import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Chips, IconCircle, ProgressBar } from '@/components/kit';
import { BarChart, LineChart, StreakDots } from '@/components/progress/Charts';
import { colors, fonts, screenPadding, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { mealApi } from '@/lib/db';
import { DailyTargets, macrosFor, sumMeals } from '@/lib/nutrition';

type View_ = 'weight' | 'calories' | 'macros' | 'streaks';

const VIEWS = [
  { label: 'Weight', value: 'weight' },
  { label: 'Calories', value: 'calories' },
  { label: 'Macros', value: 'macros' },
  { label: 'Streaks', value: 'streaks' },
] as const satisfies readonly { label: string; value: View_ }[];

// SAMPLE: no weight history or streak tracking exists yet.
const SAMPLE_WEIGHT_DELTAS = [-3.5, -3, -2.6, -2, -1.4, -0.9, -0.4, 0];
const SAMPLE_WEIGHT_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'Now'];
const SAMPLE_STREAK: ('done' | 'today' | 'upcoming')[] = [
  ...Array<'done'>(13).fill('done'),
  'today',
  'upcoming',
];

interface Week {
  labels: string[];
  calories: number[];
  today: DailyTargets;
}

/** Midnight six days ago, so the window covers the last seven local days including today. */
function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

export default function ProgressScreen() {
  const { user, profile } = useUser();
  const [view, setView] = useState<View_>('weight');
  const [week, setWeek] = useState<Week | null>(null);

  const target = profile?.daily_calorie_target ?? 2500;
  const currentWeight = Number(profile?.weight) || 62;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;

      async function loadWeek() {
        if (!user) return;
        const start = weekStart();
        const { data } = await mealApi.getSince(user.id, start.toISOString());
        if (!active) return;

        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          return d;
        });
        const meals = data ?? [];
        const perDay = days.map(day =>
          meals.filter(m => new Date(m.created_at).toDateString() === day.toDateString())
        );

        setWeek({
          labels: days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })),
          calories: perDay.map(dayMeals => Math.round(sumMeals(dayMeals).calories)),
          today: sumMeals(perDay[6]),
        });
      }

      loadWeek();
      return () => {
        active = false;
      };
    }, [user])
  );

  const calories = week?.calories ?? Array(7).fill(0);
  const labels = week?.labels ?? ['', '', '', '', '', '', ''];
  const daysOnTarget = calories.filter(c => c >= target * 0.9).length;
  const consistency = Math.round((daysOnTarget / 7) * 100);

  const weights = SAMPLE_WEIGHT_DELTAS.map(d => Math.round((currentWeight + d) * 10) / 10);

  const consistencyCard = (barHeight: number) => (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Calorie Consistency</Text>
        <Text style={styles.cardValue}>{consistency}%</Text>
      </View>
      <Text style={styles.cardHint}>
        {daysOnTarget}/7 days within 10% of your {target.toLocaleString()} kcal target
      </Text>
      <View style={styles.chartGap}>
        <BarChart values={calories} labels={labels} target={target} height={barHeight} />
      </View>
    </Card>
  );

  const streakCard = (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Streak Calendar</Text>
        <Text style={styles.cardMeta}>14 days</Text>
      </View>
      <View style={styles.chartGap}>
        <StreakDots days={SAMPLE_STREAK} />
      </View>
    </Card>
  );

  const macroTargets = macrosFor(target);
  const today = week?.today ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const macroRows = [
    { label: 'Calories', value: today.calories, goal: target, unit: 'kcal', color: colors.primary },
    { label: 'Protein', value: today.protein, goal: macroTargets.protein, unit: 'g', color: colors.primary },
    { label: 'Carbs', value: today.carbs, goal: macroTargets.carbs, unit: 'g', color: colors.teal },
    { label: 'Fats', value: today.fat, goal: macroTargets.fat, unit: 'g', color: colors.amber },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Progress</Text>
        <View style={styles.chips}>
          <Chips options={VIEWS} value={view} onChange={setView} />
        </View>

        {view === 'weight' && (
          <>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Weight</Text>
                <Text style={styles.cardValue}>{currentWeight} kg</Text>
              </View>
              <View style={styles.chartGap}>
                <LineChart values={weights} labels={SAMPLE_WEIGHT_LABELS} />
              </View>
            </Card>
            {streakCard}
            {consistencyCard(70)}
          </>
        )}

        {view === 'calories' && consistencyCard(160)}

        {view === 'macros' && (
          <Card>
            <Text style={styles.cardTitle}>Today&apos;s Macros</Text>
            {macroRows.map(row => (
              <View key={row.label} style={styles.macroRow}>
                <View style={styles.cardHeader}>
                  <Text style={styles.macroLabel}>{row.label}</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(row.value)}
                    <Text style={styles.macroGoal}>
                      {' '}/ {row.goal.toLocaleString()} {row.unit}
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
              <Text style={styles.cardHint}>Week 4 of 12 • compare your progress photos</Text>
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
