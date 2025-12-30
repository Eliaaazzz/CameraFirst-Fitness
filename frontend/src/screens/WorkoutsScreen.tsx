import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, SafeAreaWrapper, SearchBar, Text, WorkoutCard } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedWorkouts, useRemoveWorkout, useSavedWorkouts, useSaveWorkout } from '@/services';
import { searchWorkouts, WorkoutSearchResult } from '@/services/searchApi';
import type { SavedWorkout } from '@/types';
import { colors, spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    gap: spacing.sm,
  },
  listContent: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    opacity: 0.7,
  },
  searchContainer: {
    marginTop: spacing.md,
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
  searchResults: {
    gap: spacing.md,
  },
  searchResultCard: {
    marginBottom: spacing.sm,
  },
  savedHeader: {
    marginTop: spacing.lg,
  },
  // Error state card styling
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorBody: {
    textAlign: 'center',
    color: colors.dark.textSecondary,
    opacity: 0.7,
  },
  savedAt: {
    opacity: 0.68,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});

// Moved outside component to prevent recreation on every render
const ItemSeparator = () => <View style={{ height: spacing.md }} />;

export const WorkoutsScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedWorkouts(userId);
  const recommended = useRecommendedWorkouts(currentUser.data?.profile?.fitnessGoal, userId);
  const saveWorkout = useSaveWorkout(userId);
  const removeWorkout = useRemoveWorkout(userId);
  const listRef = useRef<FlatList<SavedWorkout>>(null);
  const [showFab, setShowFab] = useState(false);
  const savedWorkouts = saved.data ?? [];
  const savedWorkoutIds = useMemo(() => new Set(savedWorkouts.map((item) => item.id)), [savedWorkouts]);
  const recommendedItems = recommended.data ?? [];

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkoutSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchWorkouts(query, 20);
        setSearchResults(results);
      } catch (error) {
        console.error('[WorkoutsScreen] Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // Calculate bottom padding using shared utility
  const listBottomPadding = useContentBottomPadding(spacing.lg);
  const fabBottomPosition = useFABBottomPosition(spacing.md);

  // Memoize empty component BEFORE any conditional returns
  const listEmptyComponent = useMemo(() => (
    <EmptyStateCard
      icon={<MaterialCommunityIcons name="arm-flex" size={32} color="#4ECDC4" />}
      title="Your saved workouts will appear here"
      variant="single"
    />
  ), []);

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
            onRemove={(id) => removeWorkout.mutateAsync(id).then(() => true)}
          />
          <Text variant="caption" style={styles.savedAt}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeWorkout],
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
          <EmptyStateCard
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />}
            title="Unable to load workouts"
            subtitle="Check your network connection and try again."
            ctaLabel="Retry"
            onCtaPress={() => {
              currentUser.refetch();
              saved.refetch();
            }}
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  const workouts = savedWorkouts;
  const isRefreshing = saved.isRefetching;
  const isSearchMode = searchQuery.trim().length > 0;

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold">
        Workouts
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Recommended routines and your saved list.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search workouts..."
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={clearSearch}
          isLoading={isSearching}
        />
      </View>

      {/* Search Results or Recommended */}
      {isSearchMode ? (
        <View style={styles.section}>
          <Text variant="heading2" weight="semibold">
            Search Results
          </Text>
          {isSearching ? (
            <Text variant="caption" style={styles.recommendedNote}>
              Searching...
            </Text>
          ) : searchResults.length === 0 ? (
            <Text variant="caption" style={styles.recommendedNote}>
              No workouts found for "{searchQuery}"
            </Text>
          ) : (
            <View style={styles.searchResults}>
              {searchResults.map((item) => (
                <View key={item.id} style={styles.searchResultCard}>
                  <WorkoutCard
                    item={{
                      id: item.id,
                      title: item.exerciseName,
                      thumbnailUrl: item.thumbnailUrl,
                      youtubeId: item.youtubeId,
                      primaryCategory: item.primaryCategory,
                    }}
                    isSaved={savedWorkoutIds.has(item.id)}
                    onSave={(id) => saveWorkout.mutateAsync(id).then(() => true)}
                    onRemove={(id) => removeWorkout.mutateAsync(id).then(() => true)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
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
      )}
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
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
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
        style={[styles.fab, { bottom: fabBottomPosition }]}
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
      />
    </SafeAreaWrapper>
  );
};
