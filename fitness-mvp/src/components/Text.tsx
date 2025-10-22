import React, { PropsWithChildren } from 'react';
import { Text as RNText, TextProps as RNTextProps, useColorScheme } from 'react-native';

import { getTheme, typography } from '@/utils';

type TextVariant = 'heading1' | 'heading2' | 'body' | 'caption' | 'label';
type TextWeight = 'regular' | 'medium' | 'bold';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  weight?: TextWeight;
}

const variantStyles: Record<TextVariant, { fontSize: number; lineHeight: number }> = {
  heading1: { fontSize: 32, lineHeight: 40 },
  heading2: { fontSize: 24, lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 16 },
};

type FontFamilyKey = keyof typeof typography.fontFamily;

const weightToFontFamily: Record<TextWeight, FontFamilyKey> = {
  regular: 'regular',
  medium: 'medium',
  bold: 'bold',
};

export const Text = ({ variant = 'body', weight = 'regular', color, style, children, ...rest }: PropsWithChildren<TextProps>) => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark' ? 'dark' : 'light');
  const resolvedColor = color ?? theme.colors.textPrimary;
  const fontFamily = theme.typography.fontFamily[weightToFontFamily[weight]];

  return (
    <RNText
      accessibilityRole={rest.accessibilityRole}
      {...rest}
      style={[
        {
          color: resolvedColor,
          fontFamily,
          fontSize: variantStyles[variant].fontSize,
          lineHeight: variantStyles[variant].lineHeight,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};
