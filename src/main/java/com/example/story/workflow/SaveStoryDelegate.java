package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.story.entity.Story;
import com.example.story.entity.StoryStatus;
import com.example.story.repository.StoryRepository;
import com.example.story.service.NotificationService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SaveStoryDelegate implements JavaDelegate {

    private final StoryRepository storyRepository;
    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        String title = (String) execution.getVariable("title");
        String content = (String) execution.getVariable("content");
        String createdBy = (String) execution.getVariable("createdBy");

        Story story = new Story();
        story.setTitle(title);
        story.setContent(content);
        story.setStatus(StoryStatus.IN_REVIEW);
        story.setCreatedBy(createdBy);

        storyRepository.save(story);

        execution.setVariable("storyId", story.getId());

        System.out.println("Saved story: " + story.getId());

        // Gửi WebSocket notification khi tạo story mới
        notificationService.broadcastStoryUpdate("STORY_CREATED", "Story mới được tạo",
                "Truyện '" + title + "' đã được tạo và đang chờ review.", story.getId(), createdBy);
    }
}