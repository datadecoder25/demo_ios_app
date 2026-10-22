import { router } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, OrDivider, Screen, SocialButton } from '@/components/kit';
import { colors, fonts, type } from '@/constants/design';
import { Alert } from '@/lib/alert';

interface AuthScaffoldProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/welcome');
  }
}

function comingSoon(provider: string) {
  Alert.alert('Coming soon', `${provider} sign-in will be available in a future update.`);
}

/** Shared layout for Sign In / Sign Up (design #3, #4): logo, title, form, social buttons, footer link. */
export function AuthScaffold({ title, subtitle, children, footerPrompt, footerAction, onFooterPress }: AuthScaffoldProps) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen onBack={goBack} scroll>
        <View style={styles.logo}>
          <LogoMark size={44} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.form}>{children}</View>

        <View style={styles.social}>
          <OrDivider />
          <SocialButton
            title="Continue with Google"
            icon="logo-google"
            iconColor="#4285F4"
            onPress={() => comingSoon('Google')}
          />
          <SocialButton title="Continue with Apple" icon="logo-apple" onPress={() => comingSoon('Apple')} />
        </View>

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
  social: {
    marginTop: 22,
    gap: 12,
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
});
