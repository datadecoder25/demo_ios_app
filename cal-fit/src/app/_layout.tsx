import "./../global.css";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SplashView } from '@/components/SplashView';
import { colors } from '@/constants/design';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/auth';
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
        {/*
          Each group names where to go when its guard fails. Without redirectTo the router falls
          back to the first unguarded route in its own sort order (which was /terms).
        */}
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn && needsOnboarding} redirectTo={isSignedIn ? '/' : '/welcome'}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn && !needsOnboarding} redirectTo={isSignedIn ? '/onboarding' : '/welcome'}>
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

        <Stack.Protected guard={isSignedIn} redirectTo="/welcome">
          <Stack.Screen name="delete-account" />
        </Stack.Protected>

        {/* Google/Apple sign-in lands here on web before a session exists. */}
        <Stack.Screen name="sso-callback" />
        {/* Public, signed in or not: linked from sign-up, Profile and the store listings. */}
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <SplashView error="Sign-in isn't configured: set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env and restart." />;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <UserProvider>
        <CameraProvider>
          <RootNavigator />
        </CameraProvider>
      </UserProvider>
    </ClerkProvider>
  );
}
