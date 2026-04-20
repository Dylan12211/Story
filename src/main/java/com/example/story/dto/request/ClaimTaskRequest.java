package com.example.story.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class ClaimTaskRequest {
    @NotBlank
    private String assignee;
}
