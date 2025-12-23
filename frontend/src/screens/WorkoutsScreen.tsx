import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, SafeAreaWrapper, Text, WorkoutCard } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedWorkouts, useRemoveWorkout, useSavedWorkouts, useSaveWorkout } from '@/services';
import type { SavedWorkout } from '@/types';
import { spacing } from '@/utils';

// Styles must be defined before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  recommendedList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  recommendedCard: {
    width: 260,
  },
  recommendedNote: {
    opacity: 0.7,
  },
  savedHeader: {
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  iconWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyBody: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
    paddingHorizontal: spacing.lg,
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

// Moved outside component to prevent recreation on every render
const ItemSeparator = () => <View style={{ height: spacing.md }} />;

type TabParamList = {
  Dashboard: undefined;
  Workouts: undefined;
  Recipes: undefined;
};

export const WorkoutsScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedWorkouts(userId);
  const recommended = useRecommendedWorkouts(currentUser.data?.profile?.fitnessGoal);
  const saveWorkout = useSaveWorkout(userId);
  const removeWorkout = useRemoveWorkout(userId);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const listRef = useRef<FlatList<SavedWorkout>>(null);
  const [showFab, setShowFab] = useState(false);
  const savedWorkouts = saved.data ?? [];
  const savedWorkoutIds = useMemo(() => new Set(savedWorkouts.map((item) => item.id)), [savedWorkouts]);
  const recommendedItems = recommended.data ?? [];

  // Memoize empty component BEFORE any conditional returns
  const listEmptyComponent = useMemo(() => (
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
      <Button title="Browse Workouts" variant="primary" onPress={() => navigation.navigate('Dashboard')} />
    </Card>
  ), [navigation]);

  const handleRefresh = useCallback(() => {
    if (!saved.isLoading) {
      saved.refetch();
    }
  }, [saved]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > 240;
    setShowFab(currentValue => {
      if (currentValue !== shouldShow) {
        return shouldShow;
      }
      return currentValue;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SavedWorkout }) => {
      const duration = item.durationMinutes ?? 0;
      const levelText = item.level?.toUpperCase?.() ?? '—';
      const meta = duration + ' min · level ' + levelText;

      return (
        <View style={styles.card}>
          <WorkoutCard
            item={item}
            isSaved
          />
          <Text variant="caption" style={styles.savedAt}>
            {meta}
          </Text>
        </View>
      );
    },
    [],
  );

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <View style={styles.header}>
            <Text variant="heading1" weight="bold">
              Workouts
            </Text>
            <Text variant="body" style={styles.subtitle}>
              Recommended routines and your saved list.
            </Text>
          </View>
          <ListSkeleton rows={4} showAvatar primaryWidth="55%" secondaryWidth="32%" />
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Error state
  if (currentUser.isError || saved.isError) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.emptyState}>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
              Unable to load workouts
            </Text>
            <Text variant="body" style={styles.emptyBody}>
              Check your network connection and try again.
            </Text>
            <Button
              title="Retry"
              variant="primary"
              onPress={() => {
                currentUser.refetch();
                saved.refetch();
              }}
            />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const workouts = savedWorkouts;
  const isRefreshing = saved.isRefetching;
  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold">
        Workouts
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Recommended routines and your saved list.
      </Text>
      <View style={styles.section}>
        <Text variant="heading2" weight="semibold">
          Recommended for you
        </Text>
        {recommended.isLoading ? (
          <Text variant="caption" style={styles.recommendedNote}>
            Loading recommendations...
          </Text>
        ) : recommended.isError ? (
          <Text variant="caption" style={styles.recommendedNote}>
            Unable to load recommendations.
          </Text>
        ) : recommendedItems.length === 0 ? (
          <Text variant="caption" style={styles.recommendedNote}>
            No recommendations yet.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedList}
          >
            {recommendedItems.map((item) => (
              <View key={item.id} style={styles.recommendedCard}>
                <WorkoutCard
                  item={item}
                  isSaved={savedWorkoutIds.has(item.id)}
                  onSave={(id) => saveWorkout.mutateAsync(id).then(() => true)}
                  onRemove={(id) => removeWorkout.mutateAsync(id).then(() => true)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <Text variant="heading2" weight="semibold" style={styles.savedHeader}>
        Saved Workouts
      </Text>
    </View>
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
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4ECDC4"
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
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
