import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChartLine, ClockCounterClockwise, Export, Scales } from 'phosphor-react-native';

import { Text } from '@/components';
import { BentoCard } from '@/components/common/BentoCard';
import { TourGuideZone } from '@/components/tour/TourProvider';
import { WeightLogModal } from '@/components/weight';
import { QUICK_ACTIONS_STEP } from '@/config/tourSteps';
import { useLanguageStore } from '@/stores';
import { BRAND_COLORS } from '@/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const tint = (hex: string, alpha = 0.12): string => {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const QUICK_ACTIONS = [
  { key: 'history', labelKey: 'mealHistory' as const, Icon: ClockCounterClockwise, color: BRAND_COLORS.secondary, screen: 'MealHistory' },
  { key: 'insights', labelKey: 'weeklyInsights' as const, Icon: ChartLine, color: '#14B8A6', screen: 'WeeklyInsights' },
  { key: 'weight', labelKey: 'logWeight' as const, Icon: Scales, color: BRAND_COLORS.primary, screen: 'LogWeight' },
  { key: 'export', labelKey: 'exportData' as const, Icon: Export, color: '#22C55E', screen: 'ExportData' },
] as const;

type QuickAction = (typeof QUICK_ACTIONS)[number];

interface QuickActionButtonProps {
  Icon: React.ComponentType<any>;
  color: string;
  label: string;
  onPress: () => void;
}

function QuickActionButton({ Icon, color, label, onPress }: QuickActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

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
      <View
        style={[
          styles.actionIconWrapper,
          {
            backgroundColor: tint(color, 0.14),
            borderColor: tint(color, 0.26),
          },
        ]}
      >
        <Icon size={20} weight={isHovered ? 'fill' : 'regular'} color={color} />
      </View>
      <Text variant="caption" weight="medium" style={styles.actionText} numberOfLines={2}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function QuickActionsCard() {
  const navigation = useNavigation<any>();
  const { t } = useLanguageStore();
  const [showWeightModal, setShowWeightModal] = useState(false);

  const onActionPress = useCallback(
    (action: QuickAction) => {
      if (action.key === 'weight') {
        setShowWeightModal(true);
        return;
      }
      navigation.navigate('Profile', { screen: action.screen });
    },
    [navigation]
  );

  return (
    <>
      <TourGuideZone
        zone={QUICK_ACTIONS_STEP.zone}
        text={QUICK_ACTIONS_STEP.text}
        title={QUICK_ACTIONS_STEP.title}
        icon="⚡"
      >
        <BentoCard>
          <Text variant="caption" weight="bold" style={styles.sectionLabel}>
            QUICK ACTIONS
          </Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.key}
                Icon={action.Icon}
                color={action.color}
                label={t[action.labelKey] as string}
                onPress={() => onActionPress(action)}
              />
            ))}
          </View>
        </BentoCard>
      </TourGuideZone>

      <WeightLogModal visible={showWeightModal} onDismiss={() => setShowWeightModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 16,
  },
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE3EC',
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionText: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 14,
    minHeight: 28,
    textAlign: 'center',
  },
});
