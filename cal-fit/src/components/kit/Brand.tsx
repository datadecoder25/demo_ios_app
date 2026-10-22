import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, fonts } from '@/constants/design';

/** Cal-Fit "C" mark: a thick gradient arc with a diagonal notch, as on the splash screen. */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="calfit-logo" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3D8BFF" />
          <Stop offset="1" stopColor="#0B57E3" />
        </LinearGradient>
      </Defs>
      {/* Open ring: 300° arc, gap on the right. */}
      <Path
        d="M 80.3 32.5 A 35 35 0 1 0 80.3 67.5"
        stroke="url(#calfit-logo)"
        strokeWidth={22}
        strokeLinecap="round"
        fill="none"
      />
      {/* Diagonal cut through the ring, giving the mark its notch. */}
      <Path d="M 38 62 L 12 88" stroke={colors.white} strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

/** Logo + "Cal-Fit" wordmark. */
export function Wordmark({ size = 96, light }: { size?: number; light?: boolean }) {
  return (
    <View style={styles.wordmark}>
      <LogoMark size={size} />
      <Text style={[styles.name, { fontSize: size * 0.46 }, light && { color: colors.white }]}>Cal-Fit</Text>
    </View>
  );
}

/** Calories-left ring for the home dashboard. */
export function ProgressRing({
  progress,
  size = 150,
  stroke = 12,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="calfit-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.teal} />
            <Stop offset="1" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#calfit-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontFamily: fonts.extrabold,
    color: colors.navy,
    letterSpacing: -0.5,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
