import { BORDER_RADIUS, COLORS, ELEVATION, SPACING, TYPOGRAPHY } from '@/utils/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tonal' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFF' : COLORS.primary.main} />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS,
    gap: SPACING.xs,
  },
  
  // Variants
  primary: {
    backgroundColor: COLORS.primary.main,
    ...ELEVATION.level1,
  },
  secondary: {
    backgroundColor: COLORS.secondary.main,
  },
  tonal: {
    backgroundColor: COLORS.primary.surfaceTint,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  text: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  size_sm: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minHeight: 56,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  buttonText: {
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_tonal: {
    color: COLORS.primary.main,
  },
  text_outline: {
    color: COLORS.primary.main,
  },
  text_text: {
    color: COLORS.primary.main,
  },
  
  textSize_sm: {
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  textSize_md: {
    fontSize: TYPOGRAPHY.sizes.bodyM,
  },
  textSize_lg: {
    fontSize: TYPOGRAPHY.sizes.bodyL,
  },
  
  textDisabled: {
    opacity: 0.7,
  },
});
