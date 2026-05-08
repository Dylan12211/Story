package com.example.story.dto.request;

import java.time.LocalDate;

public record ProfileUpdateRequest(
        String firstName,
        String lastName,
        String email,
        LocalDate dob,
        String idNumber,
        String gender,
        String nationality,
        String placeOfOrigin,
        String placeOfResidence,
        LocalDate dateOfExpiry) {}
