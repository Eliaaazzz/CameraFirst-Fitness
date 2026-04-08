import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraSlash } from 'phosphor-react-native';

import { Button, Container, SafeAreaWrapper, Text } from '@/components';
import { spacing } from '@/utils';

interface PermissionExplanationScreenProps {
  description?: string;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  permissionDenied?: boolean;
}

export const PermissionExplanationScreen = ({
  description = 'Use the system permission prompt to continue with camera features.',
  onRequestPermission: _onRequestPermission,
  onOpenSettings,
  permissionDenied = false,
}: PermissionExplanationScreenProps) => (
  <SafeAreaWrapper>
    <Container style={styles.container}>
      <View style={styles.iconContainer}>
        <CameraSlash size={48} color="#FF6B6B" />
      </View>
      <Text variant="heading1" weight="bold" style={styles.heading}>
        {permissionDenied ? 'Camera Access Is Off' : 'Waiting for System Permission'}
      </Text>
      <Text variant="body" style={styles.body}>
        {description}
      </Text>
      {permissionDenied && (
        <View style={styles.actions}>
          <Button title="Open Settings" onPress={onOpenSettings} />
        </View>
      )}
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
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
