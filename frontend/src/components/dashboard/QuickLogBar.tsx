import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Camera, Image as ImageIcon } from 'phosphor-react-native';

import { Card, Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

// Theme colors for quick actions (matches Sidebar style)
const ACTION_COLORS = {
  camera: '#10B981',   // Green - capture
  gallery: '#7C3AED',  // Purple - brand
  search: '#3B82F6',   // Blue - search
};

// Helper: create tinted background from hex color
const tint = (hex: string, alpha = 0.12): string => {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

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

      {/* Quick Action Icons - ✅ Phosphor icons with colored chips (alpha 0.10-0.16) */}
      <View style={styles.quickActions}>
        {/* Camera Button */}
        {onOpenCamera && (
          <Pressable
            style={[
              styles.iconButton,
              { 
                backgroundColor: tint(ACTION_COLORS.camera, isCameraHovered ? 0.16 : 0.12),
                borderColor: tint(ACTION_COLORS.camera, 0.2),
              },
            ]}
            onPress={onOpenCamera}
            {...(Platform.OS === 'web' && {
              onMouseEnter: () => setIsCameraHovered(true),
              onMouseLeave: () => setIsCameraHovered(false),
            })}
          >
            <Camera
              size={20}
              weight="regular"
              color={ACTION_COLORS.camera}
            />
          </Pressable>
        )}

        {/* Gallery Button */}
        <Pressable
          style={[
            styles.iconButton,
            { 
              backgroundColor: tint(ACTION_COLORS.gallery, isGalleryHovered ? 0.16 : 0.12),
              borderColor: tint(ACTION_COLORS.gallery, 0.2),
            },
          ]}
          onPress={onOpenGallery}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => setIsGalleryHovered(true),
            onMouseLeave: () => setIsGalleryHovered(false),
          })}
        >
          <ImageIcon
            size={20}
            weight="regular"
            color={ACTION_COLORS.gallery}
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
    color: '#374151',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
});

export default QuickLogBar;
