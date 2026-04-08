/**
 * HelpScreen — Commercial-grade help & support page
 *
 * Inspired by: Uber Help / Stripe Docs layout
 * - Web: full-width Uber-style sections with two-column FAQ grid
 * - Mobile: clean stacked BentoCards with generous spacing
 * - Includes: Getting Started, FAQ, Contact, Legal links
 */
import {
  ArrowLeft,
  BookOpen,
  Camera,
  CaretRight,
  ChartLine,
  Envelope,
  Fire,
  Lifebuoy,
  Lightning,
  Lock,
  Robot,
  Scales,
  ShieldCheck,
  Target,
} from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaWrapper, Text } from '@/components';
import { BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { ScreenLayout } from '@/components/layout';
import { APP_NAME, BRAND_COLORS, colors, radii, saasShadows, spacing, useContentBottomPadding, useSidebarVisible } from '@/utils';

// ============================================================================
// DATA
// ============================================================================

interface FaqItem {
  icon: React.ReactNode;
  question: string;
  answer: string;
  color: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    icon: <Camera size={20} color="#FFFFFF" weight="bold" />,
    question: 'How do I log a meal?',
    answer:
      'Tap the camera button on the tab bar or the "Snap a meal" bar on your dashboard. Take a photo of your food — our AI identifies items and estimates nutrition. Review, adjust, and save.',
    color: BRAND_COLORS.primary,
  },
  {
    icon: <Target size={20} color="#FFFFFF" weight="bold" />,
    question: 'How do I set my goals?',
    answer:
      'Go to Profile → "Generate Goals" or use "Build my plan" on the dashboard. Answer a few questions about your body and targets — AI creates personalised daily calorie and macro goals.',
    color: '#3B82F6',
  },
  {
    icon: <Robot size={20} color="#FFFFFF" weight="bold" />,
    question: 'How accurate is the AI?',
    answer:
      'We use Google Gemini Vision for food recognition. It works best with clearly visible, single-plate meals. Always review results — AI estimates should be verified with a healthcare professional.',
    color: '#8B5CF6',
  },
  {
    icon: <ShieldCheck size={20} color="#FFFFFF" weight="bold" />,
    question: 'Is my data private?',
    answer:
      'Photos are processed securely and stored on encrypted cloud storage. We never sell your data. Delete your account and all data anytime from Settings.',
    color: '#10B981',
  },
  {
    icon: <ChartLine size={20} color="#FFFFFF" weight="bold" />,
    question: 'What are Weekly Reports?',
    answer:
      'Weekly Reports show your 7-day nutrition trends, macro distribution, and calorie adherence. You can export data as CSV. Access them from the Profile tab or sidebar.',
    color: '#06B6D4',
  },
  {
    icon: <Fire size={20} color="#FFFFFF" weight="bold" />,
    question: 'How do streaks work?',
    answer:
      'Log at least one meal per day to maintain your streak. Streaks unlock badge tiers at 3, 7, 14, 30, and 100 days. Missing a day resets the counter.',
    color: '#F59E0B',
  },
  {
    icon: <Lightning size={20} color="#FFFFFF" weight="bold" />,
    question: 'What is the Daily Score?',
    answer:
      'A 0-100 composite score based on calorie adherence (40%), macro balance (30%), hydration (15%), and streak bonus (15%). It gives you one number to check each day.',
    color: '#EC4899',
  },
  {
    icon: <Lock size={20} color="#FFFFFF" weight="bold" />,
    question: 'How do I delete my account?',
    answer:
      'Go to Profile → Settings → "Delete Account". This permanently removes your account and all associated data including meal logs, photos, and goals.',
    color: '#EF4444',
  },
];

