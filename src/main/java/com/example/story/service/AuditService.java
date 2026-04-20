package com.example.story.service;

import org.springframework.stereotype.Service;

import com.example.story.entity.WorkflowAudit;
import com.example.story.repository.WorkflowAuditRepository;

import camundajar.impl.com.google.gson.Gson;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final WorkflowAuditRepository repository;

    public void log(String processId, String taskId, String taskName, String action, String actor, Object data) {

        WorkflowAudit audit = new WorkflowAudit();
        audit.setProcessInstanceId(processId);
        audit.setTaskId(taskId);
        audit.setTaskName(taskName);
        audit.setAction(action);
        audit.setActor(actor);
        audit.setData(new Gson().toJson(data));

        repository.save(audit);
    }
}
