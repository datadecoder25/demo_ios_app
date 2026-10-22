import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ProgressBar, ProgressRing } from '@/components/kit';
import { useTodayMeals } from '@/components/home/useTodayMeals';
import { colors, fonts, screenPadding, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';

// Placeholder gamification until streaks/XP exist in the backend.
const SAMPLE_STREAK = { days: 14, xp: 2350, xpLevelProgress: 0.35 };

const TASKS = [
  { id: 'calories', label: 'Hit your calorie target' },
  { id: 'water', label: 'Drink 2.5L water' },
  { id: 'workout', label: 'Complete your workout' },
  { id: 'meals', label: 'Log your meals' },
] as const;

type TaskId = (typeof TASKS)[number]['id'];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function HomeScreen() {
  const { user, profile } = useUser();
  const { meals, eaten, targets, caloriesLeft, reload } = useTodayMeals();
  const [refreshing, setRefreshing] = useState(false);
  // Manually toggled placeholder tasks; calorie/meal tasks also auto-complete from real data.
  const [checked, setChecked] = useState<Record<TaskId, boolean>>({
    calories: false,
    water: false,
    workout: false,
    meals: false,
  });

  const autoDone: Partial<Record<TaskId, boolean>> = {
    calories: targets.calories > 0 && eaten.calories >= targets.calories,
    meals: meals.length > 0,
  };
  const isDone = (id: TaskId) => checked[id] || !!autoDone[id];
  const completed = TASKS.filter(t => isDone(t.id)).length;

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const calorieProgress = targets.calories > 0 ? eaten.calories / targets.calories : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name}>{user?.firstName ?? 'there'}! ☀️</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.navy} />
          </Pressable>
        </View>

        <View style={styles.row}>
          <Card style={styles.ringCard}>
            <ProgressRing progress={calorieProgress} size={140} stroke={12}>
              <Text style={styles.ringValue}>{caloriesLeft.toLocaleString()}</Text>
              <Text style={styles.ringLabel}>calories left</Text>
            </ProgressRing>
            <Text style={styles.ringFooter}>
              {Math.round(eaten.calories).toLocaleString()} / {targets.calories.toLocaleString()}
            </Text>
          </Card>

          <Card style={styles.proteinCard}>
            <Text style={styles.statLabel}>Protein</Text>
            <Text style={styles.proteinValue}>
              {Math.round(eaten.protein)}g <Text style={styles.proteinTarget}>/ {targets.protein}g</Text>
            </Text>
            <ProgressBar
              progress={targets.protein > 0 ? eaten.protein / targets.protein : 0}
              style={styles.proteinBar}
            />
          </Card>
        </View>

        <Card style={styles.weightCard}>
          <View style={styles.weightCol}>
            <Text style={styles.statLabel}>Current weight</Text>
            <Text style={styles.weightValue}>
              {profile?.weight ?? '–'} <Text style={styles.unit}>kg</Text>
            </Text>
          </View>
          <View style={styles.weightDivider} />
          <View style={styles.weightCol}>
            <Text style={styles.statLabel}>Goal weight</Text>
            <Text style={styles.weightValue}>
              {profile?.goal_weight ?? '–'} <Text style={styles.unit}>kg</Text>
            </Text>
          </View>
        </Card>

        <Card style={styles.streakCard}>
          <Text style={styles.flame}>🔥</Text>
          <View style={styles.streakText}>
            <Text style={styles.streakDays}>{SAMPLE_STREAK.days}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <View style={styles.xpCol}>
            <Text style={styles.xp}>
              <Text style={styles.xpPrefix}>XP </Text>
              {SAMPLE_STREAK.xp.toLocaleString()}
            </Text>
            <ProgressBar progress={SAMPLE_STREAK.xpLevelProgress} height={6} style={styles.xpBar} />
          </View>
        </Card>

        <PrimaryButton title="Scan Food with AI" icon="camera" onPress={() => router.push('/camera')} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          <Text style={styles.sectionMeta}>{completed}/{TASKS.length} completed</Text>
        </View>
        <Card style={styles.listCard}>
          {TASKS.map((task, i) => {
            const done = isDone(task.id);
            return (
              <Pressable
                key={task.id}
                onPress={() => setChecked(c => ({ ...c, [task.id]: !c[task.id] }))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                style={[styles.taskRow, i < TASKS.length - 1 && styles.rowBorder]}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={done ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.taskLabel, done && styles.taskDone]}>{task.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
          <Text style={styles.sectionMeta}>{meals.length} logged</Text>
        </View>
        {meals.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No meals logged yet today. Scan your first meal to get started!</Text>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            {meals.map((meal, i) => {
              const a = meal.analysis_json ?? {};
              return (
                <View key={meal.id} style={[styles.mealRow, i < meals.length - 1 && styles.rowBorder]}>
                  <View style={styles.mealIcon}>
                    <Ionicons name={meal.is_manual ? 'restaurant' : 'sparkles'} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.mealText}>
                    <Text style={styles.mealName}>
                      {meal.manual_name || (meal.is_manual ? 'Manual entry' : 'AI-analyzed meal')}
                    </Text>
                    <Text style={styles.mealMeta}>
                      {formatTime(meal.created_at)} · P {Math.round(a.protein ?? 0)}g · C {Math.round(a.carbs ?? 0)}g · F{' '}
                      {Math.round(a.fat ?? 0)}g
                    </Text>
                  </View>
                  <Text style={styles.mealKcal}>{Math.round(a.calories ?? 0)} kcal</Text>
                </View>
              );
            })}
          </Card>
        )}
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
    padding: screenPadding,
    paddingBottom: 32,
    gap: 14,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: {
    ...type.body,
    fontSize: 14,
  },
  name: {
    ...type.title,
    fontSize: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  ringCard: {
    flex: 1.3,
    alignItems: 'center',
    paddingVertical: 18,
  },
  ringValue: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    color: colors.navy,
  },
  ringLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  ringFooter: {
    ...type.label,
    marginTop: 10,
  },
  proteinCard: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  proteinValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    marginTop: 6,
  },
  proteinTarget: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  proteinBar: {
    marginTop: 12,
  },
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightCol: {
    flex: 1,
    gap: 4,
  },
  weightDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  weightValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.navy,
  },
  unit: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flame: {
    fontSize: 28,
  },
  streakText: {
    flex: 1,
  },
  streakDays: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
  },
  streakLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  xpCol: {
    width: 110,
    alignItems: 'flex-end',
    gap: 6,
  },
  xp: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  xpPrefix: {
    color: colors.success,
  },
  xpBar: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: {
    ...type.subheading,
  },
  sectionMeta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  listCard: {
    paddingVertical: 4,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  taskLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  taskDone: {
    color: colors.textSecondary,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealText: {
    flex: 1,
  },
  mealName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  mealMeta: {
    ...type.caption,
    marginTop: 2,
  },
  mealKcal: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  empty: {
    ...type.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
