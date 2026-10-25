import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormError } from '@/components/auth/AuthScaffold';
import { Card, Screen, SecondaryButton } from '@/components/kit';
import { colors, fonts, radius, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { goBack } from '@/lib/navigation';

const DELETED = [
  'Your profile, goals and email preferences',
  'Every meal, scan result and meal photo',
  'Weigh-ins and progress photos',
  'Remaining AI scans, including purchased ones',
  'Your sign-in (email, Google or Apple)',
];

/** Permanent, in-app account deletion (required by the App Store and Google Play). */
export default function DeleteAccountScreen() {
  const { user, deleteAccount } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      // On success the user is signed out and sent to the welcome screen.
      await deleteAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account. Please try again.');
      setIsDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all of your data. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDelete },
      ]
    );
  }

  return (
    <Screen
      onBack
      scroll
      backgroundColor={colors.background}
      footer={
        <View style={styles.footer}>
          <Pressable
            onPress={confirmDelete}
            disabled={isDeleting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.danger, (pressed || isDeleting) && styles.dangerPressed]}
          >
            {isDeleting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={type.button}>Delete My Account</Text>
            )}
          </Pressable>
          <SecondaryButton title="Keep My Account" onPress={() => goBack('/profile')} disabled={isDeleting} />
        </View>
      }
    >
      <Text style={styles.title}>Delete Account</Text>
      <Text style={styles.subtitle}>
        {user?.email ? `This deletes the Cal-Fit account for ${user.email}.` : 'This deletes your Cal-Fit account.'}
        {' '}It happens right away and can’t be undone.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>What gets deleted</Text>
        {DELETED.map(item => (
          <View key={item} style={styles.row}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.rowText}>{item}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.note}>
        Purchases made through the App Store or Google Play aren’t refunded automatically. To ask for a refund, contact
        Apple or Google. You can sign up again later with the same email, but you’ll start from scratch, and this month’s free scans won’t reset.
      </Text>

      <FormError message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    marginTop: 8,
  },
  subtitle: {
    ...type.body,
    marginTop: 8,
  },
  card: {
    marginTop: 20,
    gap: 12,
  },
  cardTitle: {
    ...type.subheading,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.navy,
  },
  note: {
    ...type.caption,
    marginTop: 16,
    marginBottom: 12,
  },
  footer: {
    gap: 12,
  },
  danger: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerPressed: {
    opacity: 0.8,
  },
});
