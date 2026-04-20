package com.example.story.dto.request;

import lombok.Data;

@Data
public class StartProcessRequest {
    public String author;
    public String title;
    public String content;
}
