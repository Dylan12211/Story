package com.example.story.kafka;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.example.story.dto.kafka.EmailEvent;
import com.example.story.dto.kafka.StoryEvent;

@Service
public class StoryProducer {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private KafkaTemplate<String, StoryEvent> storyEventKafkaTemplate;

    public void sendMessage(String topic, String message) {
        kafkaTemplate.send(topic, message);
    }

    public CompletableFuture<SendResult<String, StoryEvent>> sendStoryEvent(String topic, StoryEvent event) {
        if (event.getTimestamp() == null) {
            event.setTimestamp(LocalDateTime.now());
        }
        return storyEventKafkaTemplate.send(topic, event);
    }

    public void publishStoryCreated(Long storyId, String title, String createdBy) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_CREATED)
                .timestamp(LocalDateTime.now())
                .message("Story created successfully")
                .build();
        // Dùng storyId làm key để routing partition
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }
    // Thêm method mới với key parameter
    public CompletableFuture<SendResult<String, StoryEvent>> sendStoryEvent(
            String topic, String key, StoryEvent event) {
        if (event.getTimestamp() == null) {
            event.setTimestamp(LocalDateTime.now());
        }
        // Gửi với key để Kafka hash và chọn partition
        return storyEventKafkaTemplate.send(topic, key, event);
    }

    public void publishStorySubmitted(Long storyId, String title, String createdBy) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_SUBMITTED)
                .timestamp(LocalDateTime.now())
                .message("Story submitted for review")
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishStoryApproved(Long storyId, String title, String createdBy) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_APPROVED)
                .timestamp(LocalDateTime.now())
                .message("Story approved by admin")
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishStoryRejected(Long storyId, String title, String createdBy, String reason) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_REJECTED)
                .timestamp(LocalDateTime.now())
                .message("Story rejected: " + reason)
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishStoryNeedRepair(Long storyId, String title, String createdBy, String reason) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_NEED_REPAIR)
                .timestamp(LocalDateTime.now())
                .message("Story needs repair: " + reason)
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishStoryPublished(Long storyId, String title, String createdBy) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_PUBLISHED)
                .timestamp(LocalDateTime.now())
                .message("Story published successfully")
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishStoryRepaired(Long storyId, String title, String createdBy) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .createdBy(createdBy)
                .eventType(StoryEvent.StoryEventType.STORY_REPAIRED)
                .timestamp(LocalDateTime.now())
                .message("Story repaired and resubmitted")
                .build();
        sendStoryEvent("story-events", String.valueOf(storyId), event);
    }

    public void publishTaskCreated(Long storyId, String title, String taskId, String taskKey, String assignee) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .taskId(taskId)
                .taskKey(taskKey)
                .assignee(assignee)
                .eventType(StoryEvent.StoryEventType.TASK_CREATED)
                .timestamp(LocalDateTime.now())
                .message("Task created")
                .build();
        sendStoryEvent("story-events", taskId, event);
    }

    public void publishTaskClaimed(Long storyId, String title, String taskId, String taskKey, String assignee) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .taskId(taskId)
                .taskKey(taskKey)
                .assignee(assignee)
                .eventType(StoryEvent.StoryEventType.TASK_CLAIMED)
                .timestamp(LocalDateTime.now())
                .message("Task claimed")
                .build();
        sendStoryEvent("story-events", taskId, event);
    }

    public void publishTaskCompleted(Long storyId, String title, String taskId, String taskKey, String assignee) {
        StoryEvent event = StoryEvent.builder()
                .storyId(storyId)
                .title(title)
                .taskId(taskId)
                .taskKey(taskKey)
                .assignee(assignee)
                .eventType(StoryEvent.StoryEventType.TASK_COMPLETED)
                .timestamp(LocalDateTime.now())
                .message("Task completed")
                .build();
        sendStoryEvent("story-events", taskId, event);
    }

    @Autowired
    private KafkaTemplate<String, EmailEvent> emailEventKafkaTemplate;

    public void publishEmailEvent(String to, String subject, String body, String emailType, Long storyId) {
        EmailEvent event = EmailEvent.builder()
                .to(to)
                .subject(subject)
                .body(body)
                .emailType(emailType)
                .storyId(storyId)
                .build();
        emailEventKafkaTemplate.send("email-events", String.valueOf(storyId), event);
    }
}
