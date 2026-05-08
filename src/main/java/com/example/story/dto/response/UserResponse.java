package com.example.story.dto.response;

import java.time.LocalDate;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private Boolean emailVerified;
    private Set<String> roles;

    // CCCD Information
    private String idNumber;
    private LocalDate dob;
    private String gender;
    private String nationality;
    private String placeOfOrigin;
    private String placeOfResidence;
    private LocalDate dateOfExpiry;
}
