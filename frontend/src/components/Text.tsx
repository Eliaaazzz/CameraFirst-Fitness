import { colors } from '@/utils';
import React, { PropsWithChildren } from 'react';
import { Platform, Text as RNText, TextStyle } from 'react-native';

type TextVariant = 'hero' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'body' | 'caption' | 'label';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: TextWeight;
  muted?: boolean;
  style?: TextStyle | TextStyle[];
  children?: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}

const variantStyles: Record<TextVariant, { fontSize: number; lineHeight: number; defaultWeight: TextWeight }> = {
  hero: { fontSize: 40, lineHeight: 48, defaultWeight: 'bold' },
  heading1: { fontSize: 28, lineHeight: 36, defaultWeight: 'bold' },
  heading2: { fontSize: 22, lineHeight: 28, defaultWeight: 'semibold' },
  heading3: { fontSize: 18, lineHeight: 24, defaultWeight: 'semibold' },
  heading4: { fontSize: 16, lineHeight: 22, defaultWeight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, defaultWeight: 'regular' },
  caption: { fontSize: 13, lineHeight: 18, defaultWeight: 'regular' },
  label: { fontSize: 12, lineHeight: 16, defaultWeight: 'medium' },
};

const weightValues: Record<TextWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Text - Material Design 3 Style
 * Clean typography system
 */
export const Text = ({ 
  variant = 'body', 
  weight,
  color, 
  muted,
  style, 
  children, 
  ...rest 
}: PropsWithChildren<TextProps>) => {
  const config = variantStyles[variant];
  const finalWeight = weight || config.defaultWeight;
  // Always use light mode colors for better readability
  const light = colors.light;
  
  const textColor = color || (muted ? light.textMuted : light.textPrimary);

  return (
    <RNText
      {...rest}
      style={[
        {
          color: textColor,
          fontSize: config.fontSize,
          lineHeight: config.lineHeight,
          fontWeight: weightValues[finalWeight],
          fontFamily: Platform.select({
            ios: 'System',
            android: 'Roboto',
            default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};
