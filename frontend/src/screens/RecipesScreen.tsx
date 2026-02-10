import { TourGuideZone } from '@/components/tour/TourProvider';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, RecipeCard, SafeAreaWrapper, SearchBar, SearchSuggestions, Text, type SuggestionItem } from '@/components';
import { ScreenLayout } from '@/components/layout';
import { RECIPES_TOUR_STEP } from '@/config/tourSteps';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedRecipes, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import { RecipeSearchResult, searchRecipes } from '@/services/searchApi';
import type { SavedRecipe } from '@/types';
import { getTheme, spacing, useContentBottomPadding, useFABBottomPosition, useSidebarVisible } from '@/utils';

// Recipe search suggestions with fun icons
const RECIPE_SUGGESTIONS: SuggestionItem[] = [
  { id: 'salad', label: 'Salad', icon: 'food-apple', color: '#10B981' },
  { id: 'chicken', label: 'Chicken', icon: 'food-drumstick', color: '#F59E0B' },
  { id: 'smoothie', label: 'Smoothie', icon: 'cup-water', color: '#EC4899' },
  { id: 'pasta', label: 'Pasta', icon: 'pasta', color: '#EF4444' },
  { id: 'breakfast', label: 'Breakfast', icon: 'egg-fried', color: '#F97316' },
  { id: 'soup', label: 'Soup', icon: 'bowl-mix', color: '#8B5CF6' },
  { id: 'fish', label: 'Fish', icon: 'fish', color: '#06B6D4' },
  { id: 'vegetarian', label: 'Vegetarian', icon: 'leaf', color: '#22C55E' },
];

const RECIPE_SUGGESTION_SEARCH_FALLBACKS: Record<string, string[]> = {
  salad: ['salad', 'vegetable', 'veggie'],
  chicken: ['chicken', 'grilled chicken', 'protein'],
  smoothie: ['smoothie', 'shake', 'drink'],
  pasta: ['pasta', 'noodle', 'spaghetti'],
  breakfast: ['breakfast', 'egg', 'oatmeal'],
  soup: ['soup', 'broth', 'stew'],
  fish: ['fish', 'salmon', 'seafood'],
  vegetarian: ['vegetarian', 'veggie', 'plant based'],
};

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

