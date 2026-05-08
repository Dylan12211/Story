package com.example.keycloak.provider;

import com.example.keycloak.dto.UserResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.keycloak.component.ComponentModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.storage.StorageId;
import org.keycloak.storage.adapter.AbstractUserAdapterFederatedStorage;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;

public class RemoteUserAdapter extends AbstractUserAdapterFederatedStorage {

    private final UserResponse user;
    private final RemoteUserStorageProvider provider;
    private final RealmModel realm;

    public RemoteUserAdapter(
            KeycloakSession session,
            RealmModel realm,
            ComponentModel model,
            UserResponse user,
            RemoteUserStorageProvider provider) {
        super(session, realm, model);
        this.user = user;
        this.provider = provider;
        this.realm = realm;
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public String getId() {
        return StorageId.keycloakId(storageProviderModel, user.getUserId());
    }

    @Override
    public void setUsername(String username) {
        // Username is controlled by the application storage.
    }

    @Override
    public String getEmail() {
        return user.getEmail();
    }

    @Override
    public void setEmail(String email) {
        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + encodePath(user.getUsername()));
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = String.format("{\"email\":\"%s\"}", escapeJson(email));
            conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));

            if (conn.getResponseCode() == 200) {
                user.setEmail(email);
            }

        } catch (Exception e) {
            // Keep Keycloak flow alive when the remote update fails.
        }
    }

    @Override
    public String getFirstName() {
        return user.getFirstName();
    }

    @Override
    public void setFirstName(String firstName) {
        provider.updateAttribute(user.getUsername(), "firstName", firstName);
    }

    @Override
    public String getLastName() {
        return user.getLastName();
    }

    @Override
    public boolean isEmailVerified() {
        return Boolean.TRUE.equals(user.getEmailVerified());
    }

    @Override
    public Stream<String> getRequiredActionsStream() {
        // PostgreSQL is the source of truth for external users, so direct grant logins
        // should not be blocked by federated required actions managed by Keycloak.
        return Stream.empty();
    }

    @Override
    public void setLastName(String lastName) {
        provider.updateAttribute(user.getUsername(), "lastName", lastName);
    }

    @Override
    protected Set<RoleModel> getRoleMappingsInternal() {
        Set<RoleModel> roles = new HashSet<>();

        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            for (String roleName : user.getRoles()) {
                RoleModel role = realm.getRole(roleName);
                if (role == null) {
                    role = realm.addRole(roleName);
                }
                roles.add(role);
            }
            return roles;
        }

        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + encodePath(getUsername()) + "/roles");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                Set<String> roleNames = new ObjectMapper().readValue(reader, Set.class);

                for (String roleName : roleNames) {
                    RoleModel role = realm.getRole(roleName);
                    if (role == null) {
                        role = realm.addRole(roleName);
                    }
                    roles.add(role);
                }
            }
        } catch (Exception e) {
            // Return the roles we have so Keycloak can continue processing.
        }

        return roles;
    }

    public boolean deleteUser() {
        return provider.removeUser(user.getUsername());
    }

    private String encodePath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
