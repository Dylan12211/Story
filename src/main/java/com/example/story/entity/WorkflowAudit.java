package com.example.story.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.Data;

@Entity
@Table(name = "workflow_audit")
@Data
public class WorkflowAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String processInstanceId;
    private String taskId;
    private String taskName;
    private String action;
    private String actor;

    @Column(columnDefinition = "TEXT")
    private String data;

    private LocalDateTime createdAt = LocalDateTime.now();
}
