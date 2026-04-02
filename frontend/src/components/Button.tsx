import { colors, radii, spacing } from '@/utils';
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
  textColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Button - Material Design 3 Style
 * Spring-based press animation for tactile feedback
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
  textColor,
}: ButtonProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, MaterialSprings.stiff);
    opacity.value = withTiming(0.85, { duration: 100 });
  }, [scale, opacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, MaterialSprings.stiff);
    opacity.value = withTiming(1, { duration: 150 });
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const sizeConfig = SIZE_CONFIG[size];
  const variantStyle = getVariantStyle(variant, disabled);

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        animatedStyle,
        {
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.5 : 1,
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
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text
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

const getVariantStyle = (variant: ButtonVariant, disabled?: boolean) => {
  const dark = colors.dark;

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: dark.primary,
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: '#FFFFFF',
      };

    case 'secondary':
      return {
        backgroundColor: 'rgba(167, 139, 250, 0.15)',
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: dark.primary,
      };

    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: dark.border,
        textColor: dark.textPrimary,
      };

    case 'text':
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: dark.primary,
      };

    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: dark.primary,
      };

    default:
      return {
        backgroundColor: dark.primary,
        borderWidth: 0,
        borderColor: 'transparent',
        textColor: '#FFFFFF',
      };
  }
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' && {
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
