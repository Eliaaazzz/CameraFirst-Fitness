import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

export type CuteAuraLogoVariant = 'peachy' | 'sparkle' | 'leafy';

type CuteAuraLogoProps = {
  size?: number;
  variant?: CuteAuraLogoVariant;
};

export default function CuteAuraLogo({ size = 128, variant = 'sparkle' }: CuteAuraLogoProps) {
  const isPeachy = variant === 'peachy';
  const isSparkle = variant === 'sparkle';
  const isLeafy = variant === 'leafy';

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="orangeBody" x1="120" y1="100" x2="420" y2="420" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FDBA74" />
          <Stop offset="0.55" stopColor="#FB923C" />
          <Stop offset="1" stopColor="#EA580C" />
        </LinearGradient>
        <LinearGradient id="leafFill" x1="250" y1="70" x2="330" y2="120" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#86EFAC" />
          <Stop offset="1" stopColor="#22C55E" />
        </LinearGradient>
      </Defs>

      <Circle cx="256" cy="265" r="210" fill="#FFF7ED" />

      <G>
        {isLeafy ? (
          <>
            <Path
              d="M286 64c30 0 58 16 72 44-32 18-67 16-95-9-13-11-19-23-23-35 14 0 30 0 46 0z"
              fill="url(#leafFill)"
            />
            <Path
              d="M250 112c18-24 41-39 74-49"
              stroke="#65A30D"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <Ellipse cx="312" cy="82" rx="42" ry="22" fill="url(#leafFill)" transform="rotate(-24 312 82)" />
            <Path
              d="M248 111c20-26 43-44 72-55"
              stroke="#65A30D"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
      </G>

      <Circle cx="256" cy="265" r="182" fill="url(#orangeBody)" />
      <Circle cx="208" cy="210" r={isPeachy ? 84 : 76} fill="#FFFFFF" opacity={isPeachy ? 0.28 : 0.22} />
      <Ellipse cx="284" cy="350" rx="128" ry="74" fill="#C2410C" opacity="0.16" />

      {isSparkle ? (
        <>
          <Circle cx="198" cy="248" r="14" fill="#7C2D12" />
          <Path
            d="M296 248c10-12 24-12 34 0"
            stroke="#7C2D12"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <Circle cx="198" cy="248" r="14" fill="#7C2D12" />
          <Circle cx="314" cy="248" r="14" fill="#7C2D12" />
        </>
      )}

      <Circle cx="168" cy="292" r={isPeachy ? 24 : 20} fill="#FB7185" opacity={isPeachy ? 0.45 : 0.33} />
      <Circle cx="344" cy="292" r={isPeachy ? 24 : 20} fill="#FB7185" opacity={isPeachy ? 0.45 : 0.33} />

      <Path
        d={isLeafy ? 'M196 300c16 26 38 36 60 36s44-10 60-36' : 'M196 302c14 20 34 30 60 30s46-10 60-30'}
        stroke="#7C2D12"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />

      {isSparkle && (
        <G fill="#FACC15" opacity="0.9">
          <Path d="M112 196l10 22 24 10-24 10-10 22-10-22-24-10 24-10z" />
          <Path d="M406 182l7 15 17 7-17 7-7 15-7-15-17-7 17-7z" />
        </G>
      )}
    </Svg>
  );
}
