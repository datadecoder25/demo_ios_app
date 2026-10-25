import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListRow, PrimaryButton } from '@/components/kit';
import { colors, fonts, radius, screenPadding, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { FREE_MONTHLY_CREDITS, useCredits } from '@/hooks/useCredits';
import { useStats } from '@/hooks/useStats';
import { Alert } from '@/lib/alert';
import { GOALS, levelFor } from '@/lib/nutrition';

export default function ProfileScreen() {
  const { user, profile, signOut, saveProfile } = useUser();
  const { balance, renewsOn } = useCredits();
  const { stats } = useStats();
  const [isSavingOptIn, setIsSavingOptIn] = useState(false);

  async function toggleMarketing(value: boolean) {
    setIsSavingOptIn(true);
    try {
      await saveProfile({ marketing_opt_in: value });
    } catch {
      Alert.alert('Error', 'Could not update your email preference. Please try again.');
    } finally {
      setIsSavingOptIn(false);
    }
  }

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your profile';
  const initials =
    [user?.firstName, user?.lastName]
      .filter((part): part is string => !!part)
      .map(part => part[0].toUpperCase())
      .join('') || (user?.email?.[0]?.toUpperCase() ?? '?');

  const goalSubtitle = [
    GOALS.find(g => g.value === profile?.goal)?.label,
    profile?.daily_calorie_target ? `${profile.daily_calorie_target.toLocaleString()} kcal a day` : null,
  ]
    .filter(Boolean)
    .join(' • ');
  const level = levelFor(stats?.xp ?? 0);
  const renewal = renewsOn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
            {user?.email && (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
        </View>

        <Card style={styles.scans}>
          <View style={styles.scansRow}>
            <View style={styles.scansIcon}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={styles.scansText}>
              <Text style={styles.scansCount}>
                {balance == null ? '–' : balance} AI {balance === 1 ? 'scan' : 'scans'} left
              </Text>
              <Text style={styles.scansHint}>
                {FREE_MONTHLY_CREDITS} free scans every month • next on {renewal}
              </Text>
            </View>
          </View>
          <PrimaryButton title="Get More Scans" icon="add-circle-outline" onPress={() => router.push('/paywall')} />
        </Card>

        <Card style={styles.stats}>
          <Stat value={stats ? String(stats.current_streak) : '–'} label="Day streak" />
          <View style={styles.statDivider} />
          <Stat value={stats ? `Lv ${level.level}` : '–'} label={`${(stats?.xp ?? 0).toLocaleString()} XP`} />
          <View style={styles.statDivider} />
          <Stat value={stats ? String(stats.meals_logged) : '–'} label="Meals" />
        </Card>

        <Section title="Progress">
          <ListRow
            icon="trophy-outline"
            title="Goals & body"
            subtitle={goalSubtitle || undefined}
            onPress={() => router.push('/edit-profile')}
          />
          <ListRow icon="scale-outline" title="Log weight" onPress={() => router.push('/check-in')} />
          <ListRow icon="images-outline" title="Progress photos" onPress={() => router.push('/transformation')} />
          <ListRow icon="pulse-outline" title="Activity" onPress={() => router.push('/notifications')} last />
        </Section>

        <Section title="Preferences">
          <View style={styles.toggleRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Email updates</Text>
              <Text style={styles.toggleSubtitle}>Tips, recipes and offers</Text>
            </View>
            <Switch
              value={!!profile?.marketing_opt_in}
              onValueChange={toggleMarketing}
              disabled={!profile || isSavingOptIn}
              trackColor={{ true: colors.primary, false: colors.track }}
              accessibilityLabel="Email updates"
            />
          </View>
        </Section>

        <Section title="Account & legal">
          <ListRow icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => router.push('/privacy')} />
          <ListRow icon="document-text-outline" title="Terms of Use" onPress={() => router.push('/terms')} />
          <ListRow icon="log-out-outline" title="Log Out" onPress={confirmLogout} showChevron={false} last />
        </Section>

        <Pressable
          onPress={() => router.push('/delete-account')}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.deleteLink}
        >
          <Text style={styles.deleteText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.list}>{children}</Card>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: screenPadding,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scans: {
    gap: 14,
  },
  scansRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scansIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scansText: {
    flex: 1,
  },
  scansCount: {
    ...type.subheading,
  },
  scansHint: {
    ...type.caption,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginLeft: 4,
  },
  list: {
    paddingVertical: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  toggleSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  deleteLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  deleteText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
});
