import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthScaffold, FormError } from '@/components/auth/AuthScaffold';
import { PrimaryButton, TextField } from '@/components/kit';
import { useUser } from '@/contexts/UserContext';

export default function SignUpScreen() {
  const { signUp } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
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
        placeholder="Create a strong password"
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />

      <FormError message={error} />

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
