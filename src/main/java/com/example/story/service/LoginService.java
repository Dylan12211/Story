package com.example.story.service;

import java.util.Base64;

import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.example.story.dto.request.LoginRequest;
import com.example.story.entity.Profile;
import com.example.story.entity.User;
import com.example.story.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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
            // 2. Gọi Keycloak để lấy Token
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUrl, request, String.class);
            String responseBody = response.getBody();

            log.info("Đăng nhập Keycloak thành công cho user: {}", loginRequest.getUsername());

            // 3. THỰC HIỆN ĐỒNG BỘ (LAZY SYNC)
            syncUserToPostgres(responseBody, loginRequest.getUsername());

            return responseBody; // Trả về JSON chứa access_token cho Controller
        } catch (HttpClientErrorException e) {
            log.error("LỖI KEYCLOAK ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            log.error("Lỗi hệ thống khi xử lý đăng nhập: {}", e.getMessage());
            throw new RuntimeException("Đăng nhập thất bại do lỗi hệ thống.");
        }
    }

    @Transactional
    public void syncUserToPostgres(String jsonResponse, String username) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(jsonResponse);
            String accessToken = node.get("access_token").asText();

            // Giải mã Payload JWT
            String[] chunks = accessToken.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(chunks[1]));
            JsonNode payloadNode = mapper.readTree(payload);

            String keycloakId = payloadNode.get("sub").asText();
            String email = payloadNode.has("email") ? payloadNode.get("email").asText() : "";

            String firstName = payloadNode.has("given_name")
                    ? payloadNode.get("given_name").asText()
                    : "";
            String lastName = payloadNode.has("family_name")
                    ? payloadNode.get("family_name").asText()
                    : "";

            if (email != null && !email.isBlank()
                    && userRepository.findByEmail(email).isEmpty()) {

                log.info("Tạo mới User và Profile cho: {}", username);

                User newUser = User.builder()
                        .id(keycloakId)
                        .username(username)
                        .email(email)
                        .build();

                Profile newProfile = Profile.builder()
                        .username(username)
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .user(newUser)
                        .build();

                newUser.setProfile(newProfile);
                userRepository.save(newUser);

                log.info("Đã đồng bộ User và Profile thành công!");
            }
        } catch (Exception e) {
            log.error("Lỗi đồng bộ User/Profile: {}", e.getMessage());
            throw new RuntimeException("Sync failed", e);
        }
    }
}
