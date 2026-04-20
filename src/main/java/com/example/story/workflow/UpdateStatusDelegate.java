package com.example.story.workflow;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.story.entity.Story;
import com.example.story.entity.StoryStatus;
import com.example.story.repository.StoryRepository;

@Component
public class UpdateStatusDelegate implements JavaDelegate {

    @Autowired
    private StoryRepository storyRepository;

    @Override
    public void execute(DelegateExecution execution) {

        Long storyId = (Long) execution.getVariable("storyId");
        String status = (String) execution.getVariable("status");

        Story story = storyRepository
                .findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found: " + storyId));

        StoryStatus statusEnum;
        try {
            statusEnum = StoryStatus.valueOf(status);
        } catch (Exception e) {
            throw new RuntimeException("Invalid status from BPMN: " + status);
        }

        story.setStatus(statusEnum);
        storyRepository.save(story);

        System.out.println("Updated story status: " + statusEnum);
    }
}
