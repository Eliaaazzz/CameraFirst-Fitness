import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB } from 'react-native-paper';

import {
    Container,
    CreateGoalModal,
    GoalCard,
    SafeAreaWrapper,
    Text
} from '@/components';
import { EmptyState, FilterBar, ScreenHeader, StatCard } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useCreateGoal, useDeleteGoal, useGoals, useGoalStatistics, useLogGoalProgress } from '@/services/goalsApi';
import type { Goal, GoalType } from '@/types';
import { BORDER_RADIUS, COLORS, ELEVATION, SPACING, spacing } from '@/utils/theme';

type FilterType = GoalType | 'all';

export const GoalsScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId || '';

  const goals = useGoals(userId);
  const stats = useGoalStatistics(userId);
  const deleteGoal = useDeleteGoal();
  const logProgress = useLogGoalProgress();
  const createGoal = useCreateGoal(userId);

  const [filter, setFilter] = useState<FilterType>('all');
  const [showFab, setShowFab] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter goals
  const filteredGoals = React.useMemo(() => {
    if (!goals.data) return [];
    if (filter === 'all') return goals.data;
    return goals.data.filter((g) => g.type === filter);
  }, [goals.data, filter]);

  // Handle refresh
  const handleRefresh = () => {
    goals.refetch();
    stats.refetch();
  };

  // Handle quick progress
  const handleQuickProgress = (goal: Goal) => {
    // Simple increment for demo
    const newValue = (goal.currentValue || 0) + 1;
    logProgress.mutate({
      goalId: goal.id,
      value: newValue,
      date: new Date().toISOString(),
    });
  };

  // Handle delete goal
  const handleDelete = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  // Render statistics cards
  const renderStatistics = () => {
    if (!stats.data) return null;

    return (
      <View style={styles.statsContainer}>
        <StatCard
          label="Active Goals"
          value={stats.data.activeGoals}
          icon={<Feather name="target" size={20} color={COLORS.primary.main} />}
        />
        <StatCard
          label="Current Streak"
          value={`🔥 ${stats.data.currentStreak}`}
          variant="highlighted"
        />
        <StatCard
          label="Completed"
          value={stats.data.completedGoals}
          icon={<Feather name="check-circle" size={20} color={COLORS.semantic.success} />}
        />
      </View>
    );
  };

  // Render filter chips
  const renderFilters = () => {
    const filterOptions = [
      { id: 'nutrition', label: 'Nutrition' },
      { id: 'workout', label: 'Workout' },
      { id: 'hydration', label: 'Hydration' },
      { id: 'sleep', label: 'Sleep' },
      { id: 'weight', label: 'Weight' },
      { id: 'habit', label: 'Habit' },
    ];

    return (
      <FilterBar
        options={filterOptions}
        selectedId={filter === 'all' ? null : filter}
        onSelect={(id) => setFilter(id as FilterType || 'all')}
        style={styles.filtersContainer}
      />
    );
  };

  // Render goal item
  const renderGoalItem = ({ item }: { item: Goal }) => (
    <GoalCard
      goal={item}
      onQuickProgress={() => handleQuickProgress(item)}
      onDelete={() => handleDelete(item.id)}
      onEdit={() => {
        // TODO: Open edit modal
        console.log('Edit goal:', item.id);
      }}
    />
  );

  // Empty state
  const renderEmptyState = () => (
    <EmptyState
      icon={<Feather name="target" size={48} color={COLORS.primary.main} />}
      title="No goals yet"
      description="Set your first goal to start tracking your fitness journey and receive helpful reminders!"
      actionLabel="Create Your First Goal"
      onAction={() => setModalVisible(true)}
      style={styles.emptyState}
    />
  );

  // Loading state
  if (currentUser.isLoading || goals.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="body" style={styles.loadingText}>
            Loading your goals...
          </Text>
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Error state
  if (currentUser.isError || goals.isError) {
    return (
      <SafeAreaWrapper>
        <Container style={styles.container}>
          <EmptyState
            icon={<Feather name="alert-circle" size={48} color={COLORS.semantic.error} />}
            title="Unable to load goals"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={handleRefresh}
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title="🎯 Goals"
        subtitle="Track your progress and stay motivated"
        variant="hero"
      />
      <Container style={styles.container}>
        {renderStatistics()}
        {renderFilters()}

        <FlatList
          data={filteredGoals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoalItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={renderEmptyState()}
          refreshControl={
            <RefreshControl
              refreshing={goals.isRefetching}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setShowFab(false)}
          onScrollEndDrag={() => setShowFab(true)}
        />

        <FAB
          icon="plus"
          style={[styles.fab, !showFab && styles.fabHidden]}
          onPress={() => setModalVisible(true)}
          label="New Goal"
          visible={showFab}
          color="#FFFFFF"
          customSize={56}
        />

        <CreateGoalModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          onSave={(payload) => {
            createGoal.mutate(payload, {
              onSuccess: () => {
                setModalVisible(false);
              },
            });
          }}
          isLoading={createGoal.isPending}
        />
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    opacity: 0.7,
    color: COLORS.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filtersContainer: {
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.md,
  },
  listContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  emptyState: {
    marginTop: SPACING.xxl,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS,
    ...ELEVATION.level2,
  },
  fabHidden: {
    transform: [{ translateY: 100 }],
  },
});
