import { COLORS, spacing } from '@/utils';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'tonal';
type ButtonSize = 'small' | 'medium' | 'large';

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; textSize: number }> = {
  small: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, textSize: 14 },
  medium: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, textSize: 16 },
  large: { paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], textSize: 18 },
};

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: any;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const Button = ({ title, variant = 'primary', size = 'medium', icon, loading, disabled, style, onPress, ...rest }: ButtonProps) => {
  const mode: 'contained' | 'outlined' | 'text' =
    variant === 'primary' || variant === 'secondary' || variant === 'tonal' ? 'contained' : variant === 'outline' ? 'outlined' : 'text';

  const contentStyle = {
    paddingVertical: sizeStyles[size].paddingVertical,
  };
  const labelStyle = { fontSize: sizeStyles[size].textSize } as any;
  
  // Determine button color based on variant
  const buttonColor = variant === 'primary' ? COLORS.primary.main : 
                      variant === 'secondary' ? COLORS.secondary.main :
                      variant === 'tonal' ? COLORS.primary.surfaceTint :
                      undefined;

  return (
    <PaperButton
      mode={mode}
      icon={icon as any}
      loading={loading}
      disabled={disabled}
      style={style as any}
      contentStyle={contentStyle}
      labelStyle={labelStyle}
      onPress={onPress}
      buttonColor={buttonColor}
      {...rest}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  base: {},
  content: {},
  title: {},
});
