package com.example.story.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.example.story.entity.Story;
import com.example.story.repository.StoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;

    private String getCurrentUsername(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User chua dang nhap");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {
            String preferredUsername = jwt.getClaimAsString("preferred_username");
            if (preferredUsername != null && !preferredUsername.isBlank()) {
                return preferredUsername;
            }
        }

        return authentication.getName();
    }

    @Cacheable(value = "stories", key = "#authentication.name + ':all'")
    public List<Story> getStoriesForUser(Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return storyRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        }

        String username = getCurrentUsername(authentication);

        return storyRepository.findByCreatedBy(
                username,
                Sort.by(Sort.Direction.DESC, "id")
        );
    }

    @Cacheable(value = "story", key = "#id")
    public Story getStoryByIdForUser(Long id, Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return storyRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Story not found"));
        }

        String username = getCurrentUsername(authentication);

        return storyRepository.findByIdAndCreatedBy(id, username)
                .orElseThrow(() -> new RuntimeException("Story not found"));
    }
}
