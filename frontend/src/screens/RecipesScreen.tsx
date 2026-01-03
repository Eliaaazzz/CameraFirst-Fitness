import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, RecipeCard, SafeAreaWrapper, SearchBar, SearchSuggestions, Text, type SuggestionItem } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedRecipes, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import { RecipeSearchResult, searchRecipes } from '@/services/searchApi';
import type { SavedRecipe } from '@/types';
import { spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';
import { getTheme } from '@/utils/theme';

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

export const RecipesScreen = () => {
  // Always use light mode
  const theme = getTheme('light');

  // All hooks must be called before any early returns
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const userGoal = currentUser.data?.profile?.fitnessGoal;

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate bottom padding for content using shared utility
  // These hooks MUST be called before any conditional returns
  const listBottomPadding = useContentBottomPadding(spacing.lg);
  const fabBottomPosition = useFABBottomPosition(spacing.md);

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

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: SuggestionItem) => {
    handleSearch(suggestion.label);
  }, [handleSearch]);

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

  const listEmptyComponent = useMemo(() => (
    <EmptyStateCard
      icon={<Feather name="coffee" size={32} color={theme.colors.primary} />}
      title="Your saved recipes will appear here"
      variant="single"
    />
  ), [theme]);

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
  // Show search UI when focused or has query text
  const showSearchUI = isSearchFocused || isSearchMode;

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
        Recipes
      </Text>
      <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Healthy meals and your saved list.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search recipes..."
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
                      imageUrl: item.imageUrl,
                      timeMinutes: item.timeMinutes,
                      difficulty: item.difficulty,
                      calories: item.calories,
                      protein: item.protein,
                    }}
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

      {/* Saved Recipes Header - hidden when search UI is active */}
      {!showSearchUI && (
        <Text variant="heading2" weight="semibold" style={[styles.savedHeader, { color: theme.colors.textPrimary }]}>
          Saved Recipes
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={showSearchUI ? [] : recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
        color="#FFFFFF"
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
      />
    </SafeAreaWrapper>
  );
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
