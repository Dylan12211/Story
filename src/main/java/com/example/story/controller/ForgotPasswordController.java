package com.example.story.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ForgotPasswordController {

    private final RestTemplate restTemplate;

    @Value("${idp.url}")
    private String keycloakUrl;

    @Value("${idp.realm}")
    private String realm;

    @Value("${idp.client-id}")
    private String adminClientId;

    @Value("${idp.client-secret}")
    private String adminClientSecret;

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        System.out.println("=== forgotPassword START ===");
        System.out.println("Email: " + email);

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email không được để trống");
        }

        try {
            // 1️⃣ Lấy access token admin
            System.out.println("Getting admin token...");
            String token = getAdminToken();
            System.out.println("Admin token obtained successfully");

            // 2️⃣ Lấy userId theo email
            String userSearchUrl = keycloakUrl + "/admin/realms/" + realm + "/users?email=" + email;
            System.out.println("Searching user: " + userSearchUrl);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<List> response = restTemplate.exchange(userSearchUrl, HttpMethod.GET, entity, List.class);
            List<Map<String, Object>> users = response.getBody();

            if (users == null || users.isEmpty()) {
                System.out.println("User not found");
                return ResponseEntity.badRequest().body("Email không tồn tại");
            }

            String userId = (String) users.get(0).get("id");
            System.out.println("User found: " + userId);

            // 3️⃣ Gọi execute-actions-email để gửi email reset
            String executeActionsUrl =
                    keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/execute-actions-email";
            System.out.println("Sending reset email: " + executeActionsUrl);

            HttpEntity<List<String>> actionEntity = new HttpEntity<>(List.of("UPDATE_PASSWORD"), headers);

            restTemplate.exchange(executeActionsUrl, HttpMethod.PUT, actionEntity, Void.class);
            System.out.println("Reset email sent successfully");

            return ResponseEntity.ok("Email reset mật khẩu đã được gửi");

        } catch (HttpClientErrorException.Unauthorized e) {
            System.out.println("Unauthorized error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Không thể xác thực với Keycloak (401)");
        } catch (HttpClientErrorException.NotFound e) {
            System.out.println("Not found error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy user trên Keycloak");
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            System.out.println("Keycloak server error: " + responseBody);
            if (responseBody != null && responseBody.contains("Failed to send execute actions email")) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(
                                "Keycloak không gửi được email. Vui lòng kiểm tra cấu hình SMTP trong Keycloak Admin Console → Realm Settings → Email Settings");
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi Keycloak: " + responseBody);
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống: " + e.getMessage());
        }
    }

    /**
     * Lấy admin access token từ Keycloak bằng client credentials
     */
    private String getAdminToken() {
        String tokenUrl = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", adminClientId);
        body.add("client_secret", adminClientSecret);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, entity, Map.class);
        Map<String, Object> respBody = response.getBody();

        if (respBody == null || !respBody.containsKey("access_token")) {
            throw new RuntimeException("Không lấy được access token admin Keycloak");
        }

        return (String) respBody.get("access_token");
    }
}
