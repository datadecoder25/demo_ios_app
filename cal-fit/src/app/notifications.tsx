import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, LogoMark, Screen } from '@/components/kit';
import { useTodayMeals } from '@/components/home/useTodayMeals';
import { colors, fonts, radius, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { useStats } from '@/hooks/useStats';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { Meal, mealApi, WeightLog, weightApi } from '@/lib/db';
import { WATER_GOAL_ML } from '@/lib/nutrition';

interface FeedItem {
  id: string;
  at: Date;
  title: string;
  body: string;
}

const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]);
const RECENT_MEALS = 10;
const RECENT_WEIGH_INS = 5;

function relativeTime(date: Date, now: Date) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Recent meals and weigh-ins for the feed; today's totals come from the shared hooks. */
function useHistory() {
  const { user } = useUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weighIns, setWeighIns] = useState<WeightLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      Promise.all([mealApi.getRecent(user.id, RECENT_MEALS), weightApi.list(user.id)]).then(([m, w]) => {
        if (!active) return;
        // Keep the current feed when a request fails.
        if (!m.error) setMeals(m.data ?? []);
        if (!w.error) setWeighIns(w.data ?? []);
      });
      return () => {
        active = false;
      };
    }, [user])
  );

  return { meals, weighIns };
}

/** Activity feed built from the user's real data (newest first). */
export default function NotificationsScreen() {
  const { meals: todayMeals, caloriesLeft, targets, eaten } = useTodayMeals();
  const { stats } = useStats();
  const { water } = useTodayHabits();
  const { meals, weighIns } = useHistory();

  const now = new Date();
  const items: FeedItem[] = [];

  if (targets.calories > 0) {
    const percent = Math.round((eaten.calories / targets.calories) * 100);
    if (todayMeals.length === 0) {
      items.push({
        id: 'calories',
        at: now,
        title: `Your target today is ${targets.calories.toLocaleString()} calories`,
        body: 'Scan or add your first meal to start tracking.',
      });
    } else if (percent > 110) {
      items.push({
        id: 'calories',
        at: now,
        title: `You're ${Math.round(eaten.calories - targets.calories).toLocaleString()} calories over today`,
        body: 'No stress — tomorrow is a fresh start.',
      });
    } else if (percent >= 90) {
      items.push({ id: 'calories', at: now, title: 'Calorie target hit! 🎯', body: `${percent}% of your goal • +50 XP` });
    } else {
      items.push({
        id: 'calories',
        at: now,
        title: `You still need ${caloriesLeft.toLocaleString()} calories today`,
        body: `Keep going! You're ${percent}% there 💪`,
      });
    }
  }

  if (stats && stats.current_streak > 0) {
    const lastMealToday = todayMeals[0] ? new Date(todayMeals[0].created_at) : null;
    if (!stats.logged_today && now.getHours() >= 17) {
      items.push({
        id: 'streak-risk',
        at: now,
        title: `Don't lose your ${stats.current_streak}-day streak 🔥`,
        body: 'Log a meal before midnight to keep it alive.',
      });
    } else if (stats.logged_today && lastMealToday && STREAK_MILESTONES.has(stats.current_streak)) {
      items.push({
        id: 'streak-milestone',
        at: lastMealToday,
        title: `Day ${stats.current_streak} complete! 🎉`,
        body: "You're on a roll! Keep building that momentum.",
      });
    }
  }

  if (water >= WATER_GOAL_ML) {
    items.push({ id: 'water', at: now, title: 'Water goal reached 💧', body: `${(water / 1000).toFixed(1)} L today` });
  } else if (now.getHours() >= 12) {
    items.push({
      id: 'water',
      at: now,
      title: `You've had ${(water / 1000).toFixed(1)} of ${(WATER_GOAL_ML / 1000).toFixed(1)} L water`,
      body: 'Tap the water task on Home after each glass.',
    });
  }

  for (const meal of meals) {
    const kcal = Math.round(Number(meal.analysis_json?.calories) || 0);
    items.push({
      id: `meal-${meal.id}`,
      at: new Date(meal.created_at),
      title: `Logged ${meal.manual_name || 'a meal'}`,
      body: `${kcal.toLocaleString()} kcal • ${meal.is_manual ? 'Added manually' : 'Analyzed by AI'}`,
    });
  }

  weighIns.slice(-RECENT_WEIGH_INS).forEach((entry, i, recent) => {
    const index = weighIns.length - recent.length + i;
    const previous = index > 0 ? Number(weighIns[index - 1].weight_kg) : null;
    const delta = previous == null ? null : Math.round((Number(entry.weight_kg) - previous) * 10) / 10;
    items.push({
      id: `weight-${entry.id}`,
      at: new Date(entry.logged_at),
      title: `Weight check-in: ${Number(entry.weight_kg)} kg`,
      body:
        delta == null
          ? 'Your starting point. Every check-in builds your trend.'
          : delta === 0
            ? 'Same as last time • +20 XP'
            : `${delta > 0 ? '+' : ''}${delta} kg since your last check-in • +20 XP`,
    });
  });

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <Screen onBack scroll backgroundColor={colors.background}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.list}>
        {items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Nothing here yet. Your meals, check-ins and milestones will show up here.</Text>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.icon}>
                <LogoMark size={28} />
              </View>
              <View style={styles.text}>
                <View style={styles.topRow}>
                  <Text style={styles.app}>Cal-Fit</Text>
                  <Text style={styles.time}>{relativeTime(item.at, now)}</Text>
                </View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    marginTop: 8,
  },
  list: {
    gap: 12,
    marginTop: 18,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  app: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  time: {
    ...type.caption,
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
    marginTop: 6,
  },
  body: {
    ...type.body,
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    ...type.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
