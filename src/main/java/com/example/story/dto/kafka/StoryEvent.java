package com.example.story.dto.kafka;

import java.time.LocalDateTime;

import com.example.story.entity.StoryStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryEvent {
    private Long storyId;
    private String title;
    private String createdBy;
    private StoryStatus status;
    private StoryEventType eventType;
    private LocalDateTime timestamp;
    private String message;
    private String taskId;
    private String taskKey;
    private String assignee;

    public enum StoryEventType {
        STORY_CREATED,
        STORY_UPDATED,
        STORY_SUBMITTED,
        STORY_APPROVED,
        STORY_REJECTED,
        STORY_NEED_REPAIR,
        STORY_PUBLISHED,
        STORY_REPAIRED,
        STORY_DELETED,
        TASK_CREATED,
        TASK_CLAIMED,
        TASK_COMPLETED
    }
}
