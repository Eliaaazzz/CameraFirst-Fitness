/**
 * SavedWorkoutsScreen - Dedicated screen for viewing saved workouts from Profile
 * Uses the industry standard Tab > Stack > Screen architecture
 */
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import {
    Container,
    EmptyStateCard,
    ListSkeleton,
    SafeAreaWrapper,
    Text,
    WorkoutCard,
} from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRemoveWorkout, useSavedWorkouts } from '@/services';
import type { SavedWorkout } from '@/types';
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

export const SavedWorkoutsScreen = () => {
  const theme = getTheme('light');
  const navigation = useNavigation();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedWorkouts(userId);
  const removeWorkout = useRemoveWorkout(userId);

  const savedWorkouts = saved.data ?? [];
  const listBottomPadding = useContentBottomPadding(spacing.lg);

  const listEmptyComponent = useMemo(
    () => (
      <EmptyStateCard
        icon={<MaterialCommunityIcons name="dumbbell" size={32} color={theme.colors.primary} />}
        title="No saved workouts yet"
        subtitle="Save workouts from the Workouts tab to see them here"
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
    ({ item }: { item: SavedWorkout }) => {
      const duration = item.durationMinutes ?? 0;
      const levelText = item.level?.toUpperCase?.() ?? '—';
      const meta = `${duration} min · level ${levelText}`;

      return (
        <View style={styles.card}>
          <WorkoutCard
            item={item}
            isSaved
            onRemove={(id) => removeWorkout.mutateAsync(id).then(() => true)}
          />
          <Text variant="caption" style={[styles.savedAt, { color: theme.colors.textSecondary }]}>
            {meta}
          </Text>
        </View>
      );
    },
    [removeWorkout, theme]
  );

  // Loading state
  if (currentUser.isLoading || saved.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container style={styles.container}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Text variant="heading2" weight="bold" style={styles.headerTitle}>
              Saved Workouts
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
              <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Text variant="heading2" weight="bold" style={styles.headerTitle}>
              Saved Workouts
            </Text>
          </View>
          <EmptyStateCard
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.error} />}
            title="Unable to load workouts"
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
          data={savedWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={listEmptyComponent}
          ListHeaderComponent={
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
              </Pressable>
              <Text variant="heading2" weight="bold" style={styles.headerTitle}>
                Saved Workouts
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

export default SavedWorkoutsScreen;
