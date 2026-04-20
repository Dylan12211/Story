package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SendNotificationRepairStoryDelegate implements JavaDelegate {

    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        String title = (String) execution.getVariable("title");

        notificationService.notifyAdmins(
                "REPAIR_SUBMITTED",
                "User da gui lai story",
                "Truyen '" + title + "' da duoc sua va gui lai cho admin review.",
                null,
                "adminReview"
        );
    }
}
