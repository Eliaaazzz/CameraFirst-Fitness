import { BookmarkButton, Button, Text, useSnackbar, YouTubePlayerModal } from '@/components';
import type { WorkoutCard as Workout } from '@/types';
import { cardStyles, getTheme, radii, spacing, useResponsiveValue } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  item: Workout;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
  onRemove?: (id: string) => Promise<boolean> | boolean | void;
  isSaved?: boolean;
  /** Disable hover/press scale micro-animation (useful for dense lists like search results). */
  disableHoverEffect?: boolean;
};

/**
 * WorkoutCard - Material Design 3 Style
 * Clean design, purple palette, micro-animations
 */
export const WorkoutCard = ({ item, onSave, onRemove, isSaved, disableHoverEffect = false }: Props) => {
  // Always use light mode
  const theme = getTheme('light');
  const [saving, setSaving] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Animation for floating card effect - each card has its own state
  // Disable hover effect for saved items
  const [isHovered, setIsHovered] = useState(false);
  const enableHover = !isSaved && !disableHoverEffect;

  // Spring press animation (mobile)
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  // Web hover handlers
  const webHoverProps = Platform.OS === 'web' && enableHover ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  // Mobile press handlers
  const handlePressIn = useCallback(() => {
    if (enableHover) setIsHovered(true);
    if (Platform.OS !== 'web') {
      pressScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  }, [enableHover, pressScale]);
  const handlePressOut = useCallback(() => {
    if (enableHover) setIsHovered(false);
    if (Platform.OS !== 'web') {
      pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  }, [enableHover, pressScale]);

  const level = item.level?.toUpperCase?.() ?? '—';
  const duration = item.durationMinutes ? `${item.durationMinutes} min` : '—';
  const equipment = (item.equipment ?? []).slice(0, 2).join(' · ');

  // Responsive image height - same values as RecipeCard for consistency
  const imageHeight = useResponsiveValue({
    mobile: 160,
    tablet: 180,
    desktop: 180,
    wide: 180,
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

  // Dynamic styles for hover/press effect
  const showHover = enableHover && isHovered;
  const cardDynamicStyle = {
    transform: [{ scale: showHover ? 1.02 : 1 }],
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease-out',
      ...(showHover ? cardStyles.hover : cardStyles.rest),
    }),
  };

  return (
    <Animated.View style={[Platform.OS !== 'web' && pressAnimatedStyle]}>
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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
          <View style={[styles.image, { backgroundColor: theme.colors.surfaceVariant }]} />
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.gradient}
        />
        
        {/* Level chip */}
        <View style={[styles.chip, { backgroundColor: theme.colors.primary }]}>
          <Text variant="label" style={{ color: '#FFF', fontSize: 11 }}>{level}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text variant="body" weight="semibold" numberOfLines={2} style={{ color: theme.colors.textPrimary }}>
          {item.title}
        </Text>
        
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
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
            style={{ backgroundColor: theme.colors.primary }}
          />
          <BookmarkButton
            isSaved={!!isSaved}
            isLoading={saving}
            onPress={handleBookmark}
            color={theme.colors.primary}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 120,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
