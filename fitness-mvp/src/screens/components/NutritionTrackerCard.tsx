import { BORDER_RADIUS, COLORS, spacing, SPACING } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text as PaperText, ProgressBar } from 'react-native-paper';

interface NutritionData {
  calories?: { consumed: number; target: number };
  protein?: { consumed: number; target: number };
  carbs?: { consumed: number; target: number };
  fat?: { consumed: number; target: number };
}

interface NutritionTrackerCardProps {
  data: NutritionData | null | undefined;
  isLoading?: boolean;
}

const NutritionTrackerCard: React.FC<NutritionTrackerCardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <PaperText variant="bodyMedium" style={styles.loadingText}>
            Loading nutrition data...
          </PaperText>
        </Card.Content>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <PaperText variant="bodyMedium" style={styles.emptyText}>
            No nutrition data available
          </PaperText>
        </Card.Content>
      </Card>
    );
  }

  const renderMacroRow = (
    label: string,
    icon: 'food-steak' | 'bread-slice' | 'water',
    consumed: number,
    target: number,
    color: string
  ) => {
    const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
    const percentage = Math.round(progress * 100);

    return (
      <React.Fragment key={label}>
        <View style={styles.macroRow}>
          <View style={styles.macroHeader}>
            <MaterialCommunityIcons name={icon} size={20} color={color} />
            <PaperText variant="bodyMedium" style={styles.macroLabel}>
              {label}
            </PaperText>
            <PaperText variant="bodySmall" style={styles.macroValue}>
              {consumed}g / {target}g
            </PaperText>
          </View>
          <ProgressBar
            progress={progress}
            color={color}
            style={styles.progressBar}
          />
          <PaperText variant="bodySmall" style={styles.percentageText}>
            {percentage}%
          </PaperText>
        </View>
      </React.Fragment>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-donut" size={24} color={COLORS.primary.main} />
          <PaperText variant="titleMedium" style={styles.title}>
            Today's Nutrition
          </PaperText>
        </View>

        {/* Calories - Enhanced with gradient */}
        {data.calories && (
          <LinearGradient
            colors={[COLORS.primary.main + '20', COLORS.primary.dark + '10'] as const}
            style={styles.caloriesSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.caloriesIconWrapper}>
              <MaterialCommunityIcons name="fire" size={28} color={COLORS.primary.main} />
            </View>
            <View style={styles.caloriesText}>
              <PaperText variant="headlineMedium" style={styles.caloriesValue}>
                {data.calories.consumed}
              </PaperText>
              <PaperText variant="bodySmall" style={styles.caloriesLabel}>
                / {data.calories.target} cal
              </PaperText>
            </View>
            <View style={styles.caloriesProgress}>
              <PaperText variant="bodySmall" style={styles.caloriesPercent}>
                {Math.round((data.calories.consumed / data.calories.target) * 100)}%
              </PaperText>
            </View>
          </LinearGradient>
        )}

        {/* Macros */}
        <View style={styles.macrosContainer}>
          {data.protein && renderMacroRow('Protein', 'food-steak', data.protein.consumed, data.protein.target, '#4CAF50')}
          {data.carbs && renderMacroRow('Carbs', 'bread-slice', data.carbs.consumed, data.carbs.target, '#2196F3')}
          {data.fat && renderMacroRow('Fat', 'water', data.fat.consumed, data.fat.target, '#FF9800')}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.surface.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  loadingText: {
    textAlign: 'center',
    color: COLORS.text.secondary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.text.secondary,
  },
  caloriesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  caloriesIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.main + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesText: {
    marginLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  caloriesValue: {
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  caloriesLabel: {
    color: COLORS.text.secondary,
    marginLeft: spacing.xs,
  },
  caloriesProgress: {
    backgroundColor: COLORS.primary.main + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  caloriesPercent: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  macrosContainer: {
    gap: spacing.md,
  },
  macroRow: {
    marginBottom: spacing.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    flex: 1,
    marginLeft: spacing.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  macroValue: {
    color: COLORS.text.secondary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.divider,
  },
  percentageText: {
    textAlign: 'right',
    color: COLORS.text.tertiary,
    marginTop: spacing.xs,
  },
});

export default NutritionTrackerCard;
