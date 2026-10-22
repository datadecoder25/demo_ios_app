import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthScaffold, FormError } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { colors, fonts } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';

export default function SignInScreen() {
  const { signIn } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
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

      <Pressable
        onPress={() => Alert.alert('Coming soon', 'Password reset will be available in a future update.')}
        accessibilityRole="link"
        hitSlop={8}
        style={styles.forgot}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      <FormError message={error} />

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
