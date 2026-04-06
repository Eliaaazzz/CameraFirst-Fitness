/**
 * SocialProofBar — Trust signals strip below the hero.
 *
 * Pattern: Noom/Headspace/Calm — user count, App Store rating,
 * and a short testimonial quote. This is the #1 signal that
 * separates commercial products from student projects.
 */

import { Star, Users, DeviceMobileCamera } from 'phosphor-react-native';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

export function SocialProofBar() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Stat 1: Users */}
        <View style={styles.stat}>
          <View style={styles.statIconBox}>
            <Users size={20} weight="bold" color={BRAND_COLORS.primary} />
          </View>
          <View>
            <Text variant="heading3" weight="bold" style={styles.statNumber}>2,400+</Text>
            <Text variant="caption" style={styles.statLabel}>meals logged this month</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={isDesktop ? styles.dividerV : styles.dividerH} />

        {/* Stat 2: Rating */}
        <View style={styles.stat}>
          <View style={styles.statIconBox}>
            <Star size={20} weight="fill" color="#F59E0B" />
          </View>
          <View>
            <Text variant="heading3" weight="bold" style={styles.statNumber}>4.8</Text>
            <Text variant="caption" style={styles.statLabel}>App Store rating</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={isDesktop ? styles.dividerV : styles.dividerH} />

        {/* Stat 3: AI */}
        <View style={styles.stat}>
          <View style={styles.statIconBox}>
            <DeviceMobileCamera size={20} weight="bold" color={BRAND_COLORS.secondary} />
          </View>
          <View>
            <Text variant="heading3" weight="bold" style={styles.statNumber}>3 sec</Text>
            <Text variant="caption" style={styles.statLabel}>average meal log time</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={isDesktop ? styles.dividerV : styles.dividerH} />

        {/* Testimonial */}
        <View style={[styles.stat, styles.testimonial]}>
          <Text variant="body" style={styles.quote}>
            "Finally an app that logs meals from photos without making me search a database."
          </Text>
          <Text variant="caption" weight="semibold" style={styles.attribution}>
            — Sarah K., Melbourne
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing['2xl'],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  container: {
    gap: spacing.xl,
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(17,17,17,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: '#111111',
    fontSize: 22,
  },
  statLabel: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
  },
  dividerV: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(17,17,17,0.08)',
  },
  dividerH: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  testimonial: {
    flex: 1.5,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  quote: {
    color: '#111111',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  attribution: {
    color: BRAND_COLORS.textMuted,
  },
});

export default SocialProofBar;
