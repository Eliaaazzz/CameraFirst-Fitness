import { Text } from '@/components';
import { BRAND_COLORS, colors, radii, spacing } from '@/utils';
import { CaretRight, Coffee, MoonStars, SunDim, Sun } from 'phosphor-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type DaySlot = 'morning' | 'afternoon' | 'evening' | 'night';

interface AdaptiveHomeHeroProps {
  /** User's first name for personalization */
  userName?: string;
  /** Today's calories consumed so far */
  caloriesConsumed?: number;
  /** Today's calorie target */
  caloriesTarget?: number;
  /** Today's protein consumed so far (g) */
  proteinConsumed?: number;
  /** Today's protein target (g) */
  proteinTarget?: number;
  /** Today's composite score 0-100, when available */
  dailyScore?: number;
  /** Number of meals logged today */
  mealsLoggedToday?: number;
  /** Primary CTA tap handler (snap meal, view recap, etc) */
  onPrimaryAction?: () => void;
  /** Secondary CTA tap handler (browse recipes, view targets) */
  onSecondaryAction?: () => void;
}

const getSlot = (date = new Date()): DaySlot => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'afternoon';
  if (h >= 16 && h < 21) return 'evening';
  return 'night';
};

interface SlotContent {
  greeting: string;
  emoji: string;
  headline: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
  icon: React.ReactNode;
  bgGradient: [string, string];
}

/**
 * AdaptiveHomeHero — single hero card that morphs by time of day.
 * Pattern source: Apple Health's adaptive summaries + Spotify's daily Mix energy varying by time.
 */
export const AdaptiveHomeHero: React.FC<AdaptiveHomeHeroProps> = ({
  userName,
  caloriesConsumed,
  caloriesTarget,
  proteinConsumed,
  proteinTarget,
  dailyScore,
  mealsLoggedToday = 0,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  const slot = useMemo(() => getSlot(), []);
  const nameBit = userName ? `, ${userName}` : '';

  const remainingCals = useMemo(() => {
    if (!caloriesTarget) return null;
    return Math.max(0, caloriesTarget - (caloriesConsumed ?? 0));
  }, [caloriesTarget, caloriesConsumed]);

  const remainingProtein = useMemo(() => {
    if (!proteinTarget) return null;
    return Math.max(0, proteinTarget - (proteinConsumed ?? 0));
  }, [proteinTarget, proteinConsumed]);

  const content: SlotContent = useMemo(() => {
    switch (slot) {
      case 'morning':
        return {
          greeting: `Good morning${nameBit}`,
          emoji: '🌅',
          headline:
            mealsLoggedToday > 0
              ? 'Strong start.'
              : 'Plan breakfast first.',
          body:
            mealsLoggedToday > 0
              ? `${mealsLoggedToday} ${mealsLoggedToday === 1 ? 'meal' : 'meals'} logged. Stay ahead of your day.`
              : 'Snap or pick a high-protein breakfast to win the morning.',
          primaryLabel: mealsLoggedToday > 0 ? 'Log a meal' : 'Snap breakfast',
          secondaryLabel: 'Browse recipes',
          icon: <Coffee size={22} color="#FFFFFF" weight="fill" />,
          bgGradient: ['#FF9A56', '#FFB97A'],
        };
      case 'afternoon':
        return {
          greeting: `Good afternoon${nameBit}`,
          emoji: '☀️',
          headline:
            remainingCals !== null
              ? `${remainingCals} kcal to go`
              : 'Keep momentum.',
          body:
            remainingProtein !== null && remainingProtein > 0
              ? `${remainingProtein}g of protein left today. A snack now keeps the macros honest.`
              : 'Stay on plan with a balanced lunch or smart snack.',
          primaryLabel: 'Log a meal',
          secondaryLabel: 'Suggest a snack',
          icon: <Sun size={22} color="#FFFFFF" weight="fill" />,
          bgGradient: ['#F97316', '#FB923C'],
        };
      case 'evening':
        return {
          greeting: `Good evening${nameBit}`,
          emoji: '🌆',
          headline:
            dailyScore !== undefined
              ? `Today’s score: ${Math.round(dailyScore)}`
              : 'Close the loop on today.',
          body:
            remainingCals !== null
              ? `${remainingCals} kcal budget left. Plan a balanced dinner to finish strong.`
              : 'Log dinner to wrap up today’s plan.',
          primaryLabel: 'Log dinner',
          secondaryLabel: 'See recap',
          icon: <SunDim size={22} color="#FFFFFF" weight="fill" />,
          bgGradient: ['#E11D48', '#F97316'],
        };
      case 'night':
      default:
        return {
          greeting: `Good night${nameBit}`,
          emoji: '🌙',
          headline:
            dailyScore !== undefined
              ? `Today landed at ${Math.round(dailyScore)}/100`
              : 'Reviewing today.',
          body:
            mealsLoggedToday > 0
              ? `${mealsLoggedToday} ${mealsLoggedToday === 1 ? 'meal' : 'meals'} logged. Lock in the streak — tomorrow starts fresh.`
              : 'Quick recap and you’re done. Sleep well.',
          primaryLabel: 'View daily recap',
          secondaryLabel: 'Tomorrow’s plan',
          icon: <MoonStars size={22} color="#FFFFFF" weight="fill" />,
          bgGradient: ['#312E81', '#6D28D9'],
        };
    }
  }, [slot, nameBit, mealsLoggedToday, remainingCals, remainingProtein, dailyScore]);

  return (
    <View style={[styles.container, { backgroundColor: content.bgGradient[0] }]}>
      {/* Decorative second band for gradient feel without LinearGradient dependency */}
      <View
        pointerEvents="none"
        style={[styles.band, { backgroundColor: content.bgGradient[1] }]}
      />

      <View style={styles.row}>
        <View style={styles.iconBubble}>{content.icon}</View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" weight="semibold" style={styles.greeting}>
            {content.emoji}  {content.greeting}
          </Text>
          <Text variant="heading3" weight="bold" style={styles.headline} numberOfLines={2}>
            {content.headline}
          </Text>
          <Text variant="body" style={styles.body} numberOfLines={2}>
            {content.body}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onPrimaryAction}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        >
          <Text variant="body" weight="bold" style={styles.primaryBtnText}>
            {content.primaryLabel}
          </Text>
          <CaretRight size={14} color={colors.light.textPrimary} weight="bold" />
        </Pressable>
        {content.secondaryLabel && (
          <Pressable
            onPress={onSecondaryAction}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text variant="caption" weight="semibold" style={styles.secondaryBtnText}>
              {content.secondaryLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl ?? 24,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  band: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -80,
    right: -60,
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 2,
  },
  headline: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  body: {
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryBtnText: { color: colors.light.textPrimary },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  secondaryBtnText: { color: '#FFFFFF' },
});

export default AdaptiveHomeHero;
