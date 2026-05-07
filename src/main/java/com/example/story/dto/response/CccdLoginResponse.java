package com.example.story.dto.response;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO cho CCCD login flow
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CccdLoginResponse {

    private boolean success;
    private String message;

    // Token từ Keycloak (JSON string)
    private String token;

    // Thông tin user
    private CccdUser user;

    // OCR data từ CCCD
    private OcrData ocrData;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CccdUser {
        private String id;
        private String name;
        private String cccdNumber;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OcrData {
        private String id;
        private String name;
        private String dob;
        private String nationality;
        private String sex;
        private String address;
        private String issueDate;
    }

    /**
     * Builder method để tạo success response
     */
    public static CccdLoginResponse success(String token, UserResponse user, com.example.story.dto.ocr.IdCardData ocrData) {
        CccdLoginResponse.OcrData ocrDataDto = null;
        if (ocrData != null) {
            ocrDataDto = OcrData.builder()
                    .id(ocrData.getIdNumber() != null ? ocrData.getIdNumber().getText() : null)
                    .name(ocrData.getName() != null ? ocrData.getName().getText() : null)
                    .dob(ocrData.getDob() != null ? ocrData.getDob().getText() : null)
                    .nationality(ocrData.getNationality() != null ? ocrData.getNationality().getText() : null)
                    .sex(ocrData.getGender() != null ? ocrData.getGender().getText() : null)
                    .address(ocrData.getPlaceOfResidence() != null ? ocrData.getPlaceOfResidence().getText() : null)
                    .issueDate(ocrData.getDateOfExpiry() != null ? ocrData.getDateOfExpiry().getText() : null)
                    .build();
        }

        return CccdLoginResponse.builder()
                .success(true)
                .message("Đăng nhập CCCD thành công")
                .token(token)
                .user(CccdUser.builder()
                        .id(user.getUserId())
                        .name(user.getFirstName() + " " + user.getLastName())
                        .cccdNumber(user.getIdNumber())
                        .build())
                .ocrData(ocrDataDto)
                .build();
    }

    /**
     * Builder method để tạo error response
     */
    public static CccdLoginResponse error(String message) {
        return CccdLoginResponse.builder()
                .success(false)
                .message(message)
                .build();
    }
}
