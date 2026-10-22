import { StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '@/components/kit';
import { colors } from '@/constants/design';

/**
 * Splash screen (design #1). Rendered while fonts and the session load, so it uses
 * system fonts rather than Plus Jakarta Sans.
 */
export function SplashView() {
  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <View style={styles.center}>
        <LogoMark size={120} />
        <Text style={styles.name}>Cal-Fit</Text>
        <Text style={styles.tagline}>Gain Weight  •  Build Muscle</Text>
        <Text style={styles.tagline}>Be Your Best</Text>
      </View>

      <Text style={styles.powered}>Powered by AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primaryTint,
    opacity: 0.8,
  },
  blobTop: {
    width: 220,
    height: 220,
    top: -60,
    right: -70,
  },
  blobBottom: {
    width: 260,
    height: 260,
    bottom: -90,
    left: -110,
  },
  center: {
    alignItems: 'center',
  },
  name: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  powered: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
