import { StyleSheet, Text, View } from 'react-native';

import { Card, LogoMark, Screen } from '@/components/kit';
import { useTodayMeals } from '@/components/home/useTodayMeals';
import { colors, fonts, radius, type } from '@/constants/design';

interface NotificationItem {
  id: string;
  time: string;
  title: string;
  body: string;
}

// Sample notifications until push/reminders exist; the first one uses today's real calories.
const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  { id: 'streak', time: '1h ago', title: 'Day 14 complete! 🎉', body: "You're on a roll! Keep building that momentum." },
  { id: 'shake', time: '3h ago', title: 'Time for your protein shake', body: 'Your body needs fuel 💙' },
];

export default function NotificationsScreen() {
  const { caloriesLeft, targets, eaten } = useTodayMeals();
  const percent = targets.calories > 0 ? Math.round((eaten.calories / targets.calories) * 100) : 0;

  const items: NotificationItem[] = [
    {
      id: 'calories',
      time: '2m ago',
      title: `You still need ${caloriesLeft.toLocaleString()} calories today`,
      body: `Keep going! You're ${Math.min(percent, 100)}% there 💪`,
    },
    ...SAMPLE_NOTIFICATIONS,
  ];

  return (
    <Screen onBack scroll backgroundColor={colors.background}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.list}>
        {items.map(item => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.icon}>
              <LogoMark size={28} />
            </View>
            <View style={styles.text}>
              <View style={styles.topRow}>
                <Text style={styles.app}>Cal-Fit</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </Card>
        ))}
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
});
