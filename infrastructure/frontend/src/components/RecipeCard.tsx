import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';

import { BookmarkButton, Button, Card, Text } from '@/components';
import { radii, spacing } from '@/utils';
import type { RecipeCard as Recipe } from '@/types';

type Props = {
  item: Recipe;
  onSave?: (id: string) => Promise<boolean> | Promise<void> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | Promise<void> | boolean | void;
  onStart?: (id: string) => void;
  isSaved?: boolean;
};

export const RecipeCard = ({ item, onSave, onRemove, onStart, isSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const time = item.timeMinutes ? `${item.timeMinutes} min` : '—';
  const difficulty = item.difficulty ? item.difficulty.toUpperCase() : '—';

  const handleBookmark = async () => {
    const removeAction = isSaved && onRemove;
    const handler = removeAction ? onRemove : onSave;
    if (!handler || saving) return;
    try {
      setSaving(true);
      const result = await Promise.resolve(handler(item.id));
      const ok = result === undefined ? true : Boolean(result);
      if (ok) {
        showSnackbar(removeAction ? 'Removed from your recipes' : 'Saved to your recipes', {
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
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={{ gap: spacing.xs }}>
        <View style={styles.titleRow}>
          <Text variant="body" weight="bold" numberOfLines={2} style={{ flex: 1 }}>{item.title}</Text>
          {item.isAiGenerated && (
            <View style={styles.aiBadge}>
              <Text variant="caption" style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>
        <Text variant="caption" style={{ opacity: 0.8 }}>{time} • {difficulty}</Text>
      </View>

      <View style={styles.row}>
        <Button title="Start Cooking" onPress={() => onStart?.(item.id)} />
        <BookmarkButton
          isSaved={!!isSaved}
          isLoading={saving}
          onPress={handleBookmark}
          color="#FF6B6B"
          accessibilityLabel={isSaved ? 'Remove recipe from library' : 'Save recipe to library'}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  image: { width: '100%', height: 200, borderRadius: radii.lg },
  imagePlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  aiBadge: {
    backgroundColor: '#9333EA',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: 2,
  },
  aiBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
