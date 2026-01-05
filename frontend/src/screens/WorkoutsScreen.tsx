import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, SafeAreaWrapper, SearchBar, SearchSuggestions, Text, WorkoutCard, type SuggestionItem } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedWorkouts, useRemoveWorkout, useSavedWorkouts, useSaveWorkout } from '@/services';
import { searchWorkouts, WorkoutSearchResult } from '@/services/searchApi';
import type { SavedWorkout } from '@/types';
import { getTheme, spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';

// Workout search suggestions with fun icons
const WORKOUT_SUGGESTIONS: SuggestionItem[] = [
  { id: 'hiit', label: 'HIIT', icon: 'fire', color: '#EF4444' },
  { id: 'yoga', label: 'Yoga', icon: 'yoga', color: '#8B5CF6' },
  { id: 'strength', label: 'Strength', icon: 'dumbbell', color: '#F59E0B' },
  { id: 'cardio', label: 'Cardio', icon: 'run-fast', color: '#EC4899' },
  { id: 'abs', label: 'Abs', icon: 'human', color: '#06B6D4' },
  { id: 'stretch', label: 'Stretching', icon: 'human-handsup', color: '#10B981' },
  { id: 'legs', label: 'Legs', icon: 'walk', color: '#F97316' },
  { id: 'arms', label: 'Arms', icon: 'arm-flex', color: '#3B82F6' },
];

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
  suggestionsSection: {
    marginTop: spacing.sm,
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
  noResultsText: {
    opacity: 0.6,
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
  // Always use light mode
  const theme = getTheme('light');
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSuggestionSelect = useCallback((suggestion: SuggestionItem) => {
    handleSearch(suggestion.label);
  }, [handleSearch]);

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
          <Text variant="caption" style={[styles.savedAt, { color: theme.colors.textSecondary }]}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeWorkout, theme],
  );

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <View style={styles.header}>
            <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
              Workouts
            </Text>
            <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.error} />}
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
  // Show search UI when focused or has query text
  const showSearchUI = isSearchFocused || isSearchMode;

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
        Workouts
      </Text>
      <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Recommended routines and your saved list.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search workouts..."
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={clearSearch}
          onFocusChange={setIsSearchFocused}
          isLoading={isSearching}
        />
      </View>

      {/* Search Suggestions - only visible when search is focused */}
      {showSearchUI && (
        <View style={styles.suggestionsSection}>
          <SearchSuggestions
            suggestions={WORKOUT_SUGGESTIONS}
            onSelect={handleSuggestionSelect}
            title="Popular searches"
          />
        </View>
      )}

      {/* Search Results - only when has query text */}
      {isSearchMode && (
        <View style={styles.section}>
          <Text variant="heading2" weight="semibold" style={{ color: theme.colors.textPrimary }}>
            Search Results
          </Text>
          {isSearching ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
              Searching...
            </Text>
          ) : searchResults.length === 0 ? (
            <Text variant="caption" style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
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
                      thumbnailUrl: item.thumbnailUrl ?? undefined,
                      youtubeId: item.youtubeId,
                      durationMinutes: 5,
                      level: 'intermediate',
                      equipment: [],
                      bodyPart: [item.primaryCategory],
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
      )}

      {/* Recommended Section - hidden when search UI is active */}
      {!showSearchUI && (
        <View style={styles.section}>
          <Text variant="heading2" weight="semibold" style={{ color: theme.colors.textPrimary }}>
            Recommended for you
          </Text>
          {recommended.isLoading ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
              Loading recommendations...
            </Text>
          ) : recommended.isError ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
              Unable to load recommendations.
            </Text>
          ) : recommendedItems.length === 0 ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
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

      {/* Saved Workouts Header - hidden when search UI is active */}
      {!showSearchUI && (
        <Text variant="heading2" weight="semibold" style={[styles.savedHeader, { color: theme.colors.textPrimary }]}>
          Saved Workouts
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={showSearchUI ? [] : workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={showSearchUI ? null : listEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Container>
      <FAB
        icon="arrow-up"
        style={[styles.fab, { bottom: fabBottomPosition, backgroundColor: theme.colors.primary }]}
        color="#FFF"
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
      />
    </SafeAreaWrapper>
  );
};
