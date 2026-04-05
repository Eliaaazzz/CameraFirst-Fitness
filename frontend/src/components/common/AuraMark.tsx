import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type AuraMarkProps = {
  size?: number;
  subtle?: boolean;
};

export function AuraMark({ size = 72, subtle = false }: AuraMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs>
        <LinearGradient id="auraWarm" x1="26" y1="18" x2="100" y2="106" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={subtle ? '#E7C9B5' : '#EBC0A3'} />
          <Stop offset="0.58" stopColor={subtle ? '#D99568' : '#D98B59'} />
          <Stop offset="1" stopColor={subtle ? '#B15D31' : '#A7552A'} />
        </LinearGradient>
        <LinearGradient id="auraOrbit" x1="86" y1="34" x2="108" y2="78" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#7DB8A9" />
          <Stop offset="1" stopColor="#2F7A6A" />
        </LinearGradient>
      </Defs>

      <Circle cx="64" cy="64" r="56" fill="#FFF8F2" />
      <Circle cx="64" cy="64" r="55" stroke="rgba(201,106,52,0.10)" />

      <Path
        d="M41 92L63.5 34L86 92"
        stroke="url(#auraWarm)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M50 73H77"
        stroke="url(#auraWarm)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <Path
        d="M90 33c12 4 20 16 20 31 0 9-3 18-9 24"
        stroke="url(#auraOrbit)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="97" cy="29" r="6" fill="#2F7A6A" />
    </Svg>
  );
}

export default AuraMark;

