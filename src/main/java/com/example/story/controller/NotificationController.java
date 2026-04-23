package com.example.story.controller;

import com.example.story.dto.response.TaskNotification;
import com.example.story.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/unread")
    public List<TaskNotification> getUnreadNotifications() {
        String username = getCurrentUser();
        return notificationService.getUnreadNotifications(username);
    }

    @PutMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        String username = getCurrentUser();
        notificationService.markAsRead(id, username);
    }

    private String getCurrentUser() {
        // Lấy username từ JWT claims (preferred_username)
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
            return jwtAuth.getToken().getClaimAsString("preferred_username");
        }

        return auth.getName();
    }
}
