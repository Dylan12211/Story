package com.example.story.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.story.entity.WorkflowAudit;

public interface WorkflowAuditRepository extends JpaRepository<WorkflowAudit, Long> {}
