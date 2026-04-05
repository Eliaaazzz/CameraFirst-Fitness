import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import {
  ForkKnife,
  Hamburger,
  IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { BRAND_COLORS } from '@/utils';

/** Map of MaterialCommunityIcons names to Phosphor components */
const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  'food': Hamburger,
  'silverware-fork-knife': ForkKnife,
  'food-fork-drink': ForkKnife,
};

interface MealImageProps {
  /** Public image URL (R2/CDN) */
  imageUrl: string | null | undefined;
  /** Size of the image (width & height) */
  size?: number;
  /** Border radius (default: 12) */
  borderRadius?: number;
  /** Container style override */
  style?: ViewStyle;
  /** Image style override */
  imageStyle?: ImageStyle;
  /** Fallback icon name */
  fallbackIcon?: string;
  /** Fallback icon size (default: size * 0.4) */
  fallbackIconSize?: number;
}

/**
 * MealImage - Image component for meal cards with caching.
 *
 * Features:
 * - Uses expo-image for automatic disk & memory caching
 * - Images load instantly after first fetch
 * - Cross-fade transition for smooth loading
 * - Falls back to placeholder icon when no image or on error
 */
export const MealImage: React.FC<MealImageProps> = ({
  imageUrl,
  size = 80,
  borderRadius = 12,
  style,
  imageStyle,
  fallbackIcon = 'food',
  fallbackIconSize,
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const iconSize = fallbackIconSize || size * 0.4;
  const showPlaceholder = !imageUrl || hasError;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius },
        style,
      ]}
    >
      {showPlaceholder ? (
        // Placeholder with icon
        <View style={[styles.placeholder, { borderRadius }]}>
          {(() => {
            const IconComponent = ICON_MAP[fallbackIcon] || Hamburger;
            return <IconComponent size={iconSize} color={BRAND_COLORS.primary} />;
          })()}
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { borderRadius }, imageStyle]}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          onError={handleError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default MealImage;
