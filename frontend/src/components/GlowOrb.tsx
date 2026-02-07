import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type GlowPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface GlowOrbProps {
  /** Size of the glow orb in pixels */
  size?: number;
  /** Primary color of the glow */
  color?: string;
  /** Position of the glow relative to container */
  position?: GlowPosition;
  /** Opacity of the glow (0-1) */
  opacity?: number;
  /** Custom style overrides */
  style?: ViewStyle;
}

const getPositionStyle = (position: GlowPosition, size: number): ViewStyle => {
  const offset = -size * 0.3; // Offset to make glow peek from behind

  switch (position) {
    case 'top-left':
      return { top: offset, left: offset };
    case 'top-right':
      return { top: offset, right: offset };
    case 'bottom-left':
      return { bottom: offset, left: offset };
    case 'bottom-right':
      return { bottom: offset, right: offset };
    case 'center':
    default:
      return {
        top: '50%',
        left: '50%',
        transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
      };
  }
};

export const GlowOrb: React.FC<GlowOrbProps> = ({
  size = 100,
  color = '#06B6D4',
  position = 'center',
  opacity = 0.4,
  style,
}) => {
  const positionStyle = getPositionStyle(position, size);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        positionStyle,
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient
            id="glowGradient"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.5" stopColor={color} stopOpacity={opacity * 0.5} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={size}
          height={size}
          fill="url(#glowGradient)"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});

export default GlowOrb;
