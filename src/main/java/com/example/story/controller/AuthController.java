package com.example.story.controller;

import com.example.story.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.*;

import com.example.story.dto.request.CreateUserRequest;
import com.example.story.dto.request.LoginRequest;
import com.example.story.dto.request.UpdatePasswordRequest;
import com.example.story.dto.request.UpdateUserRequest;
import com.example.story.dto.response.UserResponse;
import com.example.story.service.LoginService;
import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Slf4j
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final LoginService loginService;
    private final AuthService  authService;


    @Value("${idp.client-secret}")
    @NonFinal
    String clientSecret;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String tokenResponse = loginService.login(loginRequest);
        return ResponseEntity.ok(tokenResponse);
    }

    @GetMapping("/users/{username}")
    public UserResponse getUser(@PathVariable String username) {
        return userService
                .findByUserName(username)
                .map(user -> new com.example.story.dto.response.UserResponse(
                        user.getId().toString(), user.getUsername(), user.getEmail()))
                .orElse(null);
    }

    @PostMapping("/auth/validate")
    public ResponseEntity<Boolean> validateLogin(@RequestBody LoginRequest loginRequest) {
        boolean valid = userService.validateUser(loginRequest.getUsername(), loginRequest.getPassword());
        return ResponseEntity.ok(valid);
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        var user = userService.createUser(request.getUsername(), request.getEmail(), request.getPassword());
        UserResponse response = new UserResponse(user.getId().toString(), user.getUsername(), user.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/users/{username}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String username, @RequestBody UpdateUserRequest request) {
        var updatedUser = userService.updateUser(username, request.getEmail());
        if (updatedUser == null) return ResponseEntity.notFound().build();
        UserResponse response =
                new UserResponse(updatedUser.getId().toString(), updatedUser.getUsername(), updatedUser.getEmail());
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

    @PostMapping("/admin/users/{username}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRole(
            @PathVariable String username,
            @RequestBody Map<String, String> request) {
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

}
