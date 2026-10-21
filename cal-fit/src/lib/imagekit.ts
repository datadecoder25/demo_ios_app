/**
 * ImageKit upload utilities
 * Uses HTTP POST to ImageKit endpoint
 */

const IMAGEKIT_URL_ENDPOINT = process.env.EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const IMAGEKIT_PUBLIC_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY;

export async function uploadImageToImageKit(
  imageUri: string,
  fileName?: string
): Promise<{ url: string }> {
  if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PUBLIC_KEY) {
    throw new Error('ImageKit configuration missing');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: fileName || `meal-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);
  formData.append('fileName', fileName || `meal-${Date.now()}.jpg`);
  formData.append('useUniqueFileName', 'true');
  formData.append('folder', '/cal-fit/meals');
  formData.append('tags', 'meal,analysis');

  try {
    const response = await fetch(
      `https://upload.imagekit.io/v1/${IMAGEKIT_URL_ENDPOINT}/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${IMAGEKIT_PUBLIC_KEY}:`)}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ImageKit upload failed: ${errorData.message}`);
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw error;
  }
}

export function getImageKitUrl(imageUrl: string, preset: 'food-analysis' | 'thumbnail'): string {
  if (!IMAGEKIT_URL_ENDPOINT) {
    return imageUrl;
  }

  const urlParts = imageUrl.split('/tr:');
  if (urlParts.length > 1) {
    const originalPath = urlParts[1];
    return `https://ik.imagekit.io/${IMAGEKIT_URL_ENDPOINT}/tr:${getPresetTransformations(preset)}/${originalPath}`;
  }

  const transformedUrl = imageUrl.replace('https://ik.imagekit.io/', '');
  return `https://ik.imagekit.io/${IMAGEKIT_URL_ENDPOINT}/tr:${getPresetTransformations(preset)}/${transformedUrl}`;
}

function getPresetTransformations(preset: 'food-analysis' | 'thumbnail'): string {
  switch (preset) {
    case 'food-analysis':
      return 'tr:w-1024,fo-auto,q-80';
    case 'thumbnail':
      return 'tr:w-200,h-200,c-at_max';
    default:
      return '';
  }
}

export function isBlurry(imageBase64: string): boolean {
  const imageData = imageBase64.split(',')[1];
  if (!imageData) return true;

  try {
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return byteArray.length < 10 * 1024;
  } catch {
    return true;
  }
}
