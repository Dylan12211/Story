package com.example.story.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.story.dto.request.CreateUserRequest;
import com.example.story.dto.request.LoginRequest;
import com.example.story.dto.request.UpdatePasswordRequest;
import com.example.story.dto.request.UpdateUserRequest;
import com.example.story.dto.response.CccdLoginResponse;
import com.example.story.dto.response.UserResponse;
import com.example.story.service.AuthService;
import com.example.story.service.IdCardLoginService;
import com.example.story.service.LoginService;
import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api")
@Slf4j
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final LoginService loginService;
    private final AuthService authService;
    private final IdCardLoginService idCardLoginService;

    @Value("${idp.client-secret}")
    @NonFinal
    String clientSecret;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String tokenResponse = loginService.login(loginRequest);
        return ResponseEntity.ok(tokenResponse);
    }

    @GetMapping(value = "/users/{username}", produces = MediaType.APPLICATION_JSON_VALUE)
    public UserResponse getUser(@PathVariable String username) {
        return userService
                .findByUserName(username)
                .map(userService::toUserResponse)
                .orElse(null);
    }

    @PostMapping("/auth/validate")
    public ResponseEntity<Boolean> validateLogin(@RequestBody LoginRequest loginRequest) {
        boolean valid = userService.validateUser(loginRequest.getUsername(), loginRequest.getPassword());
        log.info("Remote provider credential validation for user {}: {}", loginRequest.getUsername(), valid);
        return ResponseEntity.ok(valid);
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        var user = userService.createUser(request.getUsername(), request.getEmail(), request.getPassword());
        UserResponse response = userService.toUserResponse(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/users/{username}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String username, @RequestBody UpdateUserRequest request) {
        var updatedUser = userService.updateUser(username, request.getEmail());
        if (updatedUser == null) return ResponseEntity.notFound().build();
        UserResponse response = userService.toUserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/users/{username}")
    public ResponseEntity<Void> deleteUser(@PathVariable String username) {
        boolean deleted = userService.deleteUser(username);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PutMapping("/users/{username}/password")
    public ResponseEntity<Void> updatePassword(
            @PathVariable String username, @RequestBody UpdatePasswordRequest request) {
        boolean updated = userService.updatePassword(username, request.getPassword());
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @PutMapping("/users/{username}/attributes")
    public ResponseEntity<Void> updateAttributes(
            @PathVariable String username, @RequestBody Map<String, String> attributes) {
        boolean updated = userService.updateAttributes(username, attributes);
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/users/{username}/roles")
    public ResponseEntity<java.util.Set<String>> getUserRoles(@PathVariable String username) {
        java.util.Set<String> roles = userService.getUserRoles(username);
        return ResponseEntity.ok(roles);
    }

    @PostMapping("/admin/users/{username}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRole(@PathVariable String username, @RequestBody Map<String, String> request) {
        userService.assignRole(username, request.get("role"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("auth/google/url")
    public String getGoogleLoginUrl() {
        return authService.buildGoogleLoginUrl();
    }

    @GetMapping("auth/google/callback")
    public ResponseEntity<?> googleCallback(@RequestParam String code) {
        return ResponseEntity.ok(authService.handleGoogleCallback(code));
    }

    @PostMapping("/auth/cccd/login")
    public ResponseEntity<CccdLoginResponse> loginWithCccd(@RequestParam("image") MultipartFile image) {
        try {
            // Step 1: Process CCCD login (OCR + find user)
            IdCardLoginService.IdCardLoginResult result = idCardLoginService.loginWithIdCard(image);
            UserResponse user = result.getUser();

            // Step 2: Login with Keycloak using CCCD flow
            // Trong flow CCCD: username = idNumber, password = CCCD_LOGIN
            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setUsername(result.getExtractedIdNumber()); // username là idNumber
            loginRequest.setPassword("CCCD_LOGIN"); // marker để Keycloak detect CCCD login
            String tokenResponse = loginService.login(loginRequest);

            // Step 3: Build success response
            CccdLoginResponse response = CccdLoginResponse.success(tokenResponse, user, result.getOcrData());
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("CCCD login failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(CccdLoginResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("CCCD login error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(CccdLoginResponse.error("Lỗi hệ thống khi xử lý đăng nhập CCCD"));
        }
    }

    /**
     * Endpoint để Keycloak Provider tìm user bằng idNumber (CCCD)
     * Trả về 200 nếu user tồn tại với idNumber này
     */
    @GetMapping("/users/by-idNumber")
    public ResponseEntity<UserResponse> getUserByIdNumber(@RequestParam("idNumber") String idNumber) {
        return userService.findByIdNumber(idNumber)
                .map(userService::toUserResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint để Keycloak Provider tìm user bằng userId
     */
    @GetMapping("/users/id/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable("userId") String userId) {
        return userService.findByUserId(userId)
                .map(userService::toUserResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
