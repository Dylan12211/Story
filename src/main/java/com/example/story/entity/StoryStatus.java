package com.example.story.entity;

public enum StoryStatus {
    DRAFT, // user vừa tạo
    IN_REVIEW, // đang chờ admin xử lý (Camunda userTask)
    REJECTED, // admin từ chối
    APPROVED, // admin duyệt xong
    PUBLISHED, // đã publish ra hệ thống
    PENDING
}
