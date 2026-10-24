import { router } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SocialSignIn } from '@/components/auth/SocialSignIn';
import { LogoMark, Screen } from '@/components/kit';
import { colors, fonts, type } from '@/constants/design';
import { goBack } from '@/lib/navigation';

interface AuthScaffoldProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
  /** Show "Continue with Google / Apple"; off for screens like Reset Password. */
  showSocial?: boolean;
}

const backToWelcome = () => goBack('/welcome');

/**
 * Shared layout for Sign In / Sign Up / Reset Password (design #3, #4): logo, title, form,
 * Google and Apple sign-in, footer link.
 */
export function AuthScaffold({
  title,
  subtitle,
  children,
  footerPrompt,
  footerAction,
  onFooterPress,
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

        {showSocial && <SocialSignIn />}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerPrompt} </Text>
          <Pressable onPress={onFooterPress} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.footerLink}>{footerAction}</Text>
          </Pressable>
        </View>

        {showSocial && (
          <Text style={styles.agreement}>
            By continuing, you agree to our{' '}
            <Text style={styles.agreementLink} accessibilityRole="link" onPress={() => router.push('/terms')}>
              Terms of Use
            </Text>{' '}
            and{' '}
            <Text style={styles.agreementLink} accessibilityRole="link" onPress={() => router.push('/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        )}
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

/** Clerk's default minimum password length. */
export const MIN_PASSWORD_LENGTH = 8;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
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
  agreement: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 16,
  },
  agreementLink: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
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
