package com.example.story.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.example.story.dto.ocr.OcrResponse;

@FeignClient(name = "ocrClient", url = "${ocr.service.url:http://localhost:8000}")
public interface OcrClient {

    @PostMapping(value = "/ocr/id-card", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    OcrResponse recognizeIdCard(@RequestPart("file") MultipartFile file);
}
