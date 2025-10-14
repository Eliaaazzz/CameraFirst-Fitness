package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.Feedback;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
  List<Feedback> findByUser_Id(UUID userId);
}

