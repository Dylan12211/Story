package com.example.story.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.example.story.entity.Story;
import com.example.story.repository.StoryRepository;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.task.Task;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.story.dto.identity.UserInfo;
import com.example.story.dto.identity.UserRole;

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;

@Service
public class ReportService {

    private final UserService userService;
    private final StoryRepository storyRepository;
    private final TaskService taskService;

    public ReportService(UserService userService, StoryRepository storyRepository, TaskService taskService) {
        this.userService = userService;
        this.storyRepository = storyRepository;
        this.taskService = taskService;
    }

    @Cacheable(value = "jasperReports", key = "'users:' + #type + ':' + #selectedColumns.hashCode()")
    public byte[] exportReport(String type, List<String> selectedColumns) throws Exception {
        List<UserInfo> userInfoList = userService.getAllUserInfo();
        List<UserRole> userRoleList = userService.getAllUserRoles();

        InputStream reportStream = getClass().getResourceAsStream("/Report/2_table.jrxml");
        JasperReport jasperReport = getCompiledReport(reportStream);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("SELECTED_COLUMNS", selectedColumns);
        parameters.put("USER_INFO_LIST", userInfoList);
        parameters.put("USER_ROLE_LIST", userRoleList);

        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());

        if ("pdf".equalsIgnoreCase(type)) {
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } else if ("xlsx".equalsIgnoreCase(type)) {
            JRXlsxExporter exporter = new JRXlsxExporter();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
            exporter.exportReport();
            return outputStream.toByteArray();
        } else {
            throw new IllegalArgumentException("Unsupported type: " + type);
        }
    }

    @Cacheable(value = "jasperReports", key = "'stories:' + #type + ':' + #selectedColumns.hashCode()")
    public byte[] exportStoryReport(String type, List<String> selectedColumns) throws Exception {
        List<Story> stories = storyRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        InputStream reportStream = getClass().getResourceAsStream("/Report/story_report.jrxml");
        JasperReport jasperReport = getCompiledReport(reportStream);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("STORY_LIST", stories);
        parameters.put("SELECTED_COLUMNS", selectedColumns);

        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());

        if ("pdf".equalsIgnoreCase(type)) {
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } else if ("xlsx".equalsIgnoreCase(type)) {
            JRXlsxExporter exporter = new JRXlsxExporter();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
            exporter.exportReport();
            return outputStream.toByteArray();
        }
        throw new IllegalArgumentException("Unsupported type");
    }

    @Cacheable(value = "jasperReports", key = "'tasks:' + #type + ':' + #selectedColumns.hashCode()")
    public byte[] exportTaskReport(String type, List<String> selectedColumns) throws Exception {
        List<Task> tasks = taskService.createTaskQuery().active().list();
        InputStream reportStream = getClass().getResourceAsStream("/Report/task_report.jrxml");
        JasperReport jasperReport = getCompiledReport(reportStream);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("TASK_LIST", tasks);
        parameters.put("SELECTED_COLUMNS", selectedColumns);

        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());

        if ("pdf".equalsIgnoreCase(type)) {
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } else if ("xlsx".equalsIgnoreCase(type)) {
            JRXlsxExporter exporter = new JRXlsxExporter();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
            exporter.exportReport();
            return outputStream.toByteArray();
        }
        throw new IllegalArgumentException("Unsupported type");
    }

    private JasperReport getCompiledReport(InputStream reportStream) throws JRException {
        return JasperCompileManager.compileReport(reportStream);
    }
}

//    public byte[] exportReportTest(String type, List<String> selectedColumns) throws Exception {
//        // Mock data 10k record
//        List<UserInfo> userInfoList = test.generateUserInfo(1000000);
//        List<UserRole> userRoleList = test.generateUserRole(1000000);
//        // Load JRXML
//        InputStream reportStream = getClass().getResourceAsStream("/Report/2_table.jrxml");
//        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
//
//        // Set parameters
//        Map<String, Object> parameters = new HashMap<>();
//        parameters.put("SELECTED_COLUMNS", selectedColumns);
//
//        // Truyền datasource cho table
//        parameters.put("USER_INFO_LIST", (userInfoList));
//        parameters.put("USER_ROLE_LIST", (userRoleList));
//
//        // Fill report
//        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());
//
//        if ("pdf".equalsIgnoreCase(type)) {
//            return JasperExportManager.exportReportToPdf(jasperPrint);
//        } else if ("xlsx".equalsIgnoreCase(type)) {
//            // Xuất Excel
//            JRXlsxExporter exporter = new JRXlsxExporter();
//            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
//
//            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
//            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
//            exporter.exportReport();
//
//            return outputStream.toByteArray();
//        } else {
//            throw new IllegalArgumentException("Unsupported type: " + type);
//        }
//    }

