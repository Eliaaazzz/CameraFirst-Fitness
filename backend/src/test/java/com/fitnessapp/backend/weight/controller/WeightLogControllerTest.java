package com.fitnessapp.backend.weight.controller;

import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.ArgumentMatchers.eq;

import static org.mockito.Mockito.verify;

import static org.mockito.Mockito.when;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;



import java.math.BigDecimal;

import java.time.LocalDate;

import java.time.OffsetDateTime;

import java.util.List;

import java.util.UUID;



import org.junit.jupiter.api.BeforeEach;

import org.junit.jupiter.api.DisplayName;

import org.junit.jupiter.api.Nested;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.boot.test.mock.mockito.MockBean;

import org.springframework.http.MediaType;

import org.springframework.security.test.context.support.WithMockUser;

import org.springframework.test.web.servlet.MockMvc;



import com.fasterxml.jackson.databind.ObjectMapper;

import com.fitnessapp.backend.weight.dto.WeightLogRequest;

import com.fitnessapp.backend.weight.dto.WeightLogResponse;

import com.fitnessapp.backend.weight.dto.WeightStatsResponse;

import com.fitnessapp.backend.weight.service.WeightLogService;



@WebMvcTest(WeightLogController.class)

@AutoConfigureMockMvc(addFilters = false)

@DisplayName("WeightLogController Integration Tests")

class WeightLogControllerTest {



    @Autowired

    private MockMvc mockMvc;



    @Autowired

    private ObjectMapper objectMapper;



    @MockBean

    private WeightLogService weightLogService;



    private UUID userId;

