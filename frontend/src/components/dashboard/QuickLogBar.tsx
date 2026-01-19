import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { Card, Text } from '@/components';
import { BRAND_COLORS, colors, spacing } from '@/utils';

interface QuickLogBarProps {
  username?: string;
  onOpenCamera?: () => void;
  onOpenGallery?: () => void;
  onSearchFood?: () => void;
}

/**
 * QuickLogBar - Desktop-optimized food logging input
 *
 * Replaces the mobile "Snap Your Meal" button with a Twitter/LinkedIn-style
 * quick post bar that feels native to desktop users.
 */
export function QuickLogBar({
  username = 'User',
  onOpenCamera,
  onOpenGallery,
  onSearchFood,
}: QuickLogBarProps) {
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [isCameraHovered, setIsCameraHovered] = useState(false);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);

  // Get first letter for avatar
  const avatarLetter = username.charAt(0).toUpperCase();

  return (
    <Card style={styles.container} elevation="light">
      {/* User Avatar */}
      <View style={styles.avatar}>
        <Text variant="body" weight="bold" style={styles.avatarText}>
          {avatarLetter}
        </Text>
      </View>

      {/* Fake Input - Click to open search/log modal */}
      <Pressable
        style={[
          styles.fakeInput,
          isInputHovered && styles.fakeInputHovered,
        ]}
        onPress={onSearchFood || onOpenGallery}
        {...(Platform.OS === 'web' && {
          onMouseEnter: () => setIsInputHovered(true),
          onMouseLeave: () => setIsInputHovered(false),
        })}
      >
        <Text style={styles.placeholderText}>
          What did you eat today?
        </Text>
      </Pressable>

      {/* Quick Action Icons */}
      <View style={styles.quickActions}>
        {/* Camera Button */}
        {onOpenCamera && (
          <Pressable
            style={[
              styles.iconButton,
              isCameraHovered && styles.iconButtonHovered,
            ]}
            onPress={onOpenCamera}
            {...(Platform.OS === 'web' && {
              onMouseEnter: () => setIsCameraHovered(true),
              onMouseLeave: () => setIsCameraHovered(false),
            })}
          >
            <MaterialCommunityIcons
              name="camera-outline"
              size={22}
              color={BRAND_COLORS.primary}
            />
          </Pressable>
        )}

        {/* Gallery Button */}
        <Pressable
          style={[
            styles.iconButton,
            isGalleryHovered && styles.iconButtonHovered,
          ]}
          onPress={onOpenGallery}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => setIsGalleryHovered(true),
            onMouseLeave: () => setIsGalleryHovered(false),
          })}
        >
          <Feather
            name="image"
            size={20}
            color={BRAND_COLORS.primary}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  fakeInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  fakeInputHovered: {
    backgroundColor: '#E5E7EB',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  iconButtonHovered: {
    backgroundColor: `${BRAND_COLORS.primary}20`,
    transform: [{ scale: 1.05 }],
  },
});

export default QuickLogBar;
