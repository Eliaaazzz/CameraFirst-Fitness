import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button, Container, SafeAreaWrapper, Text } from '@/components';
import { spacing } from '@/utils';

interface PermissionExplanationScreenProps {
  description?: string;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  onChooseGallery: () => void;
  permissionDenied?: boolean;
}

export const PermissionExplanationScreen = ({
  description = 'We need camera access to help you discover workouts and recipes based on your equipment and ingredients.',
  onRequestPermission,
  onOpenSettings,
  onChooseGallery,
  permissionDenied = false,
}: PermissionExplanationScreenProps) => (
  <SafeAreaWrapper>
    <Container style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name="camera-off" size={48} color="#FF6B6B" />
      </View>
      <Text variant="heading1" weight="bold" style={styles.heading}>
        Camera Access Needed
      </Text>
      <Text variant="body" style={styles.body}>
        {description}
      </Text>
      <View style={styles.bullets}>
        <View style={styles.bulletRow}>
          <Text variant="body" weight="bold">
            📸
          </Text>
          <Text variant="body">Take photos of your equipment</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text variant="body" weight="bold">
            🍽️
          </Text>
          <Text variant="body">Snap pictures of ingredients</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text variant="body" weight="bold">
            🔒
          </Text>
          <Text variant="body">Photos are never stored without your permission</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title={permissionDenied ? 'Open Settings' : 'Allow Camera Access'}
          onPress={permissionDenied ? onOpenSettings : onRequestPermission}
        />
        <Button title="Choose from Gallery Instead" variant="ghost" onPress={onChooseGallery} />
      </View>
    </Container>
  </SafeAreaWrapper>
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
  },
  heading: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
  },
  bullets: {
    gap: spacing.sm,
    width: '100%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
