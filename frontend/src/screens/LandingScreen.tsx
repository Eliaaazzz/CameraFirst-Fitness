/**
 * LandingScreen — Uber-inspired marketing landing page (web only)
 *
 * Layout pattern:
 * 1. Sticky nav bar — logo left, login/signup right
 * 2. Hero section — task-first headline + CTA left, illustration right
 * 3. Feature discovery grid — 3x2 capability cards
 * 4. Account split CTA
 * 5. Planner promo
 * 6. Program hub
 * 7. CTA footer + mega footer
 *
 * Inspired by: Uber homepage (uber.com/au/en)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import AccountSplitSection from '@/components/landing/AccountSplitSection';
import AIStepsSection from '@/components/landing/AIStepsSection';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import FaqSection from '@/components/landing/FaqSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import ProgramHubSection from '@/components/landing/ProgramHubSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { startBackendWarmup } from '@/services/backendWarmup';
import { useAuthStore } from '@/stores';
import { APP_PAGE_PATHS, SUPPORT_EMAIL_URL, openAppPage, openExternalUrl } from '@/utils';

/** Map nav item labels to section keys */
const NAV_SECTION_MAP: Record<string, string> = {
  Track: 'featureGrid',
  Programs: 'programHub',
  Reports: 'howItWorks',
  About: 'footer',
};

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isRestoringToken } = useAuthStore();

  // If user is already logged in (token restored in background), redirect to Main
  useEffect(() => {
    void startBackendWarmup();
  }, []);

  useEffect(() => {
    if (!isRestoringToken && isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    }
  }, [isAuthenticated, isRestoringToken, navigation]);
  const { width } = useWindowDimensions();
  const horizontalInset = width >= 768 ? 24 : 14;
  const maxWidth = Math.min(width - horizontalInset * 2, 1360);

  const navigateLogin = () => navigation.navigate('Login');
  const navigateSignup = () => navigation.navigate('Register');

  // ── Scroll-to-section logic ──────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const handleSectionLayout = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      sectionPositions.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToSection = useCallback((sectionKey: string) => {
    const y = sectionPositions.current[sectionKey];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  }, []);

  const handleNavPress = useCallback((item: string) => {
    const sectionKey = NAV_SECTION_MAP[item];
    if (sectionKey) {
      scrollToSection(sectionKey);
    }
  }, [scrollToSection]);

  const handleHelpPress = useCallback(() => {
    navigation.navigate('Help');
  }, [navigation]);

  const handleLanguagePress = useCallback(() => {
    void openAppPage(`${APP_PAGE_PATHS.support}#language`);
  }, []);

  const handleFooterLinkPress = useCallback((linkId: string) => {
    switch (linkId) {
      case 'meal-logging':
        scrollToSection('featureGrid');
        return;
      case 'workout-planning':
        scrollToSection('programHub');
        return;
      case 'targets':
      case 'weekly-reports':
        scrollToSection('howItWorks');
        return;
      case 'help-centre':
      case 'export-data':
        navigation.navigate('Help');
        return;
      case 'data-sources':
        navigation.navigate('AboutNutritionData');
        return;
      case 'release-notes':
        void openAppPage(APP_PAGE_PATHS.releaseNotes);
        return;
      case 'about':
        scrollToSection('footer');
        return;
      case 'contact':
        void openExternalUrl(SUPPORT_EMAIL_URL, 'Unable to open email', 'Please email support@aurafitness.org.');
        return;
      case 'privacy-policy':
        void openAppPage(APP_PAGE_PATHS.privacy);
        return;
      case 'terms-of-service':
        void openAppPage(APP_PAGE_PATHS.terms);
        return;
      case 'accessibility':
        void openAppPage(APP_PAGE_PATHS.accessibility);
        return;
      default:
        return;
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
        <View style={[styles.section, { maxWidth }]}>
          <HeroSection onGetStarted={navigateSignup} onLogin={navigateLogin} />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <AIStepsSection />
        </View>
        <View style={[styles.section, { maxWidth }]} onLayout={handleSectionLayout('featureGrid')}>
          <FeatureGrid onExplore={navigateSignup} />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <AccountSplitSection onLogin={navigateLogin} onSignup={navigateSignup} />
        </View>
        <View style={[styles.section, { maxWidth }]} onLayout={handleSectionLayout('howItWorks')}>
          <HowItWorks onGetStarted={navigateSignup} />
        </View>
        <View style={[styles.section, { maxWidth }]} onLayout={handleSectionLayout('programHub')}>
          <ProgramHubSection />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <FaqSection />
        </View>
        <View style={[styles.section, { maxWidth }]} onLayout={handleSectionLayout('footer')}>
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
    backgroundColor: '#F8F7F3',
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  section: {
    width: '100%',
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
});
