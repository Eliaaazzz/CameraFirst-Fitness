/**
 * BentoCard - Golden Standard Card Component
 *
 * Unified card styling for all dashboard content:
 * - White background (#FFFFFF)
 * - 16px border radius
 * - 24px padding (p-6)
 * - 1px border (#E5E7EB)
 * - Subtle shadow (0 1px 2px rgba(0,0,0,0.05))
 */

import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Golden Standard Card Styles - single source of truth
export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  // Shadow
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
};

// Web-specific box-shadow (applied separately)
const webShadow = Platform.OS === 'web' ? { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } : {};

interface BentoCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export function BentoCard({ children, style, noPadding }: BentoCardProps) {
  return (
    <View style={[styles.card, webShadow as ViewStyle, noPadding && styles.noPadding, style]}>
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
