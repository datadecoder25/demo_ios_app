import { HandleSSOCallback } from '@clerk/react';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { SplashView } from '@/components/SplashView';

/**
 * Where Google/Apple sign-in returns on web. Clerk finishes the sign-in (or sign-up) here;
 * once the session is active the root layout shows the app or onboarding. On native the
 * auth browser handles the redirect itself, so this screen only shows the splash.
 */
export default function SSOCallbackScreen() {
  if (Platform.OS !== 'web') return <SplashView />;

  return (
    <>
      <SplashView />
      <HandleSSOCallback
        navigateToApp={() => router.replace('/')}
        navigateToSignIn={() => router.replace('/sign-in')}
        navigateToSignUp={() => router.replace('/sign-up')}
      />
    </>
  );
}
