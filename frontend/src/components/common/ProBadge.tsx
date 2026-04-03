/**
 * ProBadge - Premium Tier Pill Badge
 *
 * Inspired by: Spotify Premium badge / YouTube Premium pill
 * Why: Inline upgrade nudge that communicates exclusivity without disrupting
 *      content flow. The warm orange-on-white contrast draws the eye to
 *      premium features while remaining tasteful.
 *
 * Usage:
 *   <ProBadge />              — default size with zap icon
 *   <ProBadge size="small" /> — compact, no icon (for tight spaces)
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components';
import { BRAND_COLORS } from '@/utils';

interface ProBadgeProps {
  /** Badge size variant */
  size?: 'small' | 'default';
}

const SIZE_CONFIG = {
  small: {
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    iconSize: 0, // no icon for small
    gap: 0,
  },
  default: {
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    iconSize: 9,
    gap: 2,
  },
} as const;

export function ProBadge({ size = 'default' }: ProBadgeProps) {
  const config = SIZE_CONFIG[size];
  const showIcon = size === 'default';

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          borderRadius: config.borderRadius,
          gap: config.gap,
        },
      ]}
    >
      {showIcon && (
        <Feather name="zap" size={config.iconSize} color="#FFFFFF" />
      )}
      <Text
        variant="label"
        weight="bold"
        color="#FFFFFF"
        style={{
          fontSize: config.fontSize,
          lineHeight: config.fontSize + 3,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        PRO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primary,
    alignSelf: 'flex-start',
  },
});

export default ProBadge;
