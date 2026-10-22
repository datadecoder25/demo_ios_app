import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, fonts } from '@/constants/design';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'foods', title: 'Foods', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { name: 'progress', title: 'Progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 76,
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={size - 2} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
