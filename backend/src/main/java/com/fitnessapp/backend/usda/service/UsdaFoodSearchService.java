package com.fitnessapp.backend.usda.service;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsdaFoodSearchService {

    private final UsdaFoodRepository foodRepository;

    public List<UsdaFood> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }
        Set<UsdaFood> results = new LinkedHashSet<>();
        results.addAll(foodRepository.findByNameContainingIgnoreCase(query));
        results.addAll(foodRepository.searchByAlias(query));
        return results.stream().limit(limit).toList();
    }
}
