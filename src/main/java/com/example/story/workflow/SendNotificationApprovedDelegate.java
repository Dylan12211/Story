package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.kafka.StoryProducer;
import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationApprovedDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) {
        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");
        Long storyId = (Long) execution.getVariable("storyId");

        System.out.println("=== SendNotificationApprovedDelegate START ===");
        System.out.println("author = " + author);
        System.out.println("title = " + title);
        System.out.println("storyId = " + storyId);
        System.out.println("All variables: " + execution.getVariables());

        // // Gửi notification trực tiếp cho user
        // notificationService.notifyToUser(
        //         author,
        //         "APPROVED",
        //         "Story đã được duyệt",
        //         "Truyện '" + title + "' đã được publish.",
        //         null,
        //         "published"
        // );

        // Gửi Kafka event cho logging/audit
        if (storyId != null) {
            storyProducer.publishStoryApproved(storyId, title, author);
        } else {
            System.out.println("WARNING: storyId is null, skipping Kafka event");
        }

        System.out.println("=== SendNotificationApprovedDelegate END ===");
    }
}
