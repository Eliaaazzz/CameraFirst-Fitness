package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.RetrievalResult;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RetrievalResultRepository extends JpaRepository<RetrievalResult, UUID> {
  List<RetrievalResult> findByQuery_IdOrderByRankAsc(UUID queryId);
}

