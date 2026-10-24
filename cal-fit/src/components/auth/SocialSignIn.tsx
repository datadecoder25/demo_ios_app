import { useSignIn } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { OrDivider, SocialButton } from '@/components/kit';
import { colors, fonts } from '@/constants/design';
import { clerkErrorMessage } from '@/lib/auth';

// Lets the auth browser session hand its result back to the app (native).
WebBrowser.maybeCompleteAuthSession();

type Provider = 'oauth_google' | 'oauth_apple';

const PROVIDERS: { strategy: Provider; title: string; icon: 'logo-google' | 'logo-apple'; color: string }[] = [
  { strategy: 'oauth_google', title: 'Continue with Google', icon: 'logo-google', color: '#DB4437' },
  { strategy: 'oauth_apple', title: 'Continue with Apple', icon: 'logo-apple', color: colors.navy },
];

/**
 * "Continue with Google / Apple" via Clerk. Works for new and returning users alike: Clerk
 * signs in an existing account or creates one. On web the page redirects to the provider and
 * back to /sso-callback; on iOS/Android it opens the system auth browser.
 */
export function SocialSignIn() {
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(strategy: Provider) {
    setError(null);
    setPending(strategy);
    try {
      if (Platform.OS === 'web') {
        const origin = window.location.origin;
        const { error: ssoError } = await signIn.sso({
          strategy,
          redirectUrl: `${origin}/`,
          redirectCallbackUrl: `${origin}/sso-callback`,
        });
        if (ssoError) throw ssoError;
        // The page is navigating to the provider; leave the button busy.
        return;
      }

      const { createdSessionId } = await startSSOFlow({ strategy });
      // A session means we're signed in; the root layout takes it from here. No session means
      // the user closed the browser.
      if (!createdSessionId) setPending(null);
    } catch (err) {
      setError(clerkErrorMessage(err, 'Sign-in didn’t complete. Please try again.'));
      setPending(null);
    }
  }

  return (
    <View style={styles.container}>
      <OrDivider />
      {PROVIDERS.map(p => (
        <SocialButton
          key={p.strategy}
          title={pending === p.strategy ? 'Opening…' : p.title}
          icon={p.icon}
          iconColor={p.color}
          onPress={() => start(p.strategy)}
          disabled={pending !== null}
        />
      ))}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 18,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
});
