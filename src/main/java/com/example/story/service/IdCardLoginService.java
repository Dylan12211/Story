package com.example.story.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.story.dto.ocr.IdCardData;
import com.example.story.dto.response.UserResponse;
import com.example.story.entity.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdCardLoginService {

    private final OcrService ocrService;
    private final UserService userService;

    public UserResponse loginWithIdCard(MultipartFile idCardImage) {
        log.info("Processing ID card login");

        // Step 1: OCR to extract ID card data
        IdCardData idCardData = ocrService.recognizeIdCard(idCardImage);
        log.info(
                "OCR raw result: idNumber={}, name={}, dob={}, gender={}",
                idCardData.getIdNumber() != null ? idCardData.getIdNumber().getText() : "null",
                idCardData.getName() != null ? idCardData.getName().getText() : "null",
                idCardData.getDob() != null ? idCardData.getDob().getText() : "null",
                idCardData.getGender() != null ? idCardData.getGender().getText() : "null");

        // Step 2: Get ID number from OCR result
        String idNumber = extractIdNumber(idCardData);
        if (idNumber == null || idNumber.isBlank()) {
            throw new RuntimeException("Could not extract ID number from card");
        }

        log.info("Extracted ID number: {}", idNumber);

        // Step 3: Find user by ID number
        Optional<User> userOpt = userService.findByIdNumber(idNumber);

        User user = userOpt.orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại với số CCCD này"));
        log.info("User found with ID number: {}, username: {}", idNumber, user.getUsername());

        return userService.toUserResponse(user);
    }

    private String extractIdNumber(IdCardData idCardData) {
        if (idCardData.getIdNumber() != null && idCardData.getIdNumber().getText() != null) {
            String text = idCardData.getIdNumber().getText().trim();
            // Extract only digits from text (CCCD should be 9 or 12 digits)
            String digitsOnly = text.replaceAll("[^0-9]", "");
            if (digitsOnly.length() == 9 || digitsOnly.length() == 12) {
                return digitsOnly;
            }
            log.warn(
                    "Detected ID number '{}' does not match expected format (9 or 12 digits). Extracted digits: '{}'",
                    text,
                    digitsOnly);
        }
        return null;
    }
}
