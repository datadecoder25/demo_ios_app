import { useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthScaffold, FormError, FormNotice, isValidEmail, MIN_PASSWORD_LENGTH } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { clerkErrorMessage } from '@/lib/auth';

export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Clerk verifies the email with a 6-digit code before the account is created.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const { error: createError } = await signUp.password({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName: rest.join(' ') || undefined,
      });
      if (createError) throw createError;

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) throw sendError;
      setAwaitingCode(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      if (signUp.status !== 'complete') {
        throw new Error('Your account needs more details. Please try again.');
      }
      // Activates the session; the root layout then sends the new user to onboarding.
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) throw finalizeError;
    } catch (err) {
      setError(clerkErrorMessage(err, 'That code didn’t work. Please try again.'));
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    setError(null);
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) setError(clerkErrorMessage(sendError));
  }

  if (awaitingCode) {
    return (
      <AuthScaffold
        title="Verify Your Email"
        subtitle={`Enter the 6-digit code we sent to ${email.trim()}.`}
        footerPrompt="Didn't get it?"
        footerAction="Resend code"
        onFooterPress={resendCode}
        showSocial={false}
      >
        <TextField
          label="Verification code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={handleVerify}
        />
        <FormNotice message="Check your spam folder if it hasn't arrived after a minute." />
        <FormError message={error} />
        <PrimaryButton title="Verify & Continue" onPress={handleVerify} loading={isSubmitting} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Create Your Account"
      subtitle="Start your journey to a stronger you."
      footerPrompt="Already have an account?"
      footerAction="Sign In"
      onFooterPress={() => router.replace('/sign-in')}
    >
      <TextField
        label="Full name"
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
      />
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
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />

      <FormError message={error} />

      {/* Clerk's bot protection renders its challenge here on web. */}
      {Platform.OS === 'web' && <View nativeID="clerk-captcha" />}

      <View style={styles.submit}>
        <PrimaryButton title="Sign Up" onPress={handleSubmit} loading={isSubmitting} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: 6,
  },
});
