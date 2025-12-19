import { Button, Container, SafeAreaWrapper, Text, useSnackbar } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import MealDetailModal from '@/screens/components/MealDetailModal';
import NutritionTrackerCard from '@/screens/components/NutritionTrackerCard';
import mealPlanApi from '@/services/mealPlanApi';
import nutritionApi from '@/services/nutritionApi';
import { MealPlanHistoryItem, MealPlanResponse, NutritionInsightResponse } from '@/types/mealPlan';
import { spacing } from '@/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, Card as PaperCard, Text as PaperText } from 'react-native-paper';

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
    enabled: !!userId && !currentUserQuery.isError,
  });

  const summaryQuery = useQuery({
    queryKey: ['nutrition', 'summary', 'daily'],
    queryFn: () => nutritionApi.getDailySummary('me'),
    enabled: !currentUserQuery.isError,
  });

  const insightQuery = useQuery<NutritionInsightResponse>({
    queryKey: ['nutrition', 'insight', 'weekly'],
    queryFn: () => nutritionApi.getWeeklyInsight('me'),
    enabled: !currentUserQuery.isError,
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

  useEffect(() => {
    if (currentUserQuery.isError) {
      const message = currentUserQuery.error instanceof Error
        ? currentUserQuery.error.message
        : 'Failed to load user information';
      snackbar.showSnackbar(message, { variant: 'error' });
    }
  }, [currentUserQuery.isError, currentUserQuery.error, snackbar]);

  // Conditional return must come after all hooks
  if (currentUserQuery.isError && !currentUserQuery.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.emptyCard}>
            <Card.Title title="Unable to load user info" />
            <Card.Content>
              <PaperText variant="bodyMedium" style={{ marginBottom: spacing.md }}>
                Please check your network connection or API Key settings, then try again.
              </PaperText>
              <Button title="Retry" onPress={() => currentUserQuery.refetch()} />
            </Card.Content>
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const refreshing = (isFetching && !isLoading)
    || summaryQuery.isFetching
    || insightQuery.isFetching
    || currentUserQuery.isFetching;

  const renderDay = ({ item }: { item: MealPlanHistoryItem['plan']['days'][number] }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Avatar.Text size={36} label={`${item.dayNumber}`} style={styles.dayAvatar} />
        <Text variant="heading3">Day {item.dayNumber}</Text>
      </View>
      {item.meals.map((meal) => (
        <PaperCard key={`${item.dayNumber}-${meal.mealType}`} style={styles.mealCard} onPress={() => {
          setSelectedPlan(latestPlan ?? null);
          setSelectedMeal(meal);
          setSelectedDay(item.dayNumber);
        }}>
          <PaperCard.Title title={meal.recipeName ?? meal.mealType} subtitle={`${meal.calories ?? '--'} kcal`} />
          <PaperCard.Content>
            <Text variant="caption" style={{ opacity: 0.8 }}>
              Protein {meal.protein ?? '--'}g · Carbs {meal.carbs ?? '--'}g · Fat {meal.fat ?? '--'}g
            </Text>
          </PaperCard.Content>
        </PaperCard>
      ))}
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Container>
        <View style={styles.header}>
          <Text variant="heading1" weight="bold">Your Meal Plan</Text>
          <Button
            title="Regenerate"
            variant="outline"
            loading={generateMutation.isPending}
            onPress={() => {
              if (!userId) {
                snackbar.showSnackbar('Please log in to generate a plan', { variant: 'error' });
                return;
              }
              generateMutation.mutate(userId);
            }}
          />
        </View>

        <NutritionTrackerCard summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

        {insightQuery.data && (
          <Card style={styles.insightCard}>
            <Card.Title
              title="Weekly Nutrition Insight"
              subtitle={new Date(insightQuery.data.summary.rangeStart).toLocaleDateString()}
            />
            <Card.Content>
              {insightQuery.data.summary.alerts.length > 0 && (
                <View style={styles.alertContainer}>
                  {insightQuery.data.summary.alerts.map((alert) => (
                    <PaperText key={alert} variant="bodySmall" style={styles.alertText}>{alert}</PaperText>
                  ))}
                </View>
              )}
              <PaperText variant="bodyMedium" style={{ marginTop: spacing.sm }}>{insightQuery.data.aiAdvice}</PaperText>
            </Card.Content>
          </Card>
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
              <Card style={styles.emptyCard}>
                <Card.Title title="No meal plan yet" />
                <Card.Content>
                  <PaperText variant="bodyMedium" style={{ marginBottom: spacing.md }}>
                    Tap the "Regenerate" button above to create a personalized 7-day meal plan.
                  </PaperText>
                  <Button
                    title="Generate Weekly Plan"
                    onPress={() => {
                      if (!userId) {
                        snackbar.showSnackbar('Please log in to generate a plan', { variant: 'error' });
                        return;
                      }
                      generateMutation.mutate(userId);
                    }}
                    loading={generateMutation.isPending}
                  />
                </Card.Content>
              </Card>
            }
            contentContainerStyle={days.length === 0 ? styles.emptyList : undefined}
          />
        )}

        <MealDetailModal
          visible={!!selectedMeal}
          meal={selectedMeal}
          onDismiss={() => setSelectedMeal(null)}
        />
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
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
    gap: spacing.sm,
  },
  dayAvatar: {
    backgroundColor: '#FF6B6B',
  },
  mealCard: {
    marginTop: spacing.xs,
    borderRadius: 12,
  },
  insightCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
  },
  alertContainer: {
    gap: spacing.xs,
  },
  alertText: {
    color: '#f97316',
  },
  emptyCard: {
    borderRadius: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
});
