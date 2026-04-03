/**
 * VisionCameraView - Advanced Camera with LiDAR/ToF Depth Sensing
 *
 * Uses react-native-vision-camera for real-time depth measurement.
 * Provides progressive enhancement based on device capabilities:
 *
 * - Tier 1 (LiDAR/ToF): Real-time depth at 30fps, instant lock
 * - Tier 2 (Standard): Falls back to SmartCameraView behavior
 *
 * NOTE: VisionCamera only works on native (iOS/Android).
 * On web, this component falls back to SmartCameraView.
 *
 * The captured photo includes accurate distance metadata for
 * precise food portion estimation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { IconButton } from 'react-native-paper';

import { Button, LoadingSpinner, Text } from '@/components';
import { MagicReticle, ReticleState } from '@/components/MagicReticle';
import { getTierDescription, DeviceTier } from '@/hooks/useDeviceCapabilities';
import { DepthResult } from '@/hooks/useDepthCamera';
import { spacing } from '@/utils';

// Conditionally import VisionCamera (only on native)
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraFormat: any = null;
let useCameraPermission: any = null;
let useDepthCamera: any = null;
let formatDistance: ((depth: DepthResult | null) => string) | null = null;
let isOptimalDistance: ((depth: DepthResult | null, minCm?: number, maxCm?: number) => boolean) | null = null;

if (Platform.OS !== 'web') {
  // Dynamic require for native platforms
  const VisionCamera = require('react-native-vision-camera');
  Camera = VisionCamera.Camera;
  useCameraDevice = VisionCamera.useCameraDevice;
  useCameraFormat = VisionCamera.useCameraFormat;
  useCameraPermission = VisionCamera.useCameraPermission;

  const DepthCamera = require('@/hooks/useDepthCamera');
  useDepthCamera = DepthCamera.useDepthCamera;
  formatDistance = DepthCamera.formatDistance;
  isOptimalDistance = DepthCamera.isOptimalDistance;
}

export interface CaptureMetadata {
  distanceCm: number | null;
  confidence: number;
  accuracy: string;
  deviceTier: DeviceTier;
}

export interface VisionCameraViewProps {
  onCapture: (uri: string, metadata: CaptureMetadata) => void;
  onCancel?: () => void;
  onGalleryPress?: () => void;
  guideText?: string;
  processing?: boolean;
  autoUsePhoto?: boolean;
  /** Enable depth sensing (default: true for supported devices) */
  enableDepth?: boolean;
  /** Minimum acceptable distance in cm (default: 20) */
  minDistance?: number;
  /** Maximum acceptable distance in cm (default: 60) */
  maxDistance?: number;
}

type FlashState = 'auto' | 'on' | 'off';

