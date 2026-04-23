package com.example.story.workflow;

import com.example.story.kafka.StoryProducer;
import com.example.story.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BroadcastAdminReviewCreatedDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        log.info("=== BroadcastAdminReviewCreatedDelegate START ===");

        String title = (String) execution.getVariable("title");
        Long storyId = (Long) execution.getVariable("storyId");

        log.info("Broadcasting admin review task creation for story: {}", title);

        // Gửi WebSocket task update để admin task list update realtime
        // adminReview task đã được tạo trong Camunda trước delegate này được gọi
        notificationService.broadcastTaskUpdate(
                "TASK_CREATED",
                "Admin Review Task Created",
                "Story repaired, admin review task created",
                null,
                "adminReview",
                null
        );

        // Gửi Kafka event cho admin users (không có assignee cụ thể)
        storyProducer.publishTaskCreated(storyId, title, null, "adminReview", null);

        log.info("Admin review task update broadcast sent to /topic/tasks");
        log.info("=== BroadcastAdminReviewCreatedDelegate END ===");
    }
}
