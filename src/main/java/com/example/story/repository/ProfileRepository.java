package com.example.story.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.story.entity.Profile;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, Long> {
    Optional<Profile> findByUser_Username(String username);

    Optional<Profile> findByUser_Email(String email);

    Optional<Profile> findByUser_Id(String userId);
}
