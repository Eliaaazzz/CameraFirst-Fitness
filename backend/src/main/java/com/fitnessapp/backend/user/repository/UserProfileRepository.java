package com.fitnessapp.backend.user.repository;

import com.fitnessapp.backend.user.entity.UserProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

  @EntityGraph(attributePaths = "allergens")
  Optional<UserProfile> findByUserId(UUID userId);
}

