import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, RecipeCard, SafeAreaWrapper, Text } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedRecipes, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import type { SavedRecipe } from '@/types';
import { spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';

export const RecipesScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const userGoal = currentUser.data?.profile?.fitnessGoal;

  // Calculate bottom padding for content using shared utility
  const listBottomPadding = useContentBottomPadding(spacing.lg);
  const fabBottomPosition = useFABBottomPosition(spacing.md);

  const saved = useSavedRecipes(userId);
  // Use dedicated recipe recommendations API
  const recommended = useRecommendedRecipes(userGoal);
  const saveRecipe = useSaveRecipe(userId);
  const removeRecipe = useRemoveRecipe(userId);
  const listRef = useRef<FlatList<SavedRecipe>>(null);
  const [showFab, setShowFab] = useState(false);
  const savedRecipes = saved.data ?? [];
  const savedRecipeIds = useMemo(() => new Set(savedRecipes.map((item) => item.id)), [savedRecipes]);
  const recommendedRecipes = recommended.data ?? [];

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

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold">
        Recipes
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Healthy meals and your saved list.
      </Text>

      {/* Recommended Recipes Section */}
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
      <Text variant="heading2" weight="semibold" style={styles.savedHeader}>
        Saved Recipes
      </Text>
    </View>
  );

  const listEmptyComponent = useMemo(() => (
    <EmptyStateCard
      icon={<Feather name="coffee" size={32} color="#4ECDC4" />}
      title="Your saved recipes will appear here"
      variant="single"
    />
  ), []);

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
  savedAt: {
    opacity: 0.68,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});
