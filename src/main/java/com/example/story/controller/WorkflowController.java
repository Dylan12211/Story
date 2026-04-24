package com.example.story.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.story.service.WorkflowService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    // START PROCESS
    @PostMapping("/start")
    public String start(@RequestBody Map<String, Object> req, Authentication authentication) {
        Map<String, Object> payload = new HashMap<>(req);
        payload.put("createdBy", authentication.getName());
        return workflowService.startProcess(payload);
    }

    // GET TASKS
    @GetMapping("/tasks")
    public List<Map<String, Object>> getTasks(
            @RequestParam(required = false) String assignee, @RequestParam(required = false) String group) {
        return workflowService.getTasks(assignee, group);
    }

    // COMPLETE TASK
    @PostMapping("/tasks/{taskId}/complete")
    public String complete(@PathVariable String taskId, @RequestBody Map<String, Object> req) {
        return workflowService.completeTask(taskId, req);
    }

    // GET TASK DETAIL
    @GetMapping("/tasks/{taskId}")
    public Map<String, Object> detail(@PathVariable String taskId) {
        return workflowService.getTaskDetail(taskId);
    }

    // CLAIM TASK
    @PostMapping("/tasks/{taskId}/claim")
    public String claim(@PathVariable String taskId) {
        return workflowService.claimTask(taskId);
    }
}
