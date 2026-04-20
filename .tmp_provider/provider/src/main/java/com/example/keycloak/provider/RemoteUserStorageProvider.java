package com.example.keycloak.provider;

import com.example.keycloak.dto.LoginRequest;
import com.example.keycloak.dto.UserResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.keycloak.component.ComponentModel;
import org.keycloak.credential.*;
import org.keycloak.models.*;
import org.keycloak.storage.UserStorageProvider;
import org.keycloak.storage.user.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.stream.Stream;

public class RemoteUserStorageProvider implements
        UserStorageProvider,
        UserLookupProvider,
        CredentialInputValidator,
        UserRegistrationProvider,
        CredentialInputUpdater
{

    private final KeycloakSession session;
    private final ComponentModel model;
    private final ObjectMapper mapper = new ObjectMapper();

    public RemoteUserStorageProvider(KeycloakSession session, ComponentModel model) {
        this.session = session;
        this.model = model;
    }

    // =================== CREDENTIAL ===================
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
        if (!supportsCredentialType(input.getType())) return false;

        try {
            URL url = new URL("http://host.docker.internal:8080/api/auth/validate");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = String.format("{\"username\":\"%s\",\"password\":\"%s\"}",
                    user.getUsername(),
                    input.getChallengeResponse());

            conn.getOutputStream().write(json.getBytes());

            if (conn.getResponseCode() != 200) return false;

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String response = reader.readLine();
            return "true".equalsIgnoreCase(response);

        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean updateCredential(RealmModel realm, UserModel user, CredentialInput input) {
        if (!supportsCredentialType(input.getType())) return false;

        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + user.getUsername() + "/password");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = String.format("{\"password\":\"%s\"}", input.getChallengeResponse());
            conn.getOutputStream().write(json.getBytes());

            return conn.getResponseCode() == 200;

        } catch (Exception e) {
            return false;
        }
    }
    @Override
    public void disableCredentialType(RealmModel realm, UserModel user, String credentialType) {
    }
    @Override
    public Stream<String> getDisableableCredentialTypesStream(RealmModel realm, UserModel user) {
        // Ví dụ: chỉ password là disableable
        return Stream.of("password");

        // Nếu không muốn support disable gì cả:
        // return Stream.empty();
    }

    // =================== USER LOOKUP ===================
    @Override
    public UserModel getUserById(RealmModel realm, String userId) { return null; }

    @Override
    public UserModel getUserByUsername(RealmModel realm, String username) {
        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + username);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");

            if (conn.getResponseCode() != 200) return null;

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            UserResponse user = mapper.readValue(reader, UserResponse.class);

            return new RemoteUserAdapter(session, realm, model, user, this);

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public UserModel getUserByEmail(RealmModel realm, String email) { return null; }

    // =================== USER REGISTRATION (CREATE) ===================
    @Override
    public UserModel addUser(RealmModel realm, String username) {
        try {
            URL url = new URL("http://host.docker.internal:8080/api/users");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            String json = String.format("{\"username\":\"%s\",\"email\":\"%s\"}", username, "test@example.com");
            conn.getOutputStream().write(json.getBytes());

            if (conn.getResponseCode() != 201) return null;

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            UserResponse newUser = mapper.readValue(reader, UserResponse.class);

            return new RemoteUserAdapter(session, realm, model, newUser, this);

        } catch (Exception e) {
            return null;
        }
    }
    // =================== CUSTOM REMOVE USER ===================
    @Override
    public boolean removeUser(RealmModel realm, UserModel user) {
        return removeUser(user.getUsername());
    }

    // helper gọi REST API
    public boolean removeUser(String username) {
        try {
            URL url = new URL("http://host.docker.internal:8080/api/users/" + username);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("DELETE");
            return conn.getResponseCode() == 204;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void close() {}
}


