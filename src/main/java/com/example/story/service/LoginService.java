package com.example.story.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.example.story.dto.request.LoginRequest;
import com.example.story.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class LoginService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    // Map chính xác các key từ file application.yml của bạn
    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    @Value("${idp.token-url}")
    private String tokenUrl;

    public String login(LoginRequest loginRequest) {
        // 1. Chuẩn bị dữ liệu gửi sang Keycloak
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("grant_type", "password");
        params.add("username", loginRequest.getUsername());
        params.add("password", loginRequest.getPassword());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            // 2. Gọi Keycloak để lấy Token (Remote Provider sẽ query backend API)
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUrl, request, String.class);
            String responseBody = response.getBody();

            log.info(
                    "Đăng nhập Keycloak thành công cho user: {}, Status: {}",
                    loginRequest.getUsername(),
                    response.getStatusCode());

            if (responseBody == null || responseBody.trim().isEmpty()) {
                throw new RuntimeException("Keycloak trả về response rỗng");
            }

            return responseBody; // Trả về JSON chứa access_token cho Controller
        } catch (HttpClientErrorException e) {
            log.error(
                    "LỖI KEYCLOAK ({}): {} - Body: {}", e.getStatusCode(), e.getMessage(), e.getResponseBodyAsString());
            throw new RuntimeException("Lỗi xác thực Keycloak: " + e.getStatusCode());
        } catch (Exception e) {
            log.error(
                    "Lỗi hệ thống khi xử lý đăng nhập cho user {}: {}", loginRequest.getUsername(), e.getMessage(), e);
            throw new RuntimeException("Đăng nhập thất bại do lỗi hệ thống: " + e.getMessage());
        }
    }
}
