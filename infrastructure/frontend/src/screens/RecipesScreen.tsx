import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, FAB, IconButton, SegmentedButtons } from 'react-native-paper';

import { Button, Card, Container, FilterModal, ListSkeleton, SafeAreaWrapper, SwipeableCard, Text, RecipeCard, type RecipeFilters } from '@/components';
import { spacing } from '@/utils';
import { DEFAULT_SAVED_PAGE_SIZE, useSavedRecipes, useRemoveRecipe, DEFAULT_RECIPE_SORT } from '@/services';
import type { SavedRecipe, SortDirection, RecipeSortField, RecipeSortOption } from '@/types';
import useCurrentUser from '@/hooks/useCurrentUser';

type TabParamList = {
  Capture: undefined;
  Workouts: undefined;
  Recipes: undefined;
  DesignSystem?: undefined;
};

export const RecipesScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const [sortField, setSortField] = useState<RecipeSortField>('savedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_RECIPE_SORT.direction);
  const sortOption = useMemo<RecipeSortOption>(() => ({ field: sortField, direction: sortDirection }), [sortField, sortDirection]);
  const saved = useSavedRecipes(userId, DEFAULT_SAVED_PAGE_SIZE, sortOption);
  const removeRecipe = useRemoveRecipe(userId, DEFAULT_SAVED_PAGE_SIZE, sortOption);
  const listRef = useRef<FlatList<SavedRecipe>>(null);
  const [showFab, setShowFab] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({});

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

  const allRecipes = useMemo(
    () => saved.data?.pages.flatMap((page) => page.items) ?? [],
    [saved.data],
  );

  const recipes = useMemo(() => {
    let result = allRecipes;

    // Filter by difficulty
    if (filters.difficulties?.length) {
      result = result.filter((r) =>
        filters.difficulties!.includes(r.difficulty?.toUpperCase() || '')
      );
    }

    // Filter by prep time
    if (filters.timeRange) {
      const { min, max } = filters.timeRange;
      result = result.filter((r) =>
        r.timeMinutes && r.timeMinutes >= min && r.timeMinutes <= max
      );
    }

    return result;
  }, [allRecipes, filters]);

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
    ({ item }: { item: SavedRecipe }) => {
      const savedLabel = item.savedAt ? new Date(item.savedAt).toLocaleString() : '—';
      const time = item.timeMinutes ?? 0;
      const meta = sortField === 'time'
        ? `${time} min · saved ${savedLabel}`
        : `${time} min · difficulty ${item.difficulty?.toUpperCase?.() ?? '—'}`;

      return (
        <SwipeableCard
          onDelete={async () => { await removeRecipe.mutateAsync(item.id); }}
          deleteTitle="Remove Recipe"
          deleteMessage={`Remove "${item.title}" from your saved recipes?`}
          deleteLabel="Remove"
        >
          <View style={styles.card}>
            <RecipeCard
              item={item}
              isSaved
              onRemove={(id) => removeRecipe.mutateAsync(id)}
            />
            <Text variant="caption" style={styles.savedAt}>
              {meta}
            </Text>
          </View>
        </SwipeableCard>
      );
    },
    [removeRecipe, sortField],
  );

  const listEmptyComponent = (
    <Card style={styles.emptyState}>
      <View style={styles.iconWrapper}>
        <Feather name="coffee" size={48} color="#FF6B6B" />
      </View>
      <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
        Your saved recipes will appear here
      </Text>
      <Text variant="body" style={styles.emptyBody}>
        Snap photos of your ingredients to discover healthy recipes you can make right now.
      </Text>
      <Button title="Capture Ingredients" variant="secondary" onPress={() => navigation.navigate('Capture')} />
    </Card>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text variant="heading1" weight="bold">
                Saved Recipes
              </Text>
              <Text variant="body" style={styles.subtitle}>
                Curate comforting meals for every goal.
              </Text>
              <View style={styles.sortGroups}>
                <View style={styles.filterRow}>
                  <SegmentedButtons
                    value={sortField}
                    onValueChange={(value) => setSortField(value as RecipeSortField)}
                    buttons={[
                      { value: 'savedAt', label: 'Recent' },
                      { value: 'time', label: 'Prep Time' },
                    ]}
                    density="small"
                    style={styles.segmentedWithFilter}
                  />
                  <IconButton
                    icon="filter-variant"
                    mode="contained-tonal"
                    onPress={() => setShowFilterModal(true)}
                    accessibilityLabel="Filter recipes"
                  />
                </View>
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
              <ListSkeleton rows={4} showAvatar primaryWidth="60%" secondaryWidth="38%" />
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
              tintColor="#FF6B6B"
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleLoadMore}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
        {saved.isError && (
          <Card>
            <Text variant="body">Failed to load saved recipes.</Text>
            <Button title="Retry" variant="secondary" onPress={() => saved.refetch()} />
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
      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
        onClose={() => setShowFilterModal(false)}
        type="recipe"
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  segmented: {
    marginTop: spacing.sm,
  },
  segmentedWithFilter: {
    marginTop: spacing.sm,
    flex: 1,
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
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
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