const GETTING_STARTED_STEPS = [
  { step: '1', title: 'Create your account', description: 'Sign up with Apple, Google, or email in under 30 seconds.' },
  { step: '2', title: 'Set your goals', description: 'Answer a few questions and let AI build your daily targets.' },
  { step: '3', title: 'Snap your meals', description: 'Take a photo — AI logs calories and macros automatically.' },
  { step: '4', title: 'Track your progress', description: 'Check your Daily Score, streaks, and weekly reports.' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function FaqCard({ item, expanded, onToggle }: { item: FaqItem; expanded: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${item.question}${expanded ? ', expanded' : ''}`}
      style={({ pressed }) => [
        faqStyles.card,
        Platform.OS === 'web' && (BENTO_CARD_WEB_STYLES as any),
        pressed && faqStyles.cardPressed,
      ]}
    >
      <View style={faqStyles.cardRow}>
        <View style={[faqStyles.iconBox, { backgroundColor: item.color }]}>
          {item.icon}
        </View>
        <Text variant="body" weight="bold" style={faqStyles.question}>
          {item.question}
        </Text>
        <CaretRight
          size={16}
          color={BRAND_COLORS.textMuted}
          weight="bold"
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </View>
      {expanded && (
        <Text variant="body" style={faqStyles.answer}>
          {item.answer}
        </Text>
      )}
    </Pressable>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export const HelpScreen = () => {
  const navigation = useNavigation();
  const showSidebar = useSidebarVisible();
  const contentBottomPadding = useContentBottomPadding(spacing.xl);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleContact = () => {
    Linking.openURL('mailto:support@aurafitness.org').catch(() => {});
  };

  // ============================================================================
  // WEB DESKTOP LAYOUT
  // ============================================================================
  if (showSidebar && Platform.OS === 'web') {
    return (
      <SafeAreaWrapper>
        <ScreenLayout scrollable={false}>
          <ScrollView
            style={webStyles.scroll}
            contentContainerStyle={webStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={webStyles.hero}>
              <Text variant="heading1" weight="bold" style={webStyles.heroTitle}>
                How can we help?
              </Text>
              <Text variant="body" style={webStyles.heroSubtitle}>
                Everything you need to know about {APP_NAME} — from getting started to advanced features.
              </Text>
            </View>

            {/* Getting Started */}
            <View style={webStyles.section}>
              <Text variant="heading2" weight="bold" style={webStyles.sectionTitle}>
                Getting started
              </Text>
              <View style={webStyles.stepsRow}>
                {GETTING_STARTED_STEPS.map((s) => (
                  <View key={s.step} style={webStyles.stepCard}>
                    <View style={webStyles.stepNumber}>
                      <Text variant="body" weight="bold" style={webStyles.stepNumberText}>{s.step}</Text>
                    </View>
                    <Text variant="body" weight="bold" style={webStyles.stepTitle}>{s.title}</Text>
                    <Text variant="body" style={webStyles.stepDesc}>{s.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* FAQ Grid */}
            <View style={webStyles.section}>
              <Text variant="heading2" weight="bold" style={webStyles.sectionTitle}>
                Frequently asked questions
              </Text>
              <View style={webStyles.faqGrid}>
                {FAQ_ITEMS.map((item, i) => (
                  <View key={i} style={webStyles.faqGridItem}>
                    <FaqCard
                      item={item}
                      expanded={expandedIndex === i}
                      onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Contact + Legal */}
            <View style={webStyles.section}>
              <Text variant="heading2" weight="bold" style={webStyles.sectionTitle}>
                Still need help?
              </Text>
              <View style={webStyles.contactRow}>
                <Pressable
                  onPress={handleContact}
                  style={({ pressed }) => [webStyles.contactCard, pressed && { opacity: 0.92 }]}
                >
                  <View style={webStyles.contactIconBox}>
                    <Envelope size={24} color="#FFFFFF" weight="bold" />
                  </View>
                  <View style={webStyles.contactCopy}>
                    <Text variant="body" weight="bold" style={{ color: '#111111' }}>Email support</Text>
                    <Text variant="body" style={{ color: '#6B6B6B' }}>support@aurafitness.org</Text>
                  </View>
                  <CaretRight size={18} color="#7B7B7B" />
                </Pressable>

                <Pressable
                  onPress={() => Linking.openURL('https://aurafitness.org/privacy-policy.html').catch(() => {})}
                  style={({ pressed }) => [webStyles.contactCard, pressed && { opacity: 0.92 }]}
                >
                  <View style={[webStyles.contactIconBox, { backgroundColor: '#8B5CF6' }]}>
                    <Lock size={24} color="#FFFFFF" weight="bold" />
                  </View>
                  <View style={webStyles.contactCopy}>
                    <Text variant="body" weight="bold" style={{ color: '#111111' }}>Privacy Policy</Text>
                    <Text variant="body" style={{ color: '#6B6B6B' }}>How we handle your data</Text>
                  </View>
                  <CaretRight size={18} color="#7B7B7B" />
                </Pressable>

                <Pressable
                  onPress={() => Linking.openURL('https://aurafitness.org/terms-of-service.html').catch(() => {})}
                  style={({ pressed }) => [webStyles.contactCard, pressed && { opacity: 0.92 }]}
                >
                  <View style={[webStyles.contactIconBox, { backgroundColor: '#06B6D4' }]}>
                    <Scales size={24} color="#FFFFFF" weight="bold" />
                  </View>
                  <View style={webStyles.contactCopy}>
                    <Text variant="body" weight="bold" style={{ color: '#111111' }}>Terms of Service</Text>
                    <Text variant="body" style={{ color: '#6B6B6B' }}>Usage terms and conditions</Text>
                  </View>
                  <CaretRight size={18} color="#7B7B7B" />
                </Pressable>
              </View>
            </View>

            {/* AI Disclaimer */}
            <View style={webStyles.disclaimerWrap}>
              <Text variant="caption" style={webStyles.disclaimer}>
                AI-generated nutritional data is for reference only.
                Please adapt to your own situation.
              </Text>
            </View>
          </ScrollView>
        </ScreenLayout>
      </SafeAreaWrapper>
    );
  }

  // ============================================================================
  // MOBILE LAYOUT
  // ============================================================================
  return (
    <SafeAreaWrapper>
      <ScrollView
        style={mobileStyles.scroll}
        contentContainerStyle={[mobileStyles.scrollContent, { paddingBottom: contentBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={mobileStyles.header}>
          <Pressable
            style={mobileStyles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={BRAND_COLORS.textPrimary} />
          </Pressable>
          <Text variant="heading2" weight="bold" style={{ color: '#111111' }}>
            Help & FAQ
          </Text>
        </View>

        <Text variant="body" style={mobileStyles.intro}>
          Everything you need to know about {APP_NAME}.
        </Text>

        {/* Getting Started */}
        <Text variant="heading4" weight="bold" style={mobileStyles.sectionLabel}>
          Getting started
        </Text>
        <View style={mobileStyles.stepsContainer}>
          {GETTING_STARTED_STEPS.map((s) => (
            <View key={s.step} style={mobileStyles.stepRow}>
              <View style={mobileStyles.stepBadge}>
                <Text variant="body" weight="bold" style={mobileStyles.stepBadgeText}>{s.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold" style={{ color: '#111111' }}>{s.title}</Text>
                <Text variant="caption" style={{ color: BRAND_COLORS.textSecondary, marginTop: 2 }}>{s.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text variant="heading4" weight="bold" style={mobileStyles.sectionLabel}>
          FAQ
        </Text>
        {FAQ_ITEMS.map((item, i) => (
          <FaqCard
            key={i}
            item={item}
            expanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
          />
        ))}

        {/* Contact */}
        <Text variant="heading4" weight="bold" style={mobileStyles.sectionLabel}>
          Contact & Legal
        </Text>

        <Pressable
          onPress={handleContact}
          accessibilityRole="button"
          accessibilityLabel="Email support"
          style={({ pressed }) => [mobileStyles.linkRow, pressed && { opacity: 0.7 }]}
        >
          <View style={[mobileStyles.linkIcon, { backgroundColor: BRAND_COLORS.primary }]}>
            <Envelope size={18} color="#FFFFFF" weight="bold" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="semibold" style={{ color: '#111111' }}>Email support</Text>
            <Text variant="caption" style={{ color: BRAND_COLORS.textMuted }}>support@aurafitness.org</Text>
          </View>
          <CaretRight size={16} color={BRAND_COLORS.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL('https://aurafitness.org/privacy-policy.html').catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
          style={({ pressed }) => [mobileStyles.linkRow, pressed && { opacity: 0.7 }]}
        >
          <View style={[mobileStyles.linkIcon, { backgroundColor: '#8B5CF6' }]}>
            <Lock size={18} color="#FFFFFF" weight="bold" />
          </View>
          <Text variant="body" weight="semibold" style={{ color: '#111111', flex: 1 }}>Privacy Policy</Text>
          <CaretRight size={16} color={BRAND_COLORS.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL('https://aurafitness.org/terms-of-service.html').catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel="Terms of Service"
          style={({ pressed }) => [mobileStyles.linkRow, pressed && { opacity: 0.7 }]}
        >
          <View style={[mobileStyles.linkIcon, { backgroundColor: '#06B6D4' }]}>
            <Scales size={18} color="#FFFFFF" weight="bold" />
          </View>
          <Text variant="body" weight="semibold" style={{ color: '#111111', flex: 1 }}>Terms of Service</Text>
          <CaretRight size={16} color={BRAND_COLORS.textMuted} />
        </Pressable>

        {/* AI disclaimer */}
        <Text variant="caption" style={mobileStyles.disclaimer}>
          AI-generated nutritional data is for reference only.
          Please adapt to your own situation.
        </Text>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

// ============================================================================
// FAQ CARD STYLES
// ============================================================================

const faqStyles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E7E7E7',
        }
      : MOBILE_CARD_STYLES),
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...(Platform.OS === 'web' && ({
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    } as any)),
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  question: {
    flex: 1,
    color: '#111111',
    fontSize: 15,
  },
  answer: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 22,
    marginTop: spacing.md,
    paddingLeft: 48, // align with text after icon
  },
});

// ============================================================================
// WEB STYLES
// ============================================================================

const webStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  hero: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: 40,
  },
  heroTitle: {
    color: '#111111',
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -2,
  },
  heroSubtitle: {
    color: '#6B6B6B',
    fontSize: 18,
    lineHeight: 28,
    marginTop: 12,
    maxWidth: 600,
  },
  section: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 24,
  },
  // Getting started steps
  stepsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    ...(Platform.OS === 'web' && ({
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)',
    } as any)),
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  stepTitle: {
    color: '#111111',
    fontSize: 16,
    marginBottom: 6,
  },
  stepDesc: {
    color: '#6B6B6B',
    fontSize: 14,
    lineHeight: 20,
  },
  // FAQ grid
  faqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  faqGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 340,
  },
  // Contact
  contactRow: {
    flexDirection: 'row',
    gap: 16,
  },
  contactCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    ...(Platform.OS === 'web' && ({
      cursor: 'pointer' as any,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)',
    } as any)),
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCopy: {
    flex: 1,
  },
  disclaimerWrap: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
  },
  disclaimer: {
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

// ============================================================================
// MOBILE STYLES
// ============================================================================

const mobileStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intro: {
    color: BRAND_COLORS.textSecondary,
    marginBottom: spacing.xl,
    fontSize: 15,
  },
  sectionLabel: {
    color: '#111111',
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  stepsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.sm,
    ...saasShadows.subtle,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...saasShadows.subtle,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: {
    color: BRAND_COLORS.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});

export default HelpScreen;
