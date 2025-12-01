import { Button, Card, Container, RecipeCard, SafeAreaWrapper, Text, WorkoutCard } from '@/components';
import { Chip, ScreenHeader } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
    useRemoveRecipe,
    useRemoveWorkout,
    useSavedRecipes,
    useSavedWorkouts,
    useSaveRecipe,
    useSaveWorkout,
} from '@/services';
import type { RecipeCard as RecipeCardType, WorkoutCard as WorkoutCardType } from '@/types';
import { BORDER_RADIUS, COLORS, SPACING } from '@/utils';
import { Feather } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

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
  const items: (WorkoutCardType | RecipeCardType)[] = useMemo(() => {
    if (hasRouteRecipes) return route.params.recipes as RecipeCardType[];
    if (hasRouteWorkouts) return route.params.workouts as WorkoutCardType[];
    return showingRecipes ? savedRecipeItems : savedWorkoutItems;
  }, [hasRouteRecipes, hasRouteWorkouts, route.params, showingRecipes, savedRecipeItems, savedWorkoutItems]);

  const savedWorkoutIds = useMemo(() => new Set(savedWorkoutItems.map((w: WorkoutCardType) => w.id)), [savedWorkoutItems]);
  const savedRecipeIds = useMemo(() => new Set(savedRecipeItems.map((r: RecipeCardType) => r.id)), [savedRecipeItems]);

  // Get title and subtitle based on context
  const getHeaderInfo = () => {
    if (hasRouteRecipes) return { title: '🍽️ Recommended Recipes', subtitle: 'Based on your selections' };
    if (hasRouteWorkouts) return { title: '💪 Recommended Workouts', subtitle: 'Based on your selections' };
    if (showingRecipes) return { title: '📚 Saved Recipes', subtitle: `${savedRecipeItems.length} items in your collection` };
    return { title: '📚 Saved Workouts', subtitle: `${savedWorkoutItems.length} items in your collection` };
  };

  const headerInfo = getHeaderInfo();

  if (!hasRouteRecipes && !hasRouteWorkouts) {
    if (currentUser.isLoading) {
      return (
        <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
          <ScreenHeader title="📚 My Library" subtitle="Loading your profile..." variant="compact" />
          <Container style={styles.container}>
            <Card style={styles.loadingCard}>
              <View style={styles.loadingContent}>
                <Feather name="loader" size={32} color={COLORS.primary.main} />
                <Text variant="body">Loading your profile…</Text>
              </View>
            </Card>
          </Container>
        </SafeAreaWrapper>
      );
    }

    if (currentUser.isError) {
      return (
        <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
          <ScreenHeader title="📚 My Library" subtitle="Error loading data" variant="compact" />
          <Container style={styles.container}>
            <Card style={styles.fullWidthCard}>
              <View style={styles.errorContent}>
                <Feather name="alert-circle" size={48} color={COLORS.semantic.error} />
                <Text variant="heading2" weight="bold">Unable to load user</Text>
                <Text variant="body" style={styles.errorText}>Check your API key or network connection, then try again.</Text>
                <Button title="Retry" onPress={() => currentUser.refetch()} />
              </View>
            </Card>
          </Container>
        </SafeAreaWrapper>
      );
    }
  }

  return (
    <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
      <ScreenHeader title={headerInfo.title} subtitle={headerInfo.subtitle} variant="compact" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Container style={styles.container}>
          {!hasRouteRecipes && !hasRouteWorkouts && (
            <SegmentedButtons
              value={savedTab}
              onValueChange={(value) => setSavedTab(value as 'workouts' | 'recipes')}
              buttons={[
                { value: 'workouts', label: '💪 Workouts', icon: 'dumbbell' },
                { value: 'recipes', label: '🍽️ Recipes', icon: 'food' },
              ]}
              density="regular"
              style={styles.segmentedButtons}
              theme={{
                colors: {
                  secondaryContainer: COLORS.primary.main + '30',
                  onSecondaryContainer: COLORS.primary.main,
                },
              }}
            />
          )}

        {(!hasRouteRecipes && !hasRouteWorkouts) && ((showingRecipes && savedRecipes.isError) || (!showingRecipes && savedWorkouts.isError)) && (
          <Card style={styles.fullWidthCard}>
            <View style={styles.errorContent}>
              <Feather name="wifi-off" size={32} color={COLORS.semantic.error} />
              <Text variant="body">Failed to load your saved {showingRecipes ? 'recipes' : 'workouts'}.</Text>
              <Button
                title="Retry"
                variant="outline"
                onPress={() => (showingRecipes ? savedRecipes.refetch() : savedWorkouts.refetch())}
              />
            </View>
          </Card>
        )}

        {items.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Feather name={showingRecipes ? 'book-open' : 'activity'} size={48} color={COLORS.primary.main} />
              <Text variant="heading2" weight="bold">No {showingRecipes ? 'recipes' : 'workouts'} saved</Text>
              <Text variant="body" style={styles.emptyText}>
                Start exploring and save items you like!
              </Text>
              <Button title={`Browse ${showingRecipes ? 'Recipes' : 'Workouts'}`} />
            </View>
          </Card>
        ) : (
          <View style={styles.grid}>
            {items.map((it) => {
              const isSaved = showingRecipes
                ? savedRecipeIds.has(it.id) || (it as any).alreadySaved
                : savedWorkoutIds.has(it.id) || (it as any).alreadySaved;
              return (
                <View key={it.id} style={styles.card}>
                  {showingRecipes ? (
                    <RecipeCard
                      item={it as RecipeCardType}
                      isSaved={isSaved}
                      onSave={(id) => saveRecipe.mutateAsync(id)}
                      onRemove={(id) => removeRecipe.mutateAsync(id)}
                    />
                  ) : (
                    <WorkoutCard
                      item={it as WorkoutCardType}
                      isSaved={isSaved}
                      onSave={(id) => saveWorkout.mutateAsync(id)}
                      onRemove={(id) => removeWorkout.mutateAsync(id)}
                    />
                  )}
                  {isSaved && (
                    <Chip 
                      label="✓ Saved" 
                      variant="tonal" 
                      color="success" 
                      size="small" 
                      style={styles.savedChip}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.dark.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  loadingCard: {
    borderRadius: BORDER_RADIUS,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  fullWidthCard: {
    width: '100%',
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS,
  },
  errorContent: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  errorText: {
    opacity: 0.8,
    textAlign: 'center',
    color: COLORS.text.secondary,
  },
  segmentedButtons: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS,
  },
  emptyCard: {
    borderRadius: BORDER_RADIUS,
  },
  emptyContent: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
    color: COLORS.text.secondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  card: { 
    width: '48%',
    marginBottom: SPACING.xs,
  },
  savedChip: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
});
