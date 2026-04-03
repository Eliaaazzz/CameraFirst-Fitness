import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';
import {
    CaretRight,
    Drop,
    FlagCheckered,
    Leaf,
    Plus,
    Target,
} from 'phosphor-react-native';

import { Text } from '@/components';
import { BentoCard } from '@/components/common/BentoCard';
import { InsightCard, generateInsights } from '@/components/dashboard/InsightCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useHydrationStore, useLanguageStore } from '@/stores';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Goal type display config - semantically appropriate icons
const GOAL_TYPE_CONFIG: Record<GoalType, { labelKey: 'fatLoss' | 'buildMuscle' | 'glucoseControl'; Icon: React.ComponentType<any>; color: string }> = {
  fat_loss: { labelKey: 'fatLoss', Icon: Target, color: '#EF4444' },
  muscle_gain: { labelKey: 'buildMuscle', Icon: FlagCheckered, color: BRAND_COLORS.macros.protein }, // Use Emerald for growth
  diabetes_control: { labelKey: 'glucoseControl', Icon: Leaf, color: BRAND_COLORS.macros.carbs },
};

interface DashboardWidgetsProps {
  generatedGoals: GeneratedGoals | null;
}

/**
 * DashboardWidgets - Right panel widgets for the dashboard
 * Redesigned with Bento Grid style - Premium Motivation Card + Fresh Actions
 */
