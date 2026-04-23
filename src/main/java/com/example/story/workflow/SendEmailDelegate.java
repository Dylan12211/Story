package com.example.story.workflow;

import com.example.story.kafka.StoryProducer;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.example.story.entity.EmailType;
import com.example.story.service.EmailService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class SendEmailDelegate implements JavaDelegate {

    private final EmailService emailService;
    private final StoryProducer storyProducer;

    @Override
    public void execute(DelegateExecution execution) {

        log.info("=== SendEmailDelegate START ===");

        try {
            String emailTypeStr = (String) execution.getVariable("emailType");
            String email = (String) execution.getVariable("authorEmail");
            String title = (String) execution.getVariable("title");

            log.info("emailTypeStr: {}", emailTypeStr);
            log.info("email: {}", email);
            log.info("title: {}", title);

            // check null sớm
            if (emailTypeStr == null || email == null) {
                throw new RuntimeException("Missing required variables");
            }

            EmailType emailType;
            try {
                emailType = EmailType.valueOf(emailTypeStr);
            } catch (Exception e) {
                log.error("Invalid emailType: {}", emailTypeStr, e);
                throw new RuntimeException("Invalid emailType: " + emailTypeStr);
            }

            String subject;
            String content;

            switch (emailType) {
                case APPROVED -> {
                    subject = "Story Approved 🎉";
                    content = "Your story '" + title + "' has been approved.";
                }
                case REJECTED -> {
                    subject = "Story Rejected ❌";
                    content = "Your story '" + title + "' has been rejected. Please revise.";
                }
                default -> throw new RuntimeException("Unsupported email type");
            }

            log.info("Sending email to: {}", email);
            log.info("Subject: {}", subject);

            // Gửi Kafka event thay vì gửi email trực tiếp
            storyProducer.publishEmailEvent(email, subject, content, emailTypeStr,
                    execution.getVariable("storyId") != null ? Long.valueOf(execution.getVariable("storyId").toString()) : null);

            log.info("Email sent SUCCESS");

        } catch (Exception e) {
            log.error("SendEmailDelegate ERROR", e);
        }

        log.info("=== SendEmailDelegate END ===");
    }
}
