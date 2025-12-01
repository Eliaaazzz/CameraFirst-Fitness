import { colors, radii, spacing } from '@/utils';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
  fullWidth?: boolean;
}

/**
 * Button - Material Design 3 Style
 * Purple palette, clean design, micro-animations
 */
export const Button = ({
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  loading,
  disabled,
  style,
  fullWidth,
  onPress,
}: ButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const sizeConfig = SIZE_CONFIG[size];
  const variantStyle = getVariantStyle(variant, isPressed, disabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.base,
        {
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: isPressed ? 0.97 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={variantStyle.textColor} />
        ) : (
          <>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text
              style={[
                styles.label,
                {
                  fontSize: sizeConfig.fontSize,
                  color: variantStyle.textColor,
                },
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const SIZE_CONFIG = {
  small: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    borderRadius: radii.md,
  },
  medium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    borderRadius: radii.lg,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    borderRadius: radii.xl,
  },
};

const getVariantStyle = (variant: ButtonVariant, isPressed: boolean, disabled?: boolean) => {
  const dark = colors.dark;

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: isPressed ? dark.primaryDark : dark.primary,
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: '#1F2937', // Dark text on light button
      };

    case 'secondary':
      return {
        backgroundColor: isPressed ? 'rgba(167, 139, 250, 0.25)' : 'rgba(167, 139, 250, 0.15)',
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: dark.primary,
      };

    case 'outline':
      return {
        backgroundColor: isPressed ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        borderWidth: 1,
        borderColor: dark.border,
        textColor: dark.textPrimary,
      };

    case 'text':
      return {
        backgroundColor: isPressed ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: dark.primary,
      };

    default:
      return {
        backgroundColor: dark.primary,
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: '#1F2937',
      };
  }
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' && {
      transition: 'all 0.15s ease',
      cursor: 'pointer',
    }),
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
});