export function DashboardWidgets({ generatedGoals }: DashboardWidgetsProps) {
  const navigation = useNavigation<any>();
  const { t } = useLanguageStore();
  const currentUser = useCurrentUser();
  const { data: nutritionData } = useDailyNutrition();
  const hydrationCups = useHydrationStore((state) => state.cups);
  const hydrationGoalCups = useHydrationStore((state) => state.dailyGoalCups);
  const hydrationLoaded = useHydrationStore((state) => state.isLoaded);
  const loadHydration = useHydrationStore((state) => state.loadHydration);
  const addHydrationCup = useHydrationStore((state) => state.addCup);
  const ensureHydrationToday = useHydrationStore((state) => state.ensureToday);

  // Generate smart insights
  const insights = React.useMemo(() => generateInsights({
    calories: nutritionData.calories,
    calorieGoal: nutritionData.goal,
    protein: nutritionData.protein,
    carbs: nutritionData.carbs,
    fat: nutritionData.fat,
    mealCount: nutritionData.meals.length,
    streak: currentUser.data?.currentStreak || 0,
  }), [nutritionData, currentUser.data?.currentStreak]);

  const cardProgress = useSharedValue(0);
  const actionsProgress = useSharedValue(0);

  useEffect(() => {
    cardProgress.value = withSpring(1, { damping: 18, stiffness: 100 });
    actionsProgress.value = withDelay(150, withSpring(1, { damping: 18, stiffness: 100 }));
  }, []);

  useEffect(() => {
    loadHydration().catch((error) => {
      console.warn('[DashboardWidgets] Failed to load hydration state:', error);
    });
  }, [loadHydration]);

  useEffect(() => {
    if (!hydrationLoaded) return;
    ensureHydrationToday().catch((error) => {
      console.warn('[DashboardWidgets] Failed to sync hydration date:', error);
    });
  }, [ensureHydrationToday, hydrationLoaded]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [{ translateY: interpolate(cardProgress.value, [0, 1], [15, 0]) }],
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: actionsProgress.value,
    transform: [{ translateY: interpolate(actionsProgress.value, [0, 1], [15, 0]) }],
  }));

  const goalTypeConfigRaw = generatedGoals?.goalType
    ? GOAL_TYPE_CONFIG[generatedGoals.goalType]
    : null;
  const goalTypeConfig = goalTypeConfigRaw ? {
    ...goalTypeConfigRaw,
    label: t[goalTypeConfigRaw.labelKey as keyof typeof t] as string,
  } : null;

  return (
    <View style={styles.container}>
      {/* 1. Goal Motivation Card */}
      {generatedGoals ? (
        <Animated.View style={cardAnimatedStyle}>
          <Pressable onPress={() => navigation.navigate('Profile')}>
            <BentoCard style={[styles.rightGlassCard, styles.goalBanner]}>
              <View style={styles.goalBannerHeader}>
                <View style={styles.goalIconContainer}>
                  {goalTypeConfig && (
                    <goalTypeConfig.Icon size={20} weight="fill" color="#F97316" />
                  )}
                </View>
                <View style={styles.goalStatusBadge}>
                  <Text style={styles.goalStatusText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.goalContent}>
                <Text variant="caption" weight="bold" style={styles.goalBannerLabel}>CURRENT GOAL</Text>
                <Text variant="heading2" weight="bold" style={styles.goalBannerTitle}>
                  {goalTypeConfig?.label || 'Fitness Journey'}
                </Text>
                <View style={styles.goalMetaRow}>
                  <Text variant="caption" style={styles.goalMetaText}>
                    Target: {generatedGoals.goalType === 'fat_loss' ? '72kg' : '82kg'}
                  </Text>
                </View>
              </View>

              {/* Decorative Circle */}
              <View style={styles.goalDecorativeCircle} />
            </BentoCard>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View style={cardAnimatedStyle}>
          <SetGoalsPrompt onPress={() => navigation.navigate('Profile')} />
        </Animated.View>
      )}

      {/* 2. Quick Actions - CSS Grid 2x2 Bento Style */}
      <Animated.View style={[styles.bentoSection, actionsAnimatedStyle]}>
        <QuickActionsCard cardStyle={styles.rightGlassCard} />

        {/* 3. Hydration Card */}
        <BentoCard style={styles.rightGlassCard}>
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationHeaderLeft}>
              <View style={styles.hydrationIconBox}>
                <Drop size={18} weight="fill" color="#06B6D4" />
              </View>
              <Text variant="body" weight="bold" style={styles.hydrationLabel}>{t.hydration}</Text>
            </View>
            <HydrationAddButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                addHydrationCup().catch((error) => {
                  console.warn('[DashboardWidgets] Failed to add hydration cup:', error);
                });
              }}
            />
          </View>
          <HydrationProgress current={hydrationCups} goal={hydrationGoalCups} />
        </BentoCard>

        {/* 4. Smart Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            {insights.map((insight, i) => (
              <InsightCard key={i} text={insight.text} color={insight.color} icon={insight.icon} />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function HydrationAddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Add one cup of water"
      style={({ pressed }) => [styles.hydrationPlus, pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] }]}
    >
      <View pointerEvents="none">
        <Plus size={16} weight="bold" color="#06B6D4" />
      </View>
    </Pressable>
  );
}

function SetGoalsPrompt({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedPressable
      style={styles.setGoalsPrompt}
      onPress={onPress}
    >
      <Target size={20} weight="regular" color={BRAND_COLORS.primary} />
      <View style={styles.setGoalsText}>
        <Text variant="body" weight="semibold">Set Your Goals</Text>
        <Text variant="caption" style={styles.mutedText}>Get personalized targets</Text>
      </View>
      <CaretRight size={16} weight="bold" color={BRAND_COLORS.primary} />
    </AnimatedPressable>
  );
}

function HydrationProgress({ current, goal }: { current: number; goal: number }) {
  const { t } = useLanguageStore();
  const safeGoal = goal > 0 ? goal : 1;
  const progress = Math.min(1, Math.max(0, current / safeGoal));

  return (
    <View style={styles.hydrationContent}>
      <View style={styles.hydrationStats}>
        <Text variant="heading1" weight="bold" style={styles.hydrationCurrent}>{current}</Text>
        <Text variant="body" weight="medium" style={styles.hydrationTarget}>/ {goal} {t.cups}</Text>
      </View>
      <View style={styles.hydrationTrack}>
        <View style={[styles.hydrationFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    paddingVertical: spacing.sm,
  },
  rightGlassCard: {
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && ({
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.74), 0 0 0 1px rgba(255,170,120,0.18), 0 10px 24px rgba(15,23,42,0.04)',
    } as any)),
  },
  // Goal Banner (additional styles, base from BentoCard)
  goalBanner: {
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.62)',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  goalBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 241, 227, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246, 194, 143, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalStatusBadge: {
    backgroundColor: 'rgba(255, 244, 232, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246, 194, 143, 0.5)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  goalStatusText: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
  },
  goalContent: {
    zIndex: 1,
  },
  goalBannerLabel: {
    color: '#7A6B5C',
    letterSpacing: 1,
    fontSize: 10,
  },
  goalBannerTitle: {
    color: '#111827',
    marginTop: 4,
  },
  goalMetaRow: {
    marginTop: 12,
  },
  goalMetaText: {
    color: '#6E5E4D',
  },
  goalDecorativeCircle: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
  },
  // Bento Section
  bentoSection: {
    gap: 20,
  },
  // Smart Insights
  insightsSection: {
    gap: 10,
  },
  // Hydration
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hydrationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hydrationIconBox: {
    padding: 8,
    backgroundColor: 'rgba(205, 242, 250, 0.82)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(112, 223, 243, 0.36)',
  },
  hydrationLabel: {
    color: '#164E63', // Cyan-900
  },
  hydrationPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && ({
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.78), 0 0 0 1px rgba(112,223,243,0.16), 0 8px 14px rgba(15,23,42,0.03)',
    } as any)),
  },
  hydrationContent: {
    gap: 12,
  },
  hydrationStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  hydrationCurrent: {
    color: '#164E63', // Cyan-900
    fontSize: 32,
    lineHeight: 32,
  },
  hydrationTarget: {
    color: '#06B6D4', // Cyan-500
    paddingBottom: 4,
  },
  hydrationTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    overflow: 'hidden',
  },
  hydrationFill: {
    height: '100%',
    backgroundColor: '#06B6D4', // Cyan-500
    borderRadius: 999,
  },
  // Set Goals Prompt
  setGoalsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    gap: spacing.sm,
    ...(Platform.OS === 'web' && ({
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.74), 0 0 0 1px rgba(255,170,120,0.2), 0 10px 24px rgba(15,23,42,0.04)',
    } as any)),
  },
  setGoalsText: {
    flex: 1,
  },
  mutedText: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
});

export default DashboardWidgets;
