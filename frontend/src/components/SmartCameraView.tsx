/**
 * Smart Camera View with Adaptive Distance Estimation
 *
 * Progressive Enhancement:
 * - Tier 1 (LiDAR): Instant depth measurement, no user action needed
 * - Tier 2 (AR): Quick calibration with visual feedback
 * - Tier 3 (Basic): UI guide with manual reference
 *
 * The captured photo includes metadata about estimated distance
 * for more accurate food portion estimation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView as ExpoCameraView } from 'expo-camera';
import type { CameraCapturedPicture } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { FAB, IconButton } from 'react-native-paper';

import { Button, LoadingSpinner, Text } from '@/components';
import { MagicReticle } from '@/components/MagicReticle';
import { useDistanceEstimation, toReticleState } from '@/hooks/useDistanceEstimation';
import { getTierDescription } from '@/hooks/useDeviceCapabilities';
import { spacing } from '@/utils';

const CAPTURE_BUTTON_SIZE = 84;

export interface CaptureMetadata {
  distanceCm: number | null;
  confidence: number;
  accuracy: string;
  deviceTier: 'lidar' | 'standard_ar' | 'basic';
}

export interface SmartCameraViewProps {
  onCapture: (uri: string, metadata: CaptureMetadata) => void;
  onCancel?: () => void;
  onGalleryPress?: () => void;
  guideText?: string;
  processing?: boolean;
  autoUsePhoto?: boolean;
  /** Show the smart reticle with distance estimation (default: true) */
  enableDistanceEstimation?: boolean;
}

type FlashState = 'auto' | 'on' | 'off';
type CameraPosition = 'back' | 'front';

const flashSequence: FlashState[] = ['auto', 'on', 'off'];

type CameraViewHandle = InstanceType<typeof ExpoCameraView>;

