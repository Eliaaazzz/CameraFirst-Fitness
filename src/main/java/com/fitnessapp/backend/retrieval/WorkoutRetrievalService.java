package com.fitnessapp.backend.retrieval;

import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkoutRetrievalService {

    private static final int DEFAULT_RESULT_LIMIT = 4;
    private static final int DEFAULT_DURATION_TOLERANCE_MINUTES = 5;

    private final WorkoutVideoRepository repository;

    public List<WorkoutCard> findWorkouts(String equipment, String level, int durationPreference) {
        if (!StringUtils.hasText(equipment)) {
            log.warn("Equipment not provided; returning empty workout list");
            return List.of();
        }

        List<WorkoutVideo> exactMatches = repository.findByEquipmentContaining(equipment.trim().toLowerCase(Locale.ROOT));
        if (exactMatches.isEmpty()) {
            return List.of();
        }

        List<WorkoutVideo> durationMatches = exactMatches.stream()
                .filter(video -> video.getDurationMinutes() != null)
                .filter(video -> Math.abs(video.getDurationMinutes() - durationPreference) <= DEFAULT_DURATION_TOLERANCE_MINUTES)
                .collect(Collectors.toList());

        List<WorkoutVideo> basePool = durationMatches.isEmpty() ? exactMatches : durationMatches;

        Comparator<WorkoutVideo> comparator = Comparator
                .comparing((WorkoutVideo video) -> levelMatches(video, level) ? 0 : 1)
                .thenComparing(WorkoutRetrievalService::viewCountOrZero, Comparator.reverseOrder());

        List<WorkoutVideo> sorted = basePool.stream()
                .sorted(comparator)
                .collect(Collectors.toList());

        return selectDiverseWorkouts(sorted, DEFAULT_RESULT_LIMIT);
    }

    private static boolean levelMatches(WorkoutVideo video, String requestedLevel) {
        if (!StringUtils.hasText(requestedLevel) || !StringUtils.hasText(video.getLevel())) {
            return false;
        }
        return video.getLevel().equalsIgnoreCase(requestedLevel);
    }

    private static long viewCountOrZero(WorkoutVideo video) {
        return video.getViewCount() == null ? 0L : video.getViewCount();
    }

    private List<WorkoutCard> selectDiverseWorkouts(List<WorkoutVideo> videos, int desiredCount) {
        if (videos.isEmpty() || desiredCount <= 0) {
            return List.of();
        }

        List<WorkoutCard> selected = new ArrayList<>();
        Set<String> seenBodyParts = new HashSet<>();
        Set<String> addedIds = new HashSet<>();

        for (WorkoutVideo video : videos) {
            if (selected.size() >= desiredCount) {
                break;
            }
            String primaryBodyPart = primaryBodyPart(video);
            if (primaryBodyPart == null) {
                continue;
            }
            String normalized = primaryBodyPart.toLowerCase(Locale.ROOT);
            if (seenBodyParts.add(normalized)) {
                addCard(selected, addedIds, video);
            }
        }

        if (selected.size() < desiredCount) {
            for (WorkoutVideo video : videos) {
                if (selected.size() >= desiredCount) {
                    break;
                }
                addCard(selected, addedIds, video);
            }
        }

        return selected;
    }

    private void addCard(List<WorkoutCard> selected, Set<String> addedIds, WorkoutVideo video) {
        String uniqueId = video.getYoutubeId();
        if (!StringUtils.hasText(uniqueId) || addedIds.contains(uniqueId)) {
            return;
        }
        selected.add(toCard(video));
        addedIds.add(uniqueId);
    }

    private WorkoutCard toCard(WorkoutVideo video) {
        List<String> equipment = video.getEquipment();
        List<String> bodyParts = video.getBodyPart();
        return WorkoutCard.builder()
                .youtubeId(video.getYoutubeId())
                .title(video.getTitle())
                .durationMinutes(video.getDurationMinutes())
                .level(video.getLevel())
                .equipment(equipment == null ? List.of() : new ArrayList<>(equipment))
                .bodyParts(bodyParts == null ? List.of() : new ArrayList<>(bodyParts))
                .thumbnailUrl(video.getThumbnailUrl())
                .viewCount(video.getViewCount())
                .build();
    }

    private String primaryBodyPart(WorkoutVideo video) {
        if (CollectionUtils.isEmpty(video.getBodyPart())) {
            return null;
        }
        return video.getBodyPart().stream()
                .filter(StringUtils::hasText)
                .map(part -> part.toLowerCase(Locale.ROOT))
                .findFirst()
                .orElse(null);
    }
}
