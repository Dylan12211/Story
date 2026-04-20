package com.example.story.service;

import java.time.Instant;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.story.dto.response.TaskNotification;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyToUser(
            String username,
            String type,
            String title,
            String message,
            String taskId,
            String taskKey
    ) {
        TaskNotification payload = new TaskNotification(
                type,
                title,
                message,
                username,
                taskId,
                taskKey,
                Instant.now()
        );

        messagingTemplate.convertAndSend("/topic/notifications/" + username, payload);
    }

    public void notifyAdmins(
            String type,
            String title,
            String message,
            String taskId,
            String taskKey
    ) {
        TaskNotification payload = new TaskNotification(
                type,
                title,
                message,
                "ROLE_ADMIN",
                taskId,
                taskKey,
                Instant.now()
        );

        messagingTemplate.convertAndSend("/topic/notifications/admins", payload);
    }

    public void broadcastStoryUpdate(String type, String title, String message, Long storyId, String username) {
        TaskNotification notification = new TaskNotification(
                type,
                title,
                message,
                username,
                String.valueOf(storyId),
                "STORY",
                Instant.now()
        );

        messagingTemplate.convertAndSend("/topic/stories", notification);
    }

    public void broadcastTaskUpdate(String type, String title, String message, String taskId, String taskKey, String username) {
        TaskNotification notification = new TaskNotification(
                type,
                title,
                message,
                username,
                taskId,
                taskKey,
                Instant.now()
        );

        messagingTemplate.convertAndSend("/topic/tasks", notification);
    }
}