export const SmartCameraView: React.FC<SmartCameraViewProps> = ({
  onCapture,
  onCancel,
  onGalleryPress,
  guideText,
  processing = false,
  autoUsePhoto = false,
  enableDistanceEstimation = true,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const [cameraType, setCameraType] = useState<CameraPosition>('back');
  const [flashMode, setFlashMode] = useState<FlashState>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedMetadata, setCapturedMetadata] = useState<CaptureMetadata | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);

  // Distance estimation hook
  const distanceEstimation = useDistanceEstimation({
    minDistance: 20,
    maxDistance: 60,
    idealDistance: 35,
    autoStart: enableDistanceEstimation,
    onReady: (distance) => {
      if (__DEV__) {
        console.log('[SmartCamera] Distance locked:', distance, 'cm');
      }
    },
  });

  const reticleState = toReticleState(distanceEstimation.status);

  const toggleCamera = () => {
    setCameraType((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const cycleFlash = () => {
    setFlashMode((prev) => {
      const index = flashSequence.indexOf(prev);
      return flashSequence[(index + 1) % flashSequence.length];
    });
  };

  const flashIcon = useMemo(() => {
    switch (flashMode) {
      case 'on':
        return 'flash';
      case 'off':
        return 'flash-off';
      case 'auto':
      default:
        return 'flash-auto';
    }
  }, [flashMode]);

  const flashColor = flashMode === 'off' ? 'rgba(255,255,255,0.8)' : '#FFFFFF';

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      setShowFlashOverlay(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo?.uri) {
        const metadata: CaptureMetadata = {
          distanceCm: distanceEstimation.distance,
          confidence: distanceEstimation.confidence,
          accuracy: distanceEstimation.accuracy,
          deviceTier: distanceEstimation.deviceTier,
        };

        if (autoUsePhoto) {
          onCapture(photo.uri, metadata);
        } else {
          setCapturedPhoto(photo.uri);
          setCapturedMetadata(metadata);
        }
      }

      setTimeout(() => setShowFlashOverlay(false), 130);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to capture photo', error);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [
    isCapturing,
    autoUsePhoto,
    distanceEstimation.distance,
    distanceEstimation.confidence,
    distanceEstimation.accuracy,
    distanceEstimation.deviceTier,
    onCapture,
  ]);

  const handleUsePhoto = useCallback(() => {
    if (!capturedPhoto || !capturedMetadata) {
      return;
    }
    onCapture(capturedPhoto, capturedMetadata);
  }, [capturedPhoto, capturedMetadata, onCapture]);

  const handleRetake = useCallback(async () => {
    if (capturedPhoto) {
      try {
        await FileSystem.deleteAsync(capturedPhoto, { idempotent: true });
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to delete captured photo', error);
        }
      }
    }
    setCapturedPhoto(null);
    setCapturedMetadata(null);

    // Restart distance estimation
    distanceEstimation.reset();
    setTimeout(() => distanceEstimation.start(), 300);
  }, [capturedPhoto, distanceEstimation]);

  // Tier badge text
  const tierBadge = getTierDescription(distanceEstimation.deviceTier);

  // Combine guide text with distance info
  const displayGuideText = guideText || (
    distanceEstimation.isReady
      ? 'Tap to capture'
      : distanceEstimation.deviceTier === 'lidar'
      ? 'Point at your food'
      : 'Hold steady to calibrate'
  );

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={(ref) => {
          cameraRef.current = ref;
        }}
        style={StyleSheet.absoluteFill}
        facing={cameraType}
        flash={flashMode}
        ratio="4:3"
        autofocus="on"
      />

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
          <View style={styles.circleButtonPlaceholder} />
        )}

        {/* Tier badge */}
        <View style={styles.tierBadgeContainer}>
          <Text style={styles.tierBadgeText}>{tierBadge}</Text>
        </View>

        <View style={styles.topRightControls}>
          <View>
            <IconButton
              icon={flashIcon as any}
              iconColor={flashColor}
              size={24}
              onPress={cycleFlash}
              style={styles.iconBtn}
            />
            <Text variant="caption" style={styles.flashLabel} color="#FFFFFF">
              {flashMode.toUpperCase()}
            </Text>
          </View>
          <IconButton
            icon="camera-switch"
            iconColor="#FFFFFF"
            size={24}
            onPress={toggleCamera}
            style={styles.iconBtn}
          />
        </View>
      </View>

      {/* Magic Reticle */}
      {enableDistanceEstimation && (
        <View style={styles.reticleContainer}>
          <MagicReticle
            state={reticleState}
            distance={distanceEstimation.distance ?? undefined}
            deviceTier={distanceEstimation.deviceTier}
            accuracy={distanceEstimation.accuracy}
          />
        </View>
      )}

      {/* Guide text (if no reticle) */}
      {!enableDistanceEstimation && displayGuideText && (
        <View style={[styles.guideContainer, { top: windowWidth * 0.65 }]}>
          <Text variant="body" weight="medium" color="#FFFFFF" style={styles.guideText}>
            {displayGuideText}
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
            styles.glassShutterOuter,
            (isCapturing || processing) && styles.glassShutterDisabled,
            pressed && styles.glassShutterPressed,
          ]}
        >
          <BlurView intensity={28} tint="light" style={styles.glassShutter}>
            <View
              style={[
                styles.glassShutterInner,
                distanceEstimation.isReady && styles.glassShutterReady,
              ]}
            />
          </BlurView>
        </Pressable>

        <View style={styles.circleButtonPlaceholder} />
      </View>

      {/* Photo preview */}
      {capturedPhoto && !autoUsePhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="cover" />

          {/* Distance info badge */}
          {capturedMetadata && capturedMetadata.distanceCm && (
            <View style={styles.distanceInfoBadge}>
              <Text style={styles.distanceInfoText}>
                📏 {capturedMetadata.distanceCm}cm ({capturedMetadata.accuracy})
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
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
  },
  circleButtonPlaceholder: {
    width: 48,
    height: 48,
  },
  flashLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 12,
    alignSelf: 'center',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Offset for bottom controls
  },
  guideContainer: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 999,
  },
  guideText: {
    letterSpacing: 0.2,
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
  iconBtnSquare: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  glassShutterOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassShutter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  glassShutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  glassShutterReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22C55E',
  },
  glassShutterPressed: {
    transform: [{ scale: 0.97 }],
  },
  glassShutterDisabled: {
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
  distanceInfoBadge: {
    position: 'absolute',
    top: spacing.lg + 12,
    right: spacing.lg + 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  distanceInfoText: {
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

export default SmartCameraView;
