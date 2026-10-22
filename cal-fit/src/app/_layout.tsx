import "./../global.css";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SplashView } from '@/components/SplashView';
import { colors } from '@/constants/design';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { CameraProvider } from '@/contexts/CameraContext';

function RootNavigator() {
  const { isSignedIn, isLoading, needsOnboarding, startupError, retryStartup } = useUser();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Splash until fonts and the stored session are ready, so guards decide with real state.
  if (isLoading || !fontsLoaded) return <SplashView error={startupError} onRetry={retryStartup} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        {/* Opened from the password-reset email, signed in or not. */}
        <Stack.Screen name="reset-password" />

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn && needsOnboarding}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn && !needsOnboarding}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="transformation" />
          <Stack.Screen name="meal/[id]" />
          <Stack.Screen name="log-food" options={{ presentation: 'modal' }} />
          <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <CameraProvider>
        <RootNavigator />
      </CameraProvider>
    </UserProvider>
  );
}
