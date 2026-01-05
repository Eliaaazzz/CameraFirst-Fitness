package com.fitnessapp.backend.retrieval;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkoutRetrievalService {

    private static final int DEFAULT_RESULT_LIMIT = 4;
    private static final int SEARCH_RESULT_LIMIT = 20;

    private final ExerciseVideoRepository exerciseVideoRepository;

    /**
     * Text-based workout search - searches exercise_videos table
     */
    public List<WorkoutCard> searchByText(String query, String category, Integer maxDuration) {
        if (query == null || query.trim().isEmpty()) {
            log.warn("Empty search query; returning empty list");
            return List.of();
        }

        log.info("Searching exercises: query={}, category={}", query, category);

        List<ExerciseVideo> results = exerciseVideoRepository.searchByKeyword(query.trim(), SEARCH_RESULT_LIMIT);

        // Apply category filter if provided
        if (category != null && !category.isEmpty()) {
            results = results.stream()
                    .filter(e -> e.getPrimaryCategory() != null && 
                            e.getPrimaryCategory().equalsIgnoreCase(category))
                    .collect(Collectors.toList());
        }

        return results.stream()
                .map(this::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Find workouts by category (body part)
     */
    public List<WorkoutCard> findWorkouts(String equipment, String level, int durationPreference) {
        String category = mapEquipmentToCategory(equipment);
        
        log.info("Finding exercises: equipment={}, mapped category={}", equipment, category);

        List<ExerciseVideo> results;
        if (category != null) {
            results = exerciseVideoRepository.findByCategory(category, DEFAULT_RESULT_LIMIT);
        } else {
            results = exerciseVideoRepository.findAllByOrderByExerciseNameAsc();
            if (results.size() > DEFAULT_RESULT_LIMIT) {
                results = results.subList(0, DEFAULT_RESULT_LIMIT);
            }
        }

        return selectDiverseWorkouts(results, DEFAULT_RESULT_LIMIT);
    }

    /**
     * Get all exercises by category
     */
    public List<WorkoutCard> getByCategory(String category, int limit) {
        List<ExerciseVideo> results = exerciseVideoRepository.findByCategory(category, limit);
        return results.stream()
                .map(this::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Get default workouts - one from each body part category for diverse display.
     * Returns up to 7 workouts covering: Chest, Back, Legs, Shoulders, Arms, Core, Glutes
     */
    public List<WorkoutCard> getDefaultWorkouts(int limit) {
        log.info("Getting default diverse workouts, limit={}", limit);

        List<ExerciseVideo> diverseVideos = exerciseVideoRepository.findOnePerCategory();

        return diverseVideos.stream()
                .limit(limit)
                .map(this::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Map common equipment/search terms to body part categories
     */
    private String mapEquipmentToCategory(String equipment) {
        if (equipment == null) return null;
        
        String lower = equipment.toLowerCase(Locale.ROOT);
        
        if (lower.contains("chest") || lower.contains("bench") || lower.contains("pec")) {
            return "Chest";
        }
        if (lower.contains("back") || lower.contains("pull") || lower.contains("row")) {
            return "Back";
        }
        if (lower.contains("leg") || lower.contains("squat") || lower.contains("lunge")) {
            return "Legs";
        }
        if (lower.contains("shoulder") || lower.contains("delt")) {
            return "Shoulders";
        }
        if (lower.contains("arm") || lower.contains("bicep") || lower.contains("tricep") || lower.contains("curl")) {
            return "Arms";
        }
        if (lower.contains("core") || lower.contains("ab") || lower.contains("plank")) {
            return "Core";
        }
        if (lower.contains("glute") || lower.contains("hip")) {
            return "Glutes";
        }
        
        return null;
    }

    private List<WorkoutCard> selectDiverseWorkouts(List<ExerciseVideo> videos, int desiredCount) {
        if (videos.isEmpty() || desiredCount <= 0) {
            return List.of();
        }

        List<WorkoutCard> selected = new ArrayList<>();
        Set<String> seenCategories = new HashSet<>();
        Set<String> addedIds = new HashSet<>();

        for (ExerciseVideo video : videos) {
            if (selected.size() >= desiredCount) {
                break;
            }
            String category = video.getPrimaryCategory();
            if (category != null) {
                String normalized = category.toLowerCase(Locale.ROOT);
                if (seenCategories.add(normalized)) {
                    addCard(selected, addedIds, video);
                }
            }
        }

        if (selected.size() < desiredCount) {
            for (ExerciseVideo video : videos) {
                if (selected.size() >= desiredCount) {
                    break;
                }
                addCard(selected, addedIds, video);
            }
        }

        return selected;
    }

    private void addCard(List<WorkoutCard> selected, Set<String> addedIds, ExerciseVideo video) {
        String uniqueId = video.getYoutubeId();
        if (!StringUtils.hasText(uniqueId) || addedIds.contains(uniqueId)) {
            return;
        }
        selected.add(toCard(video));
        addedIds.add(uniqueId);
    }

    private WorkoutCard toCard(ExerciseVideo video) {
        String youtubeUrl = StringUtils.hasText(video.getYoutubeId())
                ? "https://www.youtube.com/watch?v=" + video.getYoutubeId()
                : null;

        List<String> bodyParts = new ArrayList<>();
        if (video.getPrimaryCategory() != null) {
            bodyParts.add(video.getPrimaryCategory());
        }
        if (video.getSecondaryCategory() != null) {
            bodyParts.add(video.getSecondaryCategory());
        }

        return WorkoutCard.builder()
                .id(video.getId() != null ? video.getId().toString() : null)
                .youtubeId(video.getYoutubeId())
                .title(video.getExerciseName())
                .durationMinutes(video.getIsShort() ? 1 : 5)
                .level("all")
                .equipment(List.of())
                .bodyParts(bodyParts)
                .thumbnailUrl(video.getThumbnailUrl())
                .viewCount(0L)
                .youtubeUrl(youtubeUrl)
                .build();
    }
}
