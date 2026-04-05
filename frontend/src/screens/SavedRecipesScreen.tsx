/**
 * SavedRecipesScreen - Dedicated screen for viewing saved recipes from Profile
 * Uses the industry standard Tab > Stack > Screen architecture
 */
import { ArrowLeft, BookOpen, WarningCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import {
    Container,
    EmptyStateCard,
    ListSkeleton,
    RecipeCard,
    SafeAreaWrapper,
    Text,
} from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRemoveRecipe, useSavedRecipes } from '@/services';
import type { SavedRecipe } from '@/types';
import { getTheme, spacing, useContentBottomPadding } from '@/utils';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  savedAt: {
    opacity: 0.68,
    marginTop: spacing.xs,
  },
});

const ItemSeparator = () => <View style={{ height: spacing.md }} />;

export const SavedRecipesScreen = () => {
  const theme = getTheme('light');
  const navigation = useNavigation();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedRecipes(userId);
  const removeRecipe = useRemoveRecipe(userId);

  const savedRecipes = saved.data ?? [];
  const listBottomPadding = useContentBottomPadding(spacing.lg);

  const listEmptyComponent = useMemo(
    () => (
      <EmptyStateCard
        icon={<BookOpen size={32} color={theme.colors.primary} weight="fill" />}
        title="No saved recipes yet"
        subtitle="Save recipes from the Recipes tab to see them here"
        variant="single"
      />
    ),
    [theme]
  );

  const handleRefresh = useCallback(() => {
    if (!saved.isLoading) {
      saved.refetch();
    }
  }, [saved]);

  const renderItem = useCallback(
    ({ item }: { item: SavedRecipe }) => {
      const time = item.timeMinutes ?? 0;
      const calories = item.calories ?? 0;
      const meta = `${time} min · ${calories} cal`;

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
    [removeRecipe, theme]
  );

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container style={styles.container}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Text variant="heading2" weight="bold" style={styles.headerTitle}>
              Saved Recipes
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
        <Container style={styles.container}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Text variant="heading2" weight="bold" style={styles.headerTitle}>
              Saved Recipes
            </Text>
          </View>
          <EmptyStateCard
            icon={<WarningCircle size={32} color={theme.colors.error} />}
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

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          data={savedRecipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={listEmptyComponent}
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color={theme.colors.textPrimary} />
              </Pressable>
              <Text variant="heading2" weight="bold" style={styles.headerTitle}>
                Saved Recipes
              </Text>
            </View>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={saved.isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      </Container>
    </SafeAreaWrapper>
  );
};

export default SavedRecipesScreen;
