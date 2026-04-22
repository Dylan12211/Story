package com.example.story.kafka;

import com.example.story.dto.kafka.StoryEvent;
import com.example.story.entity.Story;
import com.example.story.entity.StoryStatus;
import com.example.story.repository.StoryRepository;
import com.example.story.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class StoryConsumer {
    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private NotificationService notificationService;

    @KafkaListener(topics = "story-events", groupId = "story-service-group",
            containerFactory = "storyEventKafkaListenerContainerFactory")
    @Transactional
    public void consumeStoryEvent(@Payload StoryEvent event,
                                   @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                   @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                                   @Header(KafkaHeaders.OFFSET) long offset) {
        log.info("Received StoryEvent from topic: {}, partition: {}, offset: {}", topic, partition, offset);
        log.info("StoryEvent details: {}", event);

        switch (event.getEventType()) {
            case STORY_CREATED:
                handleStoryCreated(event);
                break;
            case STORY_APPROVED:
                handleStoryApproved(event);
                break;
            case STORY_REJECTED:
                handleStoryRejected(event);
                break;
            case STORY_REPAIRED:
                handleStoryRepaired(event);
                break;
            default:
                log.warn("Unknown event type: {}", event.getEventType());
        }
    }

    public void handleStoryCreated(StoryEvent event) {
        log.info("Processing STORY_CREATED event for storyId: {}", event.getStoryId());
        notificationService.broadcastStoryUpdate("STORY_CREATED", "Story mới được tạo",
                "Truyện '" + event.getTitle() + "' đã được tạo và đang chờ review.",
                event.getStoryId(), event.getCreatedBy());
    }

    @Transactional
    public void handleStoryApproved(StoryEvent event) {
        log.info("Processing STORY_APPROVED event for storyId: {}", event.getStoryId());
        try {
            Story story = storyRepository.findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.PUBLISHED);
            storyRepository.save(story);

            notificationService.notifyToUser(
                    event.getCreatedBy(),
                    "APPROVED",
                    "Story đã được duyệt",
                    "Truyện '" + event.getTitle() + "' đã được publish.",
                    null,
                    "published"
            );
        } catch (Exception e) {
            log.error("Failed to process STORY_APPROVED for storyId {}: {}", event.getStoryId(), e.getMessage());
        }
    }

    @Transactional
    public void handleStoryRejected(StoryEvent event) {
        log.info("Processing STORY_REJECTED event for storyId: {}, reason: {}", event.getStoryId(), event.getMessage());
        try {
            Story story = storyRepository.findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.DRAFT);
            story.setRejectReason(event.getMessage());
            storyRepository.save(story);

            // Notification đã được gửi bởi SendNotificationRejectDelegate trong workflow
            // Không gửi lại ở đây để tránh trùng lặp
        } catch (Exception e) {
            log.error("Failed to process STORY_REJECTED for storyId {}: {}", event.getStoryId(), e.getMessage());
        }
    }

    @Transactional
    public void handleStoryRepaired(StoryEvent event) {
        log.info("Processing STORY_REPAIRED event for storyId: {}", event.getStoryId());
        try {
            Story story = storyRepository.findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.IN_REVIEW);
            story.setRejectReason(null); // Clear reject reason khi user sửa
            storyRepository.save(story);

            notificationService.notifyAdmins(
                    "REPAIR_SUBMITTED",
                    "User đã gửi lại story",
                    "Truyện '" + event.getTitle() + "' đã được sửa và gửi lại cho admin review.",
                    null,
                    "adminReview"
            );
        } catch (Exception e) {
            log.error("Failed to process STORY_REPAIRED for storyId {}: {}", event.getStoryId(), e.getMessage());
        }
    }
}