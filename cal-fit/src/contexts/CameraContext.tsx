import React, { createContext, useContext, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { Alert } from '@/lib/alert';
import { preparePhoto } from '@/lib/photos';

interface CameraContextType {
  /** Local URI of the picked photo, already resized and re-encoded as JPEG. */
  imageUri: string | null;
  /** True while a picked photo is being resized/re-encoded. */
  isPreparing: boolean;
  /** Why the last pick failed (unreadable format, permission denied…), if it did. */
  pickError: string | null;
  pickFromCamera: () => Promise<void>;
  pickFromCameraRoll: () => Promise<void>;
  clearImage: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: false,
  // Full quality here: preparePhoto does the one and only re-encode.
  quality: 1,
  mediaTypes: ['images'],
};

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  async function handleResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setIsPreparing(true);
    try {
      setImageUri(await preparePhoto(asset.uri, asset.width, asset.height, asset.mimeType));
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not open that photo.');
    } finally {
      setIsPreparing(false);
    }
  }

  async function pickFromCamera() {
    setPickError(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to snap your meals.');
      return;
    }
    await handleResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  }

  async function pickFromCameraRoll() {
    setPickError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings to choose a meal photo.');
      return;
    }
    await handleResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  }

  function clearImage() {
    setImageUri(null);
    setPickError(null);
  }

  const value: CameraContextType = {
    imageUri,
    isPreparing,
    pickError,
    pickFromCamera,
    pickFromCameraRoll,
    clearImage,
  };

  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within CameraProvider');
  }
  return context;
}
