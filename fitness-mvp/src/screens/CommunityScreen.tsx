import { Card, Container, ListSkeleton, SafeAreaWrapper, Text } from '@/components';
import { Chip, ScreenHeader } from '@/components/ui';
import { useLeaderboard } from '@/services';
import { BORDER_RADIUS, COLORS, SPACING } from '@/utils/theme';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons } from 'react-native-paper';

export const CommunityScreen = () => {
  const [scope, setScope] = useState<'weekly' | 'daily'>('weekly');
  const leaderboard = useLeaderboard(scope, 20);

  const entries = useMemo(() => leaderboard.data?.entries ?? [], [leaderboard.data]);
  const lastUpdated = leaderboard.data ? new Date(leaderboard.data.generatedAt).toLocaleString() : null;
  const showSkeleton = leaderboard.isLoading && !leaderboard.data;

  // Get medal color/emoji based on position
  const getMedalStyle = (position: number) => {
    if (position === 1) return { color: '#FFD700', emoji: '🥇' };
    if (position === 2) return { color: '#C0C0C0', emoji: '🥈' };
    if (position === 3) return { color: '#CD7F32', emoji: '🥉' };
    return { color: COLORS.primary.main, emoji: '' };
  };

  return (
    <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title="🏆 Leaderboard"
        subtitle="Meal logging streaks reset every Monday. Keep logging to climb!"
        variant="hero"
      />
      <Container style={styles.container}>
        <View style={styles.controls}>
          <SegmentedButtons
            value={scope}
            onValueChange={(value) => setScope(value as 'weekly' | 'daily')}
            buttons={[
              { value: 'weekly', label: '📅 Weekly', icon: 'calendar' },
              { value: 'daily', label: '📊 Daily', icon: 'chart-bar' },
            ]}
            density="regular"
            style={styles.segmentedButtons}
            theme={{
              colors: {
                secondaryContainer: COLORS.primary.main + '30',
                onSecondaryContainer: COLORS.primary.main,
              },
            }}
          />
          {lastUpdated && (
            <Text variant="caption" style={styles.timestamp}>
              <Feather name="clock" size={12} color={COLORS.text.secondary} /> Updated {lastUpdated}
            </Text>
          )}
        </View>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[styles.listContent, entries.length === 0 && { flexGrow: 1 }]}
          renderItem={({ item }) => {
            const medal = getMedalStyle(item.position);
            const isTopThree = item.position <= 3;
            
            return (
              <Card style={[styles.row, isTopThree && styles.topThreeRow]}>
                <View style={styles.rowContent}>
                  <View style={[styles.rankCircle, isTopThree && { backgroundColor: medal.color + '30' }]}>
                    {isTopThree ? (
                      <Text variant="heading2">{medal.emoji}</Text>
                    ) : (
                      <Text variant="body" weight="bold" style={[styles.rankText, { color: medal.color }]}>
                        {item.position}
                      </Text>
                    )}
                  </View>
                  <View style={styles.details}>
                    <Text variant="body" weight="bold">{item.displayName}</Text>
                    <View style={styles.statsRow}>
                      <Chip 
                        label={`${item.score} meals`}
                        variant="tonal"
                        color="primary"
                        size="small"
                        icon={<Feather name="check-circle" size={12} color={COLORS.primary.main} />}
                      />
                      <Chip 
                        label={`${item.streak} 🔥`}
                        variant="outlined"
                        color="warning"
                        size="small"
                      />
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={leaderboard.isRefetching}
              onRefresh={() => leaderboard.refetch()}
            />
          }
          ListEmptyComponent={
            showSkeleton ? (
              <ListSkeleton rows={4} showAvatar primaryWidth="60%" secondaryWidth="45%" />
            ) : leaderboard.isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator animating />
                <Text variant="body">Loading leaderboard…</Text>
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Text variant="body" style={{ textAlign: 'center' }}>
                  Log meals to see community rankings.
                </Text>
              </Card>
            )
          }
        />
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.dark.background,
  },
  subtitle: {
    opacity: 0.7,
  },
  controls: {
    gap: SPACING.sm,
    paddingTop: SPACING.md,
  },
  segmentedButtons: {
    borderRadius: BORDER_RADIUS,
  },
  timestamp: {
    opacity: 0.6,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  row: {
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.surface.primary,
  },
  topThreeRow: {
    borderWidth: 1,
    borderColor: COLORS.primary.main + '40',
    backgroundColor: COLORS.dark.surfaceElevated,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rankCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    textAlign: 'center',
    color: COLORS.primary.main,
  },
  details: {
    flex: 1,
    gap: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  meta: {
    opacity: 0.7,
    color: COLORS.text.secondary,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS,
  },
});
