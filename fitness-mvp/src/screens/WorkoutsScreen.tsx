import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, SafeAreaWrapper, Text, WorkoutCard } from '@/components';
import { Chip, EmptyState, ScreenHeader } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRemoveWorkout, useSavedWorkouts } from '@/services';
import type { SortDirection, WorkoutCard as WorkoutCardType, WorkoutSortField } from '@/types';
import { COLORS, SHAPE, SPACING, spacing } from '@/utils/theme';

type TabParamList = {
  Capture: undefined;
  Workouts: undefined;
  Recipes: undefined;
  DesignSystem?: undefined;
};

export const WorkoutsScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const [sortField, setSortField] = useState<WorkoutSortField>('savedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const saved = useSavedWorkouts(userId);
  const removeWorkout = useRemoveWorkout(userId);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const listRef = useRef<FlatList<WorkoutCardType>>(null);
  const [showFab, setShowFab] = useState(false);

  // Sort workouts client-side
  const workouts = useMemo(() => {
    const data = saved.data ?? [];
    return [...data].sort((a, b) => {
      if (sortField === 'duration') {
        const comparison = (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      // Default: savedAt - but WorkoutCard doesn't have savedAt, so keep original order
      return sortDirection === 'asc' ? 1 : -1;
    });
  }, [saved.data, sortField, sortDirection]);

  const isRefreshing = saved.isRefetching;
  const isInitialLoading = saved.isLoading;

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowFab(false);
  }, [sortDirection, sortField]);

  const handleRefresh = useCallback(() => {
    if (!saved.isLoading) {
      saved.refetch();
    }
  }, [saved]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowFab(offsetY > 240);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: WorkoutCardType }) => {
      const duration = item.durationMinutes ?? 0;
      const meta = `${duration} min · level ${item.level?.toUpperCase?.() ?? '—'}`;

      return (
        <View style={styles.card}>
          <WorkoutCard
            item={item}
            isSaved
            onRemove={(id) => removeWorkout.mutateAsync(id)}
          />
          <Text variant="caption" style={styles.savedAt}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeWorkout],
  );

  const listEmptyComponent = (
    <EmptyState
      icon={<MaterialCommunityIcons name="dumbbell" size={48} color={COLORS.primary.main} />}
      title="Your saved workouts will appear here"
      description="Capture your equipment to get workout recommendations tailored to your space and gear."
      actionLabel="Capture Equipment"
      onAction={() => navigation.navigate('Capture')}
    />
  );

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card>
            <Text variant="body">Loading your profile…</Text>
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (currentUser.isError) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.errorCard}>
            <Text variant="heading2" weight="bold" style={styles.errorTitle}>Unable to load user</Text>
            <Text variant="body" style={styles.errorBody}>Check your API key or network connection, then try again.</Text>
            <Button title="Retry" onPress={() => currentUser.refetch()} />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={['left', 'right']}>
      <FlatList
        ref={listRef}
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title="My Workouts"
              subtitle={`${workouts.length} saved workout${workouts.length !== 1 ? 's' : ''}`}
              variant="hero"
            />
            <View style={styles.sortContainer}>
              <View style={styles.sortRow}>
                <Chip
                  label="Recent"
                  variant={sortField === 'savedAt' ? 'filled' : 'tonal'}
                  onPress={() => setSortField('savedAt')}
                  icon={<Feather name="clock" size={12} color={sortField === 'savedAt' ? '#FFF' : COLORS.primary.main} />}
                />
                <Chip
                  label="Duration"
                  variant={sortField === 'duration' ? 'filled' : 'tonal'}
                  onPress={() => setSortField('duration')}
                  icon={<Feather name="activity" size={12} color={sortField === 'duration' ? '#FFF' : COLORS.primary.main} />}
                />
              </View>
              <View style={styles.sortRow}>
                <Chip
                  label="Newest"
                  variant={sortDirection === 'desc' ? 'filled' : 'outlined'}
                  size="small"
                  onPress={() => setSortDirection('desc')}
                />
                <Chip
                  label="Oldest"
                  variant={sortDirection === 'asc' ? 'filled' : 'outlined'}
                  size="small"
                  onPress={() => setSortDirection('asc')}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ListSkeleton rows={4} showAvatar primaryWidth="55%" secondaryWidth="32%" />
            </View>
          ) : !saved.isLoading && !saved.isError ? (
            listEmptyComponent
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary.main}
            colors={[COLORS.primary.main]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.list}
      />
      {saved.isError && (
        <Card>
          <Text variant="body">Failed to load saved workouts.</Text>
          <Button title="Retry" onPress={() => saved.refetch()} />
        </Card>
      )}
      <FAB
        icon="arrow-up"
        style={styles.fab}
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  card: {
    marginHorizontal: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  sortContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  sortRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  loadingContainer: {
    paddingHorizontal: SPACING.md,
  },
  savedAt: {
    opacity: 0.68,
    marginTop: SPACING.xs,
    color: COLORS.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    backgroundColor: COLORS.primary.main,
    borderRadius: SHAPE.borderRadius.lg,
  },
  errorCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  errorTitle: {
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorBody: {
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
});
