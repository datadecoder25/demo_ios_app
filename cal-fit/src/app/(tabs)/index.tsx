import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ProgressBar, ProgressRing } from '@/components/kit';
import { useTodayMeals } from '@/components/home/useTodayMeals';
import { colors, fonts, screenPadding, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { useStats } from '@/hooks/useStats';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { Alert } from '@/lib/alert';
import { levelFor, WATER_GLASS_ML, WATER_GOAL_ML } from '@/lib/nutrition';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function liters(ml: number) {
  return (ml / 1000).toFixed(1);
}

export default function HomeScreen() {
  const { user, profile } = useUser();
  const { meals, eaten, targets, caloriesLeft, reload } = useTodayMeals();
  const { stats, reload: reloadStats } = useStats();
  const habits = useTodayHabits();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), reloadStats(), habits.reload()]);
    setRefreshing(false);
  }

  async function setHabit(habit: 'water' | 'workout', amount: number) {
    if (!(await habits.set(habit, amount))) {
      Alert.alert('Not saved', 'We could not save that. Check your connection and try again.');
    }
  }

  const calorieProgress = targets.calories > 0 ? eaten.calories / targets.calories : 0;
  // Same rule as user_stats' days_on_target: within 10% of the target.
  const caloriesOnTarget = targets.calories > 0 && calorieProgress >= 0.9 && calorieProgress <= 1.1;
  const waterDone = habits.water >= WATER_GOAL_ML;
  const workoutDone = habits.workout > 0;
  const mealsDone = meals.length > 0;
  const completed = [caloriesOnTarget, waterDone, workoutDone, mealsDone].filter(Boolean).length;

  const level = levelFor(stats?.xp ?? 0);
  const streak = stats?.current_streak ?? 0;
  const streakHint = !stats
    ? ' '
    : streak > 0 && !stats.logged_today
      ? 'Log a meal today to keep it going'
      : `Best: ${stats.best_streak} ${stats.best_streak === 1 ? 'day' : 'days'}`;

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
            <Text style={[styles.statLabel, styles.macroGap]}>Carbs</Text>
            <Text style={styles.macroValue}>
              {Math.round(eaten.carbs)}g <Text style={styles.proteinTarget}>/ {targets.carbs}g</Text>
            </Text>
            <Text style={[styles.statLabel, styles.macroGap]}>Fats</Text>
            <Text style={styles.macroValue}>
              {Math.round(eaten.fat)}g <Text style={styles.proteinTarget}>/ {targets.fat}g</Text>
            </Text>
          </Card>
        </View>

        <Pressable
          onPress={() => router.push('/check-in')}
          accessibilityRole="button"
          accessibilityLabel="Log your weight"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.weightCard}>
            <View style={styles.weightCol}>
              <Text style={styles.statLabel}>Current weight</Text>
              <Text style={styles.weightValue}>
                {profile?.weight != null ? Number(profile.weight) : '–'} <Text style={styles.unit}>kg</Text>
              </Text>
            </View>
            <View style={styles.weightDivider} />
            <View style={styles.weightCol}>
              <Text style={styles.statLabel}>Goal weight</Text>
              <Text style={styles.weightValue}>
                {profile?.goal_weight != null ? Number(profile.goal_weight) : '–'} <Text style={styles.unit}>kg</Text>
              </Text>
            </View>
            <View style={styles.logWeight}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
              <Text style={styles.logWeightText}>Log</Text>
            </View>
          </Card>
        </Pressable>

        <Card style={styles.streakCard}>
          <Text style={styles.flame}>{streak > 0 ? '🔥' : '🌱'}</Text>
          <View style={styles.streakText}>
            <Text style={styles.streakDays}>
              {stats ? streak : '–'} {streak === 1 ? 'Day' : 'Days'}
            </Text>
            <Text style={styles.streakLabel}>{!stats || streak > 0 ? 'Day Streak' : 'Start your streak today'}</Text>
            <Text style={styles.streakHint}>{streakHint}</Text>
          </View>
          <View style={styles.xpCol}>
            <Text style={styles.xp}>
              <Text style={styles.xpPrefix}>XP </Text>
              {stats ? stats.xp.toLocaleString() : '–'}
            </Text>
            <ProgressBar progress={stats ? level.progress : 0} height={6} style={styles.xpBar} />
            <Text style={styles.level}>
              {stats ? `Lv ${level.level} • ${level.toNext.toLocaleString()} to next` : ' '}
            </Text>
          </View>
        </Card>

        <PrimaryButton title="Scan Food with AI" icon="camera" onPress={() => router.push('/camera')} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          <Text style={styles.sectionMeta}>{completed}/4 completed</Text>
        </View>
        <Card style={styles.listCard}>
          <TaskRow
            done={caloriesOnTarget}
            label="Hit your calorie target"
            meta={`${Math.round(eaten.calories).toLocaleString()} / ${targets.calories.toLocaleString()} kcal`}
            onPress={() => router.push('/log-food')}
            hint="Opens food logging"
          />
          <TaskRow
            done={waterDone}
            label={`Drink ${liters(WATER_GOAL_ML)}L water`}
            meta={`${liters(habits.water)} / ${liters(WATER_GOAL_ML)} L`}
            onPress={() => setHabit('water', habits.water + WATER_GLASS_ML)}
            hint={`Adds a ${WATER_GLASS_ML} ml glass`}
            trailing={
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setHabit('water', habits.water - WATER_GLASS_ML)}
                  disabled={habits.water <= 0}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove a glass of water"
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={24}
                    color={habits.water <= 0 ? colors.track : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setHabit('water', habits.water + WATER_GLASS_ML)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Add a glass of water"
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </Pressable>
              </View>
            }
          />
          <TaskRow
            done={workoutDone}
            label="Complete your workout"
            meta={workoutDone ? 'Done • +25 XP' : 'Tap when you finish training'}
            onPress={() => setHabit('workout', workoutDone ? 0 : 1)}
            checkbox
          />
          <TaskRow
            done={mealsDone}
            label="Log your meals"
            meta={`${meals.length} logged today`}
            onPress={() => router.push('/camera')}
            hint="Opens the meal scanner"
            last
          />
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
          <Pressable onPress={() => router.push('/log-food')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.sectionLink}>+ Add food</Text>
          </Pressable>
        </View>
        {meals.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No meals logged yet today. Scan your first meal to get started!</Text>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            {meals.map((meal, i) => {
              const a = meal.analysis_json ?? {};
              const mealType = meal.meal_type ? MEAL_TYPE_LABELS[meal.meal_type] : null;
              return (
                <Pressable
                  key={meal.id}
                  onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.mealRow, i < meals.length - 1 && styles.rowBorder, pressed && styles.pressed]}
                >
                  <View style={styles.mealIcon}>
                    <Ionicons name={meal.is_manual ? 'restaurant' : 'sparkles'} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.mealText}>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {meal.manual_name || (meal.is_manual ? 'Manual entry' : 'AI-analyzed meal')}
                    </Text>
                    <Text style={styles.mealMeta}>
                      {[mealType, formatTime(meal.created_at)].filter(Boolean).join(' · ')} · P{' '}
                      {Math.round(a.protein ?? 0)}g · C {Math.round(a.carbs ?? 0)}g · F {Math.round(a.fat ?? 0)}g
                    </Text>
                  </View>
                  <Text style={styles.mealKcal}>{Math.round(a.calories ?? 0)} kcal</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** One row of Today's Tasks; auto-completed tasks pass `done` from data, never local state. */
function TaskRow({
  done,
  label,
  meta,
  onPress,
  hint,
  trailing,
  checkbox,
  last,
}: {
  done: boolean;
  label: string;
  meta: string;
  onPress: () => void;
  hint?: string;
  trailing?: React.ReactNode;
  checkbox?: boolean;
  last?: boolean;
}) {
  // Trailing controls are buttons themselves, and a button can't contain another one (web),
  // so only the icon + text are pressable when there are trailing controls.
  const body = (
    <>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={done ? colors.primary : colors.textMuted}
      />
      <View style={styles.taskText}>
        <Text style={[styles.taskLabel, done && styles.taskDone]}>{label}</Text>
        <Text style={styles.taskMeta}>{meta}</Text>
      </View>
    </>
  );
  const pressableProps = {
    onPress,
    accessibilityRole: checkbox ? ('checkbox' as const) : ('button' as const),
    accessibilityState: checkbox ? { checked: done } : undefined,
    accessibilityHint: hint,
  };

  if (trailing) {
    return (
      <View style={[styles.taskRow, !last && styles.rowBorder]}>
        <Pressable {...pressableProps} style={({ pressed }) => [styles.taskMain, pressed && styles.pressed]}>
          {body}
        </Pressable>
        {trailing}
      </View>
    );
  }

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [styles.taskRow, !last && styles.rowBorder, pressed && styles.pressed]}
    >
      {body}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
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
  },  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  taskText: {
    flex: 1,
  },
  taskMeta: {
    ...type.caption,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  macroGap: {
    marginTop: 10,
  },
  macroValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    marginTop: 2,
  },
  logWeight: {
    alignItems: 'center',
    marginLeft: 12,
  },
  logWeightText: {
    ...type.caption,
    color: colors.primary,
  },
  streakHint: {
    ...type.caption,
    marginTop: 2,
  },
  level: {
    ...type.caption,
  },
  taskLabel: {
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
