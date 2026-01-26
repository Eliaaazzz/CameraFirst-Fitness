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

import { useNavigation } from '@react-navigation/native';
import {
    CaretRight,
    ChartLine,
    ClockCounterClockwise,
    Drop,
    Export,
    FlagCheckered,
    PencilSimple,
    Scales,
    Target,
} from 'phosphor-react-native';

import { Card, Text } from '@/components';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
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
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; Icon: React.ComponentType<any>; color: string }> = {
  fat_loss: { label: 'Fat Loss', Icon: Target, color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', Icon: FlagCheckered, color: '#10B981' },
  diabetes_control: { label: 'Glucose Control', Icon: Drop, color: '#3B82F6' },
};

// Quick action config with Phosphor icons and theme colors
const QUICK_ACTIONS = [
  { key: 'history', label: 'Meal History', Icon: ClockCounterClockwise, color: '#8B5CF6', screen: 'MealHistory' },
  { key: 'insights', label: 'Weekly Insights', Icon: ChartLine, color: '#3B82F6', screen: 'WeeklyInsights' },
  { key: 'weight', label: 'Log Weight', Icon: Scales, color: '#10B981', screen: 'LogWeight' },
  { key: 'export', label: 'Export Data', Icon: Export, color: '#F59E0B', screen: 'ExportData' },
];

interface DashboardWidgetsProps {
  generatedGoals: GeneratedGoals | null;
}

/**
 * DashboardWidgets - Right panel widgets for the dashboard
 * Enhanced with ghost button interactions and micro-animations
 */
export function DashboardWidgets({ generatedGoals }: DashboardWidgetsProps) {
  const navigation = useNavigation<any>();

  // Staggered entrance animations
  const cardProgress = useSharedValue(0);
  const actionsProgress = useSharedValue(0);

  useEffect(() => {
    cardProgress.value = withSpring(1, { damping: 18, stiffness: 100 });
    actionsProgress.value = withDelay(150, withSpring(1, { damping: 18, stiffness: 100 }));
  }, [cardProgress, actionsProgress]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [
      { translateY: interpolate(cardProgress.value, [0, 1], [15, 0]) },
    ],
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: actionsProgress.value,
    transform: [
      { translateY: interpolate(actionsProgress.value, [0, 1], [15, 0]) },
    ],
  }));

  const goalTypeConfig = generatedGoals?.goalType
    ? GOAL_TYPE_CONFIG[generatedGoals.goalType]
    : null;

  return (
    <View style={styles.container}>
      {/* Goals Summary Card */}
      {generatedGoals ? (
        <Animated.View style={cardAnimatedStyle}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                {goalTypeConfig && (
                  <View style={[styles.goalTypeIcon, { backgroundColor: tint(goalTypeConfig.color, 0.12) }]}>
                    <goalTypeConfig.Icon
                      size={16}
                      weight="fill"
                      color={goalTypeConfig.color}
                    />
                  </View>
                )}
                <View>
                  <Text variant="caption" style={styles.cardLabel}>Your Goal</Text>
                  {goalTypeConfig && (
                    <Text variant="body" weight="bold" style={{ color: goalTypeConfig.color }}>
                      {goalTypeConfig.label}
                    </Text>
                  )}
                </View>
              </View>
              <EditButton onPress={() => navigation.navigate('Profile')} />
            </View>

          </Card>
        </Animated.View>
      ) : (
        <Animated.View style={cardAnimatedStyle}>
          <SetGoalsPrompt onPress={() => navigation.navigate('Profile')} />
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View style={actionsAnimatedStyle}>
        <Card style={styles.actionsCard}>
          <Text variant="caption" weight="bold" style={styles.sectionLabel}>
            QUICK ACTIONS
          </Text>
          <View style={styles.actionsList}>
            {QUICK_ACTIONS.map((action, index) => (
              <QuickActionButton
                key={action.key}
                Icon={action.Icon}
                color={action.color}
                label={action.label}
                onPress={() => navigation.navigate('Profile', { screen: action.screen })}
                delay={index * 50}
              />
            ))}
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// EDIT BUTTON WITH TOOLTIP
// ============================================================================

function EditButton({ onPress }: { onPress: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(isHovered ? 1 : 0, { duration: 150 });
    if (isHovered) {
      const timer = setTimeout(() => setShowTooltip(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isHovered, bgOpacity]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <View style={styles.editButtonWrapper}>
      {/* Tooltip */}
      {showTooltip && Platform.OS === 'web' && (
        <View style={styles.tooltip}>
          <Text variant="caption" style={styles.tooltipText}>Edit Goal</Text>
        </View>
      )}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.editButton, animatedStyle]}
        {...(Platform.OS === 'web' && {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        })}
      >
        <Animated.View style={[styles.editButtonBg, bgAnimatedStyle]} />
        <PencilSimple size={12} weight="bold" color={BRAND_COLORS.primary} />
      </AnimatedPressable>
    </View>
  );
}

// ============================================================================
// SET GOALS PROMPT
// ============================================================================

function SetGoalsPrompt({ onPress }: { onPress: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.setGoalsPrompt, isHovered && styles.setGoalsPromptHovered, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
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

// ============================================================================
// QUICK ACTION BUTTON (Ghost Button Style with Phosphor + Colored Chips)
// ============================================================================

interface QuickActionButtonProps {
  Icon: React.ComponentType<any>;
  color: string;
  label: string;
  onPress: () => void;
  delay?: number;
}

function QuickActionButton({ Icon, color, label, onPress, delay = 0 }: QuickActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  // Entrance animation
  const itemProgress = useSharedValue(0);
  useEffect(() => {
    itemProgress.value = withDelay(delay + 300, withSpring(1, { damping: 18, stiffness: 100 }));
  }, [delay, itemProgress]);

  // Hover effects
  useEffect(() => {
    bgOpacity.value = withTiming(isHovered ? 1 : 0, { duration: 150 });
  }, [isHovered, bgOpacity]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: itemProgress.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.actionItem, containerStyle]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      {/* Button background */}
      <Animated.View style={[styles.actionItemBg, bgStyle]} />

      {/* Colored chip with Phosphor icon */}
      <View style={[
        styles.actionIconBox, 
        { 
          backgroundColor: tint(color, isHovered ? 0.16 : 0.1),
          borderColor: tint(color, 0.18),
        }
      ]}>
        <Icon
          size={20}
          weight={isHovered ? 'fill' : 'regular'}
          color={color}
        />
      </View>
      <Text
        variant="caption"
        weight={isHovered ? 'semibold' : 'medium'}
        style={styles.actionLabel}
        color={isHovered ? BRAND_COLORS.textPrimary : colors.light.textSecondary}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
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
  // Edit button with tooltip
  editButtonWrapper: {
    position: 'relative',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  editButtonBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${BRAND_COLORS.primary}15`,
    borderRadius: 14,
  },
  tooltip: {
    position: 'absolute',
    top: -32,
    right: 0,
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 100,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
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
    }),
  },
  setGoalsPromptHovered: {
    backgroundColor: `${BRAND_COLORS.primary}05`,
    borderColor: `${BRAND_COLORS.primary}40`,
  },
  setGoalsText: {
    flex: 1,
  },
  // Actions card
  actionsCard: {
    padding: spacing.md,
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
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  actionsList: Platform.select({
    web: {
      display: 'grid' as any,
      gridTemplateColumns: 'repeat(2, 1fr)' as any,
      gap: spacing.md,
    },
    default: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.md,
    },
  }),
  // Ghost button action item
  actionItem: {
    // Grid handles sizing on web, no need for flexBasis
    minHeight: 100,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    gap: spacing.xs,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  actionItemBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.light.background,
    borderRadius: 14,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.15s ease-out',
    }),
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.15s ease-out',
    }),
  },
  actionLabel: {
    textAlign: 'center',
    fontSize: 12,
    zIndex: 1,
  },
  mutedText: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
});

export default DashboardWidgets;
