/**
 * TrustFooter -- Trust-building elements for sensitive screens
 *
 * Used on Login, Paywall, and Profile screens to reassure users
 * about data privacy and security.
 *
 * Inspired by: Stripe checkout trust badges / Apple privacy labels --
 * concise, factual statements paired with recognisable icons reduce
 * abandonment on screens that ask for credentials or payment.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShieldCheck, Lock } from 'phosphor-react-native';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

interface TrustFooterProps {
  /** 'minimal' renders a single privacy line without icons. */
  variant?: 'default' | 'minimal';
}

export function TrustFooter({ variant = 'default' }: TrustFooterProps) {
  if (variant === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <Text
          variant="label"
          style={styles.minimalText}
          color={BRAND_COLORS.textMuted}
        >
          {'\uD83D\uDD12 Your data stays private'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.trustItem}>
        <ShieldCheck size={14} color={BRAND_COLORS.textMuted} weight="regular" />
        <Text
          variant="label"
          style={styles.trustText}
          color={BRAND_COLORS.textMuted}
        >
          Your data is encrypted
        </Text>
      </View>

      <Text
        variant="label"
        style={styles.separator}
        color={BRAND_COLORS.textMuted}
      >
        {'\u00B7'}
      </Text>

      <View style={styles.trustItem}>
        <Lock size={14} color={BRAND_COLORS.textMuted} weight="regular" />
        <Text
          variant="label"
          style={styles.trustText}
          color={BRAND_COLORS.textMuted}
        >
          We never sell your information
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    fontSize: 11,
  },
  separator: {
    fontSize: 11,
  },
  minimalContainer: {
    alignItems: 'center',
  },
  minimalText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default TrustFooter;
