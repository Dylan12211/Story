package com.example.story.dto.kafka;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailEvent {
    private String to;
    private String subject;
    private String body;
    private String emailType;
    private Long storyId;
}