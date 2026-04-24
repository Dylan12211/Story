package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.story.entity.Story;
import com.example.story.entity.StoryStatus;
import com.example.story.kafka.StoryProducer;
import com.example.story.repository.StoryRepository;
import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
@CacheEvict(value = "stories", allEntries = true)
public class SaveStoryDelegate implements JavaDelegate {

    private final StoryRepository storyRepository;
    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    @Override
    @Transactional
    public void execute(DelegateExecution execution) {
        String title = (String) execution.getVariable("title");
        String content = (String) execution.getVariable("content");
        String createdBy = (String) execution.getVariable("createdBy");

        // Tạo story mới
        Story story = new Story();
        story.setTitle(title);
        story.setContent(content);
        story.setStatus(StoryStatus.IN_REVIEW);
        story.setCreatedBy(createdBy);

        storyRepository.save(story);

        execution.setVariable("storyId", story.getId());

        System.out.println("Saved story: " + story.getId());

        // Gửi notification cho author khi tạo story mới (lưu vào database)
        notificationService.notifyToUser(
                createdBy,
                "STORY_CREATED",
                "Story mới được tạo",
                "Truyện '" + title + "' đã được tạo và đang chờ review.",
                String.valueOf(story.getId()),
                "STORY");

        // Gửi event Kafka sau khi transaction commit
        final Long storyId = story.getId();
        final String storyTitle = title;
        final String storyCreator = createdBy;

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    storyProducer.publishStoryCreated(storyId, storyTitle, storyCreator);
                }
            });
        } else {
            storyProducer.publishStoryCreated(storyId, storyTitle, storyCreator);
        }
    }
}
