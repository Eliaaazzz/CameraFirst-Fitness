/**
 * SavedRecipesScreen - Dedicated screen for viewing saved recipes from Profile
 * Uses the industry standard Tab > Stack > Screen architecture
 */
import { ArrowLeft, BookOpen, WarningCircle } from 'phosphor-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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

  const goToRecipes = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'Main', params: { screen: 'Recipes' } })
    );
  }, [navigation]);

  const listEmptyComponent = useMemo(
    () => (
      <Animated.View entering={FadeIn.duration(400)} style={emptyStyles.wrap}>
        <Image
          source={require('@/../assets/illustrations/cooking.svg')}
          style={emptyStyles.illustration}
          contentFit="contain"
        />
        <Text variant="heading3" weight="bold" style={emptyStyles.heading}>
          This space is feeling a little... empty
        </Text>
        <Text variant="body" style={emptyStyles.subtitle}>
          Save recipes to access them anytime
        </Text>
        <Pressable
          onPress={goToRecipes}
          style={({ pressed }) => [emptyStyles.cta, pressed && emptyStyles.ctaPressed]}
        >
          <Text variant="body" weight="bold" style={emptyStyles.ctaText}>Browse recipes</Text>
        </Pressable>
      </Animated.View>
    ),
    [goToRecipes]
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

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 3,
    gap: spacing.md,
  },
  illustration: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  heading: {
    textAlign: 'center',
    color: '#111111',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B6B6B',
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: '#111111',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    color: '#FFFFFF',
  },
});

export default SavedRecipesScreen;
