import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, RecipeCard, SafeAreaWrapper, Text } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecommendedRecipes, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import type { SavedRecipe } from '@/types';
import { spacing } from '@/utils';

type TabParamList = {
  Dashboard: undefined;
  Workouts: undefined;
  Recipes: undefined;
};

export const RecipesScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedRecipes(userId);
  const recommended = useRecommendedRecipes(currentUser.data?.profile?.fitnessGoal);
  const saveRecipe = useSaveRecipe(userId);
  const removeRecipe = useRemoveRecipe(userId);
  const listRef = useRef<FlatList<SavedRecipe>>(null);
  const [showFab, setShowFab] = useState(false);
  const savedRecipes = saved.data ?? [];
  const savedRecipeIds = useMemo(() => new Set(savedRecipes.map((item) => item.id)), [savedRecipes]);
  const recommendedItems = recommended.data ?? [];

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
          <Card style={styles.emptyState}>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
              Unable to load recipes
            </Text>
            <Text variant="body" style={styles.emptyBody}>
              Check your network connection and try again.
            </Text>
            <Button 
              title="Retry"
              variant="primary" 
              onPress={() => {
                currentUser.refetch();
                saved.refetch();
              }}
            />
          </Card>
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
        Recommended meals and your saved list.
      </Text>
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

  const listEmptyComponent = (
    <Card style={styles.emptyState}>
      <View style={styles.iconWrapper}>
        <Feather name="coffee" size={48} color="#4ECDC4" />
      </View>
      <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
        Your saved recipes will appear here
      </Text>
      <Text variant="body" style={styles.emptyBody}>
        Capture your ingredients to get recipe recommendations tailored to what you have.
      </Text>
      <Button title="Snap Your Meal" variant="primary" onPress={() => navigation.navigate('Dashboard')} />
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
            listHeaderComponent
          }
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
        style={styles.fab}
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  iconWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyBody: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
    paddingHorizontal: spacing.lg,
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
