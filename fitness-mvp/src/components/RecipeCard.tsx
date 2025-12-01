import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { BookmarkButton, Button, Card, Text } from '@/components';
import { Tag } from '@/components/ui';
import type { RecipeCard as Recipe } from '@/types';
import { COLORS, SHAPE, spacing, SPACING, useResponsiveValue } from '@/utils';

type Props = {
  item: Recipe;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | boolean | void;
  onStart?: (id: string) => void;
  isSaved?: boolean;
};

export const RecipeCard = ({ item, onSave, onRemove, onStart, isSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const time = item.timeMinutes ? `${item.timeMinutes} min` : '—';
  const difficulty = item.difficulty ? item.difficulty.toUpperCase() : '—';

  // Responsive image height
  const imageHeight = useResponsiveValue({
    mobile: 200,
    tablet: 240,
    desktop: 280,
    wide: 320,
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
      {/* Image with gradient overlay */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={[styles.image, { height: imageHeight }]} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { height: imageHeight }]}>
            <Feather name="book-open" size={48} color={COLORS.primary.main + '40'} />
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradient}
        />
        {/* Badges overlay */}
        <View style={styles.badgeContainer}>
          {item.timeMinutes && (
            <View style={styles.badge}>
              <Feather name="clock" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{item.timeMinutes} min</Text>
            </View>
          )}
          {item.difficulty && (
            <View style={[styles.badge, styles.difficultyBadge]}>
              <Feather name="bar-chart-2" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{item.difficulty.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {/* AI Badge */}
        {item.isAiGenerated && (
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={10} color="#FFFFFF" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text variant="body" weight="bold" numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        
        {/* Nutrition quick stats */}
        {item.calories && (
          <View style={styles.nutritionRow}>
            <Tag 
              label={`${item.calories} cal`} 
              color="secondary" 
            />
            {item.tags && item.tags.length > 0 && (
              <Tag 
                label={item.tags[0]} 
                color="neutral" 
              />
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.row}>
        <Button 
          title="Start Cooking" 
          onPress={() => onStart?.(item.id)}
          variant="primary"
          icon={<Feather name="play-circle" size={16} color="#FFFFFF" />}
        />
        <BookmarkButton
          isSaved={!!isSaved}
          isLoading={saving}
          onPress={handleBookmark}
          color={COLORS.secondary.accent}
          accessibilityLabel={isSaved ? 'Remove recipe from library' : 'Save recipe to library'}
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
    height: 200, 
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
  difficultyBadge: {
    backgroundColor: COLORS.secondary.main + 'CC',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  aiBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: SHAPE.borderRadius.sm,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text.primary,
  },
  nutritionRow: {
    flexDirection: 'row',
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
