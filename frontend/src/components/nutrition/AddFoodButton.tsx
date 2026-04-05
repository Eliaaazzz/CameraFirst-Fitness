import { Camera, CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BRAND_COLORS, radii, saasShadows, spacing } from '@/utils';

import { Text } from '@/components/Text';

interface AddFoodButtonProps {
  onPress: () => void;
}

export function AddFoodButton({ onPress }: AddFoodButtonProps) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
    >
      <View style={styles.iconWrap}>
        <Camera size={20} color="#FFFFFF" weight="bold" />
      </View>
      <View style={styles.textWrap}>
        <Text variant="heading4" weight="semibold" style={styles.title}>
          Log a meal
        </Text>
        <Text variant="caption" style={styles.subtitle}>
          Snap a photo or choose one from your library.
        </Text>
      </View>
      <CaretRight size={18} color={BRAND_COLORS.primaryDark} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: BRAND_COLORS.primaryContainer,
    borderWidth: 1,
    borderColor: 'rgba(201, 106, 52, 0.12)',
    padding: spacing.lg,
    ...saasShadows.subtle,
  },
  containerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
  },
});

