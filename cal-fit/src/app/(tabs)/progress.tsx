import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Chips, IconCircle, PrimaryButton, ProgressBar } from '@/components/kit';
import { BarChart, LineChart, StreakDay, StreakDots } from '@/components/progress/Charts';
import { shortDate, signedKg, useProgressData } from '@/components/progress/useProgressData';
import { colors, fonts, screenPadding, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { useStats } from '@/hooks/useStats';
import { Alert } from '@/lib/alert';
import { macrosFor, sumMeals } from '@/lib/nutrition';

type View_ = 'weight' | 'calories' | 'macros' | 'streaks';

const VIEWS = [
  { label: 'Weight', value: 'weight' },
  { label: 'Calories', value: 'calories' },
  { label: 'Macros', value: 'macros' },
  { label: 'Streaks', value: 'streaks' },
] as const satisfies readonly { label: string; value: View_ }[];

/** Check-ins shown under the weight chart. */
const RECENT_CHECK_INS = 5;

/** Up to three evenly spaced date labels for the weight chart's x axis. */
function axisLabels(dates: string[]): string[] {
  if (dates.length <= 3) return dates.map(d => shortDate(d));
  return [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]].map(d => shortDate(d));
}

export default function ProgressScreen() {
  const { profile, deleteWeightLog } = useUser();
  const { data, error, reload } = useProgressData();
  const { stats, reload: reloadStats } = useStats();
  const [view, setView] = useState<View_>('weight');
  const [refreshing, setRefreshing] = useState(false);

  const target = profile?.daily_calorie_target ?? 0;
  const weights = data?.weights ?? [];
  const first = weights[0];
  const latest = weights[weights.length - 1];
  const currentWeight = latest?.weight_kg ?? (profile?.weight != null ? Number(profile.weight) : null);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), reloadStats()]);
    setRefreshing(false);
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert('Remove check-in', `Remove the check-in from ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeightLog(id);
          } catch {
            Alert.alert('Error', 'Could not remove this check-in. Please try again.');
          }
          await Promise.all([reload(), reloadStats()]);
        },
      },
    ]);
  }

  // Calorie chart: the last 7 days.
  const week = data?.days.slice(-7) ?? [];
  const calories = week.length ? week.map(d => d.calories) : Array(7).fill(0);
  const labels = week.length ? week.map(d => d.date.toLocaleDateString('en-US', { weekday: 'short' })) : Array(7).fill('');
  const daysOnTarget = target > 0 ? calories.filter(c => c >= target * 0.9 && c <= target * 1.1).length : 0;
  const consistency = Math.round((daysOnTarget / 7) * 100);

  const consistencyCard = (barHeight: number) => (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Calorie Consistency</Text>
        <Text style={styles.cardValue}>{target > 0 ? `${consistency}%` : '–'}</Text>
      </View>
      <Text style={styles.cardHint}>
        {target > 0
          ? `${daysOnTarget}/7 days within 10% of your ${target.toLocaleString()} kcal target`
          : 'Set up your profile to get a daily calorie target'}
      </Text>
      <View style={styles.chartGap}>
        <BarChart values={calories} labels={labels} target={target} height={barHeight} />
      </View>
    </Card>
  );

  const streakDays: StreakDay[] = (data?.days ?? []).map((d, i, all) => ({
    label: String(d.date.getDate()),
    state: d.meals.length > 0 ? 'done' : i === all.length - 1 ? 'today' : 'missed',
  }));
  const streak = stats?.current_streak ?? 0;

  const streakCard = (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Streak Calendar</Text>
        <Text style={styles.cardMeta}>
          {stats ? `${streak} ${streak === 1 ? 'day' : 'days'} • best ${stats.best_streak}` : '–'}
        </Text>
      </View>
      <Text style={styles.cardHint}>
        {!stats
          ? ' '
          : stats.logged_today
          ? 'Today is logged. Keep it going tomorrow!'
          : streak > 0
            ? 'Log a meal today to keep your streak alive.'
            : 'Log a meal to start a streak.'}
      </Text>
      <View style={styles.chartGap}>
        {streakDays.length > 0 && <StreakDots days={streakDays} />}
      </View>
    </Card>
  );

  const weightCard = (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weight</Text>
        <Text style={styles.cardValue}>{currentWeight != null ? `${currentWeight} kg` : '–'}</Text>
      </View>
      {weights.length >= 2 && first && latest ? (
        <>
          <Text style={styles.cardHint}>
            {signedKg(latest.weight_kg - first.weight_kg)} kg since {shortDate(first.logged_at)}
            {profile?.goal_weight ? ` • goal ${Number(profile.goal_weight)} kg` : ''}
          </Text>
          <View style={styles.chartGap}>
            <LineChart values={weights.map(w => w.weight_kg)} labels={axisLabels(weights.map(w => w.logged_at))} />
          </View>
        </>
      ) : (
        <Text style={styles.cardHint}>
          {weights.length === 1
            ? 'Log your weight again to see your trend.'
            : 'Log your weight to start tracking your trend.'}
        </Text>
      )}
      <PrimaryButton title="Log Weight" icon="add" onPress={() => router.push('/check-in')} style={styles.chartGap} />
      {weights.length > 0 && (
        <View style={styles.checkIns}>
          {weights
            .slice(-RECENT_CHECK_INS)
            .reverse()
            .map(w => (
              <View key={w.id} style={styles.checkInRow}>
                <Ionicons
                  name={w.photo_key ? 'image-outline' : 'scale-outline'}
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.checkInDate}>{shortDate(w.logged_at)}</Text>
                <Text style={styles.checkInWeight}>{w.weight_kg} kg</Text>
                <Pressable
                  onPress={() => confirmDelete(w.id, shortDate(w.logged_at))}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove check-in from ${shortDate(w.logged_at)}`}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
        </View>
      )}
    </Card>
  );

  const macroTargets = macrosFor(target);
  const today = sumMeals(data?.days[data.days.length - 1]?.meals ?? []);
  const macroRows = [
    { label: 'Calories', value: today.calories, goal: target, unit: 'kcal', color: colors.primary },
    { label: 'Protein', value: today.protein, goal: macroTargets.protein, unit: 'g', color: colors.primary },
    { label: 'Carbs', value: today.carbs, goal: macroTargets.carbs, unit: 'g', color: colors.teal },
    { label: 'Fats', value: today.fat, goal: macroTargets.fat, unit: 'g', color: colors.amber },
  ];

  const photoCount = weights.filter(w => w.photo_key).length;
  const transformationHint =
    weights.length === 0
      ? 'Log your first check-in to start'
      : `${weights.length} ${weights.length === 1 ? 'check-in' : 'check-ins'} • ${photoCount} ${
          photoCount === 1 ? 'photo' : 'photos'
        }${first && latest && weights.length > 1 ? ` • ${first.weight_kg} → ${latest.weight_kg} kg` : ''}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Progress</Text>
        <View style={styles.chips}>
          <Chips options={VIEWS} value={view} onChange={setView} />
        </View>

        {error && (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        )}

        {view === 'weight' && (
          <>
            {weightCard}
            {streakCard}
            {consistencyCard(70)}
          </>
        )}

        {view === 'calories' && consistencyCard(160)}

        {view === 'macros' && (
          <Card>
            <Text style={styles.cardTitle}>Today&apos;s Macros</Text>
            {target === 0 && <Text style={styles.cardHint}>Set up your profile to get macro targets.</Text>}
            {macroRows.map(row => (
              <View key={row.label} style={styles.macroRow}>
                <View style={styles.cardHeader}>
                  <Text style={styles.macroLabel}>{row.label}</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(row.value)}
                    <Text style={styles.macroGoal}>
                      {' '}/ {row.goal ? row.goal.toLocaleString() : '–'} {row.unit}
                    </Text>
                  </Text>
                </View>
                <ProgressBar progress={row.goal ? row.value / row.goal : 0} color={row.color} />
              </View>
            ))}
          </Card>
        )}

        {view === 'streaks' && streakCard}

        <Pressable
          onPress={() => router.push('/transformation')}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.transformationCard}>
            <IconCircle name="body-outline" />
            <View style={styles.transformationText}>
              <Text style={styles.cardTitle}>Your Transformation</Text>
              <Text style={styles.cardHint}>{transformationHint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
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
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    ...type.title,
    paddingTop: 16,
  },
  chips: {
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  cardValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  cardMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  cardHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  chartGap: {
    marginTop: 14,
  },
  macroRow: {
    marginTop: 16,
    gap: 8,
  },
  macroLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  macroValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  macroGoal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  checkIns: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkInDate: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  checkInWeight: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  transformationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  transformationText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
