import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultSheet, SaveOverrides } from '@/components/camera/ResultSheet';
import { ScanningCard } from '@/components/camera/ScanningCard';
import { PrimaryButton, SecondaryButton } from '@/components/kit';
import { colors, fonts, radius, screenPadding } from '@/constants/design';
import { useCamera } from '@/contexts/CameraContext';
import { nextCreditRenewal } from '@/hooks/useCredits';
import { mealTitle, useMealAnalysis } from '@/hooks/useMealAnalysis';

const placeholderPhoto = require('../../design/food_photo.jpg');

/** AI Meal Camera (design #15) with the AI Result Modal (design #16) as a bottom sheet. */
export default function CameraScreen() {
  const { imageUri, isPreparing, pickError, pickFromCamera, pickFromCameraRoll, clearImage } = useCamera();
  const { status, credits, analysis, error, insufficientCredits, saveToDiary, isSaving, saveError } =
    useMealAnalysis(imageUri);

  // However the screen is left (Android back button, swipe, Close), drop the photo so the
  // next visit starts at the picker instead of re-running the last analysis.
  useEffect(() => clearImage, [clearImage]);

  // Dismiss the modal back to the tabs; replace('/') would stack a second copy of them.
  // Home reloads on focus, so a saved meal shows up immediately.
  function close() {
    clearImage();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const renewalLabel = nextCreditRenewal().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // The camera is a full-screen modal; swap it for the manual entry modal.
  function logManually() {
    clearImage();
    router.replace('/log-food');
  }

  async function handleSave(overrides: SaveOverrides) {
    if (await saveToDiary(overrides)) {
      close();
    }
  }

  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <>
          <Image source={placeholderPhoto} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={6} />
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
        </>
      )}

      {/* Bottom edge too: on Android the system navigation bar overlaps the pick buttons. */}
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close camera">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          <Ionicons name="flash-outline" size={22} color={colors.white} />
        </View>

        {status === 'idle' && (
          <View style={styles.pick}>
            <View style={styles.pickHeader}>
              <View style={styles.scanIcon}>
                <Ionicons name="scan-outline" size={34} color={colors.white} />
              </View>
              <Text style={styles.pickTitle}>Scan your meal</Text>
              <Text style={styles.pickSubtitle}>
                Snap or upload a photo and AI will estimate calories and macros.
              </Text>
              {credits !== null && (
                <View style={styles.creditsPill}>
                  <Ionicons name="sparkles" size={14} color={credits > 0 ? colors.white : colors.amber} />
                  <Text style={styles.creditsText}>
                    {credits > 0
                      ? `${credits} ${credits === 1 ? 'scan' : 'scans'} left`
                      : `No scans left • more on ${renewalLabel}`}
                  </Text>
                </View>
              )}
              {credits === 0 && (
                <Text style={styles.pickSubtitle}>
                  Photos you&apos;ve scanned before are still free, and manual logging always is.
                </Text>
              )}
            </View>

            <View style={styles.pickActions}>
              {pickError && (
                <View style={styles.pickError}>
                  <Ionicons name="alert-circle" size={18} color={colors.amber} />
                  <Text style={styles.pickErrorText}>{pickError}</Text>
                </View>
              )}
              <PrimaryButton title="Take Photo" icon="camera" onPress={pickFromCamera} disabled={isPreparing} />
              <SecondaryButton
                title={isPreparing ? 'Preparing photo…' : 'Choose from Gallery'}
                icon="images-outline"
                onPress={pickFromCameraRoll}
                disabled={isPreparing}
              />
              <Pressable onPress={logManually} accessibilityRole="button" hitSlop={8} style={styles.manualLink}>
                <Text style={styles.manualLinkText}>Log food manually instead</Text>
              </Pressable>
            </View>
          </View>
        )}

        {status === 'scanning' && (
          <View style={styles.centered}>
            <ScanningCard />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centered}>
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={36} color={colors.amber} />
              <Text style={styles.errorTitle}>{insufficientCredits ? 'Out of credits' : 'Analysis failed'}</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <View style={styles.errorActions}>
                {insufficientCredits ? (
                  <>
                    <PrimaryButton title="Get More Scans" icon="sparkles" onPress={() => router.push('/paywall')} />
                    <LightButton title="Log Food Manually" onPress={logManually} />
                  </>
                ) : (
                  <LightButton title="Try Another Photo" onPress={clearImage} />
                )}
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>

      {status === 'done' && imageUri && analysis && (
        <View style={styles.sheetWrap}>
          <ResultSheet
            imageUri={imageUri}
            title={mealTitle(analysis)}
            analysis={analysis}
            onSave={handleSave}
            onClose={close}
            isSaving={isSaving}
            saveError={saveError}
          />
        </View>
      )}
    </View>
  );
}

/** Outlined white button for the dark error card, readable on any phone theme. */
function LightButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.lightButton, pressed && styles.lightButtonPressed]}
    >
      <Text style={styles.lightButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lightButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lightButtonPressed: {
    opacity: 0.8,
  },
  lightButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  fill: {
    flex: 1,
  },
  dim: {
    backgroundColor: 'rgba(11, 27, 63, 0.72)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingVertical: 12,
  },
  pick: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  pickHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scanIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.white,
  },
  pickSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth: 300,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  creditsText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.white,
  },
  manualLink: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  manualLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  pickActions: {
    gap: 12,
  },
  pickError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.darkOverlay,
  },
  pickErrorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  errorCard: {
    backgroundColor: colors.darkOverlay,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  errorTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.white,
  },
  errorMessage: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  errorActions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 8,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
