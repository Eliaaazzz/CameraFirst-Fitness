import { Text } from '@/components';
import { useSocialStore, type ActivityFeedItem } from '@/stores';
import { colors, radii, spacing } from '@/utils';
import * as Haptics from 'expo-haptics';
import { Heart, UserPlus, Users } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface FriendsFeedCardProps {
  /** Max items to show. Default 4 (3 on small phones is fine too). */
  limit?: number;
  onSeeAll?: () => void;
  onAddFriend?: () => void;
}

const relative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const iconForKind = (kind: ActivityFeedItem['kind']): string => {
  switch (kind) {
    case 'workout_done': return '🏃';
    case 'meal_logged': return '🍽️';
    case 'badge_earned': return '🏅';
    case 'streak_milestone': return '🔥';
    case 'goal_hit': return '🎯';
    default: return '✨';
  }
};

/**
 * FriendsFeedCard — Strava-style activity feed with kudos.
 * Pattern source: Strava Home activity feed.
 */
export const FriendsFeedCard: React.FC<FriendsFeedCardProps> = ({
  limit = 4,
  onSeeAll,
  onAddFriend,
}) => {
  const feed = useSocialStore((s) => s.feed);
  const toggleKudos = useSocialStore((s) => s.toggleKudos);
  const seedMockFeed = useSocialStore((s) => s.seedMockFeed);

  useEffect(() => {
    seedMockFeed();
  }, [seedMockFeed]);

  const items = feed.slice(0, limit);
  const isEmpty = items.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBubble}>
            <Users size={16} color="#10B981" weight="fill" />
          </View>
          <View>
            <Text variant="body" weight="bold" style={styles.title}>Friends feed</Text>
            <Text variant="caption" style={styles.subtitle}>
              What your circle is logging today
            </Text>
          </View>
        </View>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={6}>
            <Text variant="caption" weight="semibold" style={styles.seeAllText}>See all</Text>
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <Pressable onPress={onAddFriend} style={styles.emptyCard}>
          <UserPlus size={20} color={colors.light.primary} weight="bold" />
          <Text variant="caption" weight="semibold" style={styles.emptyText}>
            Add a friend to start the feed
          </Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.avatarBubble}>
                <Text style={{ fontSize: 16 }}>{iconForKind(item.kind)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.activityTitle}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text variant="caption" style={styles.activityMeta} numberOfLines={1}>
                    {item.subtitle} · {relative(item.createdAt)}
                  </Text>
                ) : (
                  <Text variant="caption" style={styles.activityMeta} numberOfLines={1}>
                    {relative(item.createdAt)}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  toggleKudos(item.id);
                }}
                hitSlop={6}
                style={[styles.kudosBtn, item.userHasKudosed && styles.kudosBtnActive]}
              >
                <Heart
                  size={14}
                  color={item.userHasKudosed ? '#FFFFFF' : colors.light.textPrimary}
                  weight={item.userHasKudosed ? 'fill' : 'bold'}
                />
                <Text
                  variant="caption"
                  weight="bold"
                  style={item.userHasKudosed ? styles.kudosTextActive : styles.kudosText}
                >
                  {item.kudosCount}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.light.textPrimary },
  subtitle: { color: colors.light.textSecondary, opacity: 0.8 },
  seeAllText: { color: colors.light.primary },
  emptyCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { color: colors.light.textPrimary },
  list: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17,17,17,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { color: colors.light.textPrimary },
  activityMeta: { color: colors.light.textSecondary, opacity: 0.85 },
  kudosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  kudosBtnActive: {
    backgroundColor: '#EF4444',
  },
  kudosText: { color: colors.light.textPrimary },
  kudosTextActive: { color: '#FFFFFF' },
});

export default FriendsFeedCard;
