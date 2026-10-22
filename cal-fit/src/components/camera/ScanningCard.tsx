import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts, radius } from '@/constants/design';

/** Spinning blue arc around a filled dot, as in the "Scanning your food…" overlay. */
function ScanSpinner({ size = 52 }: { size?: number }) {
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={3} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.primaryLight}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * 0.3} ${circumference}`}
          />
        </Svg>
      </Animated.View>
      <View style={[styles.dot, { width: size * 0.55, height: size * 0.55, borderRadius: size }]} />
    </View>
  );
}

export function ScanningCard() {
  return (
    <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel="Scanning your food">
      <ScanSpinner />
      <View style={styles.text}>
        <Text style={styles.title}>Scanning your food…</Text>
        <Text style={styles.subtitle}>Analyzing calories, macros and ingredients…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.darkOverlay,
    borderRadius: radius.lg,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  dot: {
    backgroundColor: colors.primary,
  },
  text: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.white,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.75)',
  },
});
