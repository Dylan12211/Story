package com.example.story.controller;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.example.story.dto.ApiResponse;
import com.example.story.dto.request.ProfileUpdateRequest;
import com.example.story.dto.request.RegistrationRequest;
import com.example.story.dto.response.ProfileResponse;
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
}
