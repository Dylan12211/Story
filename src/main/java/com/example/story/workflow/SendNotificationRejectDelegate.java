package com.example.story.workflow;

import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.service.NotificationService;
import com.example.story.kafka.StoryProducer;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationRejectDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final TaskService taskService;
    private final StoryProducer storyProducer;
    @Override
    public void execute(DelegateExecution execution) {
        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");

        System.out.println("=== SendNotificationRejectDelegate START ===");
        System.out.println("author = " + author);
        System.out.println("title = " + title);
        System.out.println("All variables: " + execution.getVariables());
        System.out.println("Process variables: " + execution.getProcessInstance().getVariables());

        Long storyId = (Long) execution.getVariable("storyId");
        String rejectReason = (String) execution.getVariable("rejectReason");
        
        // Gửi notification cho người tạo story
        notificationService.notifyToUser(
                author,
                "REJECTED",
                "Story của bạn đã bị từ chối",
                "Truyện '" + title + "' đã bị từ chối. Lý do: " + rejectReason,
                String.valueOf(storyId),
                "rejected"
        );

        // Gửi Kafka event STORY_REJECTED
        storyProducer.publishStoryRejected(Long.valueOf(storyId), title, author, rejectReason);

        // broadcastTaskUpdate đã được chuyển sang BroadcastTaskCreatedDelegate
        // để đảm bảo task được tạo trong Camunda trước khi gửi WebSocket message

        System.out.println("=== SendNotificationRejectDelegate END ===");

    }
}
