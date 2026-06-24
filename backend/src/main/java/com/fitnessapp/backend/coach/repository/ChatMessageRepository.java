package com.fitnessapp.backend.coach.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import com.fitnessapp.backend.coach.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /** Most-recent N turns (newest first) — used to build bounded short-term memory for the agent. */
    List<ChatMessage> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Limit limit);
}
