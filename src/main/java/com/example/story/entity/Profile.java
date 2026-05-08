package com.example.story.entity;

import java.time.LocalDate;

import jakarta.persistence.*;

import lombok.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "profiles")
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    Long profileId;

    @Column(name = "username", nullable = false, unique = true)
    String username;

    @Column(name = "email", nullable = false)
    String email;

    @Column(name = "first_name")
    String firstName;

    @Column(name = "last_name")
    String lastName;

    LocalDate dob;

    @Column(name = "id_number", unique = true)
    String idNumber;

    @Column(name = "gender")
    String gender;

    @Column(name = "nationality")
    String nationality;

    @Column(name = "place_of_origin")
    String placeOfOrigin;

    @Column(name = "place_of_residence")
    String placeOfResidence;

    @Column(name = "date_of_expiry")
    LocalDate dateOfExpiry;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
