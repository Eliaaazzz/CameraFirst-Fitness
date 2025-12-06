package com.fitnessapp.backend.usda.controller;

import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import com.fitnessapp.backend.usda.service.UsdaFoodImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/usda/foods")
@RequiredArgsConstructor
public class UsdaFoodAdminController {

    private final UsdaFoodImportService importService;
    private final UsdaFoodRepository foodRepository;

    @PostMapping("/import")
    public ResponseEntity<UsdaFoodImportService.ImportResult> importFoods(
            @RequestParam String query,
            @RequestParam(defaultValue = "100") int maxFoods) {
        log.info("Importing USDA foods for query '{}' (max {})", query, maxFoods);
        return ResponseEntity.ok(importService.importFoods(query, maxFoods));
    }

    @GetMapping("/count")
    public ResponseEntity<Long> count() {
        return ResponseEntity.ok(foodRepository.count());
    }
}
