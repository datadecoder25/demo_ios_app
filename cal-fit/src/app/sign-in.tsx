import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { AuthScaffold, FormError, FormNotice, isValidEmail } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { colors, fonts } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { requestPasswordReset } from '@/lib/auth';

/** Where the emailed reset link lands; must be a trusted origin in Neon Auth. */
function resetRedirectUrl() {
  return Platform.OS === 'web' ? `${window.location.origin}/reset-password` : Linking.createURL('/reset-password');
}

/** Neon Auth sends social sign-in failures back as /sign-in?error=<code>. */
function socialErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === 'access_denied') return 'Google sign-in was cancelled.';
  if (code === 'account_not_linked') {
    return 'This email already has a password account. Sign in with your email and password.';
  }
  return 'Google sign-in failed. Please try again.';
}

export default function SignInScreen() {
  const { signIn } = useUser();
  const { error: socialError } = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const address = email.trim();
    setNotice(null);
    if (!isValidEmail(address)) {
      setError('Enter your email address above, then tap "Forgot password?" again.');
      return;
    }

    setIsSendingReset(true);
    setError(null);
    try {
      await requestPasswordReset(address, resetRedirectUrl());
      setNotice(`If ${address} has an account, a reset link is on its way. Check your inbox.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <AuthScaffold
      title="Welcome Back"
      subtitle="Good to see you again!"
      footerPrompt="Don't have an account?"
      footerAction="Sign Up"
      onFooterPress={() => router.replace('/sign-up')}
      socialError={socialErrorMessage(socialError)}
    >
      <TextField
        label="Email address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSubmit}
      />

      <Pressable
        onPress={handleForgotPassword}
        disabled={isSendingReset}
        accessibilityRole="link"
        hitSlop={8}
        style={styles.forgot}
      >
        {isSendingReset ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.forgotText}>Forgot password?</Text>
        )}
      </Pressable>

      <FormError message={error} />
      <FormNotice message={notice} />

      <PrimaryButton title="Sign In" onPress={handleSubmit} loading={isSubmitting} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
});
