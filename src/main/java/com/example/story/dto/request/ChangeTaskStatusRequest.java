package com.example.story.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class ChangeTaskStatusRequest {
    @NotBlank
    private String status;
}
