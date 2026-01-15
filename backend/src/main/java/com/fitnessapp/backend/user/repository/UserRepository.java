package com.fitnessapp.backend.user.repository;

import com.fitnessapp.backend.user.entity.User;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  /**
   * Find user by ID with pessimistic write lock (SELECT ... FOR UPDATE).
   * Use this for streak updates to prevent race conditions when user rapidly clicks "Post".
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT u FROM User u WHERE u.id = :userId")
  Optional<User> findByIdForUpdate(@Param("userId") UUID userId);
}

