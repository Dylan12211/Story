package com.example.story.service;

import java.util.*;

import jakarta.transaction.Transactional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.story.dto.identity.UserInfo;
import com.example.story.dto.identity.UserRole;
import com.example.story.dto.response.UserResponse;
import com.example.story.entity.Profile;
import com.example.story.entity.User;
import com.example.story.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // --- Find user by username ---
    public Optional<User> findByUserName(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByUserId(String userId) {
        return userRepository.findById(userId);
    }

    public List<UserInfo> getAllUserInfo() {
        return userRepository.findAll().stream()
                .map(user -> new UserInfo(
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getProfile() != null ? user.getProfile().getFirstName() : "",
                        user.getProfile() != null ? user.getProfile().getLastName() : "",
                        user.getProfile() != null ? user.getProfile().getUser().getStatus() : ""))
                .toList();
    }

    public List<UserRole> getAllUserRoles() {
        List<UserRole> rolesList = new ArrayList<>();
        for (User user : userRepository.findAll()) {
            for (String role : user.getRoles()) { // roles là List<String>
                rolesList.add(new UserRole(user.getId(), user.getUsername(), role));
            }
        }
        return rolesList;
    }

    // --- Sync user from external source (Keycloak webhook or event) ---
    @Transactional
    public void syncUser(Map<String, Object> body) {
        String username = (String) body.get("username");
        String email = (String) body.get("email");
        String firstName = (String) body.get("firstName");
        String lastName = (String) body.get("lastName");

        if (username == null || email == null) {
            log.warn("Cannot sync user: username or email missing");
            return;
        }

        if (userRepository.findByUsername(username).isPresent()) {
            log.info("User {} already exists, skipping sync", username);
            return;
        }

        // --- Create User and Profile ---
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);

        Profile profile = new Profile();
        profile.setFirstName(firstName);
        profile.setLastName(lastName);
        profile.setUser(user);

        user.setProfile(profile);
        userRepository.save(user);
    }

    // --- Create new user ---
    @Transactional
    public User createUser(String username, String email, String password) {
        if (username == null || email == null || password == null) {
            throw new IllegalArgumentException("username, email and password must not be null");
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("User already exists: " + username);
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRoles(new HashSet<>(Set.of("USER")));

        userRepository.save(user);

        return user;
    }

    // --- Update user email ---
    @Transactional
    public User updateUser(String username, String email) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        if (email != null) {
            user.setEmail(email);
        }
        return userRepository.save(user);
    }

    // --- Delete user ---
    @Transactional
    public boolean deleteUser(String username) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        userRepository.delete(user);
        log.info("Deleted user {}", username);
        return true;
    }

    // --- Update password ---
    @Transactional
    public boolean updatePassword(String username, String rawPassword) {
        if (rawPassword == null) {
            throw new IllegalArgumentException("Password must not be null");
        }
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
        log.info("Password updated for user {}", username);
        return true;
    }

    // --- Validate user login ---
    public boolean validateUser(String username, String rawPassword) {
        return userRepository
                .findByUsername(username)
                .map(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .orElse(false);
    }

    // --- Get all users ---
    public List<User> getAll() {
        return userRepository.findAll();
    }

    // --- Get user by ID ---
    public User getById(String id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found with ID: " + id));
    }

    public List<User> getUsersWithRole(String roleName) {
        return userRepository.findByRole(roleName);
    }

    public String getEmailByUsername(String username) {
        return userRepository
                .findByUsername(username)
                .map(User::getEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Transactional
    public void assignRole(String username, String role) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getRoles() == null) {
            user.setRoles(new HashSet<>());
        }

        user.getRoles().add(role);
        userRepository.save(user);
    }

    // --- Update user attributes ---
    @Transactional
    public boolean updateAttributes(String username, Map<String, String> attributes) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getProfile() == null) {
            user.setProfile(new Profile());
            user.getProfile().setUser(user);
        }

        Profile profile = user.getProfile();
        if (attributes.containsKey("firstName")) {
            profile.setFirstName(attributes.get("firstName"));
        }
        if (attributes.containsKey("lastName")) {
            profile.setLastName(attributes.get("lastName"));
        }
        if (attributes.containsKey("email")) {
            user.setEmail(attributes.get("email"));
        }

        userRepository.save(user);
        return true;
    }

    // --- Get user roles ---
    public Set<String> getUserRoles(String username) {
        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return user.getRoles() != null ? user.getRoles() : new HashSet<>();
    }

    public UserResponse findByEmail(String email) {
        return userRepository.findByEmail(email).map(this::toUserResponse).orElse(null);
    }

    public List<UserResponse> searchUsers(String search, int first, int max) {
        Pageable pageable = PageRequest.of(Math.max(first, 0) / Math.max(max, 1), Math.max(max, 1));
        return userRepository.searchUsers(search, pageable).stream()
                .map(this::toUserResponse)
                .toList();
    }

    public long countUsers(String search) {
        return userRepository.countUsers(search);
    }

    public List<UserResponse> findByAttribute(String attributeName, String attributeValue) {
        if (attributeValue == null || attributeValue.isBlank()) {
            return List.of();
        }

        return switch (attributeName) {
            case "username" -> userRepository.findByUsername(attributeValue).map(this::toUserResponse).stream()
                    .toList();
            case "email" -> userRepository.findByEmail(attributeValue).map(this::toUserResponse).stream()
                    .toList();
            case "firstName", "lastName" -> userRepository.searchUsers(attributeValue, PageRequest.of(0, 50)).stream()
                    .filter(user -> {
                        Profile profile = user.getProfile();
                        if (profile == null) {
                            return false;
                        }
                        String candidate =
                                "firstName".equals(attributeName) ? profile.getFirstName() : profile.getLastName();
                        return attributeValue.equalsIgnoreCase(candidate);
                    })
                    .map(this::toUserResponse)
                    .toList();
            default -> List.of();
        };
    }

    public UserResponse toUserResponse(User user) {
        Profile profile = user.getProfile();
        String firstName = profile != null ? profile.getFirstName() : null;
        String lastName = profile != null ? profile.getLastName() : null;

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                firstName,
                lastName,
                user.getEmail() != null && !user.getEmail().isBlank(),
                user.getRoles());
    }
}
