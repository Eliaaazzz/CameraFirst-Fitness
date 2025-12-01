import { Button, Container, SafeAreaWrapper, Text, Card as UICard, useSnackbar } from '@/components';
import { Chip, ScreenHeader } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import MealDetailModal from '@/screens/components/MealDetailModal';
import NutritionTrackerCard from '@/screens/components/NutritionTrackerCard';
import mealPlanApi from '@/services/mealPlanApi';
import nutritionApi from '@/services/nutritionApi';
import type { MealPlanHistoryItem, MealPlanResponse, NutritionInsightResponse, NutritionSummaryResponse } from '@/types/mealPlan';
import { BORDER_RADIUS, COLORS, spacing, SPACING } from '@/utils';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, Card as PaperCard, Text as PaperText } from 'react-native-paper';

interface NutritionData {
  calories?: { consumed: number; target: number };
  protein?: { consumed: number; target: number };
  carbs?: { consumed: number; target: number };
  fat?: { consumed: number; target: number };
}

const transformSummaryToNutritionData = (summary: NutritionSummaryResponse | undefined): NutritionData | null => {
  if (!summary) return null;
  return {
    calories: summary.calories
      ? { consumed: summary.calories.actual, target: summary.calories.target }
      : undefined,
    protein: summary.protein
      ? { consumed: summary.protein.actual, target: summary.protein.target }
      : undefined,
    carbs: summary.carbs
      ? { consumed: summary.carbs.actual, target: summary.carbs.target }
      : undefined,
    fat: summary.fat
      ? { consumed: summary.fat.actual, target: summary.fat.target }
      : undefined,
  };
};

