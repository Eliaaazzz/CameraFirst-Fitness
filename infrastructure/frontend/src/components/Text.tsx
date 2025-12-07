import React, { PropsWithChildren } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { typography } from '@/utils';

type TextVariant = 'heading1' | 'heading2' | 'body' | 'caption' | 'label';
type TextWeight = 'regular' | 'medium' | 'bold';

export interface TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: TextWeight;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
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

export const Text = ({ variant = 'body', weight = 'regular', color, style, numberOfLines, children }: PropsWithChildren<TextProps>) => (
  <PaperText
    numberOfLines={numberOfLines}
    style={[
      {
        color,
        fontSize: variantStyles[variant].fontSize,
        lineHeight: variantStyles[variant].lineHeight,
        fontFamily: typography.fontFamily[weightToFontFamily[weight]],
      },
      style,
    ]}
  >
    {children}
  </PaperText>
);
