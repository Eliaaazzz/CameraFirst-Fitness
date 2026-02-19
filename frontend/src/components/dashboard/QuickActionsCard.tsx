import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChartLine, ClockCounterClockwise, Export, Scales } from 'phosphor-react-native';

import { Text, useSnackbar } from '@/components';
import { BentoCard } from '@/components/common/BentoCard';
import { ExportDataModal } from '@/components/dashboard/ExportDataModal';
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
  { key: 'insights', labelKey: 'weeklyInsights' as const, Icon: ChartLine, color: '#14B8A6', screen: 'WeeklyInsights', iconOffsetY: 1 },
  { key: 'weight', labelKey: 'logWeight' as const, Icon: Scales, color: BRAND_COLORS.primary, screen: 'LogWeight' },
  { key: 'export', labelKey: 'exportData' as const, Icon: Export, color: '#22C55E', screen: 'ExportData' },
] as const;

type QuickAction = (typeof QUICK_ACTIONS)[number];

interface QuickActionButtonProps {
  Icon: React.ComponentType<any>;
  color: string;
  label: string;
  iconOffsetY?: number;
  onPress: () => void;
  disabled?: boolean;
}

function QuickActionButton({ Icon, color, label, iconOffsetY, onPress, disabled }: QuickActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [disabled, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.actionButton,
        isHovered && styles.actionButtonHovered,
        disabled && styles.actionButtonDisabled,
        containerStyle,
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      <View
        style={[
          styles.actionIconWrapper,
          {
            backgroundColor: tint(color, 0.22),
            borderColor: tint(color, 0.4),
          },
        ]}
      >
        <View style={styles.actionIconSpecular} />
        <Icon
          size={20}
          weight={isHovered ? 'fill' : 'regular'}
          color={color}
          style={iconOffsetY ? { transform: [{ translateY: iconOffsetY }] } : undefined}
        />
      </View>
      <Text variant="caption" weight="medium" style={styles.actionText} numberOfLines={2}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

interface QuickActionsCardProps {
  cardStyle?: StyleProp<ViewStyle>;
}

export function QuickActionsCard({ cardStyle }: QuickActionsCardProps = {}) {
  const navigation = useNavigation<any>();
  const { t } = useLanguageStore();
  const { showSnackbar } = useSnackbar();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const onActionPress = useCallback((action: QuickAction) => {
    if (action.key === 'weight') {
      setShowWeightModal(true);
      return;
    }
    if (action.key === 'export') {
      if (Platform.OS !== 'web') {
        showSnackbar('Export insights are available on web only', { variant: 'error' });
        return;
      }
      setShowExportModal(true);
      return;
    }
    navigation.navigate('Profile', { screen: action.screen });
  }, [navigation, showSnackbar]);

  return (
    <>
      <TourGuideZone
        zone={QUICK_ACTIONS_STEP.zone}
        text={QUICK_ACTIONS_STEP.text}
        title={QUICK_ACTIONS_STEP.title}
        icon="⚡"
      >
        <BentoCard style={cardStyle}>
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
                iconOffsetY={'iconOffsetY' in action ? action.iconOffsetY : undefined}
              />
            ))}
          </View>
        </BentoCard>
      </TourGuideZone>

      <WeightLogModal
        visible={showWeightModal}
        onDismiss={() => setShowWeightModal(false)}
      />

      <ExportDataModal
        visible={showExportModal}
        onDismiss={() => setShowExportModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: '#6E5E4D',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 14,
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
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    shadowOpacity: 0.035,
    elevation: 1,
    ...(Platform.OS !== 'web' && {
      flexBasis: '47%',
      flexGrow: 1,
    }),
    ...(Platform.OS === 'web' && ({
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.72), 0 0 0 1px rgba(255,170,120,0.16), 0 8px 18px rgba(15,23,42,0.04)',
    } as any)),
  },
  actionButtonHovered: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderColor: 'rgba(255,255,255,0.7)',
    ...(Platform.OS === 'web' && ({
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(255,170,120,0.2), 0 10px 22px rgba(15,23,42,0.05)',
    } as any)),
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionIconSpecular: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  actionText: {
    color: '#1F2937',
    fontSize: 12,
    lineHeight: 15,
    minHeight: 30,
    textAlign: 'center',
  },
});
