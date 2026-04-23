package com.example.story.service;

import com.example.story.entity.Notification;
import com.example.story.entity.User;
import com.example.story.repository.NotificationRepository;
import com.example.story.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import com.example.story.dto.response.TaskNotification;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;


    public NotificationService(SimpMessagingTemplate messagingTemplate, NotificationRepository notificationRepository, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }
// NOTIFY TO USER
@CacheEvict(value = "unreadNotifications", key = "#username")
public void notifyToUser(
        String username,
        String type,
        String title,
        String message,
        String taskId,
        String taskKey
) {
        // Lưu vào database
        Notification notification = new Notification();
        notification.setUsername(username);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setTaskId(taskId);
        notification.setTaskKey(taskKey);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        Notification saved = notificationRepository.save(notification);

        // Gửi WebSocket
        TaskNotification payload = new TaskNotification(
                saved.getId(), type, title, message, username, taskId, taskKey, LocalDateTime.now()
        );
        messagingTemplate.convertAndSend("/topic/notifications/" + username, payload);
    }

// NOTIFY TO ADMINS
public void notifyAdmins(
        String type,
        String title,
        String message,
        String taskId,
        String taskKey
) {
        // Lấy danh sách admin users
        List<User> adminUsers = userRepository.findByRole("ROLE_ADMIN");

        // Lưu notification cho từng admin
        for (User admin : adminUsers) {
            Notification notification = new Notification();
            notification.setUsername(admin.getUsername());
            notification.setType(type);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setTaskId(taskId);
            notification.setTaskKey(taskKey);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notification);

            // Evict cache cho admin này
            evictUnreadNotificationsCache(admin.getUsername());

            // Gửi WebSocket cho admin này
            TaskNotification payload = new TaskNotification(
                    notification.getId(), type, title, message, admin.getUsername(), taskId, taskKey, LocalDateTime.now()
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + admin.getUsername(), payload);
        }

        // Gửi WebSocket cho topic admins (backward compatibility)
        TaskNotification adminPayload = new TaskNotification(
                null, type, title, message, "ROLE_ADMIN", taskId, taskKey, LocalDateTime.now()
        );
        messagingTemplate.convertAndSend("/topic/notifications/admins", adminPayload);
    }

// GET UNREAD NOTIFICATIONS
@Cacheable(value = "unreadNotifications", key = "#username")
public List<TaskNotification> getUnreadNotifications(String username) {
        List<Notification> notifications = notificationRepository.findByUsernameAndReadFalseOrderByCreatedAtDesc(username);

        return notifications.stream()
                .map(n -> new TaskNotification(
                        n.getId(),
                        n.getType(),
                        n.getTitle(),
                        n.getMessage(),
                        n.getUsername(),
                        n.getTaskId(),
                        n.getTaskKey(),
                        n.getCreatedAt()
                ))
                .toList();
}

// MARK AS READ
@CacheEvict(value = "unreadNotifications", key = "#username")
public void markAsRead(Long notificationId, String username) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
}

// EVICT CACHE
@CacheEvict(value = "unreadNotifications", key = "#username")
public void evictUnreadNotificationsCache(String username) {
        // Method chỉ để evict cache
}

// BROADCAST STORY UPDATE
    public void broadcastStoryUpdate(String type, String title, String message, Long storyId, String username) {
        TaskNotification notification = new TaskNotification(
                null,
                type,
                title,
                message,
                username,
                String.valueOf(storyId),
                "STORY",
                LocalDateTime.now()
        );

        messagingTemplate.convertAndSend("/topic/stories", notification);
    }

// BROADCAST TASK UPDATE
    public void broadcastTaskUpdate(String type, String title, String message, String taskId, String taskKey, String username) {
        TaskNotification notification = new TaskNotification(
                null,
                type,
                title,
                message,
                username,
                taskId,
                taskKey,
                LocalDateTime.now()
        );

        messagingTemplate.convertAndSend("/topic/tasks", notification);
    }
}
