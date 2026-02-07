import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import { CameraView as ExpoCameraView } from 'expo-camera';
import type { CameraCapturedPicture } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { FAB, IconButton } from 'react-native-paper';

import { Button, LoadingSpinner, Text } from '@/components';
import { spacing } from '@/utils';

const { width } = Dimensions.get('window');
const CAPTURE_BUTTON_SIZE = 84;

export interface CameraViewProps {
  onCapture: (uri: string) => void;
  onCancel?: () => void;
  onGalleryPress?: () => void;
  guideText?: string;
  processing?: boolean;
  showReticle?: boolean;
  captureButtonVariant?: 'fab' | 'glass';
  autoUsePhoto?: boolean;
}

type FlashState = 'auto' | 'on' | 'off';

type CameraPosition = 'back' | 'front';

const flashSequence: FlashState[] = ['auto', 'on', 'off'];

// Material components used for buttons/FAB – no custom press animations needed now.

type CameraViewHandle = InstanceType<typeof ExpoCameraView>;

export const CameraView = ({
  onCapture,
  onCancel,
  onGalleryPress,
  guideText,
  processing = false,
  showReticle = false,
  captureButtonVariant = 'fab',
  autoUsePhoto = false,
}: CameraViewProps) => {
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const [cameraType, setCameraType] = useState<CameraPosition>('back');
  const [flashMode, setFlashMode] = useState<FlashState>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);
  const reticleAnim = useRef(new Animated.Value(0)).current;

  // Using FAB for capture – Material handles visual states

  useEffect(() => {
    if (!showReticle) {
      reticleAnim.stopAnimation();
      reticleAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(reticleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(reticleAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [reticleAnim, showReticle]);

  const toggleCamera = () => {
    setCameraType((prev: CameraPosition) => (prev === 'back' ? 'front' : 'back'));
  };

  const cycleFlash = () => {
    setFlashMode((prev: FlashState) => {
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

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      setShowFlashOverlay(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (photo?.uri) {
        if (autoUsePhoto) {
          onCapture(photo.uri);
        } else {
          setCapturedPhoto(photo.uri);
        }
      }
      setTimeout(() => setShowFlashOverlay(false), 130);
    } catch (error) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('Failed to capture photo', error);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto) {
      return;
    }

    onCapture(capturedPhoto);
  };

  const handleRetake = async () => {
    if (capturedPhoto) {
      try {
        await FileSystem.deleteAsync(capturedPhoto, { idempotent: true });
      } catch (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('Failed to delete captured photo', error);
        }
      }
    }
    setCapturedPhoto(null);
  };

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={(ref: CameraViewHandle | null) => {
          cameraRef.current = ref;
        }}
        style={StyleSheet.absoluteFill}
        facing={cameraType}
        flash={flashMode}
        ratio="4:3"
        autofocus="on"
      />

      {showFlashOverlay && <View style={styles.flashOverlay} />}

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", 'transparent']}
        locations={[0, 0.4]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
      />

      <View style={styles.topControls}>
        {onCancel ? (
          <IconButton icon="close" iconColor="#FFFFFF" size={24} onPress={onCancel} style={styles.iconBtn} />
        ) : (
          <View style={styles.circleButtonPlaceholder} />
        )}

        {captureButtonVariant === 'glass' ? (
          <View style={styles.circleButtonPlaceholder} />
        ) : (
          <>
            <View>
              <IconButton icon={flashIcon as any} iconColor={flashColor} size={24} onPress={cycleFlash} style={styles.iconBtn} />
              <Text variant="caption" style={styles.flashLabel} color="#FFFFFF">
                {flashMode.toUpperCase()}
              </Text>
            </View>

            <IconButton icon="camera-switch" iconColor="#FFFFFF" size={24} onPress={toggleCamera} style={styles.iconBtn} />
          </>
        )}
      </View>

      {showReticle ? (
        <View style={styles.reticleWrap}>
          <Animated.View
            style={[
              styles.reticleGlow,
              {
                opacity: reticleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] }),
                transform: [{ scale: reticleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
              },
            ]}
          >
            <BlurView intensity={22} tint="light" style={styles.reticleRing} />
          </Animated.View>

          {guideText ? (
            <View style={styles.reticleLabel}>
              <Text variant="caption" weight="medium" color="#FFFFFF" style={styles.reticleText}>
                {guideText}
              </Text>
            </View>
          ) : null}
        </View>
      ) : guideText ? (
        <View style={styles.guideContainer}>
          <Text variant="body" weight="medium" color="#FFFFFF" style={styles.guideText}>
            {guideText}
          </Text>
        </View>
      ) : null}

      <View style={styles.bottomControls}>
        <IconButton icon="image" iconColor="#FFFFFF" size={24} onPress={onGalleryPress} style={styles.iconBtnSquare} />

        {captureButtonVariant === 'glass' ? (
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
              <View style={styles.glassShutterInner} />
            </BlurView>
          </Pressable>
        ) : (
          <FAB
            icon="camera"
            onPress={takePhoto}
            disabled={isCapturing || processing}
            style={styles.captureFab}
            size="large"
          />
        )}

        <View style={styles.circleButtonPlaceholder} />
      </View>

      {capturedPhoto && !autoUsePhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="cover" />
          <View style={styles.previewActions}>
            <Button title="Retake" variant="ghost" onPress={handleRetake} />
            <Button title="Use Photo" variant="primary" onPress={handleUsePhoto} loading={processing} />
          </View>
        </View>
      )}

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
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 24 },
  circleButtonPlaceholder: {
    width: 48,
    height: 48,
  },
  flashLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 12,
  },
  guideContainer: {
    position: 'absolute',
    top: width * 0.65,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 999,
  },
  guideText: {
    letterSpacing: 0.2,
  },
  reticleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  reticleGlow: {
    width: 288,
    height: 288,
    borderRadius: 144,
    overflow: 'hidden',
  },
  reticleRing: {
    flex: 1,
    borderRadius: 144,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  reticleLabel: {
    position: 'absolute',
    bottom: -34,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  reticleText: {
    letterSpacing: 0.3,
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
  iconBtnSquare: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12 },
  captureFab: { width: CAPTURE_BUTTON_SIZE, height: CAPTURE_BUTTON_SIZE, borderRadius: CAPTURE_BUTTON_SIZE / 2 },
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
    gap: spacing.lg,
  },
  preview: {
    width: '100%',
    height: width * 0.75,
    borderRadius: 16,
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
