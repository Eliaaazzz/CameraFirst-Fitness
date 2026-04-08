/**
 * AIDisclaimer -- Inline disclaimer for AI-generated content
 *
 * Required by project guidelines: any AI-generated content (meal analysis,
 * goals, recommendations) must display a verification notice.
 *
 * Inspired by: Apple Health disclaimers / Whoop insight footnotes --
 * unobtrusive but always present, building trust without interrupting flow.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Info } from 'phosphor-react-native';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

interface AIDisclaimerProps {
  /** When true, renders a minimal inline row without background. */
  compact?: boolean;
}

const DISCLAIMER_TEXT = 'AI-generated \u2014 for reference only, adapt to your own situation';

export function AIDisclaimer({ compact = false }: AIDisclaimerProps) {
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Info size={12} color={BRAND_COLORS.textMuted} weight="regular" />
        <Text
          variant="label"
          style={styles.compactText}
          color={BRAND_COLORS.textMuted}
        >
          {DISCLAIMER_TEXT}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Info size={14} color={BRAND_COLORS.textMuted} weight="regular" />
      <Text
        variant="label"
        style={styles.blockText}
        color={BRAND_COLORS.textMuted}
      >
        {DISCLAIMER_TEXT}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primaryTint,
    padding: spacing.sm,
    borderRadius: spacing.sm,
    gap: spacing.sm,
  },
  blockText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
});

export default AIDisclaimer;
