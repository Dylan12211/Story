package com.example.story.dto.request;

import lombok.Data;

@Data
public class CompleteTaskRequest {
    public String title;
    public String content;
    public Boolean approved;
}
