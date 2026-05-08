package com.example.story.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class KeycloakService {

    @Value("${idp.url}")
    private String keycloakUrl;

    @Value("${idp.realm}")
    private String realm;

    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<UserRepresentation> getAllUsers() {
        Keycloak keycloak = KeycloakBuilder.builder()
                .serverUrl(keycloakUrl)
                .realm(realm)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .grantType("client_credentials")
                .build();

        return keycloak.realm(realm).users().list();
    }

    // --- Lấy token admin ---
    public String getAdminToken() {
        String url = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "grant_type=client_credentials" + "&client_id=" + clientId + "&client_secret=" + clientSecret;

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return (String) response.getBody().get("access_token");
    }

    // --- Lấy userId theo email ---
    public String getUserIdByEmail(String email, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users?email=" + email;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);

        if (response.getBody() != null && !response.getBody().isEmpty()) {
            Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
            return (String) user.get("id");
        }

        throw new RuntimeException("User not found in Keycloak with email: " + email);
    }

    // --- Assign realm role cho user ---
    public void assignRealmRole(String userId, String roleName, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Tạo payload role
        Map<String, Object> rolePayload =
                Map.of("name", roleName, "composite", false, "clientRole", false, "containerId", realm);

        HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(List.of(rolePayload), headers);
        restTemplate.postForEntity(url, entity, Void.class);
    }

    public void sendResetPasswordEmail(String userId, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/execute-actions-email";
        RestTemplate rest = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<String> actions = List.of("UPDATE_PASSWORD"); // chỉ reset password
        Map<String, Object> body =
                Map.of("actions", actions, "lifespan", 300, "redirectUri", "http://localhost:4200/login");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        rest.postForEntity(url, request, String.class);
    }

    public List<Map<String, Object>> getUsersByRole(String roleName, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);

        if (response.getBody() != null) {
            // Trả về danh sách Map (mỗi user là một Map)
            List<Map<String, Object>> users = new ArrayList<>();
            for (Object u : response.getBody()) {
                users.add((Map<String, Object>) u);
            }
            return users;
        }

        return new ArrayList<>();
    }
}
