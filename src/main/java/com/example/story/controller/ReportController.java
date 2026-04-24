package com.example.story.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.web.bind.annotation.*;

import com.example.story.service.ReportService;
import com.example.story.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final UserService userService;
    private final ReportService reportService;

    @GetMapping("/users")
    public void exportUserReport(
            @RequestParam String type,
            @RequestParam(required = false) List<String> selectedColumns,
            HttpServletResponse response)
            throws Exception {

        if (selectedColumns == null || selectedColumns.isEmpty()) {
            selectedColumns = List.of("userId", "username", "email", "firstName", "lastName", "status");
        }

        byte[] file = reportService.exportReport(type, selectedColumns);

        if ("pdf".equalsIgnoreCase(type)) {
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename=UserReport.pdf");
        } else if ("xlsx".equalsIgnoreCase(type)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=UserReport.xlsx");
        } else {
            throw new IllegalArgumentException("Unsupported type: " + type);
        }
        response.getOutputStream().write(file);
    }

    @GetMapping("/stories")
    public void exportStoryReport(
            @RequestParam String type,
            @RequestParam(required = false) List<String> selectedColumns,
            HttpServletResponse response)
            throws Exception {

        if (selectedColumns == null || selectedColumns.isEmpty()) {
            selectedColumns = List.of("id", "title", "content", "status", "createdBy");
        }

        byte[] file = reportService.exportStoryReport(type, selectedColumns);

        if ("pdf".equalsIgnoreCase(type)) {
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename=StoryReport.pdf");
        } else if ("xlsx".equalsIgnoreCase(type)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=StoryReport.xlsx");
        } else {
            throw new IllegalArgumentException("Unsupported type: " + type);
        }
        response.getOutputStream().write(file);
    }

    @GetMapping("/tasks")
    public void exportTaskReport(
            @RequestParam String type,
            @RequestParam(required = false) List<String> selectedColumns,
            HttpServletResponse response)
            throws Exception {

        if (selectedColumns == null || selectedColumns.isEmpty()) {
            selectedColumns = List.of(
                    "id",
                    "name",
                    "description",
                    "assignee",
                    "createTime",
                    "dueDate",
                    "priority",
                    "taskDefinitionKey",
                    "processInstanceId");
        }

        byte[] file = reportService.exportTaskReport(type, selectedColumns);

        if ("pdf".equalsIgnoreCase(type)) {
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename=TaskReport.pdf");
        } else if ("xlsx".equalsIgnoreCase(type)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=TaskReport.xlsx");
        } else {
            throw new IllegalArgumentException("Unsupported type: " + type);
        }
        response.getOutputStream().write(file);
    }
}
