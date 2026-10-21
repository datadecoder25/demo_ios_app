import { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, Alert, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUser } from '@/contexts/UserContext';

export default function OnboardingScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    activityLevel: '',
    medicalConditions: '',
    goal: '',
    unitPreference: 'imperial' as 'imperial' | 'metric',
  });

  const activityLevels = [
    { label: 'Sedentary', value: 'sedentary' },
    { label: 'Lightly Active', value: 'lightly_active' },
    { label: 'Moderately Active', value: 'moderately_active' },
    { label: 'Very Active', value: 'very_active' },
    { label: 'Extra Active', value: 'extra_active' },
  ];

  const goals = [
    { label: 'Lose Weight', value: 'lose_weight' },
    { label: 'Maintain Weight', value: 'maintain_weight' },
    { label: 'Gain Weight', value: 'gain_weight' },
  ];

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const age = parseInt(formData.age) || 30;
      const height = parseInt(formData.height) || 170;
      const weight = parseInt(formData.weight) || 70;
      const activityMultiplier = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extra_active: 1.9,
      }[formData.activityLevel] || 1.2;

      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      bmr += 5;
      
      const dailyCalories = Math.round(bmr * activityMultiplier);

      router.replace('/home' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      console.error('Onboarding error:', error);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Let's set up your profile</Text>
          <Text style={styles.subtitle}>
            We'll use this information to personalize your nutrition recommendations.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height ({formData.unitPreference === 'imperial' ? 'inches' : 'cm'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your height"
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight ({formData.unitPreference === 'imperial' ? 'lbs' : 'kg'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your weight"
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Activity Level</Text>
            <View style={styles.chipContainer}>
              {activityLevels.map((level) => (
                <Pressable
                  key={level.value}
                  style={styles.chip}
                  onPress={() => setFormData({ ...formData, activityLevel: level.value })}
                >
                  <Text style={styles.chipText}>{level.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Goal</Text>
            <View style={styles.chipContainer}>
              {goals.map((goal) => (
                <Pressable
                  key={goal.value}
                  style={styles.chip}
                  onPress={() => setFormData({ ...formData, goal: goal.value })}
                >
                  <Text style={styles.chipText}>{goal.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical Conditions (optional)</Text>
            <TextInput
              style={styles.input}
              multiline={true}
              numberOfLines={3}
              value={formData.medicalConditions}
              onChangeText={(text) => setFormData({ ...formData, medicalConditions: text })}
              placeholder="e.g., Diabetes, Ketogenic diet, etc."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Units</Text>
            <View style={styles.unitContainer}>
              <Pressable 
                style={styles.unitChip}
                onPress={() => setFormData({ ...formData, unitPreference: 'imperial' })}
              >
                <Text style={styles.unitChipText}>Imperial (lbs, inches)</Text>
              </Pressable>
              <Pressable 
                style={styles.unitChip}
                onPress={() => setFormData({ ...formData, unitPreference: 'metric' })}
              >
                <Text style={styles.unitChipText}>Metric (kg, cm)</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>Complete Setup</Text>
          </Pressable>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  unitChip: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  unitChipText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
  },
  saveButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 12,
    textAlign: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
