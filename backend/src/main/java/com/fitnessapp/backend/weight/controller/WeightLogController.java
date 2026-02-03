package com.fitnessapp.backend.weight.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.weight.dto.WeightLogRequest;
import com.fitnessapp.backend.weight.dto.WeightLogResponse;
import com.fitnessapp.backend.weight.dto.WeightStatsResponse;
import com.fitnessapp.backend.weight.service.WeightLogService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/weight")
@RequiredArgsConstructor
@Slf4j
public class WeightLogController {

    private final WeightLogService weightLogService;

    /**
     * Log a new weight entry or update existing entry for the same date.
     * POST /api/v1/weight
     */
    @PostMapping
    public ResponseEntity<ApiEnvelope<WeightLogResponse>> logWeight(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody WeightLogRequest request) {
        log.info("Logging weight for user {}: {} kg", userId, request.weightKg());
        WeightLogResponse response = weightLogService.logWeight(userId, request);
        return ResponseEntity.ok(ApiEnvelope.success(response));
    }

    /**
     * Get weight history within a date range.
     * GET /api/v1/weight/history?startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping("/history")
    public ResponseEntity<ApiEnvelope<List<WeightLogResponse>>> getWeightHistory(
            @AuthenticationPrincipal UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<WeightLogResponse> history = weightLogService.getWeightHistory(userId, startDate, endDate);
        return ResponseEntity.ok(ApiEnvelope.success(history));
    }

    /**
     * Get recent weight logs (default: last 30 entries).
     * GET /api/v1/weight/recent?limit=30
     */
    @GetMapping("/recent")
    public ResponseEntity<ApiEnvelope<List<WeightLogResponse>>> getRecentWeightLogs(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(defaultValue = "30") int limit) {
        List<WeightLogResponse> logs = weightLogService.getRecentWeightLogs(userId, Math.min(limit, 365));
        return ResponseEntity.ok(ApiEnvelope.success(logs));
    }

    /**
     * Get comprehensive weight statistics and trends.
     * GET /api/v1/weight/stats?days=30
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiEnvelope<WeightStatsResponse>> getWeightStats(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        WeightStatsResponse stats = weightLogService.getWeightStats(userId, Math.min(days, 365));
        return ResponseEntity.ok(ApiEnvelope.success(stats));
    }

    /**
     * Delete a specific weight log entry.
     * DELETE /api/v1/weight/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiEnvelope<Void>> deleteWeightLog(
            @AuthenticationPrincipal UUID userId,
            @PathVariable Long id) {
        weightLogService.deleteWeightLog(userId, id);
        return ResponseEntity.ok(ApiEnvelope.success(null));
    }
}
