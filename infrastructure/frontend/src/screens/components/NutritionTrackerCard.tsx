import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, ProgressBar, Text as PaperText, useTheme, Chip } from 'react-native-paper';
import { NutritionSummaryResponse } from '@/types/mealPlan';
import { spacing } from '@/utils';

interface Props {
  summary?: NutritionSummaryResponse;
  isLoading?: boolean;
}

const NutritionTrackerCard = ({ summary, isLoading }: Props) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Title title="每日营养进度" />
        <Card.Content style={styles.loading}>
          <ActivityIndicator />
        </Card.Content>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const metrics = [
    { label: 'Calories', value: summary.calories.actual, target: summary.calories.target, percent: summary.calories.percent / 100 },
    { label: 'Protein', value: summary.protein.actual, target: summary.protein.target, percent: summary.protein.percent / 100 },
    { label: 'Carbs', value: summary.carbs.actual, target: summary.carbs.target, percent: summary.carbs.percent / 100 },
    { label: 'Fat', value: summary.fat.actual, target: summary.fat.target, percent: summary.fat.percent / 100 },
  ];

  return (
    <Card style={styles.card}>
      <Card.Title title="每日营养进度" subtitle={`目标基于 ${summary.days} 天`} />
      <Card.Content>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricRow}>
            <View style={styles.metricHeader}>
              <PaperText variant="labelLarge">{metric.label}</PaperText>
              <PaperText variant="bodySmall" style={{ opacity: 0.7 }}>
                {Math.round(metric.value)} / {Math.round(metric.target)}
              </PaperText>
            </View>
            <ProgressBar
              progress={Math.min(metric.percent, 1.25)}
              color={metric.percent > 1 ? theme.colors.error : theme.colors.primary}
              style={styles.progress}
            />
          </View>
        ))}
        {summary.alerts.length > 0 && (
          <View style={styles.alerts}>
            {summary.alerts.map((alert) => (
              <Chip key={alert} icon="alert" style={styles.alertChip}>
                {alert}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: 16,
  },
  metricRow: {
    marginBottom: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progress: {
    height: 8,
    borderRadius: 4,
  },
  alerts: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  alertChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
});

export default NutritionTrackerCard;
