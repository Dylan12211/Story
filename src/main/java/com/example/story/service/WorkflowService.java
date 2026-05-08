package com.example.story.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.task.IdentityLink;
import org.camunda.bpm.engine.task.Task;
import org.camunda.bpm.engine.task.TaskQuery;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.example.story.kafka.StoryProducer;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final AuditService auditService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final StoryProducer storyProducer;

    // GET CURRENT USER
    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("User chua dang nhap");
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            String preferredUsername = jwt.getClaim("preferred_username");
            if (preferredUsername != null && !preferredUsername.isBlank()) {
                return preferredUsername;
            }
        }

        return auth.getName();
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean hasTaskAccess(Task task, String username) {
        if (task == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        if (username.equals(task.getAssignee())) {
            return true;
        }

        List<IdentityLink> identityLinks = taskService.getIdentityLinksForTask(task.getId());

        boolean isCandidateUser = identityLinks.stream().anyMatch(link -> username.equals(link.getUserId()));

        if (isCandidateUser) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        return identityLinks.stream()
                .map(IdentityLink::getGroupId)
                .filter(groupId -> groupId != null && !groupId.isBlank())
                .anyMatch(groupId -> auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals(groupId)));
    }

    // START PROCESS
    public String startProcess(Map<String, Object> request) {
        String username = getCurrentUser();
        String email = userService.getEmailByUsername(username);

        Map<String, Object> variables = new HashMap<>();
        variables.put("author", username);
        variables.put("title", request.get("title"));
        variables.put("content", request.get("content"));
        variables.put("authorEmail", email);
        variables.put("approved", false);

        runtimeService.startProcessInstanceByKey("Process_1fcsuqq", variables);

        // Gửi notification tới /topic/tasks để frontend reload
        notificationService.broadcastTaskUpdate(
                "TASK_CREATED", "New Task Created", "A new story has been submitted for review", null, null, username);

        notificationService.notifyAdmins(
                "TASK_CREATED", "New Task Created", "A new story has been submitted for review", null, null);
        auditService.log(null, null, "START_PROCESS", "START", username, request);
        return "Process started";
    }

    // GET TASKS
    public List<Map<String, Object>> getTasks(String assignee, String group) {
        String username = getCurrentUser();

        TaskQuery query = taskService.createTaskQuery().active();

        if (isAdmin()) {
            List<Task> candidateTasks = taskService
                    .createTaskQuery()
                    .active()
                    .taskCandidateGroup("ROLE_ADMIN")
                    .list();

            List<Task> assignedTasks = taskService
                    .createTaskQuery()
                    .active()
                    .taskAssignee(username)
                    .list();

            return java.util.stream.Stream.concat(candidateTasks.stream(), assignedTasks.stream())
                    .collect(java.util.stream.Collectors.toMap(Task::getId, task -> task, (left, right) -> left))
                    .values()
                    .stream()
                    .map(task -> {
                        Map<String, Object> t = new HashMap<>();
                        t.put("id", task.getId());
                        t.put("name", task.getName());
                        t.put("key", task.getTaskDefinitionKey());
                        t.put("assignee", task.getAssignee());

                        // Status dựa trên task key
                        String taskKey = task.getTaskDefinitionKey();
                        String status;
                        if ("repairStory".equals(taskKey)) {
                            status = task.getAssignee() != null ? "WAITING_AUTHOR_REPAIR" : "PENDING_AUTHOR";
                        } else if ("adminReview".equals(taskKey)) {
                            status = task.getAssignee() != null ? "WAITING_ADMIN_REVIEW" : "PENDING_ADMIN";
                        } else {
                            status = task.getAssignee() != null ? "IN_PROGRESS" : "PENDING";
                        }
                        t.put("status", status);

                        // Add variables for title and author
                        Map<String, Object> variables = taskService.getVariables(task.getId());
                        System.out.println("Task " + task.getId() + " variables: " + variables);
                        t.put("variables", variables);
                        return t;
                    })
                    .toList();
        } else {
            query.taskAssignee(username);
        }

        return query.list().stream()
                .map(task -> {
                    Map<String, Object> t = new HashMap<>();
                    t.put("id", task.getId());
                    t.put("name", task.getName());
                    t.put("key", task.getTaskDefinitionKey());
                    t.put("assignee", task.getAssignee());

                    // Status dựa trên task key
                    String taskKey = task.getTaskDefinitionKey();
                    String status;
                    if ("repairStory".equals(taskKey)) {
                        status = task.getAssignee() != null ? "WAITING_AUTHOR_REPAIR" : "PENDING_AUTHOR";
                    } else if ("adminReview".equals(taskKey)) {
                        status = task.getAssignee() != null ? "WAITING_ADMIN_REVIEW" : "PENDING_ADMIN";
                    } else {
                        status = task.getAssignee() != null ? "IN_PROGRESS" : "PENDING";
                    }
                    t.put("status", status);

                    // Add variables for title and author
                    Map<String, Object> variables = taskService.getVariables(task.getId());
                    System.out.println("Task " + task.getId() + " variables: " + variables);
                    t.put("variables", variables);
                    return t;
                })
                .toList();
    }

    // COMPLETE TASK
    public String completeTask(String taskId, Map<String, Object> vars) {
        String userId = getCurrentUser();

        Task task = taskService.createTaskQuery().taskId(taskId).singleResult();

        if (task == null) {
            throw new RuntimeException("Task khong ton tai");
        }

        if (task.getAssignee() == null) {
            throw new RuntimeException("Task chua duoc claim");
        }

        if (!userId.equals(task.getAssignee())) {
            throw new RuntimeException("Khong phai nguoi duoc assign");
        }

        // // Gửi notification tới /topic/tasks để frontend reload
        // notificationService.broadcastTaskUpdate(
        //         "TASK_COMPLETED",
        //         "Task Completed",
        //         "Task has been completed successfully",
        //         taskId,
        //         task.getTaskDefinitionKey(),
        //         userId
        // );

        Object approved = vars.get("approved");
        if (approved instanceof String) {
            vars.put("approved", Boolean.parseBoolean((String) approved));
        }

        taskService.complete(taskId, vars);

        // Gửi Kafka event
        String title = (String) vars.get("title");
        Long storyId = (Long) vars.get("storyId");
        storyProducer.publishTaskCompleted(storyId, title, taskId, task.getTaskDefinitionKey(), userId);

        return "Complete thanh cong";
    }

    // GET TASK DETAIL
    public Map<String, Object> getTaskDetail(String taskId) {
        String username = getCurrentUser();

        Task task = taskService.createTaskQuery().taskId(taskId).singleResult();

        if (task == null) {
            System.out.println("Task " + taskId + " không tồn tại");
            return null;
        }

        if (!hasTaskAccess(task, username)) {
            System.out.println("User " + username + " không có quyền xem task " + taskId);
            return null;
        }

        Map<String, Object> res = new HashMap<>();
        res.put("id", task.getId());
        res.put("name", task.getName());
        res.put("taskDefinitionKey", task.getTaskDefinitionKey());
        res.put("key", task.getTaskDefinitionKey());
        res.put("assignee", task.getAssignee());
        res.put("variables", taskService.getVariables(taskId));

        return res;
    }

    // CLAIM TASK
    public String claimTask(String taskId) {
        String userId = getCurrentUser();

        Task task = taskService.createTaskQuery().taskId(taskId).singleResult();

        if (task == null) {
            throw new RuntimeException("Task khong ton tai");
        }

        boolean hasPermission = taskService.getIdentityLinksForTask(taskId).stream()
                .anyMatch(link -> {
                    String groupId = link.getGroupId();
                    String candidateUser = link.getUserId();

                    if (userId.equals(candidateUser)) {
                        return true;
                    }

                    return groupId != null
                            && SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals(groupId));
                });

        if (!hasPermission) {
            throw new RuntimeException("Ban khong co quyen claim task nay");
        }

        // // Gửi notification tới /topic/tasks để frontend reload
        // notificationService.broadcastTaskUpdate(
        //         "TASK_CLAIMED",
        //         "Task Claimed",
        //         "You have claimed this task",
        //         taskId,
        //         task.getTaskDefinitionKey(),
        //         userId
        // );

        taskService.claim(taskId, userId);

        // Gửi Kafka event
        Map<String, Object> vars = taskService.getVariables(taskId);
        String title = (String) vars.get("title");
        Long storyId = (Long) vars.get("storyId");
        storyProducer.publishTaskClaimed(storyId, title, taskId, task.getTaskDefinitionKey(), userId);

        return "Claim thanh cong";
    }
}
