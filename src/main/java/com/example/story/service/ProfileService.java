package com.example.story.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.example.story.dto.request.ProfileUpdateRequest;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.example.story.dto.identity.Credential;
import com.example.story.dto.identity.TokenExchangeParam;
import com.example.story.dto.identity.UserCreationParam;
import com.example.story.dto.request.RegistrationRequest;
import com.example.story.dto.response.ProfileResponse;
import com.example.story.entity.Profile;
import com.example.story.entity.User;
import com.example.story.exception.ErrorNormalize;
import com.example.story.mapper.ProfileMapper;
import com.example.story.repository.IdentityClient;
import com.example.story.repository.ProfileRepository;
import com.example.story.repository.UserRepository;

import feign.FeignException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProfileService {
    ProfileRepository profileRepository;
    ProfileMapper profileMapper;
    IdentityClient identityClient;
    ErrorNormalize errorNormalize;

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    KeycloakService keycloakService;

    @Value("${idp.client-id}")
    @NonFinal
    String clientId;

    @Value("${idp.client-secret}")
    @NonFinal
    String clientSecret;

    @Value("${idp.role-user-id}")
    @NonFinal
    String roleUserId;

    private String getCurrentUsername() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new RuntimeException("No authentication found");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {
            return jwt.getClaimAsString("preferred_username");
        }

        return authentication.getName();
    }

    public ProfileResponse getMyProfile() {

        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String email = jwt.getClaim("email");
        String username = jwt.getClaim("preferred_username");

        Profile profile = getOrCreateProfile(email, username);

        return profileMapper.toProfileResponse(profile);
    }

    public Profile getOrCreateProfile(String email, String username) {
        return profileRepository.findByUser_Email(email).orElseGet(() -> {

            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.save(
                            User.builder()
                                    .username(username)
                                    .email(email)
                                    .build()
                    ));

            Profile profile = Profile.builder()
                    .user(user)
                    .username(username)
                    .email(email)
                    .build();

            return profileRepository.save(profile);
        });
    }

    private void assignRoleToKeycloak(String accessToken, String userId, String roleName) {
        // Cấu trúc JSON mà Keycloak yêu cầu để map role
        Map<String, Object> roleMapping = Map.of(
                "id", roleUserId, // ID bạn vừa lấy (3bf6a1cf...)
                "name", roleName // Tên role (user)
                );

        try {
            identityClient.assignRole(
                    "Bearer " + accessToken,
                    "story-app", // Thay bằng realm name của bạn nếu khác
                    userId,
                    List.of(roleMapping));
            log.info("Đã gán role '{}' cho user {} trên Keycloak", roleName, userId);
        } catch (FeignException e) {
            log.error("Không thể gán role trên Keycloak: {}", e.contentUTF8());
            throw errorNormalize.handleKeyCloakException(e);
        }
    }

    public ProfileResponse register(RegistrationRequest request) {
        try {
            // 1. Lấy Admin Token
            var tokenResponse = identityClient.exchangeToken(TokenExchangeParam.builder()
                    .grant_type("client_credentials")
                    .client_id(clientId)
                    .client_secret(clientSecret)
                    .scope("openid")
                    .build());

            String adminToken = tokenResponse.getAccessToken();

            // 2. Tạo User trên Keycloak
            var creationResponse = identityClient.createUser(
                    "Bearer " + adminToken,
                    UserCreationParam.builder()
                            .username(request.getUsername())
                            .firstName(request.getFirstName())
                            .lastName(request.getLastName())
                            .email(request.getEmail())
                            .enabled(true)
                            .emailVerified(false)
                            .credentials(List.of(Credential.builder()
                                    .type("password")
                                    .temporary(false)
                                    .value(request.getPassword())
                                    .build()))
                            .build());

            String userId = extractUserId(creationResponse);

            // 3. GÁN ROLE TRÊN KEYCLOAK (QUAN TRỌNG)
            assignRoleToKeycloak(adminToken, userId, "user");

            // 4. Lưu vào Postgres
            User user = User.builder()
                    .id(userId)
                    .username(request.getUsername())
                    // Lưu password encode vào DB nếu bạn vẫn muốn giữ login nội bộ song song
                    .password(passwordEncoder.encode(request.getPassword()))
                    .email(request.getEmail())
                    .roles(Set.of("user")) // Role trong DB nội bộ
                    .build();

            if (userRepository.findByUsername(request.getUsername()).isEmpty()) {
                user = userRepository.save(user);
            }

            var profile = profileMapper.toProfile(request);
            profile.setUser(user);
            profileRepository.save(profile);

            return profileMapper.toProfileResponse(profile);

        } catch (FeignException exception) {
            throw errorNormalize.handleKeyCloakException(exception);
        }
    }

    private String extractUserId(ResponseEntity<?> response) {
        String location = response.getHeaders().get("Location").getFirst();
        String[] splitedStr = location.split("/");
        return splitedStr[splitedStr.length - 1];
    }
    private ProfileResponse mapToResponse(Profile profile) {
        return ProfileResponse.builder()
                .profileId(profile.getProfileId())
                .userId(profile.getUser() != null ? profile.getUser().getId() : null)
                .username(profile.getUsername())
                .email(profile.getEmail())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .dob(profile.getDob())
                .roles(profile.getUser() != null ? profile.getUser().getRoles().stream().toList() : List.of())
                .build();
    }

    private String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }

        throw new RuntimeException("No JWT found");
    }

    @Transactional
    public ProfileResponse updateMyProfile(ProfileUpdateRequest request) {

        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = jwt.getClaim("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Profile profile = user.getProfile();

        if (profile == null) {
            profile = new Profile();
            profile.setUser(user);
            user.setProfile(profile);
        }

        if (request.firstName() != null) profile.setFirstName(request.firstName());
        if (request.lastName() != null) profile.setLastName(request.lastName());
        if (request.email() != null) user.setEmail(request.email());
        if (request.dob() != null) profile.setDob(request.dob());

        userRepository.save(user);

        return mapToResponse(profile);
    }
}
