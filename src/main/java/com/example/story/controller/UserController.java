package com.example.story.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.dto.response.UserResponse;
import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    @GetMapping(value = "/id/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserResponse> getById(@PathVariable String userId) {
        return userService
                .findByUserId(userId)
                .map(userService::toUserResponse)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/email/{email}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserResponse> getByEmail(@PathVariable String email) {
        UserResponse user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<UserResponse> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int first,
            @RequestParam(defaultValue = "20") int max) {
        return userService.searchUsers(search, first, max);
    }

    @GetMapping(value = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Long> countUsers(@RequestParam(required = false) String search) {
        return Map.of("count", userService.countUsers(search));
    }

    @GetMapping(value = "/by-attribute", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<UserResponse> findByAttribute(@RequestParam String name, @RequestParam String value) {
        return userService.findByAttribute(name, value);
    }
}
