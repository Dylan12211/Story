package com.example.story.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.story.entity.User;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> existsByUsername(String username);

}
