/**
 * BentoCard – Liquid Glass Card Component
 *
 * Glass-like translucent card that floats above content:
 * - Semi-transparent white background (content shows through subtly)
 * - 22px border radius (Apple's rounded geometry)
 * - 22px padding
 * - Thin glass stroke (white at low opacity)
 * - Soft floating shadow
 */

import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Liquid Glass Card Styles - single source of truth
export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: 'rgba(255,255,255,0.72)',
  borderRadius: 22,
  padding: 22,
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.48)',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 20,
  shadowOpacity: 0.06,
  elevation: 3,
};

// Web-specific box-shadow with backdrop blur (glassmorphism)
export const BENTO_CARD_WEB_STYLES =
  Platform.OS === 'web'
    ? ({
        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } as any)
    : {};

interface BentoCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export function BentoCard({ children, style, noPadding }: BentoCardProps) {
  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as ViewStyle, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...BENTO_CARD_STYLES,
  },
  noPadding: {
    padding: 0,
  },
});

export default BentoCard;