export const RecipesScreen = () => {
  // Always use light mode
  const theme = getTheme('light');
  const route = useRoute<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const userGoal = currentUser.data?.profile?.fitnessGoal;
  const showSidebar = useSidebarVisible();

  const saved = useSavedRecipes(userId);
  // Use dedicated recipe recommendations API
  const recommended = useRecommendedRecipes(userGoal, userId);
  const saveRecipe = useSaveRecipe(userId);
  const removeRecipe = useRemoveRecipe(userId);
  const listRef = useRef<FlatList<SavedRecipe>>(null);
  const [showFab, setShowFab] = useState(false);
  const savedRecipes = saved.data ?? [];
  const savedRecipeIds = useMemo(() => new Set(savedRecipes.map((item) => item.id)), [savedRecipes]);
  const recommendedRecipes = recommended.data ?? [];

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecipeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasActiveSearch, setHasActiveSearch] = useState(false); // Track if user has initiated a search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mobileBottomPadding = useContentBottomPadding(spacing.lg);
  const listBottomPadding = showSidebar ? spacing['2xl'] : mobileBottomPadding;
  const fabBottomPosition = useFABBottomPosition(spacing.md);

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const handleSearchFocusChange = useCallback((focused: boolean) => {
    clearBlurTimeout();

    if (focused) {
      setIsSearchFocused(true);
      return;
    }

    blurTimeoutRef.current = setTimeout(() => {
      setIsSearchFocused(false);
      blurTimeoutRef.current = null;
    }, 120);
  }, [clearBlurTimeout]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchRecipes(query, 20);
        setSearchResults(results);
      } catch (error) {
        console.error('[RecipesScreen] Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Handle initial search from navigation params (e.g. from Dashboard macro icons)
  useEffect(() => {
    const initialQuery = route.params?.initialSearchQuery;
    if (initialQuery) {
      handleSearch(initialQuery);
      setHasActiveSearch(true);
      // Optional: scroll to top if not already there
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [route.params?.initialSearchQuery, handleSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setHasActiveSearch(false);
  }, []);

  const handleSuggestionSelect = useCallback(async (suggestion: SuggestionItem) => {
    // Clear any pending debounce
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    clearBlurTimeout();

    // Set query and mark active search BEFORE async call to prevent UI from hiding
    setIsSearchFocused(true);
    setSearchQuery(suggestion.label);
    setHasActiveSearch(true);
    setIsSearching(true);

    const queries = RECIPE_SUGGESTION_SEARCH_FALLBACKS[suggestion.id] ?? [suggestion.label];
    let resolvedResults: RecipeSearchResult[] = [];

    for (const query of queries) {
      try {
        const results = await searchRecipes(query, 20);
        if (results.length > 0) {
          resolvedResults = results;
          break;
        }
      } catch (error) {
        console.error('[RecipesScreen] Suggestion search failed:', error);
      }
    }

    setSearchResults(resolvedResults);
    setIsSearching(false);
  }, [clearBlurTimeout]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

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
    ({ item }: { item: SavedRecipe }) => {
      const time = item.timeMinutes ?? 0;
      const calories = item.calories ?? 0;
      const meta = time + ' min · ' + calories + ' cal';

      return (
        <View style={styles.card}>
          <RecipeCard
            item={item}
            isSaved
            onRemove={(id) => removeRecipe.mutateAsync(id).then(() => true)}
          />
          <Text variant="caption" style={[styles.savedAt, { color: theme.colors.textSecondary }]}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeRecipe, theme],
  );

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <View style={styles.header}>
            <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
              Recipes
            </Text>
            <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Recommended meals and your saved list.
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
            title="Unable to load recipes"
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

  const recipes = savedRecipes;
  const isRefreshing = saved.isRefetching;
  const isSearchMode = searchQuery.trim().length > 0;
  // Show search UI when focused, has query text, or has an active search in progress
  const showSearchUI = isSearchFocused || isSearchMode || hasActiveSearch;

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
        Recipes
      </Text>
      <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Healthy meals and your saved list.
      </Text>

      {/* Search Bar - Tour Zone 5 */}
      <TourGuideZone
        zone={RECIPES_TOUR_STEP.zone}
        text={RECIPES_TOUR_STEP.text}
        title={RECIPES_TOUR_STEP.title}
        shape="rectangle"
        borderRadius={12}
      >
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={clearSearch}
            onFocusChange={handleSearchFocusChange}
            isLoading={isSearching}
          />
        </View>
      </TourGuideZone>

      {/* Search Suggestions - only when focused and query is empty */}
      {isSearchFocused && !isSearchMode && (
        <View style={styles.suggestionsSection}>
          <SearchSuggestions
            suggestions={RECIPE_SUGGESTIONS}
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
              No recipes found for "{searchQuery}"
            </Text>
          ) : (
            <View style={styles.searchResults}>
              {searchResults.map((item) => (
                <View key={item.id} style={styles.searchResultCard}>
                  <RecipeCard
                    item={{
                      id: item.id,
                      title: item.title,
                      imageUrl: item.imageUrl ?? undefined,
                      timeMinutes: item.timeMinutes,
                      difficulty: (item.difficulty as 'easy' | 'medium' | 'hard') || 'easy',
                      calories: item.calories ?? undefined,
                    }}
                    disableHoverEffect
                    isSaved={savedRecipeIds.has(item.id)}
                    onSave={(id) => saveRecipe.mutateAsync(id).then(() => true)}
                    onRemove={(id) => removeRecipe.mutateAsync(id).then(() => true)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recommended Recipes Section - hidden when search UI is active */}
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
          ) : recommendedRecipes.length === 0 ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
              No recommendations yet.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedList}
            >
              {recommendedRecipes.map((item) => (
                <View key={item.id} style={styles.recommendedCard}>
                  <RecipeCard
                    item={item}
                    isSaved={savedRecipeIds.has(item.id)}
                    onSave={(id) => saveRecipe.mutateAsync(id).then(() => true)}
                    onRemove={(id) => removeRecipe.mutateAsync(id).then(() => true)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaWrapper>
      <ScreenLayout scrollable={false}>
        <Container style={styles.container}>
          <FlatList
            ref={listRef}
            data={[]} // Saved recipes moved to SavedRecipesScreen
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
            ItemSeparatorComponent={ItemSeparator}
            ListHeaderComponent={listHeaderComponent}
            ListEmptyComponent={null}
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
        {/* Hide FAB on desktop */}
        {!showSidebar && (
          <FAB
            icon="arrow-up"
            style={[styles.fab, { bottom: fabBottomPosition, backgroundColor: theme.colors.primary }]}
            color="#FFFFFF"
            mode="elevated"
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            visible={showFab}
          />
        )}
      </ScreenLayout>
    </SafeAreaWrapper>
  );
};
