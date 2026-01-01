import { BookmarkButton, Button, Text, useSnackbar, YouTubePlayerModal } from '@/components';
import type { WorkoutCard as Workout } from '@/types';
import { colors, radii, shadows, spacing, useResponsiveValue } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  item: Workout;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | boolean | void;
  isSaved?: boolean;
};

/**
 * WorkoutCard - Material Design 3 Style
 * Clean design, purple palette, micro-animations
 */
export const WorkoutCard = ({ item, onSave, onRemove, isSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Animation for floating card effect - each card has its own state
  // Disable hover effect for saved items
  const [isHovered, setIsHovered] = useState(false);
  const enableHover = !isSaved;

  // Web hover handlers
  const webHoverProps = Platform.OS === 'web' && enableHover ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  // Mobile press handlers
  const handlePressIn = () => enableHover && setIsHovered(true);
  const handlePressOut = () => enableHover && setIsHovered(false);

  const level = item.level?.toUpperCase?.() ?? '—';
  const duration = item.durationMinutes ? `${item.durationMinutes} min` : '—';
  const equipment = (item.equipment ?? []).slice(0, 2).join(' · ');

  const imageHeight = useResponsiveValue({
    mobile: 160,
    tablet: 180,
    desktop: 200,
    wide: 220,
  });

  const handleBookmark = async () => {
    const removeAction = isSaved && onRemove;
    const handler = removeAction ? onRemove : onSave;
    if (!handler || saving) return;
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const result = await Promise.resolve(handler(item.id));
      const ok = result === undefined ? true : Boolean(result);
      if (ok) {
        showSnackbar(removeAction ? 'Removed' : 'Saved!', { variant: 'success' });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        showSnackbar('Failed', { variant: 'error' });
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showSnackbar(getFriendlyErrorMessage(e), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const dark = colors.dark;

  // Dynamic styles for hover/press effect
  const cardDynamicStyle = {
    transform: [{ scale: isHovered ? 1.05 : 1 }],
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
      boxShadow: isHovered
        ? '0 12px 28px rgba(0, 0, 0, 0.35), 0 8px 12px rgba(0, 0, 0, 0.22)'
        : '0 4px 12px rgba(0, 0, 0, 0.15)',
    }),
  };

  return (
    <Pressable
      onPressIn={Platform.OS !== 'web' ? handlePressIn : undefined}
      onPressOut={Platform.OS !== 'web' ? handlePressOut : undefined}
      style={[styles.card, cardDynamicStyle]}
      {...webHoverProps}
    >
      {/* Image */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={[styles.image, Platform.OS === 'web' && { objectFit: 'cover' } as any]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, { backgroundColor: dark.surfaceVariant }]} />
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.gradient}
        />
        
        {/* Level chip */}
        <View style={styles.chip}>
          <Text variant="label" style={{ color: '#FFF', fontSize: 11 }}>{level}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text variant="body" weight="semibold" numberOfLines={2} style={{ color: dark.textPrimary }}>
          {item.title}
        </Text>
        
        <Text variant="caption" style={{ color: dark.textSecondary }}>
          {duration}{equipment ? ` · ${equipment}` : ''}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Watch"
            variant="primary"
            size="small"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowPlayer(true);
            }}
          />
          <BookmarkButton
            isSaved={!!isSaved}
            isLoading={saving}
            onPress={handleBookmark}
            color={dark.primary}
          />
        </View>
      </View>

      {/* In-app YouTube Player Modal */}
      <YouTubePlayerModal
        visible={showPlayer}
        youtubeId={item.youtubeId || ''}
        title={item.title}
        onClose={() => setShowPlayer(false)}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.dark.medium,
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  chip: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
