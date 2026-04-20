package com.example.story.controller;

import java.util.List;

import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.dto.identity.UserInfo;
import com.example.story.service.KeycloakService;
import com.example.story.service.UserService;

@RestController
public class AdminController {

    private final KeycloakService adminService;
    private final UserService userService;

    public AdminController(KeycloakService adminService, UserService userService) {
        this.adminService = adminService;
        this.userService = userService;
    }

    @GetMapping("/api/admin/profiles")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserRepresentation> getAllUsers() {
        return adminService.getAllUsers();
    }

    @GetMapping("/api/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserInfo> getAllLocalUsers() {
        return userService.getAllUserInfo();
    }
}
