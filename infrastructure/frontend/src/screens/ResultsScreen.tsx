import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaWrapper, Container, Card, Text, Button, WorkoutCard, RecipeCard } from '@/components';
import { spacing } from '@/utils';
import {
  DEFAULT_SAVED_PAGE_SIZE,
  useSavedWorkouts,
  useSaveWorkout,
  useSavedRecipes,
  useSaveRecipe,
  useRemoveWorkout,
  useRemoveRecipe,
  DEFAULT_WORKOUT_SORT,
  DEFAULT_RECIPE_SORT,
} from '@/services';
import useCurrentUser from '@/hooks/useCurrentUser';

export const ResultsScreen = () => {
  const route = useRoute<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const savedWorkouts = useSavedWorkouts(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_WORKOUT_SORT);
  const saveWorkout = useSaveWorkout(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_WORKOUT_SORT);
  const savedRecipes = useSavedRecipes(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_RECIPE_SORT);
  const saveRecipe = useSaveRecipe(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_RECIPE_SORT);
  const removeWorkout = useRemoveWorkout(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_WORKOUT_SORT);
  const removeRecipe = useRemoveRecipe(userId, DEFAULT_SAVED_PAGE_SIZE, DEFAULT_RECIPE_SORT);
  const [savedTab, setSavedTab] = useState<'workouts' | 'recipes'>('workouts');

  const hasRouteWorkouts = Array.isArray(route.params?.workouts) && route.params.workouts.length > 0;
  const hasRouteRecipes = Array.isArray(route.params?.recipes) && route.params.recipes.length > 0;

  const savedWorkoutItems = useMemo(
    () => savedWorkouts.data?.pages.flatMap((page) => page.items) ?? [],
    [savedWorkouts.data],
  );
  const savedRecipeItems = useMemo(
    () => savedRecipes.data?.pages.flatMap((page) => page.items) ?? [],
    [savedRecipes.data],
  );

  const showingRecipes = hasRouteRecipes || (!hasRouteWorkouts && !hasRouteRecipes && savedTab === 'recipes');
  const items: any[] = useMemo(() => {
    if (hasRouteRecipes) return route.params.recipes as any[];
    if (hasRouteWorkouts) return route.params.workouts as any[];
    return showingRecipes ? savedRecipeItems : savedWorkoutItems;
  }, [hasRouteRecipes, hasRouteWorkouts, route.params, showingRecipes, savedRecipeItems, savedWorkoutItems]);

  const savedWorkoutIds = useMemo(() => new Set(savedWorkoutItems.map((w) => w.id)), [savedWorkoutItems]);
  const savedRecipeIds = useMemo(() => new Set(savedRecipeItems.map((r) => r.id)), [savedRecipeItems]);

  if (!hasRouteRecipes && !hasRouteWorkouts) {
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
          <Card style={styles.fullWidthCard}>
            <Text variant="heading2" weight="bold">Unable to load user</Text>
            <Text variant="body" style={{ opacity: 0.8 }}>Check your API key or network connection, then try again.</Text>
            <Button title="Retry" onPress={() => currentUser.refetch()} />
          </Card>
        </Container>
        </SafeAreaWrapper>
      );
    }
  }

  return (
    <SafeAreaWrapper>
      <Container>
        <View style={styles.header}>
          <Image source={{ uri: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text variant="heading2" weight="bold">
              {hasRouteRecipes
                ? 'Recommended recipes'
                : hasRouteWorkouts
                ? 'Recommended workouts'
                : showingRecipes
                ? 'Saved recipes'
                : 'Saved workouts'}
            </Text>
            <Text variant="caption" style={{ opacity: 0.8 }}>Based on your selections</Text>
          </View>
        </View>

        {!hasRouteRecipes && !hasRouteWorkouts && (
          <View style={styles.toggleRow}>
            <Button
              title="Saved Workouts"
              variant={!showingRecipes ? 'primary' : 'outline'}
              onPress={() => setSavedTab('workouts')}
            />
            <Button
              title="Saved Recipes"
              variant={showingRecipes ? 'primary' : 'outline'}
              onPress={() => setSavedTab('recipes')}
            />
          </View>
        )}

        {(!hasRouteRecipes && !hasRouteWorkouts) && ((showingRecipes && savedRecipes.isError) || (!showingRecipes && savedWorkouts.isError)) && (
          <Card style={styles.fullWidthCard}>
            <Text variant="body">Failed to load your saved {showingRecipes ? 'recipes' : 'workouts'}.</Text>
            <Button
              title="Retry"
              variant="outline"
              onPress={() => (showingRecipes ? savedRecipes.refetch() : savedWorkouts.refetch())}
            />
          </Card>
        )}

        <View style={styles.grid}>
          {items.map((it) => {
            const isSaved = showingRecipes
              ? savedRecipeIds.has(it.id) || it.alreadySaved
              : savedWorkoutIds.has(it.id) || it.alreadySaved;
            return (
              <View key={it.id} style={styles.card}>
                {showingRecipes ? (
                  <RecipeCard
                    item={it}
                    isSaved={isSaved}
                    onSave={async (id): Promise<void> => { await saveRecipe.mutateAsync(id); }}
                    onRemove={async (id): Promise<void> => { await removeRecipe.mutateAsync(id); }}
                  />
                ) : (
                  <WorkoutCard
                    item={it}
                    isSaved={isSaved}
                    onSave={async (id): Promise<void> => { await saveWorkout.mutateAsync(id); }}
                    onRemove={async (id): Promise<void> => { await removeWorkout.mutateAsync(id); }}
                  />
                )}
                {isSaved && (
                  <Text variant="caption" style={styles.savedTag}>已保存到你的收藏</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text variant="caption" style={{ opacity: 0.8 }}>Not what you're looking for?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Try Again" variant="outline" />
            <Button title="Browse All" />
          </View>
        </View>
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  fullWidthCard: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  card: { width: '48%' },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  savedTag: {
    marginTop: spacing.xs,
    color: '#f97316',
    opacity: 0.85,
  },
});
