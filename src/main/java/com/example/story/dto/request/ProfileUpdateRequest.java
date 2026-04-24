package com.example.story.dto.request;

import java.time.LocalDate;

public record ProfileUpdateRequest(String firstName, String lastName, String email, LocalDate dob) {}
