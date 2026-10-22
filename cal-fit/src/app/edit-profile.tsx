import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chips, PrimaryButton, Screen, TextField } from '@/components/kit';
import { colors, fonts, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { ACTIVITY_LEVELS, calculateTargets, Gender, GOALS, GYM_EXPERIENCE } from '@/lib/nutrition';
import { goBack } from '@/lib/navigation';

const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
] as const satisfies readonly { label: string; value: Gender }[];

// Same ranges as onboarding's sliders, a little wider since typed values are exact.
const LIMITS = {
  age: { min: 14, max: 100, label: 'Age', unit: 'years' },
  height: { min: 120, max: 230, label: 'Height', unit: 'cm' },
  weight: { min: 30, max: 300, label: 'Current weight', unit: 'kg' },
  goalWeight: { min: 30, max: 300, label: 'Goal weight', unit: 'kg' },
} as const;

type NumberField = keyof typeof LIMITS;

/** Parses "72,5" / "72.5"; NaN for anything else. */
function parseNumber(text: string) {
  return text.trim() ? Number(text.replace(',', '.')) : NaN;
}

function initial(value: number | string | null | undefined) {
  return value == null ? '' : String(Number(value));
}

export default function EditProfileScreen() {
  const { profile, saveProfile } = useUser();
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'male');
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    age: initial(profile?.age),
    height: initial(profile?.height),
    weight: initial(profile?.weight),
    goalWeight: initial(profile?.goal_weight),
  });
  const [activity, setActivity] = useState<string>(profile?.activity_level ?? 'sedentary');
  const [experience, setExperience] = useState<string>(profile?.gym_experience ?? 'none');
  const [goal, setGoal] = useState<string>(profile?.goal ?? 'improve_health');
  const [isSaving, setIsSaving] = useState(false);

  const values = Object.fromEntries(
    Object.entries(numbers).map(([key, text]) => [key, parseNumber(text)])
  ) as Record<NumberField, number>;

  const errors = (Object.keys(LIMITS) as NumberField[]).flatMap(key => {
    const { min, max, label, unit } = LIMITS[key];
    const v = values[key];
    if (!numbers[key].trim()) return [`Enter your ${label.toLowerCase()} to see your daily target.`];
    return Number.isFinite(v) && v >= min && v <= max ? [] : [`${label} must be ${min}–${max} ${unit}.`];
  });

  const targets =
    errors.length === 0
      ? calculateTargets({
          gender,
          age: Math.round(values.age),
          heightCm: values.height,
          weightKg: values.weight,
          goalWeightKg: values.goalWeight,
          activityLevel: activity,
          goal,
        })
      : null;

  async function handleSave() {
    if (!targets) return;
    setIsSaving(true);
    try {
      // saveProfile recalculates the target from these fields and logs a changed weight.
      await saveProfile({
        gender,
        age: Math.round(values.age),
        height: values.height,
        weight: Math.round(values.weight * 10) / 10,
        goal_weight: Math.round(values.goalWeight * 10) / 10,
        activity_level: activity,
        gym_experience: experience,
        goal,
      });
      goBack();
    } catch (error) {
      console.error('Edit profile error:', error);
      Alert.alert('Not saved', 'We could not save your profile. Please try again.');
      setIsSaving(false);
    }
  }

  const field = (key: NumberField, decimals: boolean) => (
    <View style={styles.field}>
      <TextField
        label={`${LIMITS[key].label} (${LIMITS[key].unit})`}
        value={numbers[key]}
        onChangeText={text => setNumbers(n => ({ ...n, [key]: text }))}
        keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
        inputMode={decimals ? 'decimal' : 'numeric'}
        placeholder="–"
      />
    </View>
  );

  return (
    <Screen
      onBack
      scroll
      footer={<PrimaryButton title="Save Changes" onPress={handleSave} loading={isSaving} disabled={!targets} />}
    >
      <Text style={styles.title}>My Goals & Body</Text>
      <Text style={styles.subtitle}>Your daily targets update automatically when you save.</Text>

      <Card style={styles.targetCard}>
        <Text style={styles.targetLabel}>Daily calorie target</Text>
        <Text style={styles.targetValue}>{targets ? targets.calories.toLocaleString('en-US') : '–'} kcal</Text>
        <Text style={styles.targetMacros}>
          {targets
            ? `Protein ${targets.protein}g • Carbs ${targets.carbs}g • Fats ${targets.fat}g`
            : errors[0]}
        </Text>
      </Card>

      <Section title="Gender">
        <Chips options={GENDERS} value={gender} onChange={setGender} />
      </Section>

      <Section title="Body">
        <View style={styles.grid}>
          {field('age', false)}
          {field('height', true)}
        </View>
        <View style={styles.grid}>
          {field('weight', true)}
          {field('goalWeight', true)}
        </View>
      </Section>

      <Section title="Activity level">
        <Chips options={ACTIVITY_LEVELS} value={activity} onChange={setActivity} />
      </Section>

      <Section title="Gym experience">
        <Chips options={GYM_EXPERIENCE} value={experience} onChange={setExperience} />
      </Section>

      <Section title="Main goal">
        <Chips options={GOALS} value={goal} onChange={setGoal} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    marginTop: 8,
  },
  subtitle: {
    ...type.body,
    marginTop: 6,
  },
  targetCard: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryBorder,
  },
  targetLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  targetValue: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    color: colors.navy,
    marginTop: 4,
  },
  targetMacros: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 22,
    gap: 10,
  },
  sectionTitle: {
    ...type.subheading,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
});
