import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { ZoneLayout } from './types';

interface SpotlightOverlayProps {
  layout: ZoneLayout;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
  windowWidth: number;
  windowHeight: number;
  backdropColor: string;
  onBackdropPress: () => void;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({ 
  layout, 
  shape = 'rectangle', 
  borderRadius = 10, 
  windowWidth, 
  windowHeight, 
  backdropColor, 
  onBackdropPress 
}) => {
  
  const maskId = "spotlight-mask";
  const isCircle = shape === 'circle';
  // Add some padding
  const padding = 5;
  const spotX = layout.x - padding;
  const spotY = layout.y - padding;
  const spotW = layout.width + (padding * 2);
  const spotH = layout.height + (padding * 2);
  const spotR = isCircle ? Math.max(spotW, spotH) / 2 : (borderRadius + padding);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id={maskId}>
              {/* White rect fills screen = Opaque */}
              <Rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black shape at target = Transparent (Hole) */}
              <Rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx={spotR}
                ry={spotR}
                fill="black"
              />
            </Mask>
          </Defs>
          {/* Main overlay using the mask */}
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={backdropColor}
            mask={`url(#${maskId})`}
          />
        </Svg>
      </Pressable>
    </View>
  );
};
