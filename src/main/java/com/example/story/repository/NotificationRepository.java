package com.example.story.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.story.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUsernameAndReadFalseOrderByCreatedAtDesc(String username);

    void deleteByReadTrue();
}
