import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';

import { Button, Card, Container, ListSkeleton, RecipeCard, SafeAreaWrapper, Text } from '@/components';
import { Chip, EmptyState, ScreenHeader } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useSavedRecipes } from '@/services';
import type { RecipeCard as RecipeCardType } from '@/types';
import { COLORS, SHAPE, SPACING, spacing } from '@/utils/theme';

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
  const [sortField, setSortField] = useState<'savedAt' | 'time'>('savedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const saved = useSavedRecipes(userId);
  const listRef = useRef<FlatList<RecipeCardType>>(null);
  const [showFab, setShowFab] = useState(false);

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
          <EmptyState
            icon={<Feather name="alert-circle" size={48} color={COLORS.semantic.error} />}
            title="Unable to load user"
            description="Check your API key or network connection, then try again."
            actionLabel="Retry"
            onAction={() => currentUser.refetch()}
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  const recipes = saved.data ?? [];
  const isRefreshing = saved.isRefetching;
  const isInitialLoading = saved.isLoading;

  // Sort recipes client-side
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort((a, b) => {
      if (sortField === 'time') {
        const comparison = (a.timeMinutes ?? 0) - (b.timeMinutes ?? 0);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      // Default: savedAt - keep original order
      return sortDirection === 'asc' ? 1 : -1;
    });
  }, [recipes, sortField, sortDirection]);

  const handleRefresh = useCallback(() => {
    if (!saved.isLoading) {
      saved.refetch();
    }
  }, [saved]);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowFab(offsetY > 240);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: RecipeCardType }) => {
      return (
        <View style={styles.card}>
          <RecipeCard
            item={item}
            isSaved
          />
        </View>
      );
    },
    [],
  );

  const listEmptyComponent = (
    <EmptyState
      icon={<Feather name="book-open" size={48} color={COLORS.primary.main} />}
      title="Your saved recipes will appear here"
      description="Snap photos of your ingredients to discover healthy recipes you can make right now."
      actionLabel="Capture Ingredients"
      onAction={() => navigation.navigate('Capture')}
    />
  );

  return (
    <SafeAreaWrapper edges={['left', 'right']}>
      <FlatList
        ref={listRef}
        data={sortedRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title="My Recipes"
              subtitle={`${recipes.length} saved recipe${recipes.length !== 1 ? 's' : ''}`}
              variant="hero"
            />
            <View style={styles.sortContainer}>
              <View style={styles.sortRow}>
                <Chip
                  label="Recent"
                  variant={sortField === 'savedAt' ? 'filled' : 'tonal'}
                  onPress={() => setSortField('savedAt')}
                  icon={<Feather name="clock" size={12} color={sortField === 'savedAt' ? '#FFF' : COLORS.primary.main} />}
                />
                <Chip
                  label="Prep Time"
                  variant={sortField === 'time' ? 'filled' : 'tonal'}
                  onPress={() => setSortField('time')}
                  icon={<Feather name="activity" size={12} color={sortField === 'time' ? '#FFF' : COLORS.primary.main} />}
                />
              </View>
              <View style={styles.sortRow}>
                <Chip
                  label="Newest"
                  variant={sortDirection === 'desc' ? 'filled' : 'outlined'}
                  size="small"
                  onPress={() => setSortDirection('desc')}
                />
                <Chip
                  label="Oldest"
                  variant={sortDirection === 'asc' ? 'filled' : 'outlined'}
                  size="small"
                  onPress={() => setSortDirection('asc')}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ListSkeleton rows={4} showAvatar primaryWidth="60%" secondaryWidth="38%" />
            </View>
          ) : !saved.isLoading && !saved.isError ? (
            listEmptyComponent
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary.main}
            colors={[COLORS.primary.main]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.list}
      />
      {saved.isError && (
        <Card>
          <Text variant="body">Failed to load saved recipes.</Text>
          <Button title="Retry" variant="secondary" onPress={() => saved.refetch()} />
        </Card>
      )}
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
  list: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  card: {
    marginHorizontal: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  sortContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  sortRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  loadingContainer: {
    paddingHorizontal: SPACING.md,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    backgroundColor: COLORS.primary.main,
    borderRadius: SHAPE.borderRadius.lg,
  },
});
