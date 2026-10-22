import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, IconCircle, OptionCard, PrimaryButton, ProgressBar, Screen } from '@/components/kit';
import { SliderCard } from '@/components/onboarding/SliderCard';
import { colors, fonts, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import {
  ACTIVITY_LEVELS,
  calculateTargets,
  Gender,
  GOALS,
  GYM_EXPERIENCE,
  MACRO_SPLIT,
} from '@/lib/nutrition';

const STEP_COUNT = 8;

const GOAL_COPY: Record<string, string> = {
  gain_weight: 'This will help you gain weight and build muscle steadily.',
  build_muscle: 'This will fuel muscle growth while keeping you lean.',
  get_stronger: 'This will give you the energy to get stronger every week.',
  improve_health: 'This will keep you energized and support a healthier you.',
};

export default function OnboardingScreen() {
  const { saveProfile } = useUser();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender | null>(null);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(62);
  const [goalWeight, setGoalWeight] = useState(75);
  const [activity, setActivity] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const targets =
    gender && activity && goal
      ? calculateTargets({
          gender,
          heightCm: height,
          weightKg: weight,
          goalWeightKg: goalWeight,
          activityLevel: activity,
          goal,
        })
      : null;

  // Whether "Next" is enabled on each step (sliders always have a value).
  const canContinue = [!!gender, true, true, true, !!activity, !!experience, !!goal, !!targets][step];
  const isLast = step === STEP_COUNT - 1;

  async function handleFinish() {
    if (!targets || !gender) return;
    setIsSaving(true);
    try {
      await saveProfile({
        gender,
        height,
        weight,
        goal_weight: goalWeight,
        activity_level: activity,
        gym_experience: experience,
        goal,
        unit_preference: 'metric',
        daily_calorie_target: targets.calories,
        age: null,
      });
      // The root layout's guards switch to the tabs once the profile exists; this is a fallback.
      router.replace('/');
    } catch (error) {
      console.error('Onboarding save error:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <Screen
      scroll
      onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
      contentStyle={step === 0 ? styles.firstStep : undefined}
      footer={
        <PrimaryButton
          title={isLast ? 'Start My Journey' : 'Next'}
          disabled={!canContinue}
          loading={isSaving}
          onPress={isLast ? handleFinish : () => setStep(s => s + 1)}
        />
      }
    >
      {step === 0 && (
        <Step title="What's your gender?" subtitle="We'll use this to calculate your calorie needs.">
          <OptionCard
            title="Male"
            selected={gender === 'male'}
            onPress={() => setGender('male')}
            leading={<IconCircle name="man" active={gender === 'male'} />}
          />
          <OptionCard
            title="Female"
            selected={gender === 'female'}
            onPress={() => setGender('female')}
            leading={
              <IconCircle
                name="woman"
                background={gender === 'female' ? '#8B5CF6' : '#F1EBFF'}
                color={gender === 'female' ? colors.white : '#8B5CF6'}
              />
            }
          />
        </Step>
      )}

      {step === 1 && (
        <Step title="What's your height?" subtitle="We'll use this to calculate your calorie needs.">
          <SliderCard label="Height" value={height} unit="cm" min={140} max={210} icon="body-outline" onChange={setHeight} />
        </Step>
      )}

      {step === 2 && (
        <Step title="What's your current weight?" subtitle="This helps us track your progress.">
          <SliderCard label="Current weight" value={weight} unit="kg" min={50} max={120} icon="scale-outline" onChange={setWeight} />
        </Step>
      )}

      {step === 3 && (
        <Step title="What's your goal weight?" subtitle="Set a realistic target for steady progress.">
          <SliderCard label="Goal weight" value={goalWeight} unit="kg" min={50} max={150} icon="locate-outline" onChange={setGoalWeight} />
        </Step>
      )}

      {step === 4 && (
        <Step title="How active are you?" subtitle="This helps us set the right calorie target for you.">
          {ACTIVITY_LEVELS.map(level => (
            <OptionCard
              key={level.value}
              icon={level.icon}
              title={level.label}
              subtitle={level.subtitle}
              selected={activity === level.value}
              onPress={() => setActivity(level.value)}
            />
          ))}
        </Step>
      )}

      {step === 5 && (
        <Step title="How much gym experience do you have?">
          {GYM_EXPERIENCE.map(level => (
            <OptionCard
              key={level.value}
              icon={level.icon}
              title={level.label}
              subtitle={level.subtitle}
              selected={experience === level.value}
              onPress={() => setExperience(level.value)}
            />
          ))}
        </Step>
      )}

      {step === 6 && (
        <Step title="What's your main goal?">
          {GOALS.map(option => (
            <OptionCard
              key={option.value}
              icon={option.icon}
              title={option.label}
              selected={goal === option.value}
              onPress={() => setGoal(option.value)}
            />
          ))}
        </Step>
      )}

      {step === 7 && targets && (
        <View style={styles.result}>
          <View style={styles.halo}>
            <View style={styles.haloInner}>
              <Ionicons name="flame" size={34} color={colors.white} />
            </View>
          </View>
          <Text style={styles.resultLabel}>Your daily calorie target</Text>
          <Text style={styles.resultValue}>{targets.calories.toLocaleString('en-US')}</Text>
          <Text style={styles.resultUnit}>calories</Text>

          <Card style={styles.macros}>
            <MacroRow label="Protein" grams={targets.protein} share={MACRO_SPLIT.protein} color={colors.primary} />
            <MacroRow label="Carbs" grams={targets.carbs} share={MACRO_SPLIT.carbs} color={colors.teal} />
            <MacroRow label="Fats" grams={targets.fat} share={MACRO_SPLIT.fat} color={colors.amber} last />
          </Card>

          <Text style={styles.resultCopy}>{GOAL_COPY[goal ?? ''] ?? GOAL_COPY.gain_weight}</Text>
        </View>
      )}
    </Screen>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function MacroRow({
  label,
  grams,
  share,
  color,
  last,
}: {
  label: string;
  grams: number;
  share: number;
  color: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.macroRow, !last && styles.macroRowSpacing]}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGrams}>{grams}g</Text>
        <Text style={styles.macroShare}>{Math.round(share * 100)}%</Text>
      </View>
      <ProgressBar progress={share} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  firstStep: {
    paddingTop: 40,
  },
  title: {
    ...type.title,
    marginTop: 16,
  },
  subtitle: {
    ...type.body,
    marginTop: 8,
  },
  options: {
    marginTop: 28,
    gap: 12,
  },
  result: {
    alignItems: 'center',
    paddingTop: 16,
  },
  halo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  haloInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLabel: {
    ...type.subheading,
  },
  resultValue: {
    fontFamily: fonts.extrabold,
    fontSize: 48,
    lineHeight: 56,
    color: colors.navy,
    marginTop: 8,
  },
  resultUnit: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.navy,
  },
  macros: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
  macroRow: {
    gap: 8,
  },
  macroRowSpacing: {
    marginBottom: 18,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  macroGrams: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    width: 64,
    textAlign: 'right',
  },
  macroShare: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    width: 48,
    textAlign: 'right',
  },
  resultCopy: {
    ...type.body,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
});
