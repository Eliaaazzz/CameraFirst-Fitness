import { Feather } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Chip, FAB } from 'react-native-paper';

import {
    Button,
    Card,
    Container,
    CreateGoalModal,
    GoalCard,
    SafeAreaWrapper,
    Text,
} from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useCreateGoal, useDeleteGoal, useGoals, useGoalStatistics, useLogGoalProgress } from '@/services/goalsApi';
import type { Goal, GoalType } from '@/types';
import { spacing } from '@/utils';
import { clearJWT } from '@/utils/jwtStorage';

type FilterType = GoalType | 'all';

export const GoalsScreen = () => {
  const navigation = useNavigation();
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearJWT();
            // Use CommonActions to properly navigate to root navigator
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          },
        },
      ]
    );
  };

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
        <Card style={styles.statCard}>
          <Text variant="caption" style={styles.statLabel}>
            Active Goals
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            {stats.data.activeGoals}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text variant="caption" style={styles.statLabel}>
            Current Streak
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            🔥 {stats.data.currentStreak}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text variant="caption" style={styles.statLabel}>
            Completed
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            {stats.data.completedGoals}
          </Text>
        </Card>
      </View>
    );
  };

  // Render filter chips
  const renderFilters = () => {
    const filters: { label: string; value: FilterType }[] = [
      { label: 'All', value: 'all' },
      { label: 'Nutrition', value: 'nutrition' },
      { label: 'Workout', value: 'workout' },
      { label: 'Hydration', value: 'hydration' },
      { label: 'Sleep', value: 'sleep' },
      { label: 'Weight', value: 'weight' },
      { label: 'Habit', value: 'habit' },
    ];

    return (
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
              style={styles.filterChip}
              mode={filter === item.value ? 'flat' : 'outlined'}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>
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
    <Card style={styles.emptyState}>
      <View style={styles.iconWrapper}>
        <Feather name="target" size={48} color="#4ECDC4" />
      </View>
      <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
        No goals yet
      </Text>
      <Text variant="body" style={styles.emptyBody}>
        Set your first goal to start tracking your fitness journey and receive helpful reminders!
      </Text>
      <Button
        title="Create Your First Goal"
        variant="primary"
        onPress={() => setModalVisible(true)}
      />
    </Card>
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
        <Container>
          <Card style={styles.emptyState}>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
              Unable to load goals
            </Text>
            <Text variant="body" style={styles.emptyBody}>
              Check your connection and try again.
            </Text>
            <Button title="Retry" onPress={handleRefresh} />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text variant="heading1" weight="bold">
              Goals
            </Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Feather name="log-out" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
          <Text variant="body" style={styles.subtitle}>
            Track your progress and stay motivated
          </Text>
        </View>

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
              tintColor="#4ECDC4"
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
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    opacity: 0.7,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    padding: spacing.sm,
  },
  subtitle: {
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    opacity: 0.7,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersList: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    marginTop: spacing['2xl'],
  },
  iconWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
  },
  fabHidden: {
    transform: [{ translateY: 100 }],
  },
});
