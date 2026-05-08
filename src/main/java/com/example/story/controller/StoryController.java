package com.example.story.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.dto.kafka.StoryEvent;
import com.example.story.entity.Story;
import com.example.story.kafka.StoryProducer;
import com.example.story.service.StoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {
    private final StoryService storyService;
    private final StoryProducer storyProducer;

    @GetMapping
    public List<Story> getStories(Authentication authentication) {
        return storyService.getStoriesForUser(authentication);
    }

    @GetMapping("/{id}")
    public Story getStory(@PathVariable Long id, Authentication authentication) {
        return storyService.getStoryByIdForUser(id, authentication);
    }

    @PostMapping("/kafka/test")
    public ResponseEntity<String> testKafka(@RequestBody StoryEvent event) {
        storyProducer.sendStoryEvent("story-events", event);
        return ResponseEntity.ok("Story event sent to Kafka successfully");
    }

    @PostMapping("/kafka/publish-created")
    public ResponseEntity<String> publishStoryCreated(@RequestBody StoryEvent event) {
        storyProducer.publishStoryCreated(event.getStoryId(), event.getTitle(), event.getCreatedBy());
        return ResponseEntity.ok("Story created event published to Kafka");
    }

    @PostMapping("/kafka/publish-submitted")
    public ResponseEntity<String> publishStorySubmitted(@RequestBody StoryEvent event) {
        storyProducer.publishStorySubmitted(event.getStoryId(), event.getTitle(), event.getCreatedBy());
        return ResponseEntity.ok("Story submitted event published to Kafka");
    }

    @PostMapping("/kafka/publish-approved")
    public ResponseEntity<String> publishStoryApproved(@RequestBody StoryEvent event) {
        storyProducer.publishStoryApproved(event.getStoryId(), event.getTitle(), event.getCreatedBy());
        return ResponseEntity.ok("Story approved event published to Kafka");
    }

    @PostMapping("/kafka/publish-rejected")
    public ResponseEntity<String> publishStoryRejected(@RequestBody StoryEvent event) {
        storyProducer.publishStoryRejected(
                event.getStoryId(),
                event.getTitle(),
                event.getCreatedBy(),
                event.getMessage() != null ? event.getMessage() : "No reason provided");
        return ResponseEntity.ok("Story rejected event published to Kafka");
    }

    @PostMapping("/kafka/publish-published")
    public ResponseEntity<String> publishStoryPublished(@RequestBody StoryEvent event) {
        storyProducer.publishStoryPublished(event.getStoryId(), event.getTitle(), event.getCreatedBy());
        return ResponseEntity.ok("Story published event published to Kafka");
    }
}
