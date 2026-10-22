import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/kit';
import { colors, fonts, screenPadding } from '@/constants/design';

// Placeholder hero: the mockup's athlete photo isn't in the repo, so use the food shot.
const heroImage = require('../../design/food_photo.jpg');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image source={heroImage} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(11, 27, 63, 0.35)', 'rgba(11, 27, 63, 0.88)', colors.navy, '#FFFFFF']}
        locations={[0, 0.45, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.inner}>
          <View style={styles.copy}>
            <Text style={styles.headline}>Build a</Text>
            <Text style={styles.headline}>
              <Text style={styles.accent}>Stronger</Text> You
            </Text>
            <Text style={styles.body}>
              Cal-Fit helps skinny people gain weight, build muscle and stay consistent with AI-powered
              nutrition & tracking.
            </Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton title="Get Started" onPress={() => router.push('/sign-up')} />
            <SecondaryButton title="I Already Have an Account" onPress={() => router.push('/sign-in')} />
          </View>

          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: screenPadding,
    paddingBottom: 16,
  },
  copy: {
    marginBottom: 32,
  },
  headline: {
    fontFamily: fonts.extrabold,
    fontSize: 38,
    lineHeight: 46,
    color: colors.white,
    letterSpacing: -0.5,
  },
  accent: {
    color: colors.primaryLight,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 25,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 16,
  },
  actions: {
    gap: 14,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C9D3E6',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
});
