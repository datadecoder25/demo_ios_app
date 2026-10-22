import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, OrDivider, Screen, SocialButton } from '@/components/kit';
import { colors, fonts, type } from '@/constants/design';
import { isSocialSignInSupported, signInWithSocial } from '@/lib/auth';
import { goBack } from '@/lib/navigation';

interface AuthScaffoldProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
  /** Message shown above the social buttons, e.g. a failed Google sign-in. */
  socialError?: string | null;
  /** Show "Continue with Google"; off for screens like Reset Password. */
  showSocial?: boolean;
}

const backToWelcome = () => goBack('/welcome');

/**
 * "Continue with Google" (web only). Apple isn't offered: Neon Auth doesn't support it.
 */
function SocialSignIn({ initialError }: { initialError?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  if (!isSocialSignInSupported) return null;

  async function start() {
    setError(null);
    setIsStarting(true);
    try {
      await signInWithSocial('google');
      // The page is navigating to Google; leave the button disabled.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in.');
      setIsStarting(false);
    }
  }

  return (
    <View style={styles.social}>
      <OrDivider />
      <SocialButton
        title={isStarting ? 'Opening Google…' : 'Continue with Google'}
        icon="logo-google"
        iconColor="#DB4437"
        onPress={start}
        disabled={isStarting}
      />
      <FormError message={error ?? initialError ?? null} />
    </View>
  );
}

/**
 * Shared layout for Sign In / Sign Up / Reset Password (design #3, #4): logo, title, form,
 * Google sign-in, footer link.
 */
export function AuthScaffold({
  title,
  subtitle,
  children,
  footerPrompt,
  footerAction,
  onFooterPress,
  socialError,
  showSocial = true,
}: AuthScaffoldProps) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen onBack={backToWelcome} scroll>
        <View style={styles.logo}>
          <LogoMark size={44} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.form}>{children}</View>

        {showSocial && <SocialSignIn initialError={socialError} />}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerPrompt} </Text>
          <Pressable onPress={onFooterPress} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.footerLink}>{footerAction}</Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Inline validation / server error under the form. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

/** Inline success message under the form (e.g. "reset link sent"). */
export function FormNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.notice}>{message}</Text>;
}

/** Basic shape check; the server does the real validation. */
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Neon Auth (Better Auth) rejects passwords shorter than this. */
export const MIN_PASSWORD_LENGTH = 8;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  social: {
    gap: 14,
    marginTop: 18,
  },
  logo: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    ...type.title,
    fontFamily: fonts.extrabold,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...type.body,
    marginTop: 6,
  },
  form: {
    marginTop: 28,
    gap: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  notice: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.success,
    textAlign: 'center',
  },
});
