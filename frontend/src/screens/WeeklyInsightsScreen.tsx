/**
 * Weekly Insights Screen
 * Displays weekly nutrition analytics and trends
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { Card, SafeAreaWrapper, Text } from '@/components';
import { useWeeklyInsights } from '@/hooks/useMealHistory';
import { GeneratedGoals } from '@/services/geminiApi';
import { BRAND_COLORS, spacing, useContentBottomPadding } from '@/utils';

// Storage key for generated goals (shared with ProfileScreen)
const GENERATED_GOALS_KEY = '@generated_fitness_goals';

export const WeeklyInsightsScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useWeeklyInsights();
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const contentBottomPadding = useContentBottomPadding(spacing.xl);

  // Load generated goals from AsyncStorage
  const loadGeneratedGoals = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(GENERATED_GOALS_KEY);
      if (saved) {
        setGeneratedGoals(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load generated goals:', e);
    }
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGeneratedGoals();
      refetch();
    }, [loadGeneratedGoals, refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadGeneratedGoals(), refetch()]);
    setRefreshing(false);
  };

  // Use generated goals if available, otherwise fall back to API response
  const effectiveUserGoal = {
    dailyCalorieTarget: generatedGoals?.dailyCalories.target || data?.userGoal?.dailyCalorieTarget,
    dailyProteinTarget: generatedGoals?.macros_grams.protein_g || data?.userGoal?.dailyProteinTarget,
    dailyCarbsTarget: generatedGoals?.macros_grams.carbs_g || data?.userGoal?.dailyCarbsTarget,
    dailyFatTarget: generatedGoals?.macros_grams.fat_g || data?.userGoal?.dailyFatTarget,
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
          <Text variant="body" style={styles.loadingText}>
            Analyzing your nutrition data...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text variant="body" style={styles.errorText}>
            Failed to load insights
          </Text>
          <Text variant="caption" style={styles.errorSubtext}>
            {error.message}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text variant="body" weight="semibold" style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!data) {
    return null;
  }

  const { dateRange, summary, dailyData, macrosDistribution, sugarWarning } = data;

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                // Navigate explicitly to Profile to avoid incorrect back navigation
                // This ensures consistent behavior regardless of navigation history
                (navigation as any).navigate('ProfileMain');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={BRAND_COLORS.textPrimary}
              />
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text variant="heading2" weight="bold">
                Weekly Insights
              </Text>
              <Text variant="caption" style={styles.dateRange}>
                {dateRange.startDate} to {dateRange.endDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={[BRAND_COLORS.primary + '20', BRAND_COLORS.secondary + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="heading3" weight="bold" style={styles.summaryValue}>
                  {summary.totalMeals}
                </Text>
                <Text variant="caption" style={styles.summaryLabel}>
                  Total Meals
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="heading3" weight="bold" style={styles.summaryValue}>
                  {Math.round(summary.averageDailyCalories)}
                </Text>
                <Text variant="caption" style={styles.summaryLabel}>
                  Avg Calories/Day
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Macros Distribution */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-pie" size={24} color={BRAND_COLORS.primary} />
            <Text variant="body" weight="semibold" style={styles.cardTitle}>
              Macros Distribution
            </Text>
          </View>

          <View style={styles.macrosGrid}>
            <View style={[styles.macroCard, { backgroundColor: BRAND_COLORS.macros.protein + '20' }]}>
              <MaterialCommunityIcons name="food-drumstick" size={32} color={BRAND_COLORS.macros.protein} />
              <Text variant="heading3" weight="bold" style={styles.macroValue}>
                {macrosDistribution.protein.grams.toFixed(0)}g
              </Text>
              <Text variant="caption" style={styles.macroLabel}>
                Protein
              </Text>
              <Text variant="caption" style={styles.macroPercentage}>
                {macrosDistribution.protein.percentage.toFixed(1)}%
              </Text>
              <Text variant="caption" style={styles.macroCalories}>
                {macrosDistribution.protein.caloriesFromMacro} kcal
              </Text>
            </View>

            <View style={[styles.macroCard, { backgroundColor: BRAND_COLORS.macros.carbs + '20' }]}>
              <MaterialCommunityIcons name="rice" size={32} color={BRAND_COLORS.macros.carbs} />
              <Text variant="heading3" weight="bold" style={styles.macroValue}>
                {macrosDistribution.carbs.grams.toFixed(0)}g
              </Text>
              <Text variant="caption" style={styles.macroLabel}>
                Carbs
              </Text>
              <Text variant="caption" style={styles.macroPercentage}>
                {macrosDistribution.carbs.percentage.toFixed(1)}%
              </Text>
              <Text variant="caption" style={styles.macroCalories}>
                {macrosDistribution.carbs.caloriesFromMacro} kcal
              </Text>
            </View>

            <View style={[styles.macroCard, { backgroundColor: BRAND_COLORS.macros.fat + '20' }]}>
              <MaterialCommunityIcons name="water" size={32} color={BRAND_COLORS.macros.fat} />
              <Text variant="heading3" weight="bold" style={styles.macroValue}>
                {macrosDistribution.fat.grams.toFixed(0)}g
              </Text>
              <Text variant="caption" style={styles.macroLabel}>
                Fat
              </Text>
              <Text variant="caption" style={styles.macroPercentage}>
                {macrosDistribution.fat.percentage.toFixed(1)}%
              </Text>
              <Text variant="caption" style={styles.macroCalories}>
                {macrosDistribution.fat.caloriesFromMacro} kcal
              </Text>
            </View>
          </View>
        </Card>

        {/* Daily Breakdown */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-week" size={24} color={BRAND_COLORS.primary} />
            <Text variant="body" weight="semibold" style={styles.cardTitle}>
              Daily Breakdown
            </Text>
          </View>

          {dailyData.map((day, index) => (
            <View key={index} style={styles.dailyRow}>
              <View style={styles.dailyDate}>
                <Text variant="caption" weight="semibold" style={styles.dailyDateText}>
                  {day.date}
                </Text>
                <Text variant="caption" style={styles.dailyMealCount}>
                  {day.mealCount} meals
                </Text>
              </View>

              <View style={styles.dailyCalories}>
                <View style={styles.caloriesBar}>
                  <View
                    style={[
                      styles.caloriesProgress,
                      {
                        width: `${Math.min(day.calories.percentage, 100)}%`,
                        backgroundColor:
                          day.calories.percentage > 110
                            ? '#EF4444'
                            : day.calories.percentage > 90
                            ? '#10B981'
                            : '#F59E0B',
                      },
                    ]}
                  />
                </View>
                <Text variant="caption" style={styles.caloriesText}>
                  {day.calories.actual} / {day.calories.target} kcal ({day.calories.percentage.toFixed(0)}%)
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Sugar Warning */}
        {sugarWarning.hasWarning && (
          <Card style={[styles.card, styles.warningCard]}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert" size={24} color="#F59E0B" />
              <Text variant="body" weight="semibold" style={styles.warningTitle}>
                Sugar Alert
              </Text>
            </View>
            <Text variant="caption" style={styles.warningMessage}>
              {sugarWarning.message}
            </Text>
            <View style={styles.warningStats}>
              <Text variant="caption" style={styles.warningText}>
                Average: {sugarWarning.averageDailySugar.toFixed(1)}g/day
              </Text>
              <Text variant="caption" style={styles.warningText}>
                Limit: {sugarWarning.recommendedLimit}g/day
              </Text>
            </View>
          </Card>
        )}

        {/* Goals */}
        {effectiveUserGoal.dailyCalorieTarget && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="target" size={24} color={BRAND_COLORS.primary} />
              <Text variant="body" weight="semibold" style={styles.cardTitle}>
                Your Goals
              </Text>
            </View>

            <View style={styles.goalsGrid}>
              <View style={styles.goalItem}>
                <Text variant="caption" style={styles.goalLabel}>
                  Calories
                </Text>
                <Text variant="body" weight="semibold" style={styles.goalValue}>
                  {effectiveUserGoal.dailyCalorieTarget} kcal
                </Text>
              </View>
              <View style={styles.goalItem}>
                <Text variant="caption" style={styles.goalLabel}>
                  Protein
                </Text>
                <Text variant="body" weight="semibold" style={styles.goalValue}>
                  {effectiveUserGoal.dailyProteinTarget || '-'}g
                </Text>
              </View>
              <View style={styles.goalItem}>
                <Text variant="caption" style={styles.goalLabel}>
                  Carbs
                </Text>
                <Text variant="body" weight="semibold" style={styles.goalValue}>
                  {effectiveUserGoal.dailyCarbsTarget || '-'}g
                </Text>
              </View>
              <View style={styles.goalItem}>
                <Text variant="caption" style={styles.goalLabel}>
                  Fat
                </Text>
                <Text variant="body" weight="semibold" style={styles.goalValue}>
                  {effectiveUserGoal.dailyFatTarget || '-'}g
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: BRAND_COLORS.textPrimary,
    marginTop: spacing.md,
  },
  errorSubtext: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  dateRange: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  summaryCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: BRAND_COLORS.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: BRAND_COLORS.textSecondary,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: BRAND_COLORS.textPrimary,
    marginLeft: spacing.sm,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCard: {
    flex: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
    alignItems: 'center',
  },
  macroValue: {
    color: BRAND_COLORS.textPrimary,
    marginTop: spacing.xs,
  },
  macroLabel: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
  },
  macroPercentage: {
    color: BRAND_COLORS.textPrimary,
    marginTop: 4,
    fontWeight: '600',
  },
  macroCalories: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
  },
  dailyRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  dailyDate: {
    width: 100,
  },
  dailyDateText: {
    color: BRAND_COLORS.textPrimary,
  },
  dailyMealCount: {
    color: BRAND_COLORS.textSecondary,
  },
  dailyCalories: {
    flex: 1,
    marginLeft: spacing.md,
  },
  caloriesBar: {
    height: 8,
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  caloriesProgress: {
    height: '100%',
    borderRadius: 4,
  },
  caloriesText: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: BRAND_COLORS.surface,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  warningTitle: {
    color: '#F59E0B',
    marginLeft: spacing.sm,
  },
  warningMessage: {
    color: BRAND_COLORS.textSecondary,
    marginBottom: spacing.sm,
  },
  warningStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  warningText: {
    color: BRAND_COLORS.textSecondary,
  },
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
  },
  goalLabel: {
    color: BRAND_COLORS.textSecondary,
    marginBottom: spacing.xs,
  },
  goalValue: {
    color: BRAND_COLORS.textPrimary,
  },
});
