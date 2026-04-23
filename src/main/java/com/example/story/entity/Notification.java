package com.example.story.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String type;
    private String title;
    private String message;
    private String taskId;
    private String taskKey;
    private boolean read;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}