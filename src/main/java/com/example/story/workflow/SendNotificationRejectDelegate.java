package com.example.story.workflow;

import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationRejectDelegate implements JavaDelegate {

    private final NotificationService notificationService;
    private final TaskService taskService;

    @Override
    public void execute(DelegateExecution execution) {
        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");

        System.out.println("=== SendNotificationRejectDelegate START ===");
        System.out.println("author = " + author);
        System.out.println("title = " + title);

        notificationService.notifyToUser(
                author,
                "REJECTED",
                "Story bi tu choi",
                "Truyen '" + title + "' da bi reject. Hay sua va gui lai.",
                null,
                "repairStory"
        );
        System.out.println("=== SendNotificationRejectDelegate END ===");
    }
}

