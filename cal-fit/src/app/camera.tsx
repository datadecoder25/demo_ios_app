import { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCamera } from '@/contexts/CameraContext';
import { uploadImageToImageKit } from '@/lib/imagekit';
import { creditTransactionApi } from '@/lib/db';

import { useUser } from '@/contexts/UserContext';

export default function CameraScreen() {
  const { user } = useUser();
  const { 
    imageUri, 
    cameraPermission, 
    cameraRollPermission,
    requestCameraPermission,
    requestCameraRollPermission,
    pickFromCamera,
    pickFromCameraRoll,
    uploadImage,
    isBlurry,
    clearImage
  } = useCamera();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [isBlurryImage, setIsBlurryImage] = useState(false);
  const [credits, setCredits] = useState(4);

  useEffect(() => {
    if (imageUri) {
      setHasImage(true);
      checkBlur();
    } else {
      setHasImage(false);
      setIsBlurryImage(false);
    }
  }, [imageUri]);

  useEffect(() => {
    if (user) {
      loadCredits();
    }
  }, [user]);

  async function loadCredits() {
    if (!user) return;

    const { data } = await creditTransactionApi.getByUserId(user.id);
    if (data) {
      const totalCredits = data.reduce((sum, tx) => sum + tx.amount, 0);
      setCredits(totalCredits);
    }
  }

  async function checkBlur() {
    if (imageUri) {
      setIsBlurryImage(isBlurry(imageUri));
    }
  }

  const handlePhotoTaken = async () => {
    if (!hasImage) return;

    if (isBlurryImage) {
      Alert.alert(
        'Blurry Image',
        'This image appears to be blurry. Please take a clearer photo for accurate analysis.',
        [
          { text: 'Retake', style: 'cancel', onPress: clearImage },
          { text: 'Continue Anyway', onPress: analyzeMeal },
        ]
      );
    } else {
      analyzeMeal();
    }
  };

  async function analyzeMeal() {
    if (!imageUri) return;

    setIsProcessing(true);

    try {
      if (credits < 5 && user) {
        Alert.alert(
          'Insufficient Credits',
          'You need at least 5 credits to analyze a meal. Please purchase more credits.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Buy Credits', onPress: () => router.push('/profile' as any) },
          ]
        );
        setIsProcessing(false);
        return;
      }

      const { url } = await uploadImage();
      router.push(`/analysis/${encodeURIComponent(url)}` as any);
      clearImage();

    } catch (error) {
      console.error('Photo processing error:', error);
      Alert.alert('Error', 'Failed to process photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    Alert.alert('Coming Soon', 'Manual entry will be available in a future update.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {!hasImage ? (
          <View style={styles.header}>
            <Text style={styles.title}>New Meal</Text>
            <Text style={styles.subtitle}>
              Take a photo of your meal to get AI-powered nutrition analysis.
            </Text>
          </View>
        ) : (
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Photo Preview</Text>
            <Pressable onPress={clearImage}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {!hasImage ? (
          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.cameraButton}
              onPress={pickFromCamera}
              disabled={!cameraPermission}
            >
              <Text style={styles.buttonText}>
                {cameraPermission ? 'Take Photo' : 'Camera Access Required'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.galleryButton}
              onPress={pickFromCameraRoll}
              disabled={!cameraRollPermission}
            >
              <Text style={styles.buttonText}>
                {cameraRollPermission ? 'Choose from Gallery' : 'Gallery Access Required'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.manualButton}
              onPress={handleManualEntry}
            >
              <Text style={styles.buttonText}>Manual Entry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Text style={styles.previewImage}>[Image Preview Here]</Text>
            
            {isBlurryImage && (
              <View style={styles.blurBadge}>
                <Text style={styles.blurText}>Blur Detected</Text>
              </View>
            )}
          </View>
        )}

        {hasImage && (
          <View style={styles.previewActions}>
            <Pressable
              style={styles.confirmButton}
              onPress={handlePhotoTaken}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Analyzing...' : 'Analyze Photo'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.creditsInfo}>
          <Text style={styles.creditsText}>
            {credits < 5 ? '⚠️ ' : '✓ '}{credits} credits available
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 20,
    gap: 16,
  },
  cameraButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  galleryButton: {
    backgroundColor: '#7B1FA2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  manualButton: {
    borderWidth: 2,
    borderColor: '#757575',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    color: '#f44336',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 300,
  },
  blurBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  blurText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewActions: {
    padding: 20,
  },
  confirmButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  creditsInfo: {
    padding: 16,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  creditsText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
