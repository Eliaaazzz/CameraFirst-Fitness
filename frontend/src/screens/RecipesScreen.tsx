import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, RecipeCard, SafeAreaWrapper, SearchBar, Text } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedRecipes, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import { searchRecipes, RecipeSearchResult } from '@/services/searchApi';
import type { SavedRecipe } from '@/types';
import { spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';

export const RecipesScreen = () => {
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
          <Text variant="caption" style={styles.savedAt}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeRecipe],
  );

  const listEmptyComponent = useMemo(() => (
    <EmptyStateCard
      icon={<Feather name="coffee" size={32} color="#4ECDC4" />}
      title="Your saved recipes will appear here"
      variant="single"
    />
  ), []);

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <View style={styles.header}>
            <Text variant="heading1" weight="bold">
              Recipes
            </Text>
            <Text variant="body" style={styles.subtitle}>
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
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />}
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

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold">
        Recipes
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Healthy meals and your saved list.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search recipes..."
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={clearSearch}
          isLoading={isSearching}
        />
      </View>

      {/* Search Results or Recommended Recipes */}
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
      ) : (
        /* Recommended Recipes Section */
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
        ) : recommendedRecipes.length === 0 ? (
          <Text variant="caption" style={styles.recommendedNote}>
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
      <Text variant="heading2" weight="semibold" style={styles.savedHeader}>
        Saved Recipes
      </Text>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
  savedAt: {
    opacity: 0.68,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});
