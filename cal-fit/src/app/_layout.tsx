import "./../global.css";
import { Stack } from 'expo-router';

import { UserProvider } from '@/contexts/UserContext';
import { CameraProvider } from '@/contexts/CameraContext';

export default function RootLayout() {
  return (
    <UserProvider>
      <CameraProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ title: 'Set Up Your Profile' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="camera" options={{ title: 'New Meal', gestureEnabled: false }} />
          <Stack.Screen name="analysis/[imageUri]" options={{ title: 'Analysis Results' }} />
        </Stack>
      </CameraProvider>
    </UserProvider>
  );
}
