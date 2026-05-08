package com.example.story.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.example.story.entity.User;
import com.example.story.repository.UserRepository;
import com.example.story.service.EmailService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ForgotPasswordController {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

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
            // 1️⃣ Tìm user trong DB
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                // Vẫn trả về success để tránh kẻ tấn công biết email nào tồn tại
                System.out.println("User not found for email: " + email);
                return ResponseEntity.ok("Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu");
            }

            User user = userOpt.get();
            System.out.println("User found: " + user.getUsername());

            // 2️⃣ Tạo reset token
            String resetToken = UUID.randomUUID().toString();
            long expiry = Instant.now().plusSeconds(900).toEpochMilli(); // 15 phút

            user.setResetPasswordToken(resetToken);
            user.setResetPasswordTokenExpiry(expiry);
            userRepository.save(user);
            System.out.println("Reset token generated and saved");

            // 3️⃣ Gửi email với custom link
            String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
            String emailContent = String.format(
                "Xin chào %s,\n\n" +
                "Bạn đã yêu cầu reset mật khẩu. Vui lòng click vào link sau để đặt lại mật khẩu:\n\n" +
                "%s\n\n" +
                "Link này sẽ hết hạn sau 15 phút.\n\n" +
                "Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.\n\n" +
                "Trân trọng,\nSangtacviet",
                user.getUsername(), resetLink
            );

            emailService.sendEmail(email, "Yêu cầu reset mật khẩu - Sangtacviet", emailContent);
            System.out.println("Reset email sent successfully to: " + email);

            return ResponseEntity.ok("Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu");

        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống: " + e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("password");

        System.out.println("=== resetPassword START ===");
        System.out.println("Token: " + (token != null ? token.substring(0, Math.min(8, token.length())) + "..." : "null"));

        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("Token không được để trống");
        }
        if (newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body("Mật khẩu mới không được để trống");
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Mật khẩu phải có ít nhất 6 ký tự");
        }

        try {
            // 1️⃣ Tìm user theo token
            Optional<User> userOpt = userRepository.findByResetPasswordToken(token);
            if (userOpt.isEmpty()) {
                System.out.println("Invalid token: " + token);
                return ResponseEntity.badRequest().body("Token không hợp lệ hoặc đã được sử dụng");
            }

            User user = userOpt.get();

            // 2️⃣ Check expiry
            long now = Instant.now().toEpochMilli();
            Long expiry = user.getResetPasswordTokenExpiry();
            if (expiry == null || now > expiry) {
                System.out.println("Token expired for user: " + user.getUsername());
                // Clear expired token
                user.setResetPasswordToken(null);
                user.setResetPasswordTokenExpiry(null);
                userRepository.save(user);
                return ResponseEntity.badRequest().body("Token đã hết hạn, vui lòng yêu cầu reset mật khẩu lại");
            }

            System.out.println("User found: " + user.getUsername());

            // 3️⃣ Update password trong Keycloak
            String adminToken = getAdminToken();
            String keycloakUserId = getKeycloakUserIdByEmail(user.getEmail(), adminToken);
            updateKeycloakPassword(keycloakUserId, newPassword, adminToken);

            // 4️⃣ Cập nhật trong local DB
            user.setResetPasswordToken(null);
            user.setResetPasswordTokenExpiry(null);
            userRepository.save(user);

            System.out.println("Password reset successful for user: " + user.getUsername());
            return ResponseEntity.ok("Mật khẩu đã được cập nhật thành công");

        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống: " + e.getMessage());
        }
    }

    /**
     * Lấy Keycloak userId theo email
     */
    private String getKeycloakUserIdByEmail(String email, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users?email=" + email;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);

        if (response.getBody() != null && !response.getBody().isEmpty()) {
            Map<String, Object> user = (Map<String, Object>) response.getBody().get(0);
            return (String) user.get("id");
        }
        throw new RuntimeException("User not found in Keycloak with email: " + email);
    }

    /**
     * Cập nhật mật khẩu trong Keycloak
     */
    private void updateKeycloakPassword(String userId, String password, String token) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> credential = Map.of(
            "type", "password",
            "value", password,
            "temporary", false
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(credential, headers);
        restTemplate.exchange(url, HttpMethod.PUT, entity, Void.class);
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
