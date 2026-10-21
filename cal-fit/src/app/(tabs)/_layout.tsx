import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = colorScheme === 'dark' ? '#fff' : '#208AEF';
  const inactiveColor = colorScheme === 'dark' ? '#888' : '#666';
  const backgroundColor = colorScheme === 'dark' ? '#1c1c1e' : '#ffffff';
  const borderColor = colorScheme === 'dark' ? '#333' : '#e0e0e0';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor as any,
        tabBarInactiveTintColor: inactiveColor as any,
        tabBarStyle: {
          backgroundColor: backgroundColor as any,
          borderTopColor: borderColor as any,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Log',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
