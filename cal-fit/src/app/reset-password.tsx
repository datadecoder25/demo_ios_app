import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthScaffold, FormError, FormNotice, MIN_PASSWORD_LENGTH } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { resetPassword } from '@/lib/auth';

/** Landing page of the emailed reset link: `/reset-password?token=…` (or `?error=INVALID_TOKEN`). */
export default function ResetPasswordScreen() {
  const { token, error: linkError } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError || !token ? 'This reset link is invalid or has expired. Request a new one from Sign In.' : null
  );

  async function handleSubmit() {
    if (!token) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      showSocial={false}
      title="Set a New Password"
      subtitle="Choose a new password for your Cal-Fit account."
      footerPrompt="Remembered it?"
      footerAction="Sign In"
      onFooterPress={() => router.replace('/sign-in')}
    >
      {!done && token && !linkError && (
        <>
          <TextField
            label="New password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChangeText={setPassword}
            password
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label="Confirm password"
            placeholder="Type it again"
            value={confirm}
            onChangeText={setConfirm}
            password
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={handleSubmit}
          />
        </>
      )}

      <FormError message={error} />
      <FormNotice message={done ? 'Your password was updated. Sign in with your new password.' : null} />

      <View style={styles.submit}>
        {done || !token || linkError ? (
          <PrimaryButton title="Go to Sign In" onPress={() => router.replace('/sign-in')} />
        ) : (
          <PrimaryButton title="Update Password" onPress={handleSubmit} loading={isSubmitting} />
        )}
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: 4,
  },
});
