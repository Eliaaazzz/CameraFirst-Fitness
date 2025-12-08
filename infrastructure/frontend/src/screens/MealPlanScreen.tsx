import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Avatar, Card as PaperCard, Card, Text as PaperText } from 'react-native-paper';
import { Container, SafeAreaWrapper, Text, Button, useSnackbar } from '@/components';
import { spacing } from '@/utils';
import mealPlanApi from '@/services/mealPlanApi';
import nutritionApi from '@/services/nutritionApi';
import { MealPlanHistoryItem, MealPlanResponse, NutritionInsightResponse, NutritionSummaryResponse } from '@/types/mealPlan';
import MealDetailModal from '@/screens/components/MealDetailModal';
import NutritionTrackerCard from '@/screens/components/NutritionTrackerCard';
import useCurrentUser from '@/hooks/useCurrentUser';

export const MealPlanScreen = () => {
  const [selectedMeal, setSelectedMeal] = useState<MealPlanHistoryItem['plan']['days'][number]['meals'][number] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MealPlanHistoryItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const snackbar = useSnackbar();
  const currentUserQuery = useCurrentUser();
  const userId = currentUserQuery.data?.userId;

  useEffect(() => {
    if (currentUserQuery.isError) {
      const message = currentUserQuery.error instanceof Error
        ? currentUserQuery.error.message
        : 'Failed to load user information';
      snackbar.showSnackbar(message, { variant: 'error' });
    }
  }, [currentUserQuery.isError, currentUserQuery.error, snackbar]);

  if (currentUserQuery.isError && !currentUserQuery.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.emptyCard}>
            <Card.Title title="无法加载用户信息" />
            <Card.Content>
              <PaperText variant="bodyMedium" style={{ marginBottom: spacing.md }}>
                请检查你的网络连接或 API Key 设置，然后重试。
              </PaperText>
              <Button title="重试" onPress={() => currentUserQuery.refetch()} />
            </Card.Content>
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['meal-plan', 'history', userId],
    queryFn: () => mealPlanApi.getHistory(userId!, 5),
    enabled: !!userId,
  });

  const summaryQuery = useQuery<NutritionSummaryResponse>({
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

  const renderDay = ({ item }: { item: MealPlanHistoryItem['plan']['days'][number] }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Avatar.Text size={36} label={`${item.dayNumber}`} style={styles.dayAvatar} />
        <Text variant="heading2">Day {item.dayNumber}</Text>
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
                snackbar.showSnackbar('需要登录用户才能生成计划', { variant: 'error' });
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
              title="周度营养洞察"
              subtitle={new Date(insightQuery.data.summary.rangeStart).toLocaleDateString()}
            />
            <Card.Content>
              {insightQuery.data.summary.alerts.length > 0 && (
                <View style={styles.alertContainer}>
                  {insightQuery.data.summary.alerts.map((alert: string) => (
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
                <Card.Title title="还没有生成餐食计划" />
                <Card.Content>
                  <PaperText variant="bodyMedium" style={{ marginBottom: spacing.md }}>
                    点击上方的“Regenerate”按钮，即可为你生成7天的个性化饮食安排。
                  </PaperText>
                  <Button
                    title="生成周计划"
                    onPress={() => {
                      if (!userId) {
                        snackbar.showSnackbar('需要登录用户才能生成计划', { variant: 'error' });
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