    private LocalDate today;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        today = LocalDate.now();
    }

    // =========================================================================
    // POST /api/v1/weight - Log Weight
    // =========================================================================

    @Nested
    @DisplayName("POST /api/v1/weight")
    class LogWeightEndpoint {

        @Test
        @WithMockUser
        @DisplayName("should log weight successfully with valid request")
        void shouldLogWeightSuccessfully() throws Exception {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("75.5"),
                today,
                new BigDecimal("18.5"),
                new BigDecimal("35.0"),
                "Morning weigh-in"
            );

            WeightLogResponse response = new WeightLogResponse(
                1L,
                new BigDecimal("75.5"),
                today,
                new BigDecimal("18.5"),
                new BigDecimal("35.0"),
                "Morning weigh-in",
                OffsetDateTime.now()
            );

            when(weightLogService.logWeight(any(UUID.class), any(WeightLogRequest.class)))
                .thenReturn(response);

            // When & Then
            mockMvc.perform(post("/api/v1/weight")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.weightKg").value(75.5))
                .andExpect(jsonPath("$.data.bodyFatPercentage").value(18.5))
                .andExpect(jsonPath("$.data.note").value("Morning weigh-in"));
        }

        @Test
        @WithMockUser
        @DisplayName("should return 400 when weight is missing")
        void shouldReturn400WhenWeightMissing() throws Exception {
            // Given
            String invalidRequest = """
                {
                    "logDate": "2024-01-15"
                }
                """;

            // When & Then
            mockMvc.perform(post("/api/v1/weight")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(invalidRequest))
                .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser
        @DisplayName("should return 400 when weight is out of valid range")
        void shouldReturn400WhenWeightOutOfRange() throws Exception {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("10.0"), // Too low (min is 20)
                today,
                null,
                null,
                null
            );

            // When & Then
            mockMvc.perform(post("/api/v1/weight")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 401 when not authenticated")
        void shouldReturn401WhenNotAuthenticated() throws Exception {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("75.0"),
                today,
                null,
                null,
                null
            );

            // When & Then
            mockMvc.perform(post("/api/v1/weight")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // GET /api/v1/weight/stats - Get Weight Stats
    // =========================================================================

    @Nested
    @DisplayName("GET /api/v1/weight/stats")
    class GetWeightStatsEndpoint {

        @Test
        @WithMockUser
        @DisplayName("should return weight stats successfully")
        void shouldReturnWeightStatsSuccessfully() throws Exception {
            // Given
            WeightStatsResponse stats = new WeightStatsResponse(
                new BigDecimal("72.0"),
                new BigDecimal("70.0"),
                new BigDecimal("75.0"),
                new BigDecimal("-3.0"),
                new BigDecimal("-4.0"),
                new BigDecimal("23.5"),
                today,
                10,
                "losing",
                "Great progress! 3.0 kg lost, 2.0 kg to go.",
                List.of()
            );

            when(weightLogService.getWeightStats(any(UUID.class), eq(30)))
                .thenReturn(stats);

            // When & Then
            mockMvc.perform(get("/api/v1/weight/stats")
                    .param("days", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.currentWeight").value(72.0))
                .andExpect(jsonPath("$.data.weightChange").value(-3.0))
                .andExpect(jsonPath("$.data.trend").value("losing"))
                .andExpect(jsonPath("$.data.totalLogs").value(10));
        }

        @Test
        @WithMockUser
        @DisplayName("should use default 30 days when no parameter provided")
        void shouldUseDefault30Days() throws Exception {
            // Given
            WeightStatsResponse stats = WeightStatsResponse.empty();
            when(weightLogService.getWeightStats(any(UUID.class), eq(30)))
                .thenReturn(stats);

            // When & Then
            mockMvc.perform(get("/api/v1/weight/stats"))
                .andExpect(status().isOk());

            verify(weightLogService).getWeightStats(any(UUID.class), eq(30));
        }

        @Test
        @WithMockUser
        @DisplayName("should cap days parameter at 365")
        void shouldCapDaysAt365() throws Exception {
            // Given
            WeightStatsResponse stats = WeightStatsResponse.empty();
            when(weightLogService.getWeightStats(any(UUID.class), eq(365)))
                .thenReturn(stats);

            // When & Then
            mockMvc.perform(get("/api/v1/weight/stats")
                    .param("days", "1000"))
                .andExpect(status().isOk());

            verify(weightLogService).getWeightStats(any(UUID.class), eq(365));
        }
    }

    // =========================================================================
    // GET /api/v1/weight/history - Get Weight History
    // =========================================================================

    @Nested
    @DisplayName("GET /api/v1/weight/history")
    class GetWeightHistoryEndpoint {

        @Test
        @WithMockUser
        @DisplayName("should return weight history within date range")
        void shouldReturnWeightHistoryWithinDateRange() throws Exception {
            // Given
            LocalDate startDate = today.minusDays(7);
            LocalDate endDate = today;

            List<WeightLogResponse> history = List.of(
                new WeightLogResponse(1L, new BigDecimal("72.0"), today, null, null, null, OffsetDateTime.now()),
                new WeightLogResponse(2L, new BigDecimal("73.0"), today.minusDays(3), null, null, null, OffsetDateTime.now())
            );

            when(weightLogService.getWeightHistory(any(UUID.class), eq(startDate), eq(endDate)))
                .thenReturn(history);

            // When & Then
            mockMvc.perform(get("/api/v1/weight/history")
                    .param("startDate", startDate.toString())
                    .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].weightKg").value(72.0));
        }

        @Test
        @WithMockUser
        @DisplayName("should return 400 when required date parameters are missing")
        void shouldReturn400WhenDateParametersMissing() throws Exception {
            // When & Then
            mockMvc.perform(get("/api/v1/weight/history"))
                .andExpect(status().isBadRequest());
        }
    }

    // =========================================================================
    // GET /api/v1/weight/recent - Get Recent Weight Logs
    // =========================================================================

    @Nested
    @DisplayName("GET /api/v1/weight/recent")
    class GetRecentWeightLogsEndpoint {

        @Test
        @WithMockUser
        @DisplayName("should return recent weight logs")
        void shouldReturnRecentWeightLogs() throws Exception {
            // Given
            List<WeightLogResponse> logs = List.of(
                new WeightLogResponse(1L, new BigDecimal("72.0"), today, null, null, null, OffsetDateTime.now())
            );

            when(weightLogService.getRecentWeightLogs(any(UUID.class), eq(30)))
                .thenReturn(logs);

            // When & Then
            mockMvc.perform(get("/api/v1/weight/recent")
                    .param("limit", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @WithMockUser
        @DisplayName("should use default limit of 30")
        void shouldUseDefaultLimit() throws Exception {
            // Given
            when(weightLogService.getRecentWeightLogs(any(UUID.class), eq(30)))
                .thenReturn(List.of());

            // When & Then
            mockMvc.perform(get("/api/v1/weight/recent"))
                .andExpect(status().isOk());

            verify(weightLogService).getRecentWeightLogs(any(UUID.class), eq(30));
        }
    }

    // =========================================================================
    // DELETE /api/v1/weight/{id} - Delete Weight Log
    // =========================================================================

    @Nested
    @DisplayName("DELETE /api/v1/weight/{id}")
    class DeleteWeightLogEndpoint {

        @Test
        @WithMockUser
        @DisplayName("should delete weight log successfully")
        void shouldDeleteWeightLogSuccessfully() throws Exception {
            // When & Then
            mockMvc.perform(delete("/api/v1/weight/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

            verify(weightLogService).deleteWeightLog(any(UUID.class), eq(1L));
        }
    }
}
