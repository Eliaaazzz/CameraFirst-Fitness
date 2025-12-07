import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { getTheme, spacing } from '@/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; textSize: number }> = {
  small: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, textSize: 14 },
  medium: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, textSize: 16 },
  large: { paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], textSize: 18 },
};

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({ title, variant = 'primary', size = 'medium', icon, loading, disabled, style, onPress }: ButtonProps) => {
  const mode: 'contained' | 'outlined' | 'text' =
    variant === 'primary' ? 'contained' : variant === 'outline' ? 'outlined' : 'text';

  const contentStyle = {
    paddingVertical: sizeStyles[size].paddingVertical,
  };
  const labelStyle = { fontSize: sizeStyles[size].textSize } as any;
  const theme = getTheme('light');

  return (
    <PaperButton
      mode={mode}
      icon={icon as any}
      loading={loading}
      disabled={disabled}
      style={style}
      contentStyle={contentStyle}
      labelStyle={labelStyle}
      onPress={onPress}
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
