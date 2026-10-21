import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUser } from '@/contexts/UserContext';

export default function ProfileScreen() {
  const { user, signOut } = useUser();
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>('imperial');
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      "Are you sure you want to sign out?",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleUnitToggle = () => {
    const newPreference = unitPreference === 'imperial' ? 'metric' : 'imperial';
    setUnitPreference(newPreference);
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Units</Text>
              <Text style={styles.settingValue}>
                {unitPreference === 'imperial' ? 'Imperial (lbs, inches)' : 'Metric (kg, cm)'}
              </Text>
              <Pressable 
                style={styles.unitChip}
                onPress={handleUnitToggle}
              >
                <Text style={styles.unitChipText}>
                  {unitPreference === 'imperial' ? 'Imperial' : 'Metric'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingValue}>Use dark theme</Text>
              <Switch value={darkMode} onValueChange={handleDarkModeToggle} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>30</Text>
              <Text style={styles.statUnit}>years</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>5'9"</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>165 lbs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>
          
          <View style={styles.goalCard}>
            <View style={styles.goalContent}>
              <Text style={styles.goalLabel}>Current Goal</Text>
              <View style={styles.goalChipContainer}>
                <Text style={styles.goalChip}>Lose Weight</Text>
              </View>
              
              <Text style={styles.goalLabel}>Activity Level</Text>
              <View style={styles.goalChipContainer}>
                <Text style={styles.goalChip}>Moderately Active</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={styles.editButton}
            onPress={() => Alert.alert('Edit Profile', 'Feature coming soon!')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
          
          <Pressable 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CalFit v1.0.0</Text>
          <Text style={styles.footerText}>© 2026 CalFit Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#208AEF',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  unitChip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#208AEF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  goalContent: {
    gap: 8,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#208AEF',
    padding: 14,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#f44336',
    padding: 14,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#f44336',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    color: '#999',
  },
});
