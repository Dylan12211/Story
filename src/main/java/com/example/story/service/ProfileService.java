package com.example.story.service;

import java.util.List;
import java.util.Set;

import jakarta.transaction.Transactional;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.example.story.dto.request.ProfileUpdateRequest;
import com.example.story.dto.request.RegistrationRequest;
import com.example.story.dto.response.ProfileResponse;
import com.example.story.entity.Profile;
import com.example.story.entity.User;
import com.example.story.mapper.ProfileMapper;
import com.example.story.repository.ProfileRepository;
import com.example.story.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProfileService {
    ProfileRepository profileRepository;
    ProfileMapper profileMapper;

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;

    public ProfileResponse getMyProfile() {

        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String email = jwt.getClaim("email");
        String username = jwt.getClaim("preferred_username");

        Profile profile = getOrCreateProfile(email, username);

        return profileMapper.toProfileResponse(profile);
    }

    public Profile getOrCreateProfile(String email, String username) {
        User user = userRepository.findByUsername(username).orElseGet(() -> {
            if (email != null && !email.isBlank()) {
                return userRepository
                        .findByEmail(email)
                        .orElseGet(() -> userRepository.save(User.builder()
                                .username(username)
                                .email(email)
                                .roles(Set.of("USER"))
                                .build()));
            }

            throw new RuntimeException(
                    "Cannot resolve profile because JWT does not contain an email for user " + username);
        });

        if ((user.getEmail() == null || user.getEmail().isBlank()) && email != null && !email.isBlank()) {
            user.setEmail(email);
            user = userRepository.save(user);
        }

        final User resolvedUser = user;
        return profileRepository.findByUser_Email(resolvedUser.getEmail()).orElseGet(() -> {
            Profile profile = resolvedUser.getProfile();
            if (profile != null) {
                if (profile.getEmail() == null || profile.getEmail().isBlank()) {
                    profile.setEmail(resolvedUser.getEmail());
                    profile.setUsername(resolvedUser.getUsername());
                    return profileRepository.save(profile);
                }
                return profile;
            }

            Profile newProfile = Profile.builder()
                    .user(resolvedUser)
                    .username(resolvedUser.getUsername())
                    .email(resolvedUser.getEmail())
                    .build();

            return profileRepository.save(newProfile);
        });
    }

    public ProfileResponse register(RegistrationRequest request) {
        String userId = java.util.UUID.randomUUID().toString();

        User user = User.builder()
                .id(userId)
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .roles(Set.of("USER"))
                .build();

        if (userRepository.findByUsername(request.getUsername()).isEmpty()) {
            user = userRepository.save(user);
        }

        var profile = profileMapper.toProfile(request);
        profile.setUser(user);
        profileRepository.save(profile);

        return profileMapper.toProfileResponse(profile);
    }

    private ProfileResponse mapToResponse(Profile profile) {
        return ProfileResponse.builder()
                .profileId(profile.getProfileId())
                .userId(profile.getUser() != null ? profile.getUser().getId() : null)
                .username(profile.getUsername())
                .email(profile.getEmail())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .dob(profile.getDob())
                .roles(
                        profile.getUser() != null
                                ? profile.getUser().getRoles().stream().toList()
                                : List.of())
                .build();
    }

    @Transactional
    public ProfileResponse updateMyProfile(ProfileUpdateRequest request) {

        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = jwt.getClaim("email");
        String username = jwt.getClaim("preferred_username");

        User user = userRepository.findByUsername(username).orElseGet(() -> userRepository
                .findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")));

        Profile profile = user.getProfile();

        if (profile == null) {
            profile = new Profile();
            profile.setUser(user);
            user.setProfile(profile);
        }

        if (request.firstName() != null) profile.setFirstName(request.firstName());
        if (request.lastName() != null) profile.setLastName(request.lastName());
        if (request.email() != null) user.setEmail(request.email());
        if (request.dob() != null) profile.setDob(request.dob());

        userRepository.save(user);

        return mapToResponse(profile);
    }
}
