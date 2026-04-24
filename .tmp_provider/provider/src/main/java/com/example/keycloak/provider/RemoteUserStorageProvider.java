package com.example.keycloak.provider;

import com.example.keycloak.dto.UserResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.keycloak.component.ComponentModel;
import org.keycloak.credential.CredentialInput;
import org.keycloak.credential.CredentialInputUpdater;
import org.keycloak.credential.CredentialInputValidator;
import org.keycloak.credential.CredentialModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;
import org.keycloak.storage.StorageId;
import org.keycloak.storage.UserStorageProvider;
import org.keycloak.storage.user.UserLookupProvider;
import org.keycloak.storage.user.UserQueryProvider;
import org.keycloak.storage.user.UserRegistrationProvider;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public class RemoteUserStorageProvider implements
        UserStorageProvider,
        UserLookupProvider,
        UserQueryProvider,
        CredentialInputValidator,
        UserRegistrationProvider,
        CredentialInputUpdater {

    private final KeycloakSession session;
    private final ComponentModel model;
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String BACKEND_URL = "http://host.docker.internal:8080/api";

    public RemoteUserStorageProvider(KeycloakSession session, ComponentModel model) {
        this.session = session;
        this.model = model;
    }

    @Override
    public boolean supportsCredentialType(String credentialType) {
        return CredentialModel.PASSWORD.equals(credentialType);
    }

    @Override
    public boolean isConfiguredFor(RealmModel realm, UserModel user, String credentialType) {
        return supportsCredentialType(credentialType);
    }

    @Override
    public boolean isValid(RealmModel realm, UserModel user, CredentialInput input) {
        if (!supportsCredentialType(input.getType())) {
            return false;
        }

        try {
            HttpURLConnection conn = openJsonConnection(BACKEND_URL + "/auth/validate", "POST");
            String json = String.format(
                    "{\"username\":\"%s\",\"password\":\"%s\"}",
                    escapeJson(user.getUsername()),
                    escapeJson(input.getChallengeResponse()));
            conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));

            if (conn.getResponseCode() != 200) {
                return false;
            }

            String response = new String(conn.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            return "true".equalsIgnoreCase(response);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean updateCredential(RealmModel realm, UserModel user, CredentialInput input) {
        if (!supportsCredentialType(input.getType())) {
            return false;
        }

        try {
            String username = encodePath(user.getUsername());
            HttpURLConnection conn = openJsonConnection(BACKEND_URL + "/users/" + username + "/password", "PUT");
            String json = String.format("{\"password\":\"%s\"}", escapeJson(input.getChallengeResponse()));
            conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));
            return conn.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void disableCredentialType(RealmModel realm, UserModel user, String credentialType) {}

    @Override
    public Stream<String> getDisableableCredentialTypesStream(RealmModel realm, UserModel user) {
        return Stream.of(CredentialModel.PASSWORD);
    }

    @Override
    public UserModel getUserById(RealmModel realm, String userId) {
        String externalId = new StorageId(userId).getExternalId();
        if (externalId == null || externalId.isBlank()) {
            return null;
        }
        return fetchUser(realm, "/users/id/" + encodePath(externalId));
    }

    @Override
    public UserModel getUserByUsername(RealmModel realm, String username) {
        return fetchUser(realm, "/users/" + encodePath(username));
    }

    @Override
    public UserModel getUserByEmail(RealmModel realm, String email) {
        return fetchUser(realm, "/users/email/" + encodePath(email));
    }

    @Override
    public UserModel addUser(RealmModel realm, String username) {
        throw new UnsupportedOperationException(
                "Users must be created by the application and stored in PostgreSQL.");
    }

    @Override
    public boolean removeUser(RealmModel realm, UserModel user) {
        return removeUser(user.getUsername());
    }

    @Override
    public Stream<UserModel> searchForUserStream(
            RealmModel realm, Map<String, String> params, Integer firstResult, Integer maxResults) {
        String search = extractSearchTerm(params);
        String path = String.format(
                "/users/search?search=%s&first=%d&max=%d",
                encodeNullable(search),
                Math.max(firstResult == null ? 0 : firstResult, 0),
                Math.max(maxResults == null ? 20 : maxResults, 1));
        return fetchUsers(realm, path);
    }

    @Override
    public Stream<UserModel> getGroupMembersStream(
            RealmModel realm, GroupModel group, Integer firstResult, Integer maxResults) {
        return Stream.empty();
    }

    @Override
    public Stream<UserModel> searchForUserByUserAttributeStream(
            RealmModel realm, String attributeName, String attributeValue) {
        String path = String.format(
                "/users/by-attribute?name=%s&value=%s",
                encodeNullable(attributeName),
                encodeNullable(attributeValue));
        return fetchUsers(realm, path);
    }

    @Override
    public int getUsersCount(RealmModel realm) {
        return fetchUserCount(null);
    }

    @Override
    public int getUsersCount(RealmModel realm, Map<String, String> params) {
        return fetchUserCount(extractSearchTerm(params));
    }

    public boolean removeUser(String username) {
        try {
            HttpURLConnection conn =
                    openJsonConnection(BACKEND_URL + "/users/" + encodePath(username), "DELETE");
            return conn.getResponseCode() == 204;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean updateAttribute(String username, String name, String value) {
        try {
            HttpURLConnection conn = openJsonConnection(
                    BACKEND_URL + "/users/" + encodePath(username) + "/attributes", "PUT");
            String json = String.format(
                    "{\"%s\":\"%s\"}",
                    escapeJson(name),
                    escapeJson(value));
            conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));
            return conn.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    private UserModel fetchUser(RealmModel realm, String path) {
        try {
            HttpURLConnection conn = openConnection(BACKEND_URL + path, "GET");
            int status = conn.getResponseCode();
            if (status == 404 || status == 204) {
                return null;
            }
            if (status != 200) {
                return null;
            }

            try (InputStream inputStream = conn.getInputStream()) {
                byte[] payload = inputStream.readAllBytes();
                if (payload.length == 0) {
                    return null;
                }

                UserResponse user = mapper.readValue(payload, UserResponse.class);
                return new RemoteUserAdapter(session, realm, model, user, this);
            }
        } catch (Exception e) {
            return null;
        }
    }

    private Stream<UserModel> fetchUsers(RealmModel realm, String path) {
        try {
            HttpURLConnection conn = openConnection(BACKEND_URL + path, "GET");
            if (conn.getResponseCode() != 200) {
                return Stream.empty();
            }

            try (InputStream inputStream = conn.getInputStream()) {
                List<UserResponse> users = mapper.readValue(inputStream, new TypeReference<List<UserResponse>>() {});
                return users.stream().map(user -> new RemoteUserAdapter(session, realm, model, user, this));
            }
        } catch (Exception e) {
            return Stream.empty();
        }
    }

    private int fetchUserCount(String search) {
        try {
            String path = "/users/count?search=" + encodeNullable(search);
            HttpURLConnection conn = openConnection(BACKEND_URL + path, "GET");
            if (conn.getResponseCode() != 200) {
                return 0;
            }

            try (InputStream inputStream = conn.getInputStream()) {
                Map<String, Object> payload = mapper.readValue(inputStream, new TypeReference<Map<String, Object>>() {});
                Object count = payload.get("count");
                if (count instanceof Number number) {
                    return number.intValue();
                }
                return Integer.parseInt(String.valueOf(count));
            }
        } catch (Exception e) {
            return 0;
        }
    }

    private String extractSearchTerm(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return null;
        }

        for (String key : List.of("search", "username", "email", "firstName", "lastName")) {
            String value = params.get(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }

        return params.values().stream().filter(value -> value != null && !value.isBlank()).findFirst().orElse(null);
    }

    private HttpURLConnection openJsonConnection(String url, String method) throws Exception {
        HttpURLConnection conn = openConnection(url, method);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json");
        return conn;
    }

    private HttpURLConnection openConnection(String url, String method) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        conn.setRequestProperty("Accept", "application/json");
        return conn;
    }

    private String encodePath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String encodeNullable(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @Override
    public void close() {}
}
