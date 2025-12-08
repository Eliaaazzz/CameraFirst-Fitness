package com.fitnessapp.backend.api.gamification;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fitnessapp.backend.workout.controller.LeaderboardController;
import com.fitnessapp.backend.workout.service.LeaderboardService;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardEntry;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardResult;

@ExtendWith(MockitoExtension.class)
class LeaderboardControllerTest {

  private MockMvc mockMvc;

  @Mock
  private LeaderboardService leaderboardService;

  @BeforeEach
  void setUp() {
    LeaderboardController controller = new LeaderboardController(leaderboardService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

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
