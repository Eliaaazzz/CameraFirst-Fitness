import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, FAB, SegmentedButtons } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, SafeAreaWrapper, Text, WorkoutCard } from '@/components';
import { spacing } from '@/utils';
import { DEFAULT_SAVED_PAGE_SIZE, useSavedWorkouts, useRemoveWorkout, DEFAULT_WORKOUT_SORT } from '@/services';
import type { SavedWorkout, SortDirection, WorkoutSortField, WorkoutSortOption } from '@/types';
import useCurrentUser from '@/hooks/useCurrentUser';

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
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_WORKOUT_SORT.direction);
  const sortOption = useMemo<WorkoutSortOption>(() => ({ field: sortField, direction: sortDirection }), [sortField, sortDirection]);
  const saved = useSavedWorkouts(userId, DEFAULT_SAVED_PAGE_SIZE, sortOption);
  const removeWorkout = useRemoveWorkout(userId, DEFAULT_SAVED_PAGE_SIZE, sortOption);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const listRef = useRef<FlatList<SavedWorkout>>(null);
  const [showFab, setShowFab] = useState(false);

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
          <Card style={styles.emptyState}>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>Unable to load user</Text>
            <Text variant="body" style={styles.emptyBody}>Check your API key or network connection, then try again.</Text>
            <Button title="Retry" onPress={() => currentUser.refetch()} />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const workouts = useMemo(
    () => saved.data?.pages.flatMap((page) => page.items) ?? [],
    [saved.data],
  );

  const isRefreshing = saved.isRefetching && !saved.isFetchingNextPage;
  const isInitialLoading = saved.isLoading && !saved.isFetchingNextPage;

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowFab(false);
  }, [sortDirection, sortField]);

  const handleRefresh = useCallback(() => {
    if (!saved.isLoading) {
      saved.refetch();
    }
  }, [saved]);

  const handleLoadMore = useCallback(() => {
    if (saved.hasNextPage && !saved.isFetchingNextPage) {
      saved.fetchNextPage();
    }
  }, [saved]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowFab(offsetY > 240);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SavedWorkout }) => {
      const savedLabel = item.savedAt ? new Date(item.savedAt).toLocaleString() : '—';
      const duration = item.durationMinutes ?? 0;
      const meta = sortField === 'duration'
        ? `${duration} min · saved ${savedLabel}`
        : `${duration} min · level ${item.level?.toUpperCase?.() ?? '—'}`;

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
    [removeWorkout, sortField],
  );

  const listEmptyComponent = (
    <Card style={styles.emptyState}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name="arm-flex" size={48} color="#4ECDC4" />
      </View>
      <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
        Your saved workouts will appear here
      </Text>
      <Text variant="body" style={styles.emptyBody}>
        Capture your equipment to get workout recommendations tailored to your space and gear.
      </Text>
      <Button title="Capture Equipment" onPress={() => navigation.navigate('Capture')} />
    </Card>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text variant="heading1" weight="bold">
                Saved Workouts
              </Text>
              <Text variant="body" style={styles.subtitle}>
                Keep your go-to routines within reach.
              </Text>
              <View style={styles.sortGroups}>
                <SegmentedButtons
                  value={sortField}
                  onValueChange={(value) => setSortField(value as WorkoutSortField)}
                  buttons={[
                    { value: 'savedAt', label: 'Recent' },
                    { value: 'duration', label: 'Duration' },
                  ]}
                  density="small"
                  style={styles.segmented}
                />
                <SegmentedButtons
                  value={sortDirection}
                  onValueChange={(value) => setSortDirection(value as SortDirection)}
                  buttons={[
                    { value: 'desc', label: 'Newest' },
                    { value: 'asc', label: 'Oldest' },
                  ]}
                  density="small"
                  style={styles.segmented}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            isInitialLoading ? (
              <ListSkeleton rows={4} showAvatar primaryWidth="55%" secondaryWidth="32%" />
            ) : !saved.isLoading && !saved.isError ? (
              listEmptyComponent
            ) : null
          }
          ListFooterComponent={
            saved.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator animating />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4ECDC4"
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleLoadMore}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
        {saved.isError && (
          <Card>
            <Text variant="body">Failed to load saved workouts.</Text>
            <Button title="Retry" onPress={() => saved.refetch()} />
          </Card>
        )}
      </Container>
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
  container: {
    paddingBottom: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    opacity: 0.7,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sortGroups: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  segmented: {
    marginTop: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
  },
  savedAt: {
    opacity: 0.68,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
  },
});
