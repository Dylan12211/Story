package com.example.story.kafka;

import com.example.story.dto.kafka.StoryEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

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
        sendStoryEvent("story-events", event);
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
        sendStoryEvent("story-events", event);
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
        sendStoryEvent("story-events", event);
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
        sendStoryEvent("story-events", event);
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
        sendStoryEvent("story-events", event);
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
        sendStoryEvent("story-events", event);
    }
}