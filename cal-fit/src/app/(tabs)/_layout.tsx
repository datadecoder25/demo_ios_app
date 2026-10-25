import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/design';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'foods', title: 'Foods', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { name: 'progress', title: 'Progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

const TAB_BAR_HEIGHT = 58;

export default function TabLayout() {
  // Android draws edge-to-edge, so the system navigation bar sits over the bottom of the
  // screen; the tab bar grows by that inset (and the iPhone home indicator's) to stay above it.
  const { bottom } = useSafeAreaInsets();
  const bottomPadding = Math.max(bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
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