export const MealPlanScreen = () => {
  const [selectedMeal, setSelectedMeal] = useState<MealPlanHistoryItem['plan']['days'][number]['meals'][number] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MealPlanHistoryItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const snackbar = useSnackbar();
  const currentUserQuery = useCurrentUser();
  const userId = currentUserQuery.data?.userId;

  // All hooks must be called before any conditional returns
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['meal-plan', 'history', userId],
    queryFn: () => mealPlanApi.getHistory(userId!, 5),
    enabled: !!userId,
  });

  const summaryQuery = useQuery({
    queryKey: ['nutrition', 'summary', 'daily', userId],
    queryFn: () => nutritionApi.getDailySummary(userId!),
    enabled: !!userId,
  });

  const insightQuery = useQuery<NutritionInsightResponse>({
    queryKey: ['nutrition', 'insight', 'weekly', userId],
    queryFn: () => nutritionApi.getWeeklyInsight(userId!),
    enabled: !!userId,
  });

  const generateMutation = useMutation<MealPlanResponse, Error, string>({
    mutationFn: mealPlanApi.generate,
    onSuccess: () => {
      snackbar.showSnackbar('Meal plan updated', { variant: 'success' });
      refetch();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to generate meal plan';
      snackbar.showSnackbar(message, { variant: 'error' });
    },
  });

  useEffect(() => {
    if (currentUserQuery.isError) {
      const message = currentUserQuery.error instanceof Error
        ? currentUserQuery.error.message
        : 'Failed to load user information';
      snackbar.showSnackbar(message, { variant: 'error' });
    }
  }, [currentUserQuery.isError, currentUserQuery.error, snackbar]);

  useEffect(() => {
    if (summaryQuery.error) {
      const message = summaryQuery.error instanceof Error ? summaryQuery.error.message : 'Failed to load nutrition summary';
      snackbar.showSnackbar(message, { variant: 'error' });
    }
  }, [summaryQuery.error, snackbar]);

  useEffect(() => {
    if (insightQuery.error) {
      const message = insightQuery.error instanceof Error ? insightQuery.error.message : 'Failed to load nutrition insight';
      snackbar.showSnackbar(message, { variant: 'error' });
    }
  }, [insightQuery.error, snackbar]);

  const latestPlan = data?.[0];
  const days = latestPlan?.plan.days ?? [];

  const handleRefresh = useCallback(() => {
    if (!userId) {
      return;
    }
    refetch();
    summaryQuery.refetch();
    insightQuery.refetch();
  }, [userId, insightQuery, refetch, summaryQuery]);

  const refreshing = (isFetching && !isLoading)
    || summaryQuery.isFetching
    || insightQuery.isFetching
    || currentUserQuery.isFetching;

  const nutritionData = transformSummaryToNutritionData(summaryQuery.data);

  // Early return AFTER all hooks
  if (currentUserQuery.isError && !currentUserQuery.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.emptyCard}>
            <Card.Title title="Unable to load user info" />
            <Card.Content>
              <PaperText variant="bodyMedium" style={{ marginBottom: spacing.md }}>
                Please check your network connection or API Key settings and try again.
              </PaperText>
              <Button title="Retry" onPress={() => currentUserQuery.refetch()} />
            </Card.Content>
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Get meal type emoji
  const getMealEmoji = (mealType: string) => {
    const emojis: Record<string, string> = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎',
    };
    return emojis[mealType.toLowerCase()] || '🍽️';
  };

  const renderDay = ({ item }: { item: MealPlanHistoryItem['plan']['days'][number] }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View style={styles.dayAvatarContainer}>
          <Avatar.Text size={40} label={`${item.dayNumber}`} style={styles.dayAvatar} labelStyle={styles.dayAvatarLabel} />
        </View>
        <View>
          <Text variant="heading2" weight="bold">Day {item.dayNumber}</Text>
          <Text variant="caption" style={styles.daySubtitle}>
            {item.meals.length} meals planned
          </Text>
        </View>
      </View>
      {item.meals.map((meal) => (
        <PaperCard key={`${item.dayNumber}-${meal.mealType}`} style={styles.mealCard} onPress={() => {
          setSelectedPlan(latestPlan ?? null);
          setSelectedMeal(meal);
          setSelectedDay(item.dayNumber);
        }}>
          <PaperCard.Title title={meal.recipeName ?? meal.mealType} subtitle={`${meal.calories ?? '--'} kcal`} left={() => (
            <Text variant="heading2">{getMealEmoji(meal.mealType)}</Text>
          )} />
          <PaperCard.Content>
            <View style={styles.macroRow}>
              <Chip label={`P ${meal.protein ?? '--'}g`} variant="tonal" color="primary" size="small" />
              <Chip label={`C ${meal.carbs ?? '--'}g`} variant="tonal" color="secondary" size="small" />
              <Chip label={`F ${meal.fat ?? '--'}g`} variant="tonal" color="warning" size="small" />
            </View>
          </PaperCard.Content>
        </PaperCard>
      ))}
    </View>
  );

  return (
    <SafeAreaWrapper edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title="🍽️ Meal Plan"
        subtitle="Your personalized weekly nutrition"
        variant="hero"
      >
        <Button
          title="✨ Regenerate"
          variant="outline"
          loading={generateMutation.isPending}
          style={styles.regenerateButton}
          onPress={() => {
            if (!userId) {
              snackbar.showSnackbar('Please log in to generate a plan', { variant: 'error' });
              return;
            }
            generateMutation.mutate(userId);
          }}
        />
      </ScreenHeader>
      <Container style={styles.contentContainer}>
        <NutritionTrackerCard data={nutritionData} isLoading={summaryQuery.isLoading} />

        {insightQuery.data && (
          <UICard style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Feather name="zap" size={20} color={COLORS.primary.main} />
              <Text variant="heading2" weight="bold">Weekly Insights</Text>
            </View>
            {insightQuery.data.summary.alerts.length > 0 && (
              <View style={styles.alertContainer}>
                {insightQuery.data.summary.alerts.map((alert) => (
                  <View key={alert} style={styles.alertItem}>
                    <Feather name="alert-circle" size={14} color="#f97316" />
                    <PaperText variant="bodySmall" style={styles.alertText}>{alert}</PaperText>
                  </View>
                ))}
              </View>
            )}
            <PaperText variant="bodyMedium" style={styles.aiAdvice}>{insightQuery.data.aiAdvice}</PaperText>
          </UICard>
        )}

        {isLoading || currentUserQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={days}
            renderItem={renderDay}
            keyExtractor={(item) => `${item.dayNumber}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <UICard style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Feather name="calendar" size={48} color={COLORS.primary.main} />
                  <Text variant="heading2" weight="bold" style={styles.emptyTitle}>No meal plan yet</Text>
                  <PaperText variant="bodyMedium" style={styles.emptyDescription}>
                    Generate a personalized 7-day meal plan tailored to your nutrition goals.
                  </PaperText>
                  <Button
                    title="✨ Generate Weekly Plan"
                    onPress={() => {
                      if (!userId) {
                        snackbar.showSnackbar('Please log in to generate a plan', { variant: 'error' });
                        return;
                      }
                      generateMutation.mutate(userId);
                    }}
                    loading={generateMutation.isPending}
                    style={styles.generateButton}
                  />
                </View>
              </UICard>
            }
            contentContainerStyle={days.length === 0 ? styles.emptyList : undefined}
          />
        )}

        <MealDetailModal
          visible={!!selectedMeal}
          meal={selectedMeal}
          onDismiss={() => setSelectedMeal(null)}
          plan={selectedPlan}
          dayNumber={selectedDay ?? undefined}
          userId={userId}
          onLogged={() => {
            if (userId) {
              summaryQuery.refetch();
              insightQuery.refetch();
            }
          }}
        />
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.dark.background,
  },
  regenerateButton: {
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dayCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayAvatarContainer: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary.main + '40',
  },
  dayAvatar: {
    backgroundColor: COLORS.primary.main,
  },
  dayAvatarLabel: {
    fontWeight: 'bold',
  },
  daySubtitle: {
    color: COLORS.text.secondary,
    opacity: 0.7,
  },
  mealCard: {
    marginTop: spacing.xs,
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.surface.primary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  insightCard: {
    marginBottom: spacing.lg,
    borderRadius: BORDER_RADIUS,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  alertContainer: {
    gap: spacing.xs,
    marginBottom: SPACING.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  alertText: {
    color: '#f97316',
    flex: 1,
  },
  aiAdvice: {
    marginTop: spacing.sm,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  emptyCard: {
    borderRadius: BORDER_RADIUS,
  },
  emptyContent: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.md,
  },
  generateButton: {
    marginTop: SPACING.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
});
