import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Card, Text } from '@/components';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Goal type display config
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string }> = {
  fat_loss: { label: 'Fat Loss', icon: 'target', color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', icon: 'flag-checkered', color: '#10B981' },
  diabetes_control: { label: 'Blood Sugar', icon: 'heart-pulse', color: '#3B82F6' },
};

interface DashboardWidgetsProps {
  generatedGoals: GeneratedGoals | null;
  currentStreak?: number;
}

/**
 * DashboardWidgets - Right panel widgets for the dashboard
 * Displayed only on wide screens (>=1264px)
 * Optimized for desktop with compact, high-density layout
 */
export function DashboardWidgets({ generatedGoals, currentStreak = 0 }: DashboardWidgetsProps) {
  const navigation = useNavigation<any>();

  const goalTypeConfig = generatedGoals?.goalType
    ? GOAL_TYPE_CONFIG[generatedGoals.goalType]
    : null;

  return (
    <View style={styles.container}>
      {/* Goals Summary Card */}
      {generatedGoals ? (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              {goalTypeConfig && (
                <View style={[styles.goalTypeIcon, { backgroundColor: `${goalTypeConfig.color}15` }]}>
                  <MaterialCommunityIcons
                    name={goalTypeConfig.icon as any}
                    size={16}
                    color={goalTypeConfig.color}
                  />
                </View>
              )}
              <View>
                <Text variant="caption" style={styles.cardLabel}>Your Goal</Text>
                {goalTypeConfig && (
                  <Text variant="body" weight="semibold" style={{ color: goalTypeConfig.color }}>
                    {goalTypeConfig.label}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              style={styles.editButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Feather name="edit-2" size={12} color={BRAND_COLORS.primary} />
            </Pressable>
          </View>

          {/* Compact macro grid */}
          <View style={styles.goalsGrid}>
            <GoalItem icon="fire" iconColor="#EF4444" value={generatedGoals.dailyCalories.target} label="kcal" />
            <GoalItem icon="food-steak" iconColor="#10B981" value={`${generatedGoals.macros_grams.protein_g}g`} label="P" />
            <GoalItem icon="barley" iconColor="#F59E0B" value={`${generatedGoals.macros_grams.carbs_g}g`} label="C" />
            <GoalItem icon="oil" iconColor="#EF4444" value={`${generatedGoals.macros_grams.fat_g}g`} label="F" />
          </View>
        </Card>
      ) : (
        <SetGoalsPrompt onPress={() => navigation.navigate('Profile')} />
      )}

      {/* Streak Card - Compact */}
      <Card style={styles.streakCard}>
        <View style={styles.streakIconSmall}>
          <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
        </View>
        <View style={styles.streakInfo}>
          <Text variant="heading3" weight="bold" style={styles.streakNumber}>
            {currentStreak}
          </Text>
          <Text variant="caption" style={styles.mutedText}>day streak</Text>
        </View>
      </Card>

      {/* Quick Actions - Compact list style */}
      <Card style={styles.actionsCard}>
        <Text variant="caption" weight="semibold" style={styles.sectionLabel}>
          QUICK ACTIONS
        </Text>
        <View style={styles.actionsList}>
          <QuickActionItem
            icon="history"
            label="Meal History"
            onPress={() => navigation.navigate('Profile', { screen: 'MealHistory' })}
          />
          <QuickActionItem
            icon="chart-line"
            label="Weekly Insights"
            onPress={() => navigation.navigate('Profile', { screen: 'WeeklyInsights' })}
          />
          <QuickActionItem
            icon="bookmark-outline"
            label="Saved Recipes"
            onPress={() => navigation.navigate('Profile', { screen: 'SavedRecipes' })}
          />
          <QuickActionItem
            icon="dumbbell"
            label="Saved Workouts"
            onPress={() => navigation.navigate('Profile', { screen: 'SavedWorkouts' })}
          />
        </View>
      </Card>
    </View>
  );
}

interface GoalItemProps {
  icon: string;
  iconColor: string;
  value: string | number;
  label: string;
}

function GoalItem({ icon, iconColor, value, label }: GoalItemProps) {
  return (
    <View style={styles.goalItem}>
      <MaterialCommunityIcons name={icon as any} size={14} color={iconColor} />
      <Text variant="body" weight="bold" style={styles.goalValue}>{value}</Text>
      <Text variant="caption" style={styles.goalLabel}>{label}</Text>
    </View>
  );
}

function SetGoalsPrompt({ onPress }: { onPress: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={[styles.setGoalsPrompt, isHovered && styles.setGoalsPromptHovered]}
      onPress={onPress}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      <MaterialCommunityIcons name="target" size={20} color={BRAND_COLORS.primary} />
      <View style={styles.setGoalsText}>
        <Text variant="body" weight="semibold">Set Your Goals</Text>
        <Text variant="caption" style={styles.mutedText}>Get personalized targets</Text>
      </View>
      <Feather name="chevron-right" size={16} color={BRAND_COLORS.primary} />
    </Pressable>
  );
}

interface QuickActionItemProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function QuickActionItem({ icon, label, onPress }: QuickActionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={[styles.actionItem, isHovered && styles.actionItemHovered]}
      onPress={onPress}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      <View style={styles.actionIconBox}>
        <MaterialCommunityIcons name={icon as any} size={16} color={BRAND_COLORS.primary} />
      </View>
      <Text variant="body" style={styles.actionLabel}>{label}</Text>
      <Feather name="chevron-right" size={14} color="#CCC" style={styles.actionChevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)', // Ultra-thin border
    ...saasShadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    color: colors.light.textSecondary,
    fontSize: 11,
    marginBottom: 1,
  },
  editButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  // Compact goals grid - 4 items in a row
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  goalValue: {
    fontSize: 14,
    color: colors.light.textPrimary,
  },
  goalLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  // Set goals prompt
  setGoalsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${BRAND_COLORS.primary}20`,
    borderStyle: 'dashed',
    gap: spacing.sm,
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  setGoalsPromptHovered: {
    backgroundColor: `${BRAND_COLORS.primary}05`,
    borderColor: `${BRAND_COLORS.primary}40`,
  },
  setGoalsText: {
    flex: 1,
  },
  // Compact streak card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    ...saasShadows.card,
  },
  streakIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  streakNumber: {
    color: '#F97316',
    fontSize: 20,
  },
  // Actions card
  actionsCard: {
    padding: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    ...saasShadows.card,
  },
  sectionLabel: {
    color: colors.light.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  actionsList: {
    gap: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.5)', // Lighter divider for premium feel
    gap: spacing.sm,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
      borderRadius: 6,
    }),
  },
  actionItemHovered: {
    backgroundColor: colors.light.background,
    borderBottomColor: 'transparent',
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
  },
  actionChevron: {
    marginLeft: 'auto',
  },
  mutedText: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
});

export default DashboardWidgets;
