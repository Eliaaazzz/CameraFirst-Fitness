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
import { StatsBar } from '@/components/landing/StatsBar';
import { useAuthStore } from '@/stores';

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
    if (!isRestoringToken && isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    }
  }, [isAuthenticated, isRestoringToken, navigation]);
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width - 48, 1360);

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

  const handleNavPress = useCallback((item: string) => {
    const sectionKey = NAV_SECTION_MAP[item];
    const y = sectionPositions.current[sectionKey];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  }, []);

  return (
    <View style={styles.root}>
      <LandingNav onLogin={navigateLogin} onSignup={navigateSignup} onNavPress={handleNavPress} />
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
          <StatsBar />
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
          <LandingFooter onGetStarted={navigateSignup} onLogin={navigateLogin} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  section: { width: '100%', paddingHorizontal: 24, alignSelf: 'center' },
});
