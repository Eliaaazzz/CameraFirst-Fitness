import { AppleLogo, GlobeHemisphereWest, GooglePlayLogo, MapPin } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, BRAND_COLORS, EXPERIENCE_COLORS, LANDING_COLORS, radii, spacing } from '@/utils';

const finalIllustration = require('@/../assets/illustrations/chef.svg');

interface LandingFooterProps {
  onGetStarted: () => void;
  onLogin: () => void;
  showFinalCTA?: boolean;
  onLinkPress: (linkId: string) => void;
}

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Meal Logging', id: 'meal-logging' },
      { label: 'Workout Planning', id: 'workout-planning' },
      { label: 'Targets', id: 'targets' },
      { label: 'Weekly Reports', id: 'weekly-reports' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Centre', id: 'help-centre' },
      { label: 'Export Data', id: 'export-data' },
      { label: 'Data Sources', id: 'data-sources' },
      { label: 'Release Notes', id: 'release-notes' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', id: 'about' },
      { label: 'Contact', id: 'contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', id: 'privacy-policy' },
      { label: 'Terms of Service', id: 'terms-of-service' },
      { label: 'Accessibility', id: 'accessibility' },
    ],
  },
];

function StoreBadge({
  label,
  sublabel,
  icon,
}: {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.storeBadge} accessibilityRole="text">
      {icon}
      <View>
        <Text variant="caption" style={styles.storeBadgeSub}>
          {sublabel}
        </Text>
        <Text variant="body" weight="semibold" style={styles.storeBadgeLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export function LandingFooter({ onGetStarted, onLogin, showFinalCTA = true, onLinkPress }: LandingFooterProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 720;
  const isCompact = width < 420;

  return (
    <View style={styles.wrapper}>
      {showFinalCTA && (
        <View style={[styles.finalCtaSection, isDesktop && styles.finalCtaDesktop]}>
          <View style={[styles.finalVisual, !isDesktop && styles.finalVisualMobile, isCompact && styles.finalVisualCompact]}>
            <Image
              source={finalIllustration}
              style={[styles.finalIllustration, !isDesktop && styles.finalIllustrationMobile, isCompact && styles.finalIllustrationCompact]}
              contentFit="contain"
            />
          </View>

          <View style={styles.finalCopy}>
            <Text
              variant="heading1"
              weight="bold"
              style={isDesktop ? [styles.finalTitle] : isCompact ? [styles.finalTitle, styles.finalTitleMobile, styles.finalTitleCompact] : [styles.finalTitle, styles.finalTitleMobile]}
            >
              Start today. Join thousands tracking smarter with AI.
            </Text>
            <Text
              variant="heading4"
              style={isDesktop ? [styles.finalSubtitle] : [styles.finalSubtitle, styles.finalSubtitleMobile]}
            >
              One place for every meal, workout, and weekly review.
            </Text>

            <View style={styles.finalActions}>
              <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}>
                <Text variant="body" weight="bold" style={styles.primaryCtaText}>
                  Start tracking
                </Text>
              </Pressable>
              <Pressable onPress={onLogin} style={({ pressed }) => [styles.secondaryLink, pressed && styles.linkPressed]}>
                <Text variant="body" weight="medium" style={styles.secondaryLinkText}>
                  Already have an account? Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <View style={styles.footerBrandBlock}>
            <View style={styles.brandRow}>
              <Text variant="heading3" weight="bold" style={styles.brandName}>
                {APP_NAME}
              </Text>
            </View>
            <Text variant="heading4" style={styles.brandTagline}>
              Fitness tracking for people who actually track.
            </Text>
          </View>

          <View style={[styles.columns, !isTablet && styles.columnsMobile]}>
            {FOOTER_COLUMNS.map((column) => (
              <View key={column.title} style={styles.column}>
                <Text variant="heading4" weight="bold" style={styles.columnTitle}>
                  {column.title}
                </Text>
                {column.links.map((link) => (
                  <Pressable
                    key={link.id}
                    onPress={() => onLinkPress(link.id)}
                    style={({ pressed }) => [styles.footerLink, pressed && styles.linkPressed]}
                  >
                    <Text variant="body" style={styles.footerLinkText}>
                      {link.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerBottom}>
          <View style={styles.badges}>
            <StoreBadge
              label="Google Play"
              sublabel="GET IT ON"
              icon={<GooglePlayLogo size={24} weight="fill" color={LANDING_COLORS.textOnDark} />}
            />
            <StoreBadge
              label="App Store"
              sublabel="Download on the"
              icon={<AppleLogo size={24} weight="fill" color={LANDING_COLORS.textOnDark} />}
            />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <GlobeHemisphereWest size={18} weight="regular" color={LANDING_COLORS.textOnDark} />
              <Text variant="body" weight="semibold" style={styles.metaText}>
                English
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={18} weight="fill" color={LANDING_COLORS.textOnDark} />
              <Text variant="body" weight="semibold" style={styles.metaText}>
                Melbourne
              </Text>
            </View>
          </View>
        </View>

        <Text variant="caption" style={styles.legal}>
          © 2026 {APP_NAME}. Privacy · Accessibility · Terms
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingTop: spacing['4xl'],
  },
  finalCtaSection: {
    gap: spacing['2xl'],
    marginBottom: spacing['4xl'],
  },
  finalCtaDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalVisual: {
    flex: 1,
    backgroundColor: EXPERIENCE_COLORS.glassStrong,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  finalVisualMobile: {
    minHeight: 300,
    padding: spacing.xl,
  },
  finalVisualCompact: {
    minHeight: 260,
    padding: spacing.lg,
  },
  finalIllustration: {
    width: '100%',
    height: 360,
  },
  finalIllustrationMobile: {
    height: 240,
  },
  finalIllustrationCompact: {
    height: 210,
  },
  finalCopy: {
    flex: 1,
    gap: spacing.lg,
  },
  finalTitle: {
    color: EXPERIENCE_COLORS.ink,
    fontSize: 60,
    lineHeight: 62,
    letterSpacing: -2.3,
  },
  finalTitleMobile: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  finalTitleCompact: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  finalSubtitle: {
    color: EXPERIENCE_COLORS.inkSoft,
    fontSize: 20,
    lineHeight: 32,
    maxWidth: 520,
  },
  finalSubtitleMobile: {
    fontSize: 18,
    lineHeight: 30,
  },
  finalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  primaryCta: {
    backgroundColor: EXPERIENCE_COLORS.ink,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 22,
  },
  primaryCtaText: {
    color: LANDING_COLORS.ctaText,
    fontSize: 16,
  },
  secondaryLink: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: LANDING_COLORS.borderLink,
  },
  secondaryLinkText: {
    color: EXPERIENCE_COLORS.ink,
  },
  footer: {
    backgroundColor: EXPERIENCE_COLORS.navy,
    borderRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  footerTop: {
    gap: spacing['2xl'],
  },
  footerBrandBlock: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    color: LANDING_COLORS.textOnDark,
  },
  brandTagline: {
    color: LANDING_COLORS.textOnDarkMuted,
    maxWidth: 360,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2xl'],
  },
  columnsMobile: {
    flexDirection: 'column',
    gap: spacing.xl,
  },
  column: {
    minWidth: 140,
    gap: spacing.sm,
  },
  columnTitle: {
    color: LANDING_COLORS.textOnDark,
    marginBottom: spacing.sm,
  },
  footerLink: {
    alignSelf: 'flex-start',
  },
  footerLinkText: {
    color: LANDING_COLORS.textOnDarkSubtle,
  },
  footerBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing['2xl'],
    marginTop: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: LANDING_COLORS.borderFooter,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LANDING_COLORS.borderStoreBadge,
  },
  storeBadgeSub: {
    color: LANDING_COLORS.textOnDarkFaint,
    fontSize: 10,
  },
  storeBadgeLabel: {
    color: LANDING_COLORS.textOnDark,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: LANDING_COLORS.textOnDark,
  },
  legal: {
    color: LANDING_COLORS.textOnDarkLegal,
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.88,
  },
  linkPressed: {
    opacity: 0.7,
  },
});

export default LandingFooter;
