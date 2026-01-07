import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, ProgressBar } from 'react-native-paper';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring
} from 'react-native-reanimated';

import { Card, Text } from '@/components';
import type { Goal } from '@/types';
import { radii, spacing } from '@/utils';
import { MaterialScale, MaterialSprings } from '@/utils/materialMotion';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickProgress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onEdit,
  onDelete,
  onQuickProgress,
}) => {
  const scale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  // Calculate progress percentage
  const progressPercent = goal.targetValue
    ? Math.min((goal.currentValue || 0) / goal.targetValue, 1)
    : 0;

  // Animate progress bar on mount and updates
  useEffect(() => {
    progressValue.value = withSpring(progressPercent, MaterialSprings.balanced);
  }, [progressPercent]);

  // Celebration animation when goal is completed
  useEffect(() => {
    if (goal.status === 'completed' && progressPercent >= 1) {
      scale.value = withSequence(
        withSpring(MaterialScale.strongEmphasis, MaterialSprings.bouncy),
        withSpring(MaterialScale.normal, MaterialSprings.balanced)
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [goal.status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get status color
  const getStatusColor = () => {
    switch (goal.status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'paused':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // Get goal type icon
  const getGoalIcon = () => {
    const iconMap: Record<string, string> = {
      nutrition: 'food-apple',
      workout: 'dumbbell',
      hydration: 'water',
      sleep: 'sleep',
      weight: 'scale-bathroom',
      habit: 'check-circle',
      meal_prep: 'chef-hat',
    };
    return iconMap[goal.type] || 'flag';
  };

  // Format frequency
  const getFrequencyLabel = () => {
    switch (goal.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return '';
    }
  };

  // Get reminders summary
  const getRemindersSummary = () => {
    const enabledReminders = goal.reminders.filter((r) => r.isEnabled);
    if (enabledReminders.length === 0) return 'No reminders';
    if (enabledReminders.length === 1) return `🔔 ${enabledReminders[0].time}`;
    return `🔔 ${enabledReminders.length} reminders`;
  };

  const handleQuickProgress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickProgress?.();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Card style={[styles.card, { borderLeftColor: goal.color, borderLeftWidth: 4 }]} onPress={onPress}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${goal.color}20` }]}>
              <MaterialCommunityIcons name={getGoalIcon()} size={24} color={goal.color} />
            </View>
            <View style={styles.titleContainer}>
              <Text variant="body" weight="bold" numberOfLines={1}>
                {goal.title}
              </Text>
              <Text variant="caption" style={styles.subtitle}>
                {getFrequencyLabel()} • {getRemindersSummary()}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: `${getStatusColor()}20` }]}
              textStyle={[styles.statusText, { color: getStatusColor() }]}
            >
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </Chip>
          </View>
        </View>

        {/* Description */}
        {goal.description && (
          <Text variant="caption" style={styles.description} numberOfLines={2}>
            {goal.description}
          </Text>
        )}

        {/* Progress */}
        {goal.targetValue && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text variant="caption" style={styles.progressLabel}>
                Progress
              </Text>
              <Text variant="caption" weight="bold" style={styles.progressValue}>
                {goal.currentValue || 0} / {goal.targetValue} {goal.targetUnit}
              </Text>
            </View>
            <ProgressBar
              progress={progressPercent}
              color={goal.color}
              style={styles.progressBar}
            />
            <Text variant="caption" style={styles.progressPercent}>
              {Math.round(progressPercent * 100)}% complete
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {goal.status === 'active' && onQuickProgress && (
            <IconButton
              icon="plus-circle"
              size={20}
              onPress={handleQuickProgress}
              iconColor={goal.color}
              style={styles.actionButton}
            />
          )}
          {onEdit && (
            <IconButton
              icon="pencil"
              size={20}
              onPress={handleEdit}
              iconColor="#757575"
              style={styles.actionButton}
            />
          )}
          {onDelete && (
            <IconButton
              icon="delete"
              size={20}
              onPress={handleDelete}
              iconColor="#F44336"
              style={styles.actionButton}
            />
          )}
        </View>

        {/* Streak indicator */}
        {goal.status === 'active' && goal.currentValue && goal.currentValue > 0 && (
          <View style={styles.streakContainer}>
            <Text variant="caption" style={styles.streakText}>
              🔥 Keep it up!
            </Text>
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  subtitle: {
    opacity: 0.7,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  progressContainer: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    opacity: 0.7,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  progressPercent: {
    opacity: 0.7,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  actionButton: {
    margin: 0,
  },
  streakContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
