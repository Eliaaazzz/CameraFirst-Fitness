import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
    Plus,
    Target,
} from 'phosphor-react-native';

import { Text } from '@/components';
import { BentoCard } from '@/components/common/BentoCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useLanguageStore } from '@/stores';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Goal type display config - semantically appropriate icons
const GOAL_TYPE_CONFIG: Record<GoalType, { labelKey: 'fatLoss' | 'buildMuscle' | 'glucoseControl'; Icon: React.ComponentType<any>; color: string }> = {
  fat_loss: { labelKey: 'fatLoss', Icon: Target, color: '#EF4444' },
  muscle_gain: { labelKey: 'buildMuscle', Icon: FlagCheckered, color: BRAND_COLORS.macros.protein }, // Use Emerald for growth
  diabetes_control: { labelKey: 'glucoseControl', Icon: Drop, color: BRAND_COLORS.macros.carbs },
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

  const cardProgress = useSharedValue(0);
  const actionsProgress = useSharedValue(0);

  useEffect(() => {
    cardProgress.value = withSpring(1, { damping: 18, stiffness: 100 });
    actionsProgress.value = withDelay(150, withSpring(1, { damping: 18, stiffness: 100 }));
  }, []);

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
            <BentoCard style={styles.goalBanner}>
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
        <QuickActionsCard />

        {/* 3. Hydration Card */}
        <BentoCard>
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationHeaderLeft}>
              <View style={styles.hydrationIconBox}>
                <Drop size={18} weight="fill" color="#06B6D4" />
              </View>
              <Text variant="body" weight="bold" style={styles.hydrationLabel}>Hydration</Text>
            </View>
            <HydrationAddButton />
          </View>
          <HydrationProgress />
        </BentoCard>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function HydrationAddButton() {
  // Logic for adding water should be passed down, but for UI:
  return (
    <Pressable style={({ pressed }) => [styles.hydrationPlus, pressed && { opacity: 0.7 }]}>
      <Plus size={16} weight="bold" color="#06B6D4" />
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

function HydrationProgress() {
  const { t } = useLanguageStore();
  const current = 2; // Mock
  const goal = 8;
  const progress = current / goal;

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
  // Goal Banner (additional styles, base from BentoCard)
  goalBanner: {
    overflow: 'hidden',
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
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalStatusText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  goalContent: {
    zIndex: 1,
  },
  goalBannerLabel: {
    color: '#6B7280',
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
    color: '#4B5563',
  },
  goalDecorativeCircle: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
  },
  // Bento Section
  bentoSection: {
    gap: 20,
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
    padding: 6,
    backgroundColor: '#CFFAFE', // Cyan-50
    borderRadius: 8,
  },
  hydrationLabel: {
    color: '#164E63', // Cyan-900
  },
  hydrationPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...saasShadows.subtle,
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
    backgroundColor: 'rgba(6, 182, 212, 0.15)', // Cyan with opacity
    overflow: 'hidden',
  },
  hydrationFill: {
    height: '100%',
    backgroundColor: '#06B6D4', // Cyan-500
    borderRadius: 999,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  // Set Goals Prompt
  setGoalsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${BRAND_COLORS.primary}20`,
    borderStyle: 'dashed',
    gap: spacing.sm,
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
