import { Text } from '@/components';
import { COLORS, SHAPE, SPACING } from '@/utils/theme';
import React from 'react';
import {
    StyleSheet,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

interface ChipProps {
  label: string;
  variant?: 'filled' | 'tonal' | 'outlined' | 'elevated';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const colorMap = {
  primary: {
    bg: COLORS.primary.main,
    bgTonal: COLORS.primary.main + '20',
    text: '#FFFFFF',
    textTonal: COLORS.primary.main,
    border: COLORS.primary.main,
  },
  secondary: {
    bg: COLORS.secondary.main,
    bgTonal: COLORS.secondary.main + '20',
    text: '#FFFFFF',
    textTonal: COLORS.secondary.main,
    border: COLORS.secondary.main,
  },
  success: {
    bg: COLORS.semantic.success,
    bgTonal: COLORS.semantic.success + '20',
    text: '#FFFFFF',
    textTonal: COLORS.semantic.success,
    border: COLORS.semantic.success,
  },
  warning: {
    bg: COLORS.semantic.warning,
    bgTonal: COLORS.semantic.warning + '20',
    text: '#000000',
    textTonal: COLORS.semantic.warning,
    border: COLORS.semantic.warning,
  },
  error: {
    bg: COLORS.semantic.error,
    bgTonal: COLORS.semantic.error + '20',
    text: '#FFFFFF',
    textTonal: COLORS.semantic.error,
    border: COLORS.semantic.error,
  },
  neutral: {
    bg: COLORS.neutral.textSecondary,
    bgTonal: COLORS.dark.surface,
    text: '#FFFFFF',
    textTonal: COLORS.text.secondary,
    border: COLORS.neutral.textSecondary,
  },
};

const sizeMap = {
  small: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    fontSize: 10,
    iconSize: 12,
    borderRadius: SHAPE.borderRadius.sm,
  },
  medium: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    fontSize: 12,
    iconSize: 14,
    borderRadius: SHAPE.borderRadius.md,
  },
  large: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    fontSize: 14,
    iconSize: 16,
    borderRadius: SHAPE.borderRadius.lg,
  },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'tonal',
  size = 'medium',
  color = 'primary',
  icon,
  iconPosition = 'left',
  selected = false,
  disabled = false,
  onPress,
  style,
  textStyle,
}) => {
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  const getBackgroundColor = () => {
    if (disabled) return COLORS.neutral.divider;
    switch (variant) {
      case 'filled':
        return colors.bg;
      case 'tonal':
        return selected ? colors.bg : colors.bgTonal;
      case 'outlined':
        return selected ? colors.bgTonal : 'transparent';
      case 'elevated':
        return COLORS.dark.surfaceElevated;
      default:
        return colors.bgTonal;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.neutral.textMuted;
    switch (variant) {
      case 'filled':
        return colors.text;
      case 'tonal':
        return selected ? colors.text : colors.textTonal;
      case 'outlined':
        return selected ? colors.textTonal : colors.border;
      case 'elevated':
        return COLORS.text.primary;
      default:
        return colors.textTonal;
    }
  };

  const baseChipStyle: ViewStyle = {
    ...styles.chip,
    backgroundColor: getBackgroundColor(),
    paddingHorizontal: sizes.paddingHorizontal,
    paddingVertical: sizes.paddingVertical,
    borderRadius: sizes.borderRadius,
  };

  const outlinedStyle: ViewStyle = variant === 'outlined' ? {
    borderWidth: 1,
    borderColor: disabled ? COLORS.neutral.divider : colors.border,
  } : {};

  const elevatedStyle: ViewStyle = variant === 'elevated' ? styles.elevated : {};

  const chipStyle: ViewStyle = {
    ...baseChipStyle,
    ...outlinedStyle,
    ...elevatedStyle,
    ...style,
  };

  const labelStyle: TextStyle = {
    color: getTextColor(),
    fontSize: sizes.fontSize,
    fontWeight: '600',
  };

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <View style={styles.iconLeft}>{icon}</View>
      )}
      <Text style={[labelStyle, textStyle]}>{label}</Text>
      {icon && iconPosition === 'right' && (
        <View style={styles.iconRight}>{icon}</View>
      )}
    </>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={chipStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
};

// Quick badge variants
export const Badge: React.FC<{
  label: string;
  color?: ChipProps['color'];
  style?: ViewStyle;
}> = ({ label, color = 'primary', style }) => (
  <Chip
    label={label}
    variant="filled"
    size="small"
    color={color}
    style={style}
  />
);

export const Tag: React.FC<{
  label: string;
  color?: ChipProps['color'];
  style?: ViewStyle;
}> = ({ label, color = 'neutral', style }) => (
  <Chip
    label={label}
    variant="tonal"
    size="small"
    color={color}
    style={style}
  />
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  elevated: {
    shadowColor: COLORS.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
});
