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
public class BroadcastTaskCreatedDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        log.info("=== BroadcastTaskCreatedDelegate START ===");

        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");
        Long storyId = (Long) execution.getVariable("storyId");

        log.info("Broadcasting task creation for user: {}, story: {}", author, title);

        // Gửi WebSocket task update để frontend reload task list
        // Task đã được tạo trong Camunda trước delegate này được gọi
        notificationService.broadcastTaskUpdate(
                "TASK_CREATED",
                "Repair Task Created",
                "Story rejected, repair task created for user",
                null,
                "repairStory",
                author
        );

        // Gửi Kafka event
        storyProducer.publishTaskCreated(storyId, title, null, "repairStory", author);

        log.info("Task update broadcast sent to /topic/tasks");
        log.info("=== BroadcastTaskCreatedDelegate END ===");
    }
}
