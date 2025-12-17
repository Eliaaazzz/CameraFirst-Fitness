import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, RecipeCard, SafeAreaWrapper, Text } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useSavedRecipes } from '@/services';
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
  const listRef = useRef<FlatList<SavedRecipe>>(null);
  const [showFab, setShowFab] = useState(false);

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
              Saved Recipes
            </Text>
            <Text variant="body" style={styles.subtitle}>
              Healthy eating made simple.
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

  const recipes = saved.data ?? [];
  const isRefreshing = saved.isRefetching;

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
            <View style={styles.header}>
              <Text variant="heading1" weight="bold">
                Saved Recipes
              </Text>
              <Text variant="body" style={styles.subtitle}>
                Healthy eating made simple.
              </Text>
            </View>
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
