import React from 'react';
import { Pressable, PressableProps, StyleSheet, StyleProp, View, ViewStyle, useColorScheme } from 'react-native';

import { LoadingSpinner } from './LoadingSpinner';
import { Text } from './Text';
import { getTheme, radii, spacing } from '@/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; textSize: number }> = {
  small: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, textSize: 14 },
  medium: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, textSize: 16 },
  large: { paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], textSize: 18 },
};

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = ({
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark' ? 'dark' : 'light');
  const { paddingVertical, paddingHorizontal, textSize } = sizeStyles[size];

  const backgroundColor = (() => {
    if (disabled) {
      return 'rgba(148, 163, 184, 0.4)';
    }

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  })();

  const textColor = (() => {
    if (disabled) {
      return theme.colors.textMuted;
    }

    switch (variant) {
      case 'primary':
        return '#0F172A';
      case 'secondary':
        return theme.colors.textPrimary;
      case 'outline':
      case 'ghost':
        return theme.colors.textPrimary;
      default:
        return theme.colors.textPrimary;
    }
  })();

  const borderStyle =
    variant === 'outline'
      ? { borderWidth: 1, borderColor: disabled ? theme.colors.border : theme.colors.primary }
      : {};

  const opacity = disabled || loading ? 0.7 : 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) =>
        [
          styles.base,
          {
            backgroundColor,
            paddingVertical,
            paddingHorizontal,
            opacity: pressed ? opacity * 0.9 : opacity,
          },
          borderStyle,
          style,
        ] as StyleProp<ViewStyle>
      }
      disabled={disabled || loading}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <LoadingSpinner size="small" color={variant === 'primary' ? '#0F172A' : theme.colors.primary} />
        ) : (
          icon
        )}
        <Text
          variant="body"
          weight="medium"
          style={[styles.title, { fontSize: textSize }]}
          color={textColor}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    letterSpacing: 0.1,
  },
});
