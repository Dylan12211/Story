package com.example.story.controller;

import com.example.story.dto.response.UserResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.entity.User;
import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {
    private final UserService userService;

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public User getUserById(@PathVariable String id) {
        return userService.getById(id);
    }

    @GetMapping("/api/users/email/{email}")
    public UserResponse getByEmail(@PathVariable String email) {
        return userService.findByEmail(email);
    }
}
