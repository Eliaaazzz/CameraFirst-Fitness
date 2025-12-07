import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { useLeaderboard } from '@/services';
import { Container, SafeAreaWrapper, Text, Card, ListSkeleton } from '@/components';
import { spacing } from '@/utils';

export const CommunityScreen = () => {
  const [scope, setScope] = useState<'weekly' | 'daily'>('weekly');
  const leaderboard = useLeaderboard(scope, 20);

  const entries = useMemo(() => leaderboard.data?.entries ?? [], [leaderboard.data]);
  const lastUpdated = leaderboard.data ? new Date(leaderboard.data.generatedAt).toLocaleString() : null;
  const showSkeleton = leaderboard.isLoading && !leaderboard.data;

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <Text variant="heading1" weight="bold">
          Community Leaderboard
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Meal logging streaks reset every Monday. Keep logging to climb!
        </Text>
        <View style={styles.controls}>
          <SegmentedButtons
            value={scope}
            onValueChange={(value) => setScope(value as 'weekly' | 'daily')}
            buttons={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'daily', label: 'Daily' },
            ]}
            density="small"
          />
          {lastUpdated && (
            <Text variant="caption" style={styles.timestamp}>
              Updated {lastUpdated}
            </Text>
          )}
        </View>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[styles.listContent, entries.length === 0 && { flexGrow: 1 }]}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.rowContent}>
                <View style={styles.rankCircle}>
                  <Text variant="body" weight="bold" style={styles.rankText}>
                    {item.position}
                  </Text>
                </View>
                <View style={styles.details}>
                  <Text variant="body" weight="bold">{item.displayName}</Text>
                  <Text variant="caption" style={styles.meta}>
                    {item.score} meals logged · {item.streak} day streak
                  </Text>
                </View>
              </View>
            </Card>
          )}
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
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    opacity: 0.7,
  },
  controls: {
    gap: spacing.xs,
  },
  timestamp: {
    opacity: 0.6,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderRadius: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14,116,144,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    textAlign: 'center',
  },
  details: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  meta: {
    opacity: 0.7,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
});
