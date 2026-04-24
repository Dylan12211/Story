package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.kafka.StoryProducer;
import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationRepairStoryDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) {
        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");
        Long storyId = (Long) execution.getVariable("storyId");
        String repairReason = (String) execution.getVariable("repairReason");

        System.out.println("=== SendNotificationRepairStoryDelegate START ===");
        System.out.println("author = " + author);
        System.out.println("title = " + title);
        System.out.println("storyId = " + storyId);
        System.out.println("repairReason = " + repairReason);
        System.out.println("All variables: " + execution.getVariables());

        // Gửi notification cho người tạo story
        notificationService.notifyToUser(
                author,
                "NEED_REPAIR",
                "Story cần sửa lại",
                "Truyện '" + title + "' cần sửa lại. Lý do: " + repairReason,
                String.valueOf(storyId),
                "repair");

        // Gửi Kafka event STORY_NEED_REPAIR
        if (storyId != null) {
            storyProducer.publishStoryNeedRepair(storyId, title, author, repairReason);
        } else {
            System.out.println("WARNING: storyId is null, skipping Kafka event");
        }

        System.out.println("=== SendNotificationRepairStoryDelegate END ===");
    }
}
