package com.example.story.repository;

import com.example.story.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUsernameAndReadFalseOrderByCreatedAtDesc(String username);
    void deleteByReadTrue();
    }