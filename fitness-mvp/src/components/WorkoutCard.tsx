import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, Linking, Platform, StyleSheet, View } from 'react-native';

import { BookmarkButton, Button, Card, Text } from '@/components';
import { Tag } from '@/components/ui';
import type { WorkoutCard as Workout } from '@/types';
import { COLORS, SHAPE, spacing, SPACING, useResponsiveValue } from '@/utils';

type Props = {
  item: Workout;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | boolean | void;
  isSaved?: boolean;
};

const openYouTube = async (youtubeId?: string) => {
  if (!youtubeId) return;
  const appUrl = Platform.select({ ios: `youtube://watch?v=${youtubeId}`, android: `vnd.youtube:${youtubeId}` });
  const webUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  try {
    if (appUrl && (await Linking.canOpenURL(appUrl))) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {}
  Linking.openURL(webUrl);
};

export const WorkoutCard = ({ item, onSave, onRemove, isSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const level = item.level?.toUpperCase?.() ?? '—';
  const duration = item.durationMinutes ? `${item.durationMinutes} min` : '—';
  const equipment = (item.equipment ?? []).join(', ');

  // Responsive image height
  const imageHeight = useResponsiveValue({
    mobile: 180,
    tablet: 220,
    desktop: 260,
    wide: 300,
  });

  const handleBookmark = async () => {
    const removeAction = isSaved && onRemove;
    const handler = removeAction ? onRemove : onSave;
    if (!handler || saving) return;
    try {
      setSaving(true);
      const result = await Promise.resolve(handler(item.id));
      const ok = result === undefined ? true : Boolean(result);
      if (ok) {
        showSnackbar(removeAction ? 'Removed from your workouts' : 'Saved to your workouts', {
          variant: 'success',
        });
      } else {
        // Error haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        showSnackbar(removeAction ? 'Failed to remove' : 'Failed to save', {
          variant: 'error',
          actionLabel: 'Retry',
          onAction: handleBookmark,
        });
      }
    } catch (e: any) {
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showSnackbar(getFriendlyErrorMessage(e), {
        variant: 'error',
        actionLabel: 'Retry',
        onAction: handleBookmark,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      {/* Image with gradient overlay */}
      <View style={styles.imageContainer}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={[styles.image, { height: imageHeight }]} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { height: imageHeight }]}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={COLORS.primary.main + '40'} />
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradient}
        />
        {/* Badges overlay */}
        <View style={styles.badgeContainer}>
          {item.durationMinutes && (
            <View style={styles.badge}>
              <Feather name="clock" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{item.durationMinutes} min</Text>
            </View>
          )}
          {item.level && (
            <View style={[styles.badge, styles.levelBadge]}>
              <Feather name="trending-up" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{item.level.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text variant="body" weight="bold" numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        
        {/* Equipment tags */}
        {equipment && (
          <View style={styles.tagsRow}>
            {(item.equipment ?? []).slice(0, 3).map((eq, idx) => (
              <Tag key={idx} label={eq} color="neutral" />
            ))}
            {(item.equipment?.length ?? 0) > 3 && (
              <Tag label={`+${(item.equipment?.length ?? 0) - 3}`} color="primary" />
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.row}>
        <Button 
          title="Watch Video" 
          onPress={() => openYouTube(item.youtubeId)}
          variant="primary"
          icon={<Feather name="play" size={16} color="#FFFFFF" />}
        />
        <BookmarkButton
          isSaved={!!isSaved}
          isLoading={saving}
          onPress={handleBookmark}
          color={COLORS.primary.main}
          accessibilityLabel={isSaved ? 'Remove workout from library' : 'Save workout to library'}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { 
    gap: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: { 
    width: '100%', 
    height: 180, 
    borderTopLeftRadius: SHAPE.borderRadius.lg,
    borderTopRightRadius: SHAPE.borderRadius.lg,
  },
  imagePlaceholder: { 
    backgroundColor: COLORS.dark.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: SHAPE.borderRadius.sm,
  },
  levelBadge: {
    backgroundColor: COLORS.primary.main + 'CC',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
});
