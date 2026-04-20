package com.example.story.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class UserSyncController {

    private final UserService userService;

    @PostMapping("/sync")
    public ResponseEntity<?> syncUser(@RequestBody Map<String, Object> body) {

        userService.syncUser(body);

        return ResponseEntity.ok().build();
    }
}
