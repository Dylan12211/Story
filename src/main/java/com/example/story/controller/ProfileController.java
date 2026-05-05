package com.example.story.controller;

import java.time.LocalDate;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.story.dto.ApiResponse;
import com.example.story.dto.ocr.IdCardData;
import com.example.story.dto.request.ProfileUpdateRequest;
import com.example.story.dto.request.RegistrationRequest;
import com.example.story.dto.response.IdCardProfileResponse;
import com.example.story.dto.response.ProfileResponse;
import com.example.story.service.OcrService;
import com.example.story.service.ProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProfileController {

    ProfileService profileService;
    OcrService ocrService;

    // --- Đăng ký user ---
    @PostMapping("/register")
    ApiResponse<ProfileResponse> register(@RequestBody @Valid RegistrationRequest request) {
        return ApiResponse.<ProfileResponse>builder()
                .result(profileService.register(request))
                .build();
    }

    // --- User lấy profile của chính mình ---
    @GetMapping("/profile/me")
    public ApiResponse<ProfileResponse> getMyProfile() {
        return ApiResponse.<ProfileResponse>builder()
                .result(profileService.getMyProfile())
                .build();
    }

    @PutMapping("/profile/me")
    public ApiResponse<ProfileResponse> updateMyProfile(@RequestBody @Valid ProfileUpdateRequest request) {
        return ApiResponse.<ProfileResponse>builder()
                .result(profileService.updateMyProfile(request))
                .build();
    }

    @PostMapping("/profile/me/id-card/scan")
    public ApiResponse<IdCardProfileResponse> scanIdCard(@RequestParam("idCardImage") MultipartFile idCardImage) {
        IdCardData idCardData = ocrService.recognizeIdCard(idCardImage);
        return ApiResponse.<IdCardProfileResponse>builder()
                .result(toIdCardProfileResponse(idCardData))
                .build();
    }

    private IdCardProfileResponse toIdCardProfileResponse(IdCardData idCardData) {
        String fullName = text(idCardData.getName());
        String firstName = null;
        String lastName = null;
        if (fullName != null && !fullName.isBlank()) {
            String[] nameParts = fullName.trim().split("\\s+");
            lastName = nameParts[nameParts.length - 1];
            firstName = String.join(" ", java.util.Arrays.copyOfRange(nameParts, 0, nameParts.length - 1));
        }

        return IdCardProfileResponse.builder()
                .idNumber(normalizeIdNumber(text(idCardData.getIdNumber())))
                .firstName(firstName)
                .lastName(lastName)
                .dob(parseDate(text(idCardData.getDob())))
                .gender(text(idCardData.getGender()))
                .nationality(text(idCardData.getNationality()))
                .placeOfOrigin(text(idCardData.getPlaceOfOrigin()))
                .placeOfResidence(text(idCardData.getPlaceOfResidence()))
                .dateOfExpiry(parseDate(text(idCardData.getDateOfExpiry())))
                .build();
    }

    private String text(IdCardData.FieldData fieldData) {
        if (fieldData == null || fieldData.getText() == null) {
            return null;
        }
        String value = fieldData.getText().trim();
        return value.isBlank() ? null : value;
    }

    private String normalizeIdNumber(String idNumber) {
        if (idNumber == null) {
            return null;
        }
        String normalized = idNumber.replaceAll("[^0-9]", "");
        return normalized.isBlank() ? idNumber : normalized;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }

        String cleaned = dateStr.replaceAll("[^0-9/]", "").trim();
        String[] parts = cleaned.split("/");
        if (parts.length != 3) {
            return null;
        }

        try {
            int day = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int year = Integer.parseInt(parts[2]);
            if (year < 100) {
                year += year < 50 ? 2000 : 1900;
            }

            return LocalDate.of(year, month, day);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
