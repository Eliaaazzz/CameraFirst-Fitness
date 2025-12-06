package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

  @EntityGraph(attributePaths = "allergens")
  Optional<UserProfile> findByUserId(UUID userId);
}

