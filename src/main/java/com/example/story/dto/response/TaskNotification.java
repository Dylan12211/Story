package com.example.story.dto.response;

import java.time.Instant;

public record TaskNotification(
        String type,
        String title,
        String message,
        String username,
        String taskId,
        String taskKey,
        Instant createdAt
) {
}