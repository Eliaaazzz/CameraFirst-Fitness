/**
 * PermissionRequestModal — Apple HIG–compliant pre-permission dialog.
 *
 * Shows a custom explanation BEFORE triggering the system permission dialog.
 * Apple recommends explaining WHY you need access so users can make an
 * informed decision. This modal appears for camera, photo library, and
 * notification permissions.
 *
 * Inspired by: Noom / MyFitnessPal pre-permission screens.
 */
import { Camera, ImageSquare, Bell } from 'phosphor-react-native';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

export type PermissionType = 'camera' | 'photoLibrary' | 'notifications';

interface Props {
  visible: boolean;
  permissionType: PermissionType;
  onAllow: () => void;
  onCancel: () => void;
}

const CONFIG: Record<PermissionType, {
  Icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  allowLabel: string;
}> = {
  camera: {
    Icon: Camera,
    iconColor: BRAND_COLORS.primary,
    iconBg: '#FFF1E7',
    title: 'Allow camera access',
    description:
      'We use your camera to scan meals and instantly estimate calories and macros using AI. No photos are stored without your permission.',
    allowLabel: 'Continue',
  },
  photoLibrary: {
    Icon: ImageSquare,
    iconColor: '#3B82F6',
    iconBg: '#E9F4FF',
    title: 'Allow photo access',
    description:
      'We need access to your photo library so you can select a meal photo for AI nutrition analysis. Your photos stay on your device.',
    allowLabel: 'Allow access',
  },
  notifications: {
    Icon: Bell,
    iconColor: '#8B5CF6',
    iconBg: '#F3E8FF',
    title: 'Stay on track',
    description:
      'Enable notifications to receive meal reminders, streak alerts, and daily goal updates. You can turn them off anytime in Settings.',
    allowLabel: 'Enable notifications',
  },
};

export function PermissionRequestModal({ visible, permissionType, onAllow, onCancel }: Props) {
  const config = CONFIG[permissionType];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <config.Icon size={32} weight="bold" color={config.iconColor} />
          </View>

          <Text variant="heading3" weight="bold" style={styles.title}>
            {config.title}
          </Text>

          <Text variant="body" style={styles.description}>
            {config.description}
          </Text>

          <Pressable
            onPress={onAllow}
            style={({ pressed }) => [styles.allowBtn, pressed && styles.allowBtnPressed]}
          >
            <Text variant="body" weight="bold" style={styles.allowBtnText}>
              {config.allowLabel}
            </Text>
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text variant="body" weight="medium" style={styles.cancelBtnText}>
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 28,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 24px 48px rgba(0,0,0,0.18)' } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 12,
        }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#111111',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  allowBtn: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  allowBtnPressed: {
    opacity: 0.88,
  },
  allowBtnText: {
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#888888',
  },
});
