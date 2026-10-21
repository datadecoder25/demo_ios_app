import React, { createContext, useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

interface CameraContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  cameraPermission: boolean;
  cameraRollPermission: boolean;
  requestCameraPermission: () => Promise<void>;
  requestCameraRollPermission: () => Promise<void>;
  pickFromCamera: () => Promise<void>;
  pickFromCameraRoll: () => Promise<void>;
  uploadImage: () => Promise<{ url: string }>;
  getThumbnailUrl: (url: string) => string;
  isBlurry: (uri: string) => boolean;
  clearImage: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [cameraRollPermission, setCameraRollPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const { status: cameraStatus } = await ImagePicker.getCameraPermissionsAsync();
    const { status: cameraRollStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    setCameraPermission(cameraStatus === 'granted');
    setCameraRollPermission(cameraRollStatus === 'granted');
  }

  async function requestCameraPermission() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
  }

  async function requestCameraRollPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setCameraRollPermission(status === 'granted');
  }

  async function pickFromCamera() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function pickFromCameraRoll() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(): Promise<{ url: string }> {
    if (!imageUri) {
      throw new Error('No image to upload');
    }

    const { uploadImageToImageKit } = await import('@/lib/imagekit');
    const { url } = await uploadImageToImageKit(imageUri);
    return { url };
  }

  function getThumbnailUrl(url: string): string {
    const { getImageKitUrl } = require('@/lib/imagekit');
    return getImageKitUrl(url, 'thumbnail');
  }

  function clearImage() {
    setImageUri(null);
  }

  function isBlurry(uri: string): boolean {
    // For now, always return false
    return false;
  }

  const value: CameraContextType = {
    imageUri,
    setImageUri,
    cameraPermission,
    cameraRollPermission,
    requestCameraPermission,
    requestCameraRollPermission,
    pickFromCamera,
    pickFromCameraRoll,
    uploadImage,
    getThumbnailUrl,
    isBlurry,
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
