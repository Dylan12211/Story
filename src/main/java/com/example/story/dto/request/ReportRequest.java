package com.example.story.dto.request;

import java.util.List;

import lombok.Data;

@Data
public class ReportRequest {
    private List<String> columns;

    public List<String> getColumns() {
        return columns;
    }

    public void setColumns(List<String> columns) {
        this.columns = columns;
    }
}
