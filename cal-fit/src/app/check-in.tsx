import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, SecondaryButton, TextField } from '@/components/kit';
import { colors, fonts, radius, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { preparePhoto, uploadProgressPhoto } from '@/lib/photos';
import { goBack } from '@/lib/navigation';

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: false,
  // Full quality here: preparePhoto does the one and only re-encode.
  quality: 1,
  mediaTypes: ['images'],
};

/** Weight check-in with an optional progress photo (modal). */
export default function CheckInScreen() {
  const { profile, logWeight } = useUser();
  const [weight, setWeight] = useState(profile?.weight != null ? String(Number(profile.weight)) : '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        'Allow access in Settings to add a progress photo.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsPreparing(true);
    try {
      setPhotoUri(await preparePhoto(asset.uri, asset.width, asset.height, asset.mimeType));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that photo.');
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSave() {
    const kg = Number(weight.replace(',', '.'));
    if (!Number.isFinite(kg) || kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) {
      setError(`Enter a weight between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const photoKey = photoUri ? await uploadProgressPhoto(photoUri) : null;
      await logWeight(Math.round(kg * 10) / 10, photoKey);
      goBack();
    } catch (err) {
      console.error('Check-in failed:', err);
      setError(err instanceof Error && err.message ? err.message : 'Could not save your check-in. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <Screen
      onBack
      scroll
      contentStyle={styles.content}
      footer={<PrimaryButton title="Save Check-in" onPress={handleSave} loading={isSaving} disabled={isPreparing} />}
    >
      <Text style={styles.title}>Weight Check-in</Text>
      <Text style={styles.subtitle}>Log today&apos;s weight. Adding a photo lets you compare your progress over time.</Text>

      <TextField
        label="Weight (kg)"
        placeholder="e.g. 72.5"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        inputMode="decimal"
        onSubmitEditing={handleSave}
      />

      <Text style={styles.sectionTitle}>Progress photo (optional)</Text>
      {photoUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={() => setPhotoUri(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            style={styles.removePhoto}
          >
            <Ionicons name="close" size={18} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoActions}>
          <SecondaryButton
            title="Take Photo"
            icon="camera-outline"
            onPress={() => pick('camera')}
            disabled={isPreparing || isSaving}
            style={styles.photoButton}
          />
          <SecondaryButton
            title={isPreparing ? 'Preparing…' : 'Choose Photo'}
            icon="images-outline"
            onPress={() => pick('library')}
            disabled={isPreparing || isSaving}
            style={styles.photoButton}
          />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  title: {
    ...type.title,
    marginTop: 8,
  },
  subtitle: {
    ...type.body,
    marginBottom: 6,
  },
  sectionTitle: {
    ...type.subheading,
    marginTop: 6,
  },
  photoActions: {
    gap: 10,
  },
  photoButton: {
    alignSelf: 'stretch',
  },
  previewWrap: {
    alignSelf: 'center',
    width: '70%',
    aspectRatio: 0.8,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryTint,
  },
  preview: {
    flex: 1,
  },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.darkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
});
