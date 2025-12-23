import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, spacing } from '@/utils';

interface YouTubePlayerModalProps {
  visible: boolean;
  youtubeId: string;
  title?: string;
  onClose: () => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  visible,
  youtubeId,
  title,
  onClose,
}) => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;

  // For shorts, use vertical aspect ratio; for regular videos use 16:9
  const isShort = true; // All our videos are shorts
  const videoWidth = isLandscape ? Math.min(height * 0.9, 400) : width * 0.95;
  const videoHeight = isShort
    ? Math.min(videoWidth * 1.77, height * 0.75) // 9:16 ratio for shorts
    : videoWidth * 0.5625; // 16:9 ratio

  // YouTube embed URL - use shorts player for better experience
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1`;

  const renderWebView = () => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          src={embedUrl}
          width={videoWidth}
          height={videoHeight}
          style={{ border: 'none', borderRadius: 16 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <WebView
        source={{ uri: embedUrl }}
        style={{ width: videoWidth, height: videoHeight, borderRadius: 16, overflow: 'hidden' }}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loadingContainer, { width: videoWidth, height: videoHeight }]}>
            <ActivityIndicator size="large" color={colors.dark.primary} />
          </View>
        )}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.title}>
              {title || 'Workout Video'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </Pressable>
          </View>

          {/* Video Player */}
          <View style={styles.playerContainer}>
            {renderWebView()}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: '95%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dark.surfaceVariant,
  },
  title: {
    flex: 1,
    color: colors.dark.textPrimary,
    marginRight: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
