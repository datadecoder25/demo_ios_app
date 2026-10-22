import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListRow } from '@/components/kit';
import { colors, fonts, radius, screenPadding } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { GOALS } from '@/lib/nutrition';

// SAMPLE: subscriptions aren't wired to in-app purchases yet.
const SAMPLE_PLAN = { name: 'Premium', activeUntil: 'Dec 2026' };

function comingSoon(feature: string) {
  Alert.alert('Coming soon', `${feature} will be available in a future update.`);
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useUser();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your profile';
  const initials =
    [user?.firstName, user?.lastName]
      .filter((part): part is string => !!part)
      .map(part => part[0].toUpperCase())
      .join('') || (user?.email?.[0]?.toUpperCase() ?? '?');

  const goalLabel = GOALS.find(g => g.value === profile?.goal)?.label ?? 'No goal set';
  const goalSubtitle = profile?.goal_weight ? `${goalLabel} • ${Number(profile.goal_weight)} kg` : goalLabel;

  const showGoals = () => {
    if (!profile) return comingSoon('Goal editing');
    Alert.alert(
      'My Goals',
      [
        `Goal: ${goalLabel}`,
        profile.weight ? `Current weight: ${Number(profile.weight)} kg` : null,
        profile.goal_weight ? `Goal weight: ${Number(profile.goal_weight)} kg` : null,
        profile.daily_calorie_target ? `Daily target: ${profile.daily_calorie_target.toLocaleString()} kcal` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );
  };

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
                <Text style={styles.planPillText}>{SAMPLE_PLAN.name}</Text>
              </View>
              <Text style={styles.planMeta}>Active until {SAMPLE_PLAN.activeUntil}</Text>
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

        <Card style={styles.list}>
          <ListRow icon="trophy-outline" title="My Goals" subtitle={goalSubtitle} onPress={showGoals} />
          <ListRow
            icon="notifications-outline"
            title="Reminders"
            subtitle="Meal, workout, water"
            onPress={() => router.push('/notifications')}
          />
          <ListRow
            icon="card-outline"
            title="Subscription"
            subtitle={`${SAMPLE_PLAN.name} • Active`}
            onPress={() => router.push('/paywall')}
          />
        </Card>

        <Card style={styles.list}>
          <ListRow icon="settings-outline" title="Settings" onPress={() => comingSoon('Settings')} />
          <ListRow
            icon="notifications-circle-outline"
            title="Notification Preferences"
            onPress={() => router.push('/notifications')}
          />
          <ListRow icon="help-circle-outline" title="Help & Support" onPress={() => comingSoon('Help & Support')} />
          <ListRow icon="log-out-outline" title="Log Out" danger onPress={confirmLogout} />
        </Card>
      </ScrollView>
    </SafeAreaView>
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
});
