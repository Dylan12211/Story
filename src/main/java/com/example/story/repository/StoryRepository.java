package com.example.story.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.story.entity.Story;

public interface StoryRepository extends JpaRepository<Story, Long> {
    List<Story> findByCreatedBy(String createdBy, Sort sort);

    Optional<Story> findByIdAndCreatedBy(Long id, String createdBy);
}
