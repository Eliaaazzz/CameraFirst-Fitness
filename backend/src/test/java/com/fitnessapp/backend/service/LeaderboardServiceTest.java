package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository.MealLogLeaderboardRow;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardEntry;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardResult;
import com.fitnessapp.backend.service.cache.LeaderboardCacheStore;
import com.fitnessapp.backend.service.cache.LeaderboardCacheStore.LeaderboardSnapshot;
import com.fitnessapp.backend.service.cache.LeaderboardCacheStore.Entry;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.lenient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

  @Mock private MealLogRepository mealLogRepository;
  @Mock private UserRepository userRepository;
  @Mock private ObjectProvider<MealLogRepository> mealLogRepositoryProvider;
  @Mock private ObjectProvider<UserRepository> userRepositoryProvider;
  @Mock private LeaderboardCacheStore cacheStore;

  private LeaderboardService leaderboardService;

  @BeforeEach
  void setUp() {
    lenient().when(mealLogRepositoryProvider.getIfAvailable()).thenReturn(mealLogRepository);
    lenient().when(userRepositoryProvider.getIfAvailable()).thenReturn(userRepository);
    leaderboardService = new LeaderboardService(mealLogRepositoryProvider, userRepositoryProvider, cacheStore);
  }

  @Test
  void returnsCachedSnapshotWhenAvailable() {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    Entry cachedEntry = new Entry(UUID.randomUUID(), "alice", 1, 3, 12);
    LeaderboardSnapshot snapshot = new LeaderboardSnapshot(List.of(cachedEntry), now);
    when(cacheStore.get("global", "WEEKLY")).thenReturn(snapshot);

    LeaderboardResult result = leaderboardService.mealLogLeaderboard("weekly", 5);

    assertThat(result.entries()).hasSize(1);
    assertThat(result.entries().getFirst().displayName()).isEqualTo("alice");
    verify(cacheStore, times(0)).put(any(), any(), any());
  }

  @Test
  void buildsLeaderboardAndCachesWhenSnapshotMissing() {
    UUID userId = UUID.randomUUID();
    FakeRow row = new FakeRow(userId, 8, OffsetDateTime.now(ZoneOffset.UTC));

    when(cacheStore.get("global", "WEEKLY")).thenReturn(null);
    when(mealLogRepository.leaderboardSince(any(), eq(PageRequest.of(0, 50)))).thenReturn(List.of(row));

    User user = new User();
    user.setId(userId);
    user.setEmail("leader@example.com");
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    MealLog log = new MealLog();
    log.setUserId(userId);
    log.setConsumedAt(OffsetDateTime.now(ZoneOffset.UTC));
    when(mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(eq(userId), any(), any()))
        .thenReturn(Collections.singletonList(log));

    LeaderboardResult result = leaderboardService.mealLogLeaderboard("weekly", 5);

    assertThat(result.entries()).hasSize(1);
    LeaderboardEntry entry = result.entries().getFirst();
    assertThat(entry.displayName()).isEqualTo("leader");
    assertThat(entry.score()).isEqualTo(8);
    assertThat(entry.streak()).isGreaterThanOrEqualTo(1);

    ArgumentCaptor<LeaderboardSnapshot> snapshotCaptor = ArgumentCaptor.forClass(LeaderboardSnapshot.class);
    verify(cacheStore).put(eq("global"), eq("WEEKLY"), snapshotCaptor.capture());
    assertThat(snapshotCaptor.getValue().entries()).hasSize(1);
  }

  private record FakeRow(UUID userId, long entryCount, OffsetDateTime lastLog) implements MealLogLeaderboardRow {
    @Override public UUID getUserId() { return userId; }
    @Override public long getEntryCount() { return entryCount; }
    @Override public OffsetDateTime getLastLog() { return lastLog; }
  }
}
