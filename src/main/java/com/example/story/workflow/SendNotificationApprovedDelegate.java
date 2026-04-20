package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationApprovedDelegate implements JavaDelegate {

    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        String author = (String) execution.getVariable("author");
        String title = (String) execution.getVariable("title");

        notificationService.notifyToUser(
                author,
                "APPROVED",
                "Story da duoc duyet",
                "Truyen '" + title + "' da duoc publish.",
                null,
                "published"
        );
    }
}
