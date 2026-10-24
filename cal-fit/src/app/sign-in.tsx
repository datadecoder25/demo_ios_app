import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthScaffold, FormError, FormNotice, isValidEmail } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { colors, fonts } from '@/constants/design';
import { clerkErrorMessage } from '@/lib/auth';

export default function SignInScreen() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Set when Clerk asks for an emailed code after the password (new device, or 2-step).
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function finish() {
    // Once the session is active the root layout moves on to the app (or onboarding).
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) throw finalizeError;
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const { error: passwordError } = await signIn.password({ emailAddress: email.trim(), password });
      if (passwordError) throw passwordError;

      if (signIn.status === 'complete') {
        await finish();
        return;
      }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) throw sendError;
        setNeedsCode(true);
        setNotice(`We emailed a code to ${email.trim()} to confirm it's you.`);
        setIsSubmitting(false);
        return;
      }
      throw new Error('This account needs a sign-in step the app doesn’t support yet.');
    } catch (err) {
      setError(clerkErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      await finish();
    } catch (err) {
      setError(clerkErrorMessage(err, 'That code didn’t work. Please try again.'));
      setIsSubmitting(false);
    }
  }

  function startOver() {
    signIn.reset();
    setNeedsCode(false);
    setCode('');
    setNotice(null);
    setError(null);
  }

  function handleForgotPassword() {
    const address = email.trim();
    router.push({ pathname: '/reset-password', params: isValidEmail(address) ? { email: address } : {} });
  }

  if (needsCode) {
    return (
      <AuthScaffold
        title="Check Your Email"
        subtitle="Enter the code we sent to finish signing in."
        footerPrompt="Wrong account?"
        footerAction="Start over"
        onFooterPress={startOver}
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
          onSubmitEditing={handleVerifyCode}
        />
        <FormNotice message={notice} />
        <FormError message={error} />
        <PrimaryButton title="Verify & Sign In" onPress={handleVerifyCode} loading={isSubmitting} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Welcome Back"
      subtitle="Good to see you again!"
      footerPrompt="Don't have an account?"
      footerAction="Sign Up"
      onFooterPress={() => router.replace('/sign-up')}
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

      <Pressable onPress={handleForgotPassword} accessibilityRole="link" hitSlop={8} style={styles.forgot}>
        <Text style={styles.forgotText}>Forgot password?</Text>
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
