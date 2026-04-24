package com.example.story.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.story.entity.User;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> existsByUsername(String username);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role")
    List<User> findByRole(@Param("role") String role);

    @Query(
            """
			SELECT DISTINCT u
			FROM User u
			LEFT JOIN u.profile p
			WHERE (:search IS NULL OR TRIM(:search) = ''
				OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(p.firstName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(p.lastName, '')) LIKE LOWER(CONCAT('%', :search, '%')))
			""")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query(
            """
			SELECT COUNT(DISTINCT u)
			FROM User u
			LEFT JOIN u.profile p
			WHERE (:search IS NULL OR TRIM(:search) = ''
				OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(p.firstName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
				OR LOWER(COALESCE(p.lastName, '')) LIKE LOWER(CONCAT('%', :search, '%')))
			""")
    long countUsers(@Param("search") String search);
}
