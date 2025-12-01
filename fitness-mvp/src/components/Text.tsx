import React, { PropsWithChildren } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Text as PaperText } from 'react-native-paper';

type TextVariant = 'heading1' | 'heading2' | 'body' | 'caption' | 'label';
type TextWeight = 'regular' | 'medium' | 'bold';

export interface TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: TextWeight;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
}

const variantStyles: Record<TextVariant, { fontSize: number; lineHeight: number }> = {
  heading1: { fontSize: 32, lineHeight: 40 },
  heading2: { fontSize: 24, lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 16 },
};

const fontFamilyMap: Record<TextWeight, string> = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
};

export const Text = ({ variant = 'body', weight = 'regular', color, style, children, numberOfLines, ...rest }: PropsWithChildren<TextProps>) => (
  <PaperText
    numberOfLines={numberOfLines}
    {...rest}
    style={[
      {
        color,
        fontSize: variantStyles[variant].fontSize,
        lineHeight: variantStyles[variant].lineHeight,
        fontFamily: fontFamilyMap[weight],
      },
      style,
    ]}
  >
    {children}
  </PaperText>
);
