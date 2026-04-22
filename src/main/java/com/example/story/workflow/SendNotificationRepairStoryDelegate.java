package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.service.NotificationService;
import com.example.story.kafka.StoryProducer;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationRepairStoryDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) {
        String title = (String) execution.getVariable("title");

        System.out.println("=== SendNotificationRepairStoryDelegate START ===");
        System.out.println("title = " + title);
        System.out.println("All variables: " + execution.getVariables());
        System.out.println("Process variables: " + execution.getProcessInstance().getVariables());

        notificationService.notifyAdmins(
                "REPAIR_SUBMITTED",
                "User da gui lai story",
                "Truyen '" + title + "' da duoc sua va gui lai cho admin review.",
                null,
                "adminReview"
        );
        
        // broadcastTaskUpdate đã được chuyển sang BroadcastAdminReviewCreatedDelegate
        // để đảm bảo adminReview task được tạo trong Camunda trước khi gửi WebSocket message
        
        // Gửi Kafka event khi user gửi lại story
        Long storyId = (Long) execution.getVariable("storyId");
        storyProducer.publishStoryRepaired(storyId, title, (String) execution.getVariable("createdBy"));
    }
}
