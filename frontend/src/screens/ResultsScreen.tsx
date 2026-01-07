import { Button, Card, Container, RecipeCard, SafeAreaWrapper, Text, WorkoutCard } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
  useRemoveRecipe,
  useRemoveWorkout,
  useSavedRecipes,
  useSavedWorkouts,
  useSaveRecipe,
  useSaveWorkout,
} from '@/services';
import { spacing } from '@/utils';
import { useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

export const ResultsScreen = () => {
  const route = useRoute<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const savedWorkouts = useSavedWorkouts(userId);
  const saveWorkout = useSaveWorkout(userId);
  const savedRecipes = useSavedRecipes(userId);
  const saveRecipe = useSaveRecipe(userId);
  const removeWorkout = useRemoveWorkout(userId);
  const removeRecipe = useRemoveRecipe(userId);
  const [savedTab, setSavedTab] = useState<'workouts' | 'recipes'>('workouts');

  const hasRouteWorkouts = Array.isArray(route.params?.workouts) && route.params.workouts.length > 0;
  const hasRouteRecipes = Array.isArray(route.params?.recipes) && route.params.recipes.length > 0;

  const savedWorkoutItems = useMemo(
    () => savedWorkouts.data ?? [],
    [savedWorkouts.data],
  );
  const savedRecipeItems = useMemo(
    () => savedRecipes.data ?? [],
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <Container>
          <View style={styles.header}>
            <Image source={{ uri: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }} style={styles.thumb} />
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
                      onSave={(id) => saveRecipe.mutateAsync(id).then(() => true)}
                      onRemove={(id) => removeRecipe.mutateAsync(id).then(() => true)}
                    />
                  ) : (
                    <WorkoutCard
                      item={it}
                      isSaved={isSaved}
                      onSave={(id) => saveWorkout.mutateAsync(id).then(() => true)}
                      onRemove={(id) => removeWorkout.mutateAsync(id).then(() => true)}
                    />
                  )}
                  {isSaved && (
                    <Text variant="caption" style={styles.savedTag}>Saved to your library</Text>
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
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
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
