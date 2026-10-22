import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FoodDraft, Nutrients, scaleNutrients } from '@/components/foods/types';
import { Card, Chips, PrimaryButton, Screen, TextField } from '@/components/kit';
import { defaultMealType, MealTypePicker, Stepper } from '@/components/meal/MealControls';
import { NutrientSummary } from '@/components/meal/NutrientSummary';
import { colors, fonts, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';
import { mealApi, MealType } from '@/lib/db';
import { goBack } from '@/lib/navigation';

type AmountMode = 'servings' | 'grams';

const AMOUNT_MODES = [
  { label: 'Servings', value: 'servings' },
  { label: 'Grams', value: 'grams' },
] as const satisfies readonly { label: string; value: AmountMode }[];

const NUTRIENT_FIELDS = [
  { key: 'calories', label: 'Calories (kcal)', max: 5000, required: true },
  { key: 'protein', label: 'Protein (g)', max: 500 },
  { key: 'carbs', label: 'Carbs (g)', max: 1000 },
  { key: 'fat', label: 'Fat (g)', max: 500 },
  { key: 'fiber', label: 'Fiber (g)', max: 200 },
] as const satisfies readonly { key: keyof Nutrients; label: string; max: number; required?: boolean }[];

function parseDraft(raw: string | string[] | undefined): FoodDraft | null {
  if (typeof raw !== 'string') return null;
  try {
    const draft = JSON.parse(raw) as FoodDraft;
    return draft && typeof draft.name === 'string' && draft.nutrients ? draft : null;
  } catch {
    return null;
  }
}

/** "12.5" → 12.5; blank → 0; anything else → NaN. Accepts a comma decimal separator. */
function parseAmount(text: string): number {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return 0;
  return /^\d*\.?\d*$/.test(trimmed) ? Number(trimmed) : NaN;
}

/** Log a food to today's diary: a search result / common / recent food, or a custom entry. */
export default function LogFoodScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams<{ food?: string }>();
  const draft = useMemo(() => parseDraft(params.food), [params.food]);
  const isCustom = !draft;

  const [name, setName] = useState(draft?.name ?? '');
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [mode, setMode] = useState<AmountMode>('servings');
  const [servings, setServings] = useState(1);
  const [gramsText, setGramsText] = useState(draft?.servingGrams ? String(Math.round(draft.servingGrams)) : '100');
  const [custom, setCustom] = useState<Record<keyof Nutrients, string>>({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grams = parseAmount(gramsText);
  const factor = mode === 'grams' && draft?.servingGrams ? grams / draft.servingGrams : servings;

  const perServing: Nutrients = draft
    ? draft.nutrients
    : {
        calories: parseAmount(custom.calories),
        protein: parseAmount(custom.protein),
        carbs: parseAmount(custom.carbs),
        fat: parseAmount(custom.fat),
        fiber: parseAmount(custom.fiber),
      };
  // Invalid inputs preview as 0; validate() blocks saving them.
  const finite = (n: number) => (Number.isFinite(n) ? n : 0);
  const totals = scaleNutrients(
    {
      calories: finite(perServing.calories),
      protein: finite(perServing.protein),
      carbs: finite(perServing.carbs),
      fat: finite(perServing.fat),
      fiber: finite(perServing.fiber),
    },
    finite(factor)
  );

  function validate(): string | null {
    if (!name.trim()) return 'Give this food a name.';
    if (name.trim().length > 120) return 'That name is too long.';
    if (isCustom) {
      for (const field of NUTRIENT_FIELDS) {
        const value = perServing[field.key];
        if (!Number.isFinite(value)) return `${field.label} must be a number.`;
        if (value > field.max) return `${field.label} looks too high (max ${field.max}).`;
      }
      if (!custom.calories.trim()) return 'Enter the calories.';
    }
    if (mode === 'grams') {
      if (!Number.isFinite(grams) || grams <= 0) return 'Enter the amount in grams.';
      if (grams > 5000) return 'That amount looks too high (max 5000 g).';
    }
    return null;
  }

  async function handleSave() {
    if (!user || isSaving) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    setError(null);
    const { data, error: saveError } = await mealApi.create({
      user_id: user.id,
      photo_url: null,
      is_manual: true,
      manual_name: name.trim(),
      meal_type: mealType,
      analysis_json: {
        ...totals,
        servings: Math.round(factor * 1000) / 1000,
        servingLabel: draft?.servingLabel ?? '1 serving',
        servingGrams: draft?.servingGrams ?? null,
        brand: draft?.brand ?? null,
        source: draft?.source ?? 'custom',
      },
    });
    setIsSaving(false);

    if (saveError || !data?.[0]) {
      setError('Could not save this food. Please try again.');
      return;
    }
    goBack();
    Alert.alert('Logged', `${name.trim()} was added to your diary.`);
  }

  return (
    <Screen
      onBack
      scroll
      backgroundColor={colors.background}
      contentStyle={styles.content}
      footer={<PrimaryButton title="Add to Diary" icon="add" onPress={handleSave} loading={isSaving} />}
    >
      <Text style={styles.title}>{isCustom ? 'Custom food' : 'Log food'}</Text>
      {draft?.brand ? <Text style={styles.subtitle}>{draft.brand}</Text> : null}

      <TextField label="Name" placeholder="e.g. Chicken salad" value={name} onChangeText={setName} maxLength={120} />

      {isCustom && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Nutrition per serving</Text>
          {NUTRIENT_FIELDS.map(field => (
            <TextField
              key={field.key}
              label={field.label}
              placeholder={'required' in field ? 'Required' : '0'}
              value={custom[field.key]}
              onChangeText={value => setCustom(c => ({ ...c, [field.key]: value }))}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          ))}
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Amount</Text>
        {draft?.servingGrams ? <Chips options={AMOUNT_MODES} value={mode} onChange={setMode} /> : null}
        {mode === 'grams' && draft?.servingGrams ? (
          <TextField
            label="Grams"
            value={gramsText}
            onChangeText={setGramsText}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        ) : (
          <View style={styles.servingsRow}>
            <View style={styles.servingsText}>
              <Text style={styles.servingsLabel}>Servings</Text>
              <Text style={styles.servingsHint}>1 serving = {draft?.servingLabel ?? 'what you entered above'}</Text>
            </View>
            <Stepper
              value={servings}
              onChange={setServings}
              step={0.5}
              min={0.5}
              max={20}
              format={v => String(parseFloat(v.toFixed(2)))}
              label="servings"
            />
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Meal</Text>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>You&apos;re logging</Text>
        <NutrientSummary nutrients={totals} />
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  title: {
    ...type.title,
    marginTop: 8,
  },
  subtitle: {
    ...type.body,
    marginTop: -10,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...type.subheading,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servingsText: {
    flex: 1,
  },
  servingsLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  servingsHint: {
    ...type.caption,
    marginTop: 2,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
});
