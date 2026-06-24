package com.fitnessapp.backend.coach.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fitnessapp.backend.coach.entity.ChatSession;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    /** Scope a session to its owner — prevents reading another user's conversation (IDOR-safe). */
    Optional<ChatSession> findByIdAndUserId(UUID id, UUID userId);
}
