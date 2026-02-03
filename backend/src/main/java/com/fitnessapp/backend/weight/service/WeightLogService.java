package com.fitnessapp.backend.weight.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.weight.dto.WeightLogRequest;
import com.fitnessapp.backend.weight.dto.WeightLogResponse;
import com.fitnessapp.backend.weight.dto.WeightStatsResponse;
import com.fitnessapp.backend.weight.entity.WeightLog;
import com.fitnessapp.backend.weight.repository.WeightLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeightLogService {

    private final WeightLogRepository weightLogRepository;
    private final UserProfileRepository userProfileRepository;

    /**
     * Log a new weight entry. If an entry already exists for the same date, it will be updated.
     */
    @Transactional
    public WeightLogResponse logWeight(UUID userId, WeightLogRequest request) {
        LocalDate logDate = request.logDate() != null ? request.logDate() : LocalDate.now();

        // Check if entry already exists for this date (upsert behavior)
        WeightLog weightLog = weightLogRepository.findByUserIdAndLogDate(userId, logDate)
            .orElseGet(() -> WeightLog.builder()
                .userId(userId)
                .logDate(logDate)
                .build());

        // Update fields
        weightLog.setWeightKg(request.weightKg());
        weightLog.setBodyFatPercentage(request.bodyFatPercentage());
        weightLog.setMuscleMassKg(request.muscleMassKg());
        weightLog.setNote(request.note());

        WeightLog saved = weightLogRepository.save(weightLog);
        log.info("Weight logged for user {}: {} kg on {}", userId, request.weightKg(), logDate);

        // Update user profile with latest weight and BMI
        updateUserProfileWeight(userId, request.weightKg(), request.bodyFatPercentage());

        return WeightLogResponse.from(saved);
    }

    /**
     * Get weight history for a user within a date range.
     */
    @Transactional(readOnly = true)
    public List<WeightLogResponse> getWeightHistory(UUID userId, LocalDate startDate, LocalDate endDate) {
        return weightLogRepository.findByUserIdAndDateRange(userId, startDate, endDate)
            .stream()
            .map(WeightLogResponse::from)
            .toList();
    }

    /**
     * Get recent weight logs (last N entries).
     */
    @Transactional(readOnly = true)
    public List<WeightLogResponse> getRecentWeightLogs(UUID userId, int limit) {
        return weightLogRepository.findRecentByUserId(userId, limit)
            .stream()
            .map(WeightLogResponse::from)
            .toList();
    }

    /**
     * Get comprehensive weight statistics and trends.
     */
    @Transactional(readOnly = true)
    public WeightStatsResponse getWeightStats(UUID userId, int historyDays) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(historyDays);

        List<WeightLog> history = weightLogRepository.findByUserIdAndDateRange(userId, startDate, endDate);

        if (history.isEmpty()) {
            return WeightStatsResponse.empty();
        }

        // Get user profile for target weight and height
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);

        // Current weight is the most recent log
        WeightLog latestLog = history.get(0);
        BigDecimal currentWeight = latestLog.getWeightKg();

        // Start weight is the oldest log in the range
        WeightLog oldestLog = history.get(history.size() - 1);
        BigDecimal startWeight = oldestLog.getWeightKg();

        // Calculate change
        BigDecimal weightChange = currentWeight.subtract(startWeight);
        BigDecimal weightChangePercent = startWeight.compareTo(BigDecimal.ZERO) != 0
            ? weightChange.divide(startWeight, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
            : BigDecimal.ZERO;

        // Calculate BMI if height is available
        BigDecimal bmi = null;
        if (profile != null && profile.getHeightCm() != null && profile.getHeightCm() > 0) {
            BigDecimal heightM = BigDecimal.valueOf(profile.getHeightCm()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            bmi = currentWeight.divide(heightM.multiply(heightM), 2, RoundingMode.HALF_UP);
        }

        // Determine trend
        String trend = determineTrend(weightChange);

        // Get target weight from profile's fitness goal
        BigDecimal targetWeight = profile != null ? profile.getWeightKg() : null;
        FitnessGoal goal = profile != null ? profile.getFitnessGoal() : null;

        // Generate progress message
        String progressMessage = generateProgressMessage(currentWeight, targetWeight, weightChange, goal);

        return new WeightStatsResponse(
            currentWeight,
            targetWeight,
            startWeight,
            weightChange.setScale(2, RoundingMode.HALF_UP),
            weightChangePercent.setScale(1, RoundingMode.HALF_UP),
            bmi,
            latestLog.getLogDate(),
            history.size(),
            trend,
            progressMessage,
            history.stream().map(WeightLogResponse::from).toList()
        );
    }

    /**
     * Delete a weight log entry.
     */
    @Transactional
    public void deleteWeightLog(UUID userId, Long logId) {
        weightLogRepository.findById(logId)
            .filter(log -> log.getUserId().equals(userId))
            .ifPresent(weightLogRepository::delete);
    }

    private void updateUserProfileWeight(UUID userId, BigDecimal weight, BigDecimal bodyFatPercentage) {
        userProfileRepository.findByUserId(userId).ifPresent(profile -> {
            profile.setWeightKg(weight);
            if (bodyFatPercentage != null) {
                profile.setBodyFatPercentage(bodyFatPercentage);
            }

            // Recalculate BMI if height is available
            if (profile.getHeightCm() != null && profile.getHeightCm() > 0) {
                BigDecimal heightM = BigDecimal.valueOf(profile.getHeightCm())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal bmi = weight.divide(heightM.multiply(heightM), 2, RoundingMode.HALF_UP);
                profile.setBmi(bmi);
            }

            userProfileRepository.save(profile);
            log.info("Updated user profile weight for user {}: {} kg, BMI: {}",
                userId, weight, profile.getBmi());
        });
    }

    private String determineTrend(BigDecimal change) {
        if (change.abs().compareTo(BigDecimal.valueOf(0.5)) < 0) {
            return "stable";
        }
        return change.compareTo(BigDecimal.ZERO) > 0 ? "gaining" : "losing";
    }

    private String generateProgressMessage(BigDecimal current, BigDecimal target,
                                          BigDecimal change, FitnessGoal goal) {
        if (target == null || goal == null) {
            if (change.compareTo(BigDecimal.ZERO) > 0) {
                return String.format("You've gained %.1f kg. Keep tracking!", change.abs());
            } else if (change.compareTo(BigDecimal.ZERO) < 0) {
                return String.format("You've lost %.1f kg. Great progress!", change.abs());
            }
            return "Your weight is stable. Keep it up!";
        }

        BigDecimal remaining = target.subtract(current).abs();

        return switch (goal) {
            case LOSE_WEIGHT -> {
                if (change.compareTo(BigDecimal.ZERO) < 0) {
                    yield String.format("Great progress! %.1f kg lost, %.1f kg to go.",
                        change.abs(), remaining);
                }
                yield String.format("%.1f kg to your goal. Stay focused!", remaining);
            }
            case GAIN_MUSCLE, STRENGTH -> {
                if (change.compareTo(BigDecimal.ZERO) > 0) {
                    yield String.format("Gaining well! +%.1f kg, %.1f kg to target.",
                        change.abs(), remaining);
                }
                yield String.format("%.1f kg more to reach your muscle goal.", remaining);
            }
            case MAINTAIN -> {
                if (change.abs().compareTo(BigDecimal.valueOf(1)) < 0) {
                    yield "Perfect! You're maintaining your weight well.";
                }
                yield "Weight fluctuation detected. Monitor your intake.";
            }
        };
    }
}
