import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { Button, Card, Container, SafeAreaWrapper, Text } from '@/components';
import { spacing } from '@/utils';
import { useSavedRecipes } from '@/services';

type TabParamList = {
  Capture: undefined;
  Workouts: undefined;
  Recipes: undefined;
  DesignSystem?: undefined;
};

export const RecipesScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const saved = useSavedRecipes();

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <Text variant="heading1" weight="bold">
          Saved Recipes
        </Text>
        {saved.isLoading && (
          <Card>
            <Text variant="body">Loading your saved recipes…</Text>
          </Card>
        )}
        {!saved.isLoading && saved.data && saved.data.length > 0 ? (
          saved.data.map((recipe) => (
            <Card key={recipe.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="heading2" weight="bold">
                  {recipe.title}
                </Text>
                <Feather name="coffee" size={24} color="#FF6B6B" />
              </View>
              <Text variant="caption">Time: {recipe.timeMinutes} min</Text>
              <Text variant="caption">Difficulty: {recipe.difficulty}</Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <View style={styles.iconWrapper}>
              <Feather name="coffee" size={48} color="#FF6B6B" />
            </View>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
              Your saved recipes will appear here
            </Text>
            <Text variant="body" style={styles.emptyBody}>
              Snap photos of your ingredients to discover healthy recipes you can make right now.
            </Text>
            <Button title="Capture Ingredients" variant="secondary" onPress={() => navigation.navigate('Capture')} />
          </Card>
        )}
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
  },
});
