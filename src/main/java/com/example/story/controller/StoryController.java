package com.example.story.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.story.entity.Story;
import com.example.story.service.StoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {
    private final StoryService storyService;

    @GetMapping
    public List<Story> getStories(Authentication authentication) {
        return storyService.getStoriesForUser(authentication);
    }

    @GetMapping("/{id}")
    public Story getStory(@PathVariable Long id, Authentication authentication) {
        return storyService.getStoryByIdForUser(id, authentication);
    }
}
