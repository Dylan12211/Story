package com.example.story.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.story.dto.request.CreateUserRequest;
import com.example.story.dto.request.LoginRequest;
import com.example.story.dto.request.UpdatePasswordRequest;
import com.example.story.dto.request.UpdateUserRequest;
import com.example.story.dto.response.UserResponse;
import com.example.story.service.AuthService;
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

    @Value("${idp.client-secret}")
    @NonFinal
    String clientSecret;

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String tokenResponse = loginService.login(loginRequest);
        return ResponseEntity.ok(tokenResponse);
    }

    // GET USER
    @GetMapping(value = "/users/{username}", produces = MediaType.APPLICATION_JSON_VALUE)
    public UserResponse getUser(@PathVariable String username) {
        return userService
                .findByUserName(username)
                .map(userService::toUserResponse)
                .orElse(null);
    }

    // VALIDATE LOGIN
    @PostMapping("/auth/validate")
    public ResponseEntity<Boolean> validateLogin(@RequestBody LoginRequest loginRequest) {
        boolean valid = userService.validateUser(loginRequest.getUsername(), loginRequest.getPassword());
        return ResponseEntity.ok(valid);
    }

    // CREATE USER
    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        var user = userService.createUser(request.getUsername(), request.getEmail(), request.getPassword());
        UserResponse response = userService.toUserResponse(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // UPDATE USER
    @PutMapping("/users/{username}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String username, @RequestBody UpdateUserRequest request) {
        var updatedUser = userService.updateUser(username, request.getEmail());
        if (updatedUser == null) return ResponseEntity.notFound().build();
        UserResponse response = userService.toUserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    // DELETE USER
    @DeleteMapping("/users/{username}")
    public ResponseEntity<Void> deleteUser(@PathVariable String username) {
        boolean deleted = userService.deleteUser(username);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // UPDATE PASSWORD
    @PutMapping("/users/{username}/password")
    public ResponseEntity<Void> updatePassword(
            @PathVariable String username, @RequestBody UpdatePasswordRequest request) {
        boolean updated = userService.updatePassword(username, request.getPassword());
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    // UPDATE ATTRIBUTES
    @PutMapping("/users/{username}/attributes")
    public ResponseEntity<Void> updateAttributes(
            @PathVariable String username, @RequestBody Map<String, String> attributes) {
        boolean updated = userService.updateAttributes(username, attributes);
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    // GET USER ROLES
    @GetMapping("/users/{username}/roles")
    public ResponseEntity<java.util.Set<String>> getUserRoles(@PathVariable String username) {
        java.util.Set<String> roles = userService.getUserRoles(username);
        return ResponseEntity.ok(roles);
    }

    // ASSIGN ROLE
    @PostMapping("/admin/users/{username}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRole(@PathVariable String username, @RequestBody Map<String, String> request) {
        userService.assignRole(username, request.get("role"));
        return ResponseEntity.ok().build();
    }

    // GOOGLE LOGIN
    @GetMapping("auth/google/url")
    public String getGoogleLoginUrl() {
        return authService.buildGoogleLoginUrl();
    }

    // GOOGLE CALLBACK
    @GetMapping("auth/google/callback")
    public ResponseEntity<?> googleCallback(@RequestParam String code) {
        return ResponseEntity.ok(authService.handleGoogleCallback(code));
    }
}
