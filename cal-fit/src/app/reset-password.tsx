import { useSignIn } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AuthScaffold,
  FormError,
  FormNotice,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
} from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { clerkErrorMessage } from '@/lib/auth';

/**
 * Password reset with an emailed code (Clerk): enter email → enter code and a new password.
 * A successful reset signs the user in. Opened from "Forgot password?" with ?email=… prefilled.
 */
export default function ResetPasswordScreen() {
  const { signIn } = useSignIn();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    const address = email.trim();
    if (!isValidEmail(address)) {
      setError('Please enter the email address you signed up with.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: createError } = await signIn.create({ identifier: address });
      if (createError) throw createError;
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setCodeSent(true);
    } catch (err) {
      setError(clerkErrorMessage(err, 'Could not send the code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword() {
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (submitError) throw submitError;
      if (signIn.status !== 'complete') throw new Error('Password updated. Please sign in with your new password.');
      // Signs the user in; the root layout takes them into the app.
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
    } catch (err) {
      setError(clerkErrorMessage(err, 'Could not reset your password. Please try again.'));
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      showSocial={false}
      title={codeSent ? 'Set a New Password' : 'Reset Your Password'}
      subtitle={
        codeSent
          ? `Enter the code we emailed to ${email.trim()} and choose a new password.`
          : "We'll email you a code to reset your password."
      }
      footerPrompt="Remembered it?"
      footerAction="Sign In"
      onFooterPress={() => router.replace('/sign-in')}
    >
      {codeSent ? (
        <>
          <TextField
            label="Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <TextField
            label="New password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChangeText={setPassword}
            password
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={resetPassword}
          />
          <FormNotice message="Didn't get it? Check spam, or go back and send it again." />
        </>
      ) : (
        <TextField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          onSubmitEditing={sendCode}
        />
      )}

      <FormError message={error} />

      <View style={styles.submit}>
        {codeSent ? (
          <PrimaryButton title="Update Password" onPress={resetPassword} loading={isSubmitting} />
        ) : (
          <PrimaryButton title="Email Me a Code" onPress={sendCode} loading={isSubmitting} />
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
