import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListRow } from '@/components/kit';
import { colors, fonts, radius, screenPadding } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { useCredits } from '@/hooks/useCredits';
import { useStats } from '@/hooks/useStats';
import { Alert } from '@/lib/alert';
import { ACTIVITY_LEVELS, GOALS, levelFor } from '@/lib/nutrition';

export default function ProfileScreen() {
  const { user, profile, signOut, saveProfile } = useUser();
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
  const { balance, renewsOn } = useCredits();
  const { stats } = useStats();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your profile';
  const initials =
    [user?.firstName, user?.lastName]
      .filter((part): part is string => !!part)
      .map(part => part[0].toUpperCase())
      .join('') || (user?.email?.[0]?.toUpperCase() ?? '?');

  const goalLabel = GOALS.find(g => g.value === profile?.goal)?.label ?? 'No goal set';
  const goalSubtitle = [
    goalLabel,
    profile?.goal_weight ? `${Number(profile.goal_weight)} kg` : null,
    profile?.daily_calorie_target ? `${profile.daily_calorie_target.toLocaleString()} kcal/day` : null,
    ACTIVITY_LEVELS.find(a => a.value === profile?.activity_level)?.label,
  ]
    .filter(Boolean)
    .join(' • ');

  const renewal = renewsOn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const scans = balance == null ? 'Loading scans…' : `${balance} AI ${balance === 1 ? 'scan' : 'scans'} left`;
  const level = levelFor(stats?.xp ?? 0);

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{fullName}</Text>
            {user?.email && <Text style={styles.email}>{user.email}</Text>}
            <View style={styles.planRow}>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>Free plan</Text>
              </View>
              <Text style={styles.planMeta}>{scans}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.navy} />
          </Pressable>
        </View>

        <Card style={styles.stats}>
          <Stat value={stats ? String(stats.current_streak) : '–'} label="Day streak" />
          <View style={styles.statDivider} />
          <Stat value={stats ? `Lv ${level.level}` : '–'} label={`${(stats?.xp ?? 0).toLocaleString()} XP`} />
          <View style={styles.statDivider} />
          <Stat value={stats ? String(stats.meals_logged) : '–'} label="Meals logged" />
        </Card>

        <Card style={styles.list}>
          <ListRow
            icon="trophy-outline"
            title="My Goals & Body"
            subtitle={goalSubtitle}
            onPress={() => router.push('/edit-profile')}
          />
          <ListRow
            icon="scale-outline"
            title="Log weight"
            subtitle="Add a check-in with an optional photo"
            onPress={() => router.push('/check-in')}
          />
          <ListRow
            icon="images-outline"
            title="Progress photos"
            subtitle="Compare your transformation"
            onPress={() => router.push('/transformation')}
          />
        </Card>

        <Card style={styles.list}>
          <ListRow
            icon="sparkles-outline"
            title="AI scans"
            subtitle={balance == null ? 'Free plan' : `Free plan • ${scans} • renews ${renewal}`}
            onPress={() => router.push('/paywall')}
          />
          <ListRow
            icon="notifications-circle-outline"
            title="Activity"
            subtitle="Your recent progress and reminders"
            onPress={() => router.push('/notifications')}
          />
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
          <ListRow icon="speedometer-outline" title="Units" subtitle="Metric (kg, cm)" showChevron={false} />
          <ListRow icon="log-out-outline" title="Log Out" danger onPress={confirmLogout} />
        </Card>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.navy,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  planPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.white,
  },
  planMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  bell: {
    paddingTop: 4,
  },
  list: {
    paddingVertical: 0,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
});
