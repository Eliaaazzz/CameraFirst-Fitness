package com.fitnessapp.backend.api.gamification;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fitnessapp.backend.workout.controller.LeaderboardController;
import com.fitnessapp.backend.workout.service.LeaderboardService;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardEntry;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardResult;

@WebMvcTest(LeaderboardController.class)
@AutoConfigureMockMvc(addFilters = false)
class LeaderboardControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private LeaderboardService leaderboardService;

  @Test
  void returnsLeaderboardEntries() throws Exception {
    LeaderboardEntry entry = new LeaderboardEntry(1, UUID.randomUUID(), "alice", 4, 12);
    OffsetDateTime generatedAt = OffsetDateTime.now();
    when(leaderboardService.mealLogLeaderboard("weekly", 5))
        .thenReturn(new LeaderboardResult(LeaderboardService.LeaderboardScope.WEEKLY, generatedAt, List.of(entry)));

    mockMvc.perform(get("/api/v1/gamification/leaderboard/meal-logs")
            .param("scope", "weekly")
            .param("limit", "5"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.entries[0].displayName").value("alice"))
        .andExpect(jsonPath("$.data.entries[0].score").value(12));
  }
}
