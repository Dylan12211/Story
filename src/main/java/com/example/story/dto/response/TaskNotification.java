package com.example.story.dto.response;
import java.time.LocalDateTime;

public record TaskNotification(
        Long id,
        String type,
        String title,
        String message,
        String username,
        String taskId,
        String taskKey,
        LocalDateTime createdAt
) {
}