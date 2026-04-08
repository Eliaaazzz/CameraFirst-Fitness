/**
 * LandingScreen — Uber.com clone structure.
 *
 * Sections (Uber exact order):
 * 1. Nav (black) — LandingNav
 * 2. Hero — headline left + product preview right
 * 3. Discover — "Discover what you can do with Metriful" + 3 cards
 * 4. CTA banner — sign up prompt
 * 5. Footer — LandingFooter
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Text } from '@/components';
import { startBackendWarmup } from '@/services/backendWarmup';
import { useAuthStore } from '@/stores';
import { APP_NAME, APP_PAGE_PATHS, SUPPORT_EMAIL_URL, openAppPage, openExternalUrl } from '@/utils';

const NAV_SECTION_MAP: Record<string, string> = {
  Track: 'featureGrid',
  Programs: 'featureGrid',
  Reports: 'featureGrid',
  About: 'footer',
};

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isRestoringToken } = useAuthStore();

  useEffect(() => { void startBackendWarmup(); }, []);

  useEffect(() => {
    if (!isRestoringToken && isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' } as any] });
    }
  }, [isAuthenticated, isRestoringToken, navigation]);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const maxWidth = 1200;

  const navigateLogin = () => navigation.navigate('Login');
  const navigateSignup = () => navigation.navigate('Register');

  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const handleSectionLayout = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      sectionPositions.current[key] = event.nativeEvent.layout.y;
    }, [],
  );

  const scrollToSection = useCallback((sectionKey: string) => {
    const y = sectionPositions.current[sectionKey];
    if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  const handleNavPress = useCallback((item: string) => {
    const sectionKey = NAV_SECTION_MAP[item];
    if (sectionKey) scrollToSection(sectionKey);
  }, [scrollToSection]);

  const handleHelpPress = useCallback(() => navigation.navigate('Help'), [navigation]);
  const handleLanguagePress = useCallback(() => void openAppPage(`${APP_PAGE_PATHS.support}#language`), []);

  const handleFooterLinkPress = useCallback((linkId: string) => {
    switch (linkId) {
      case 'meal-logging': case 'workout-planning': case 'targets': case 'weekly-reports':
        scrollToSection('featureGrid'); return;
      case 'help-centre': case 'export-data': navigation.navigate('Help'); return;
      case 'data-sources': navigation.navigate('AboutNutritionData'); return;
      case 'release-notes': void openAppPage(APP_PAGE_PATHS.releaseNotes); return;
      case 'about': scrollToSection('footer'); return;
      case 'contact': void openExternalUrl(SUPPORT_EMAIL_URL, 'Unable to open email', 'Please email support@aurafitness.org.'); return;
      case 'privacy-policy': void openAppPage(APP_PAGE_PATHS.privacy); return;
      case 'terms-of-service': void openAppPage(APP_PAGE_PATHS.terms); return;
      case 'accessibility': void openAppPage(APP_PAGE_PATHS.accessibility); return;
    }
  }, [navigation, scrollToSection]);

  return (
    <View style={styles.root}>
      <LandingNav
        onLogin={navigateLogin}
        onSignup={navigateSignup}
        onNavPress={handleNavPress}
        onHelp={handleHelpPress}
        onLanguage={handleLanguagePress}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO ── */}
        <View style={[styles.sectionWrap, { maxWidth }]}>
          <HeroSection onGetStarted={navigateSignup} onLogin={navigateLogin} />
        </View>

        {/* ── 2. DISCOVER ── */}
        <View style={[styles.sectionWrap, { maxWidth }]} onLayout={handleSectionLayout('featureGrid')}>
          <FeatureGrid onExplore={navigateSignup} />
        </View>

        {/* ── 3. CTA BANNER ── */}
        <View style={styles.ctaBanner}>
          <View style={[styles.ctaBannerInner, { maxWidth }]}>
            <Text style={isDesktop ? styles.ctaTitle : [styles.ctaTitle, styles.ctaTitleMobile]}>
              Start tracking your nutrition today
            </Text>
            <Text style={styles.ctaBody}>
              Sign up and log your first meal in under 30 seconds. No credit card required.
            </Text>
            <Pressable onPress={navigateSignup} style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}>
              <Text style={styles.ctaButtonText}>Sign up to start</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 4. FOOTER ── */}
        <View style={[styles.sectionWrap, { maxWidth }]} onLayout={handleSectionLayout('footer')}>
          <LandingFooter
            onGetStarted={navigateSignup}
            onLogin={navigateLogin}
            onLinkPress={handleFooterLinkPress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  sectionWrap: {
    width: '100%',
    paddingHorizontal: 24,
    alignSelf: 'center',
  },

  // ── CTA Banner — Uber-style full-width dark section ──
  ctaBanner: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaBannerInner: {
    width: '100%',
    gap: 20,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 56,
  },
  ctaTitleMobile: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  ctaBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 520,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  ctaButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
