import React, { useState } from 'react';
import { Image, Linking, Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';

import { BookmarkButton, Button, Card, Text } from '@/components';
import { spacing, radii } from '@/utils';
import type { WorkoutCard as Workout } from '@/types';

type Props = {
  item: Workout;
  onSave?: (id: string) => Promise<boolean> | Promise<void> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | Promise<void> | boolean | void;
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
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={{ gap: spacing.xs }}>
        <Text variant="body" weight="bold" numberOfLines={2}>{item.title}</Text>
        <Text variant="caption" style={{ opacity: 0.8 }}>{duration} • {level}</Text>
        {!!equipment && <Text variant="caption" style={{ opacity: 0.8 }}>Equipment: {equipment}</Text>}
      </View>

      <View style={styles.row}>
        <Button title="▶ Watch Video" onPress={() => openYouTube(item.youtubeId)} />
        <BookmarkButton
          isSaved={!!isSaved}
          isLoading={saving}
          onPress={handleBookmark}
          color="#4ECDC4"
          accessibilityLabel={isSaved ? 'Remove workout from library' : 'Save workout to library'}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: radii.lg },
  imagePlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
