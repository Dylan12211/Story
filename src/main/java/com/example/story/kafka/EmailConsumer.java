package com.example.story.kafka;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.example.story.dto.kafka.EmailEvent;

import lombok.extern.slf4j.Slf4j;

@Service
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class EmailConsumer {

    @Autowired
    private JavaMailSender mailSender;

    @KafkaListener(
            topics = "email-events",
            groupId = "email-service-group",
            containerFactory = "emailEventKafkaListenerContainerFactory")
    public void consumeEmailEvent(EmailEvent event) {
        log.info("Received EmailEvent: {}", event);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(event.getTo());
        message.setSubject(event.getSubject());
        message.setText(event.getBody());

        mailSender.send(message);
        log.info("Email sent to: {}", event.getTo());
    }
}
