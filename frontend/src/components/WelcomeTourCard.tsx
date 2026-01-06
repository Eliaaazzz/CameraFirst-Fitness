/**
 * WelcomeTourCard Component
 * Dismissable welcome card that appears on Dashboard for new users
 * Provides "Take a Tour" and "Skip" options
 */

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

interface WelcomeTourCardProps {
  onStartTour: () => void;
  onSkip: () => void;
}

export const WelcomeTourCard: React.FC<WelcomeTourCardProps> = ({
  onStartTour,
  onSkip,
}) => {
  return (
    <Card style={styles.container}>
      {/* Header with icon */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="hand-wave"
            size={28}
            color={BRAND_COLORS.primary}
          />
        </View>
        <Pressable onPress={onSkip} style={styles.closeButton} hitSlop={8}>
          <Feather name="x" size={20} color={BRAND_COLORS.textSecondary} />
        </Pressable>
      </View>

      {/* Welcome text */}
      <Text variant="heading3" weight="bold" style={styles.title}>
        Welcome to AuraFitness!
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Take a quick tour to learn how to track your meals, discover workouts, and reach your fitness goals.
      </Text>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.tourButton,
            pressed && styles.tourButtonPressed,
          ]}
          onPress={onStartTour}
        >
          <LinearGradient
            colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tourButtonGradient}
          >
            <MaterialCommunityIcons name="compass" size={20} color="#FFF" />
            <Text variant="body" weight="semibold" style={styles.tourButtonText}>
              Take a Tour
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.skipButtonPressed,
          ]}
        >
          <Text variant="body" style={styles.skipButtonText}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    gap: spacing.sm,
  },
  tourButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tourButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  tourButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tourButtonText: {
    color: '#FFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    color: BRAND_COLORS.textSecondary,
  },
});

export default WelcomeTourCard;