export const VisionCameraView: React.FC<VisionCameraViewProps> = ({
  onCapture,
  onCancel,
  onGalleryPress,
  guideText,
  processing = false,
  autoUsePhoto = false,
  enableDepth = true,
  minDistance = 20,
  maxDistance = 60,
}) => {
  // On web, fall back to SmartCameraView
  if (Platform.OS === 'web') {
    // Import SmartCameraView dynamically to avoid circular deps
    const { SmartCameraView } = require('./SmartCameraView');
    return (
      <SmartCameraView
        onCapture={onCapture}
        onCancel={onCancel}
        onGalleryPress={onGalleryPress}
        guideText={guideText}
        processing={processing}
        autoUsePhoto={autoUsePhoto}
        enableDepth={enableDepth}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />
    );
  }

  const { width: windowWidth } = useWindowDimensions();
  const cameraRef = useRef<any>(null);
  const [flashMode, setFlashMode] = useState<FlashState>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedMetadata, setCapturedMetadata] = useState<CaptureMetadata | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);

  // VisionCamera permission (only on native)
  const { hasPermission, requestPermission } = useCameraPermission();

  // Get camera device (prefer back camera with depth support)
  const device = useCameraDevice('back', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera'],
  });

  // Get optimal format
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1440 } }, // 4:3 aspect ratio
    { photoResolution: { width: 3840, height: 2880 } },
    { fps: 30 },
  ]);

  // Depth camera hook
  const depthCamera = useDepthCamera({
    enableDepth: enableDepth && !!device,
    minConfidence: 0.5,
    targetFps: 30,
    onDepthChange: (depth: DepthResult) => {
      // Haptic feedback when locked to optimal range
      if (depth.distanceCm && isOptimalDistance && isOptimalDistance(depth, minDistance, maxDistance)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
  });

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Start depth camera when mounted and ready
  useEffect(() => {
    if (hasPermission && device && enableDepth) {
      depthCamera.start();
    }
    return () => {
      depthCamera.stop();
    };
  }, [hasPermission, device, enableDepth]);

  // Determine reticle state based on depth
  const reticleState: ReticleState = useMemo(() => {
    const depth = depthCamera.currentDepth;

    if (!depthCamera.supportsDepth) {
      // No depth sensor - show ready immediately
      return 'ready';
    }

    if (!depth || !depth.hasDepth) {
      return 'searching';
    }

    if (depth.distanceCm === null) {
      return 'searching';
    }

    if (depth.distanceCm < minDistance) {
      return 'too_close';
    }

    if (depth.distanceCm > maxDistance) {
      return 'too_far';
    }

    return 'ready';
  }, [depthCamera.currentDepth, depthCamera.supportsDepth, minDistance, maxDistance]);

  const isReady = reticleState === 'ready';

  // Flash cycling
  const cycleFlash = useCallback(() => {
    setFlashMode((prev) => {
      const sequence: FlashState[] = ['auto', 'on', 'off'];
      const index = sequence.indexOf(prev);
      return sequence[(index + 1) % sequence.length];
    });
  }, []);

  const flashIcon = useMemo(() => {
    switch (flashMode) {
      case 'on':
        return 'flash';
      case 'off':
        return 'flash-off';
      default:
        return 'flash-auto';
    }
  }, [flashMode]);

  // Take photo
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      setShowFlashOverlay(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const photo = await cameraRef.current.takePhoto({
        flash: flashMode,
        enableShutterSound: true,
      });

      const photoUri = Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;

      // Build metadata
      const depth = depthCamera.currentDepth;
      const metadata: CaptureMetadata = {
        distanceCm: depth?.distanceCm ?? null,
        confidence: depth?.confidence ?? 0,
        accuracy: depthCamera.supportsDepth
          ? (depthCamera.deviceTier === 'lidar' ? '±1cm' : '±3cm')
          : '±5cm (estimated)',
        deviceTier: depthCamera.deviceTier,
      };

      if (autoUsePhoto) {
        onCapture(photoUri, metadata);
      } else {
        setCapturedPhoto(photoUri);
        setCapturedMetadata(metadata);
      }

      setTimeout(() => setShowFlashOverlay(false), 130);
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, flashMode, depthCamera, autoUsePhoto, onCapture]);

  // Use captured photo
  const handleUsePhoto = useCallback(() => {
    if (!capturedPhoto || !capturedMetadata) return;
    onCapture(capturedPhoto, capturedMetadata);
  }, [capturedPhoto, capturedMetadata, onCapture]);

  // Retake photo
  const handleRetake = useCallback(async () => {
    if (capturedPhoto) {
      try {
        await FileSystem.deleteAsync(capturedPhoto, { idempotent: true });
      } catch (e) {
        // Ignore deletion errors
      }
    }
    setCapturedPhoto(null);
    setCapturedMetadata(null);
  }, [capturedPhoto]);

  // Tier badge
  const tierLabel = getTierDescription(depthCamera.deviceTier);
  const distanceDisplay = depthCamera.currentDepth && formatDistance
    ? formatDistance(depthCamera.currentDepth)
    : '--';

  // Permission not granted
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text variant="heading3" weight="bold" style={styles.permissionTitle}>
            Camera Permission Required
          </Text>
          <Text variant="body" style={styles.permissionText}>
            We need camera access to scan your meals and estimate portions accurately.
          </Text>
          <Button title="Continue" variant="primary" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  // No camera device
  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text variant="body" style={styles.permissionText}>
            No camera device found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* VisionCamera */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={!capturedPhoto}
        photo={true}
        frameProcessor={depthCamera.frameProcessor}
        enableZoomGesture={true}
      />

      {/* Flash overlay */}
      {showFlashOverlay && <View style={styles.flashOverlay} />}

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        locations={[0, 0.4]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
      />

      {/* Top controls */}
      <View style={styles.topControls}>
        {onCancel ? (
          <IconButton
            icon="close"
            iconColor="#FFFFFF"
            size={24}
            onPress={onCancel}
            style={styles.iconBtn}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* Tier & Distance badge */}
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>
            {tierLabel} • {distanceDisplay}
          </Text>
        </View>

        <IconButton
          icon={flashIcon}
          iconColor={flashMode === 'off' ? 'rgba(255,255,255,0.6)' : '#FFFFFF'}
          size={24}
          onPress={cycleFlash}
          style={styles.iconBtn}
        />
      </View>

      {/* Magic Reticle */}
      {enableDepth && (
        <View style={styles.reticleContainer}>
          <MagicReticle
            state={reticleState}
            distance={depthCamera.currentDepth?.distanceCm ?? undefined}
            deviceTier={depthCamera.deviceTier}
            accuracy={depthCamera.supportsDepth ? '±1cm' : undefined}
          />
        </View>
      )}

      {/* Guide text (when no reticle) */}
      {!enableDepth && guideText && (
        <View style={[styles.guideContainer, { top: windowWidth * 0.65 }]}>
          <Text variant="body" weight="medium" color="#FFFFFF">
            {guideText}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <IconButton
          icon="image"
          iconColor="#FFFFFF"
          size={24}
          onPress={onGalleryPress}
          style={styles.iconBtnSquare}
        />

        <Pressable
          onPress={takePhoto}
          disabled={isCapturing || processing}
          style={({ pressed }) => [
            styles.shutterOuter,
            (isCapturing || processing) && styles.shutterDisabled,
            pressed && styles.shutterPressed,
          ]}
        >
          <BlurView intensity={28} tint="light" style={styles.shutter}>
            <View
              style={[
                styles.shutterInner,
                isReady && styles.shutterReady,
              ]}
            />
          </BlurView>
        </Pressable>

        <View style={styles.placeholder} />
      </View>

      {/* Photo preview */}
      {capturedPhoto && !autoUsePhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="cover" />

          {/* Distance badge */}
          {capturedMetadata && capturedMetadata.distanceCm && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>
                📏 {Math.round(capturedMetadata.distanceCm)}cm ({capturedMetadata.accuracy})
              </Text>
            </View>
          )}

          <View style={styles.previewActions}>
            <Button title="Retake" variant="ghost" onPress={handleRetake} />
            <Button title="Use Photo" variant="primary" onPress={handleUsePhoto} loading={processing} />
          </View>
        </View>
      )}

      {/* Processing overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <LoadingSpinner size="large" />
          <Text variant="caption" color="#FFFFFF">
            Processing…
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  permissionTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    opacity: 0.85,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  topControls: {
    position: 'absolute',
    top: spacing['2xl'],
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
  },
  iconBtnSquare: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  placeholder: {
    width: 48,
    height: 48,
  },
  infoBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  guideContainer: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 999,
  },
  bottomControls: {
    position: 'absolute',
    bottom: spacing['3xl'],
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shutterOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  shutterReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22C55E',
  },
  shutterPressed: {
    transform: [{ scale: 0.97 }],
  },
  shutterDisabled: {
    opacity: 0.55,
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
  distanceBadge: {
    position: 'absolute',
    top: spacing.lg + 12,
    right: spacing.lg + 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default VisionCameraView;
