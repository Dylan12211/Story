package com.example.keycloak.provider;

import com.example.keycloak.dto.UserResponse;
import org.keycloak.component.ComponentModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.storage.adapter.AbstractUserAdapterFederatedStorage;

import java.net.HttpURLConnection;
import java.net.URL;

public class RemoteUserAdapter extends AbstractUserAdapterFederatedStorage {

    private final UserResponse user;
    private final RemoteUserStorageProvider provider;

    public RemoteUserAdapter(KeycloakSession session,
                             RealmModel realm,
                             ComponentModel model,
                             UserResponse user,
                             RemoteUserStorageProvider provider) {
        super(session, realm, model);
        this.user = user;
        this.provider = provider;
    }

    @Override
    public String getUsername() { return user.getUsername(); }

    @Override
    public void setUsername(String username) {
        // nếu muốn update username, có thể gọi provider.updateUser() tương tự email
    }

    @Override
    public String getEmail() { return user.getEmail(); }

    @Override
    public void setEmail(String email) {
        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + user.getUsername());
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = String.format("{\"email\":\"%s\"}", email);
            conn.getOutputStream().write(json.getBytes());

            if (conn.getResponseCode() == 200) {
                user.setEmail(email);
            }

        } catch (Exception e) {
            // log nếu muốn
        }
    }

    public boolean deleteUser() {
        return provider.removeUser(user.getUsername());
    }
}