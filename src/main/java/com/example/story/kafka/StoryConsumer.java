package com.example.story.kafka;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.story.dto.kafka.StoryEvent;
import com.example.story.entity.Story;
import com.example.story.entity.StoryStatus;
import com.example.story.repository.StoryRepository;
import com.example.story.service.NotificationService;

@Service
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class StoryConsumer {
    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private NotificationService notificationService;

    @KafkaListener(
            topics = "story-events",
            groupId = "story-service-group",
            containerFactory = "storyEventKafkaListenerContainerFactory")
    @Transactional
    public void consumeStoryEvent(
            @Payload StoryEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

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
            case TASK_CREATED:
                handleTaskCreated(event);
                break;
            case TASK_CLAIMED:
                handleTaskClaimed(event);
                break;
            case TASK_COMPLETED:
                handleTaskCompleted(event);
                break;
            default:
        }
    }

    public void handleStoryCreated(StoryEvent event) {
        notificationService.broadcastStoryUpdate(
                "STORY_CREATED",
                "Story mới được tạo",
                "Truyện '" + event.getTitle() + "' đã được tạo và đang chờ review.",
                event.getStoryId(),
                event.getCreatedBy());
    }

    @Transactional
    @CacheEvict(allEntries = true)
    public void handleStoryApproved(StoryEvent event) {
        try {
            Story story = storyRepository
                    .findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.PUBLISHED);
            storyRepository.save(story);

            notificationService.notifyToUser(
                    event.getCreatedBy(),
                    "APPROVED",
                    "Story đã được duyệt",
                    "Truyện '" + event.getTitle() + "' đã được publish.",
                    null,
                    "published");
        } catch (Exception e) {
            // Error handled silently
        }
    }

    @Transactional
    @CacheEvict(allEntries = true)
    public void handleStoryRejected(StoryEvent event) {
        try {
            Story story = storyRepository
                    .findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.DRAFT);
            story.setRejectReason(event.getMessage());
            storyRepository.save(story);

        } catch (Exception e) {
            // Error handled silently
        }
    }

    @Transactional
    @CacheEvict(allEntries = true)
    public void handleStoryRepaired(StoryEvent event) {
        try {
            Story story = storyRepository
                    .findById(event.getStoryId())
                    .orElseThrow(() -> new RuntimeException("Story not found: " + event.getStoryId()));
            story.setStatus(StoryStatus.IN_REVIEW);
            story.setRejectReason(null);
            storyRepository.save(story);

            notificationService.notifyAdmins(
                    "REPAIR_SUBMITTED",
                    "User đã gửi lại story",
                    "Truyện '" + event.getTitle() + "' đã được sửa và gửi lại cho admin review.",
                    null,
                    "adminReview");
        } catch (Exception e) {
            // Error handled silently
        }
    }

    public void handleTaskCreated(StoryEvent event) {
        // Gửi broadcast task update để frontend reload task list
        notificationService.broadcastTaskUpdate(
                "TASK_CREATED",
                "Task mới được tạo",
                "Task '" + event.getTaskKey() + "' đã được tạo.",
                event.getTaskId(),
                event.getTaskKey(),
                event.getAssignee());

        // Gửi notification private cho assignee
        if (event.getAssignee() != null) {
            notificationService.notifyToUser(
                    event.getAssignee(),
                    "TASK_CREATED",
                    "Task mới được tạo",
                    "Task '" + event.getTaskKey() + "' đã được tạo cho bạn.",
                    event.getTaskId(),
                    event.getTaskKey());
        }
    }

    public void handleTaskClaimed(StoryEvent event) {
        // Gửi broadcast task update để frontend reload task list
        notificationService.broadcastTaskUpdate(
                "TASK_CLAIMED",
                "Task đã được claim",
                "Task '" + event.getTaskKey() + "' đã được claim.",
                event.getTaskId(),
                event.getTaskKey(),
                event.getAssignee());

        // Gửi notification private cho assignee
        if (event.getAssignee() != null) {
            notificationService.notifyToUser(
                    event.getAssignee(),
                    "TASK_CLAIMED",
                    "Task đã được claim",
                    "Bạn đã claim task '" + event.getTaskKey() + "'.",
                    event.getTaskId(),
                    event.getTaskKey());
        }
    }

    public void handleTaskCompleted(StoryEvent event) {
        // Gửi broadcast task update để frontend reload task list
        notificationService.broadcastTaskUpdate(
                "TASK_COMPLETED",
                "Task đã hoàn thành",
                "Task '" + event.getTaskKey() + "' đã hoàn thành.",
                event.getTaskId(),
                event.getTaskKey(),
                event.getAssignee());

        // Gửi notification private cho assignee
        if (event.getAssignee() != null) {
            notificationService.notifyToUser(
                    event.getAssignee(),
                    "TASK_COMPLETED",
                    "Task đã hoàn thành",
                    "Task '" + event.getTaskKey() + "' đã hoàn thành.",
                    event.getTaskId(),
                    event.getTaskKey());
        }
    }
}
