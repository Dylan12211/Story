package com.example.story.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.story.client.OcrClient;
import com.example.story.dto.ocr.IdCardData;
import com.example.story.dto.ocr.OcrResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OcrService {

    private final OcrClient ocrClient;

    public IdCardData recognizeIdCard(MultipartFile file) {
        log.info("Processing ID card OCR for file: {}", file.getOriginalFilename());

        try {
            OcrResponse response = ocrClient.recognizeIdCard(file);
            log.info(
                    "OCR response: success={}, hasData={}, error={}",
                    response.getSuccess(),
                    response.getData() != null,
                    response.getError());

            if (response.getData() != null) {
                log.info(
                        "OCR data fields: idNumber={}, name={}, dob={}",
                        response.getData().getIdNumber(),
                        response.getData().getName(),
                        response.getData().getDob(),
                        response.getData().getPlaceOfResidence(),
                        response.getData().getPlaceOfOrigin());
            }

            if (Boolean.TRUE.equals(response.getSuccess()) && response.getData() != null) {
                log.info("OCR successful for file: {}", file.getOriginalFilename());
                return response.getData();
            } else {
                log.error("OCR failed: {}", response.getError());
                throw new RuntimeException("OCR failed: " + response.getError());
            }
        } catch (Exception e) {
            log.error("Error calling OCR service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process ID card: " + e.getMessage(), e);
        }
    }
}
