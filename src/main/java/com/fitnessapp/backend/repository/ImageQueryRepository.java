package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.ImageQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageQueryRepository extends JpaRepository<ImageQuery, UUID> {
  List<ImageQuery> findByUser_Id(UUID userId);
}

