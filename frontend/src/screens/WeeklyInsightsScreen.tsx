/**
 * Weekly Insights Screen
 * Displays weekly nutrition analytics and trends
 */

import { ArrowLeft, CalendarDots, ChartPie, Drop, ForkKnife, Grains, Target, Warning, WarningCircle } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { Card, SafeAreaWrapper, Text } from '@/components';
import { useWeeklyInsights } from '@/hooks/useMealHistory';
import { GeneratedGoals } from '@/services/geminiApi';
import { BRAND_COLORS, spacing, useContentBottomPadding, useSidebarVisible } from '@/utils';

// Storage key for generated goals (shared with ProfileScreen)
const GENERATED_GOALS_KEY = '@generated_fitness_goals';

export const WeeklyInsightsScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useWeeklyInsights();
  const showSidebar = useSidebarVisible();
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
          <WarningCircle size={48} color={BRAND_COLORS.danger} />
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

  // ============================================================================
  // WEB DESKTOP — Uber-style full-page reports layout
  // ============================================================================
  if (showSidebar && Platform.OS === 'web') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatDay = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return dayNames[new Date(y, m - 1, d).getDay()];
    };

    return (
      <SafeAreaWrapper>
        <ScrollView
          style={webStyles.scroll}
          contentContainerStyle={webStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND_COLORS.primary} />
          }
        >
          {/* Page header */}
          <View style={webStyles.pageHeader}>
            <View>
              <Text variant="heading1" weight="bold" style={webStyles.pageTitle}>
                Weekly Report
              </Text>
              <Text variant="body" style={webStyles.dateRange}>
                {dateRange.startDate} — {dateRange.endDate}
              </Text>
            </View>
            <View style={webStyles.headerActions}>
              <Pressable
                onPress={() => (navigation as any).navigate('Main', { screen: 'Dashboard' })}
                style={({ pressed }) => [webStyles.backBtn, pressed && { opacity: 0.8 }]}
              >
                <ArrowLeft size={18} color="#111111" />
                <Text variant="body" weight="semibold" style={{ color: '#111111' }}>Back to home</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  // Build CSV and trigger download
                  const headers = 'Date,Calories,Target,Protein(g),Carbs(g),Fat(g),Meals\n';
                  const rows = dailyData.map(d =>
                    `${d.date},${d.calories.actual},${d.calories.target},${Math.round(d.protein)},${Math.round(d.carbs)},${Math.round(d.fat)},${d.mealCount}`
                  ).join('\n');
                  const csv = headers + rows;
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `aurafitness-report-${dateRange.startDate}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={({ pressed }) => [webStyles.exportBtn, pressed && { opacity: 0.8 }]}
              >
                <Text variant="body" weight="bold" style={{ color: '#FFFFFF' }}>Export CSV</Text>
              </Pressable>
            </View>
          </View>

          {/* Summary stats row */}
          <View style={webStyles.statsRow}>
            <View style={webStyles.statCard}>
              <Text variant="heading1" weight="bold" style={webStyles.statNumber}>{summary.totalMeals}</Text>
              <Text variant="body" style={webStyles.statLabel}>Meals logged</Text>
            </View>
            <View style={webStyles.statCard}>
              <Text variant="heading1" weight="bold" style={webStyles.statNumber}>{Math.round(summary.averageDailyCalories)}</Text>
              <Text variant="body" style={webStyles.statLabel}>Avg calories/day</Text>
            </View>
            <View style={webStyles.statCard}>
              <Text variant="heading1" weight="bold" style={webStyles.statNumber}>{Math.round(summary.averageProtein)}g</Text>
              <Text variant="body" style={webStyles.statLabel}>Avg protein/day</Text>
            </View>
            <View style={webStyles.statCard}>
              <Text variant="heading1" weight="bold" style={webStyles.statNumber}>{dailyData.filter(d => d.mealCount > 0).length}/7</Text>
              <Text variant="body" style={webStyles.statLabel}>Days tracked</Text>
            </View>
          </View>

          {/* Main content: two columns */}
          <View style={webStyles.mainRow}>
            {/* Left: Daily breakdown */}
            <View style={webStyles.mainLeft}>
              <Text variant="heading2" weight="bold" style={webStyles.sectionTitle}>Daily breakdown</Text>
              <View style={webStyles.dailyCard}>
                {dailyData.map((day, i) => {
                  const pct = Math.min(day.calories.percentage, 100);
                  const barColor = day.calories.percentage > 110 ? '#EF4444' : day.calories.percentage > 90 ? '#22C55E' : '#F59E0B';
                  return (
                    <View key={i} style={[webStyles.dailyRow, i < dailyData.length - 1 && webStyles.dailyRowBorder]}>
                      <View style={webStyles.dailyIndexCol}>
                        <Text variant="body" weight="bold" style={{ color: '#111111' }}>{i + 1}</Text>
                      </View>
                      <View style={webStyles.dailyDayCol}>
                        <Text variant="body" weight="bold" style={{ color: '#111111' }}>{formatDay(day.date)}</Text>
                        <Text variant="caption" style={{ color: '#6B6B6B' }}>{day.date.slice(5)}</Text>
                      </View>
                      <View style={webStyles.dailyBarCol}>
                        <View style={webStyles.dailyBarTrack}>
                          <View style={[webStyles.dailyBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                        </View>
                      </View>
                      <View style={webStyles.dailyValCol}>
                        <Text variant="body" weight="semibold" style={{ color: '#111111' }}>{day.calories.actual}</Text>
                        <Text variant="caption" style={{ color: '#6B6B6B' }}>/ {day.calories.target}</Text>
                      </View>
                      <View style={webStyles.dailyMealsCol}>
                        <Text variant="caption" style={{ color: '#6B6B6B' }}>{day.mealCount} meals</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Right: Macros + Goals + Warnings */}
            <View style={webStyles.mainRight}>
              {/* Macros distribution */}
              <Text variant="heading2" weight="bold" style={webStyles.sectionTitle}>Macros distribution</Text>
              <View style={webStyles.macrosCard}>
                <View style={[webStyles.macroItem, { backgroundColor: '#E0F5EF' }]}>
                  <ForkKnife size={28} color="#2F7A6A" />
                  <Text variant="heading3" weight="bold" style={{ color: '#111111' }}>{macrosDistribution.protein.grams.toFixed(0)}g</Text>
                  <Text variant="body" style={{ color: '#2F7A6A' }}>Protein</Text>
                  <Text variant="caption" style={{ color: '#6B6B6B' }}>{macrosDistribution.protein.percentage.toFixed(0)}% · {macrosDistribution.protein.caloriesFromMacro} kcal</Text>
                </View>
                <View style={[webStyles.macroItem, { backgroundColor: '#FFF7DD' }]}>
                  <Grains size={28} color="#8A9B4F" />
                  <Text variant="heading3" weight="bold" style={{ color: '#111111' }}>{macrosDistribution.carbs.grams.toFixed(0)}g</Text>
                  <Text variant="body" style={{ color: '#8A9B4F' }}>Carbs</Text>
                  <Text variant="caption" style={{ color: '#6B6B6B' }}>{macrosDistribution.carbs.percentage.toFixed(0)}% · {macrosDistribution.carbs.caloriesFromMacro} kcal</Text>
                </View>
                <View style={[webStyles.macroItem, { backgroundColor: '#FFF1E7' }]}>
                  <Drop size={28} color="#B88428" />
                  <Text variant="heading3" weight="bold" style={{ color: '#111111' }}>{macrosDistribution.fat.grams.toFixed(0)}g</Text>
                  <Text variant="body" style={{ color: '#B88428' }}>Fat</Text>
                  <Text variant="caption" style={{ color: '#6B6B6B' }}>{macrosDistribution.fat.percentage.toFixed(0)}% · {macrosDistribution.fat.caloriesFromMacro} kcal</Text>
                </View>
              </View>

              {/* Goals */}
              {effectiveUserGoal.dailyCalorieTarget && (
                <>
                  <Text variant="heading3" weight="bold" style={[webStyles.sectionTitle, { marginTop: 28 }]}>Your targets</Text>
                  <View style={webStyles.goalsCard}>
                    <View style={webStyles.goalRow}>
                      <Text variant="body" style={{ color: '#111111' }}>Calories</Text>
                      <Text variant="body" weight="bold" style={{ color: '#111111' }}>{effectiveUserGoal.dailyCalorieTarget} kcal</Text>
                    </View>
                    <View style={webStyles.goalRow}>
                      <Text variant="body" style={{ color: '#111111' }}>Protein</Text>
                      <Text variant="body" weight="bold" style={{ color: '#111111' }}>{effectiveUserGoal.dailyProteinTarget || '-'}g</Text>
                    </View>
                    <View style={webStyles.goalRow}>
                      <Text variant="body" style={{ color: '#111111' }}>Carbs</Text>
                      <Text variant="body" weight="bold" style={{ color: '#111111' }}>{effectiveUserGoal.dailyCarbsTarget || '-'}g</Text>
                    </View>
                    <View style={webStyles.goalRow}>
                      <Text variant="body" style={{ color: '#111111' }}>Fat</Text>
                      <Text variant="body" weight="bold" style={{ color: '#111111' }}>{effectiveUserGoal.dailyFatTarget || '-'}g</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Sugar warning */}
              {sugarWarning.hasWarning && (
                <View style={webStyles.warningCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Warning size={20} color="#F59E0B" />
                    <Text variant="body" weight="bold" style={{ color: '#111111' }}>Sugar Alert</Text>
                  </View>
                  <Text variant="body" style={{ color: '#6B6B6B', lineHeight: 24 }}>{sugarWarning.message}</Text>
                  <Text variant="caption" style={{ color: '#6B6B6B', marginTop: 8 }}>
                    Avg: {sugarWarning.averageDailySugar.toFixed(1)}g/day · Limit: {sugarWarning.recommendedLimit}g/day
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

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
              <ArrowLeft size={24} color={BRAND_COLORS.textPrimary} />
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
            <ChartPie size={24} color={BRAND_COLORS.primary} />
            <Text variant="body" weight="semibold" style={styles.cardTitle}>
              Macros Distribution
            </Text>
          </View>

          <View style={styles.macrosGrid}>
            <View style={[styles.macroCard, { backgroundColor: BRAND_COLORS.macros.protein + '20' }]}>
              <ForkKnife size={32} color={BRAND_COLORS.macros.protein} />
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
              <Grains size={32} color={BRAND_COLORS.macros.carbs} />
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
              <Drop size={32} color={BRAND_COLORS.macros.fat} />
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
            <CalendarDots size={24} color={BRAND_COLORS.primary} />
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
                            ? BRAND_COLORS.danger
                            : day.calories.percentage > 90
                            ? BRAND_COLORS.success
                            : BRAND_COLORS.warning,
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
              <Warning size={24} color={BRAND_COLORS.warning} />
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
              <Target size={24} color={BRAND_COLORS.primary} />
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
    borderLeftColor: BRAND_COLORS.warning,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  warningTitle: {
    color: BRAND_COLORS.warning,
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

// ============================================================================
// WEB DESKTOP STYLES — Uber-style reports page
// ============================================================================
const webStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: 80,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  pageTitle: {
    color: '#111111',
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -2,
  },
  dateRange: {
    color: '#6B6B6B',
    fontSize: 16,
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#F3F3F3',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  exportBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#111111',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9F9F7',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  statNumber: {
    color: '#111111',
    fontSize: 36,
    letterSpacing: -1.2,
  },
  statLabel: {
    color: '#6B6B6B',
    marginTop: 4,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 28,
  },
  mainLeft: {
    flex: 3,
  },
  mainRight: {
    flex: 2,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 28,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  dailyCard: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  dailyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dailyIndexCol: {
    width: 28,
    alignItems: 'center',
  },
  dailyDayCol: {
    width: 60,
  },
  dailyBarCol: {
    flex: 1,
  },
  dailyBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  dailyBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  dailyValCol: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dailyMealsCol: {
    width: 60,
    alignItems: 'flex-end',
  },
  macrosCard: {
    flexDirection: 'row',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  goalsCard: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  warningCard: {
    marginTop: 20,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
});
