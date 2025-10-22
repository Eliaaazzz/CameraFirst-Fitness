import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaWrapper, Container, Card, Text, Button } from '@/components';
import { spacing } from '@/utils';

const DUMMY = Array.from({ length: 6 }).map((_, i) => ({
  id: `w_${i}`,
  title: `Quick Full Body ${i + 1}`,
  channel: 'FitnessBlender',
  durationMinutes: 5 + i,
  level: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
  thumb: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  equipment: i % 2 === 0 ? ['bodyweight'] : ['dumbbells'],
}));

export const ResultsScreen = () => {
  const items = useMemo(() => DUMMY, []);

  return (
    <SafeAreaWrapper>
      <Container>
        <View style={styles.header}>
          <Image source={{ uri: DUMMY[0].thumb }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text variant="heading2" weight="bold">We found {items.length} workouts for you!</Text>
            <Text variant="caption" style={{ opacity: 0.8 }}>Based on your equipment and preferences</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {items.map((it) => (
            <Card key={it.id} style={styles.card}>
              <Image source={{ uri: it.thumb }} style={styles.cardImage} />
              <Text variant="body" weight="bold">{it.title}</Text>
              <Text variant="caption" style={{ opacity: 0.8 }}>{it.channel}</Text>
              <Text variant="caption">{it.durationMinutes} min • {it.level}</Text>
              <Button title="▶ Watch Video" />
            </Card>
          ))}
        </View>

        <View style={styles.footer}>
          <Text variant="caption" style={{ opacity: 0.8 }}>Not what you're looking for?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Try Again" variant="outline" />
            <Button title="Browse All" />
          </View>
        </View>
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '48%',
    gap: spacing.sm,
  },
  cardImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
});

