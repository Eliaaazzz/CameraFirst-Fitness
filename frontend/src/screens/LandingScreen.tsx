/**
 * LandingScreen — Uber-inspired marketing landing page (web only)
 *
 * Layout pattern:
 * 1. Sticky nav bar — logo left, login/signup right
 * 2. Hero section — bold serif headline + CTA left, illustration right (full viewport height)
 * 3. Feature discovery grid — 3x2 cards ("Discover what Metriful can do")
 * 4. How It Works — colored card + benefits list
 * 5. Stats bar — social proof numbers
 * 6. CTA footer — "Get Started" + login link + brand footer
 *
 * Inspired by: Uber homepage (uber.com/au/en)
 */

import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { StatsBar } from '@/components/landing/StatsBar';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width - 48, 1200);

  const navigateLogin = () => navigation.navigate('Login');
  const navigateSignup = () => navigation.navigate('Register');

  return (
    <View style={styles.root}>
      <LandingNav onLogin={navigateLogin} onSignup={navigateSignup} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { maxWidth }]}>
          <HeroSection onGetStarted={navigateSignup} onLogin={navigateLogin} />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <FeatureGrid />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <HowItWorks onGetStarted={navigateSignup} />
        </View>
        <View style={[styles.section, { maxWidth }]}>
          <StatsBar />
        </View>
        <View style={[styles.section, { maxWidth }]}>
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
