package com.fitnessapp.backend.nutrition.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for meal history operations
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealHistoryService {

  private final MealLogRepository mealLogRepository;

  /**
   * Get paginated meal history for a user with optional date filtering
   * 
   * @param userId User ID
   * @param startDate Optional start date (inclusive)
   * @param endDate Optional end date (exclusive)
   * @param pageable Pagination parameters
   * @return Page of meal logs
   */
  public Page<MealLog> getMealHistory(
      UUID userId,
      LocalDate startDate,
      LocalDate endDate,
      Pageable pageable
  ) {
    log.info("Fetching meal history for user: {}, startDate: {}, endDate: {}, page: {}",
             userId, startDate, endDate, pageable.getPageNumber());

    // Convert LocalDate to OffsetDateTime (UTC)
    OffsetDateTime start = startDate != null
        ? startDate.atStartOfDay().atOffset(ZoneOffset.UTC)
        : null;

    OffsetDateTime end = endDate != null
        ? endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)
        : null;

    // Use different queries based on which parameters are provided
    // This avoids PostgreSQL type inference issues with nullable parameters
    Page<MealLog> result;
    if (start != null && end != null) {
      result = mealLogRepository.findByUserIdAndConsumedAtGreaterThanEqualAndConsumedAtLessThan(
          userId, start, end, pageable);
    } else if (start != null) {
      result = mealLogRepository.findByUserIdAndConsumedAtGreaterThanEqual(userId, start, pageable);
    } else if (end != null) {
      result = mealLogRepository.findByUserIdAndConsumedAtLessThan(userId, end, pageable);
    } else {
      result = mealLogRepository.findByUserId(userId, pageable);
    }

    log.info("Found {} meal records (total: {})",
             result.getNumberOfElements(), result.getTotalElements());

    return result;
  }
}
