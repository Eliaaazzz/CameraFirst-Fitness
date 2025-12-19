package com.fitnessapp.backend.goals.service;

import com.fitnessapp.backend.goals.dto.SaveGoalRequest;
import com.fitnessapp.backend.goals.dto.UserGoalResponse;
import com.fitnessapp.backend.goals.entity.UserGoal;
import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserGoalService {

    private final UserGoalRepository userGoalRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    /**
     * Save a new goal for a user (deactivates any existing active goal)
     */
    @Transactional
    public UserGoalResponse saveGoal(SaveGoalRequest request) {
        UUID userId = request.getUserId();
        log.info("Saving goal for user: {}, type: {}", userId, request.getGoalType());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        // Deactivate existing active goals
        userGoalRepository.deactivateAllByUserId(userId);

        // Build milestones list
        List<UserGoal.MilestoneItem> milestones = null;
        if (request.getMilestonesChecklist() != null) {
            milestones = request.getMilestonesChecklist().stream()
                    .map(m -> UserGoal.MilestoneItem.builder()
                            .id(m.getId())
                            .title(m.getTitle())
                            .frequency(m.getFrequency())
                            .metric(m.getMetric())
                            .build())
                    .collect(Collectors.toList());
        }

        // Create new goal
        UserGoal goal = UserGoal.builder()
                .user(user)
                .goalType(request.getGoalType())
                .dailyCaloriesMin(request.getDailyCalories().getMin())
                .dailyCaloriesTarget(request.getDailyCalories().getTarget())
                .dailyCaloriesMax(request.getDailyCalories().getMax())
                .dailyCaloriesRationale(request.getDailyCalories().getRationale())
                .proteinG(request.getMacrosGrams().getProteinG())
                .carbsG(request.getMacrosGrams().getCarbsG())
                .fatG(request.getMacrosGrams().getFatG())
                .macrosNotes(request.getMacrosGrams().getNotes())
                .sugarLimitG(request.getSugarLimitGPerDay() != null ? request.getSugarLimitGPerDay() : 25)
                .fiberTargetG(request.getFiberTargetGPerDay() != null ? request.getFiberTargetGPerDay() : 25)
                .cardioMinutesPerWeek(getOrDefault(request.getWeeklyActivityPlan(),
                        p -> p.getCardioMinutesPerWeek(), 150))
                .strengthSessionsPerWeek(getOrDefault(request.getWeeklyActivityPlan(),
                        p -> p.getStrengthSessionsPerWeek(), 3))
                .stepsPerDayTarget(getOrDefault(request.getWeeklyActivityPlan(),
                        p -> p.getStepsPerDayTarget(), 8000))
                .activityNotes(request.getWeeklyActivityPlan() != null ?
                        request.getWeeklyActivityPlan().getNotes() : null)
                .milestonesChecklist(milestones)
                .safetyNote(request.getSafetyNote())
                .inputSex(request.getSex())
                .inputHeightCm(request.getHeightCm())
                .inputWeightKg(request.getWeightKg())
                .inputAge(request.getAge())
                .inputActivityLevel(request.getActivityLevel())
                .isActive(true)
                .build();

        UserGoal saved = userGoalRepository.save(goal);
        log.info("Goal saved with id: {}", saved.getId());

        // Also update UserProfile with the core nutrition targets for backwards compatibility
        updateUserProfileTargets(userId, request);

        return UserGoalResponse.fromEntity(saved);
    }

    /**
     * Get the active goal for a user
     */
    @Transactional(readOnly = true)
    public Optional<UserGoalResponse> getActiveGoal(UUID userId) {
        return userGoalRepository.findActiveByUserId(userId)
                .map(UserGoalResponse::fromEntity);
    }

    /**
     * Get all goals for a user (history)
     */
    @Transactional(readOnly = true)
    public List<UserGoalResponse> getGoalHistory(UUID userId) {
        return userGoalRepository.findAllByUserId(userId).stream()
                .map(UserGoalResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Check if user has an active goal
     */
    @Transactional(readOnly = true)
    public boolean hasActiveGoal(UUID userId) {
        return userGoalRepository.hasActiveGoal(userId);
    }

    /**
     * Delete a specific goal
     */
    @Transactional
    public void deleteGoal(UUID goalId) {
        userGoalRepository.deleteById(goalId);
        log.info("Goal deleted: {}", goalId);
    }

    /**
     * Delete all goals for a user
     */
    @Transactional
    public void deleteAllGoals(UUID userId) {
        userGoalRepository.deleteAllByUserId(userId);
        log.info("All goals deleted for user: {}", userId);
    }

    /**
     * Update UserProfile with core nutrition targets for backwards compatibility
     */
    private void updateUserProfileTargets(UUID userId, SaveGoalRequest request) {
        try {
            Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId);
            if (profileOpt.isPresent()) {
                UserProfile profile = profileOpt.get();
                profile.setDailyCalorieTarget(request.getDailyCalories().getTarget());
                profile.setDailyProteinTarget(request.getMacrosGrams().getProteinG());
                profile.setDailyCarbsTarget(request.getMacrosGrams().getCarbsG());
                profile.setDailyFatTarget(request.getMacrosGrams().getFatG());

                if (request.getHeightCm() != null) {
                    profile.setHeightCm(request.getHeightCm());
                }
                if (request.getWeightKg() != null) {
                    profile.setWeightKg(new java.math.BigDecimal(request.getWeightKg()));
                }

                userProfileRepository.save(profile);
                log.debug("UserProfile targets updated for user: {}", userId);
            }
        } catch (Exception e) {
            log.warn("Failed to update UserProfile targets: {}", e.getMessage());
            // Don't fail the main operation
        }
    }

    private <T, R> R getOrDefault(T obj, java.util.function.Function<T, R> getter, R defaultValue) {
        if (obj == null) {
            return defaultValue;
        }
        R value = getter.apply(obj);
        return value != null ? value : defaultValue;
    }
}
