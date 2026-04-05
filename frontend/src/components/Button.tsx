import { colors, motion, radii, saasShadows, spacing } from '@/utils';
import { MaterialSprings } from '@/utils/materialMotion';
import React, { useCallback } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'ghost';
type ButtonPriority = 'primary' | 'secondary' | 'tertiary';
type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  priority?: ButtonPriority;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
  fullWidth?: boolean;
  textColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE_CONFIG = {
  small: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    borderRadius: radii.md,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    borderRadius: radii.lg,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    borderRadius: radii.xl,
  },
};

const PRIORITY_TO_VARIANT: Record<ButtonPriority, ButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'ghost',
};

const getVariantStyle = (variant: ButtonVariant, disabled?: boolean) => {
  const light = colors.light;

  const variants = {
    primary: {
      backgroundColor: light.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: '#FFFFFF',
      shadowStyle: disabled ? undefined : saasShadows.subtle,
    },
    secondary: {
      backgroundColor: light.surfaceVariant,
      borderWidth: 1,
      borderColor: light.border,
      textColor: light.textPrimary,
      shadowStyle: undefined,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: light.borderStrong,
      textColor: light.textPrimary,
      shadowStyle: undefined,
    },
    text: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: light.primaryDark,
      shadowStyle: undefined,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: light.textSecondary,
      shadowStyle: undefined,
    },
  } satisfies Record<ButtonVariant, any>;

  return variants[variant];
};

export const Button = ({
  title,
  variant,
  priority = 'primary',
  size = 'medium',
  icon,
  loading,
  disabled,
  style,
  fullWidth,
  onPress,
  textColor,
}: ButtonProps) => {
  const resolvedVariant = variant || PRIORITY_TO_VARIANT[priority];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, MaterialSprings.stiff);
    opacity.value = withTiming(0.92, { duration: motion.fast });
  }, [opacity, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, MaterialSprings.stiff);
    opacity.value = withTiming(1, { duration: motion.fast });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const sizeConfig = SIZE_CONFIG[size];
  const variantStyle = getVariantStyle(resolvedVariant, disabled);

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        animatedStyle,
        variantStyle.shadowStyle,
        {
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.52 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor || variantStyle.textColor} />
        ) : (
          <>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text
              weight="semibold"
              allowFontScaling
              style={[
                styles.label,
                {
                  fontSize: sizeConfig.fontSize,
                  color: textColor || variantStyle.textColor,
                },
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: `transform ${motion.fast}ms ease, opacity ${motion.fast}ms ease`,
    }),
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  icon: {
    marginRight: spacing.xs,
  },
});

