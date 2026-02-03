import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useNavigation } from '@react-navigation/native';
import {
    CaretRight,
    ChartLine,
    ClockCounterClockwise,
    Drop,
    Export,
    FlagCheckered,
    PencilSimple,
    CheckCircle,
    Plus,
    Scales,
    Target,
} from 'phosphor-react-native';

import { Text } from '@/components';
import { BentoCard } from '@/components/common/BentoCard';
import { WeightLogModal } from '@/components/weight';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useLanguageStore } from '@/stores';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Helper: create tinted background from hex color
const tint = (hex: string, alpha = 0.12): string => {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Goal type display config - semantically appropriate icons
const GOAL_TYPE_CONFIG: Record<GoalType, { labelKey: 'fatLoss' | 'buildMuscle' | 'glucoseControl'; Icon: React.ComponentType<any>; color: string }> = {
  fat_loss: { labelKey: 'fatLoss', Icon: Target, color: '#EF4444' },
  muscle_gain: { labelKey: 'buildMuscle', Icon: FlagCheckered, color: '#F97316' }, // Use Orange for energy
  diabetes_control: { labelKey: 'glucoseControl', Icon: Drop, color: '#3B82F6' },
};

// Quick action config - minimalist style (Icons only colored)
const QUICK_ACTIONS = [
  { key: 'history', labelKey: 'mealHistory' as const, Icon: ClockCounterClockwise, color: '#4B5563', screen: 'MealHistory' },
  { key: 'insights', labelKey: 'weeklyInsights' as const, Icon: ChartLine, color: '#4B5563', screen: 'WeeklyInsights' },
  { key: 'weight', labelKey: 'logWeight' as const, Icon: Scales, color: '#4B5563', screen: 'LogWeight' },
  { key: 'export', labelKey: 'exportData' as const, Icon: Export, color: '#4B5563', screen: 'ExportData' },
];

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
  const [showWeightModal, setShowWeightModal] = useState(false);

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
        <BentoCard>
          <Text variant="caption" weight="bold" style={styles.sectionLabel}>
            QUICK ACTIONS
          </Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <QuickActionButton
                key={action.key}
                Icon={action.Icon}
                color={action.color}
                label={t[action.labelKey] as string}
                onPress={() => {
                  if (action.key === 'weight') {
                    setShowWeightModal(true);
                  } else {
                    navigation.navigate('Profile', { screen: action.screen });
                  }
                }}
                delay={index * 50}
              />
            ))}
          </View>
        </BentoCard>

        {/* Weight Log Modal */}
        <WeightLogModal
          visible={showWeightModal}
          onDismiss={() => setShowWeightModal(false)}
        />

        {/* 3. Hydration Card */}
        <BentoCard>
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationHeaderLeft}>
              <View style={styles.hydrationIconBox}>
                <Drop size={18} weight="fill" color="#007AFF" />
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
      <Plus size={16} weight="bold" color="#007AFF" />
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

interface QuickActionButtonProps {
  Icon: React.ComponentType<any>;
  color: string;
  label: string;
  onPress: () => void;
  delay?: number;
}

function QuickActionButton({ Icon, color, label, onPress }: QuickActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.actionButton, isHovered && styles.actionButtonHovered, containerStyle]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      <View style={styles.actionIconWrapper}>
        <Icon size={20} weight={isHovered ? 'fill' : 'regular'} color={isHovered ? BRAND_COLORS.primary : color} />
      </View>
      <Text variant="caption" weight="medium" style={styles.actionText}>{label}</Text>
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  // Bento Section
  bentoSection: {
    gap: 20,
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 16,
  },
  // Quick Actions - CSS Grid 2x2
  actionsGrid: {
    ...(Platform.OS === 'web'
      ? {
          display: 'grid' as any,
          gridTemplateColumns: 'repeat(2, 1fr)' as any,
          gap: 12,
        }
      : {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }),
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
    // For mobile flex layout
    ...(Platform.OS !== 'web' && {
      flexBasis: '47%',
      flexGrow: 1,
    }),
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  actionButtonHovered: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    color: '#374151',
    fontSize: 12,
    textAlign: 'center',
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
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  hydrationLabel: {
    color: '#1E3A8A',
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
    color: '#1E3A8A',
    fontSize: 32,
    lineHeight: 32,
  },
  hydrationTarget: {
    color: '#007AFF',
    paddingBottom: 4,
  },
  hydrationTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    overflow: 'hidden',
  },
  hydrationFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 999,
    shadowColor: '#007AFF',
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
