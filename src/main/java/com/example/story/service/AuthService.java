package com.example.story.service;

import com.example.story.entity.User;
import com.example.story.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;

    @Value("${idp.url}")
    private String idpUrl;

    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    public String buildGoogleLoginUrl() {
        return idpUrl + "/realms/story-app/protocol/openid-connect/auth"
                + "?client_id=" + clientId
                + "&redirect_uri=http://localhost:4200/auth/google/callback"
                + "&response_type=code"
                + "&scope=openid profile email"
                + "&kc_idp_hint=google";
    }



    private void createUserFromGoogle(String accessToken) {
        String email = getEmailFromUserInfo(accessToken);

        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }

        User user = User.builder()
                .username(email)
                .email(email)
                .build();

        userRepository.save(user);
    }

    private String getEmailFromUserInfo(String accessToken) {
        String userInfoUrl = idpUrl + "/realms/story-app/protocol/openid-connect/userinfo";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<?> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                userInfoUrl,
                HttpMethod.GET,
                entity,
                Map.class
        );

        Map<String, Object> body = response.getBody();

        return (String) body.get("email");
    }

    public Map<String, Object> handleGoogleCallback(String code) {

        String tokenUrl = idpUrl + "/realms/story-app/protocol/openid-connect/token";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "grant_type=authorization_code"
                + "&client_id=" + clientId
                + "&client_secret=" + clientSecret
                + "&code=" + code
                + "&redirect_uri=http://localhost:4200/auth/google/callback";

        HttpEntity<String> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                tokenUrl,
                HttpMethod.POST,
                request,
                Map.class
        );

        Map<String, Object> token = response.getBody();

        String accessToken = (String) token.get("access_token");

        String email = getEmailFromUserInfo(accessToken);


        if (userRepository.findByEmail(email).isEmpty()) {
            createUserFromGoogle(accessToken);
        }


        return token;
    }
}
