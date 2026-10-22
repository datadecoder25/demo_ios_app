import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { nutrientsOf, scaleNutrients } from '@/components/foods/types';
import { Card, PrimaryButton, Screen, TextField } from '@/components/kit';
import { defaultMealType, mealTypeLabel, MealTypePicker, Stepper } from '@/components/meal/MealControls';
import { NutrientSummary } from '@/components/meal/NutrientSummary';
import { colors, fonts, radius, type } from '@/constants/design';
import { Alert } from '@/lib/alert';
import { Meal, mealApi, MealType } from '@/lib/db';
import { getPhotoUrls } from '@/lib/photos';
import { goBack } from '@/lib/navigation';

function formatWhen(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; meal: Meal };

/** One diary entry: photo, nutrients, rename / re-categorize / re-portion, delete. */
export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('snack');
  const [portion, setPortion] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await mealApi.getById(String(id));
      const meal = data?.[0] as (Meal & { is_deleted?: boolean }) | undefined;
      if (!active) return;
      if (!meal || meal.is_deleted) {
        setState({ status: 'missing' });
        return;
      }

      setState({ status: 'ready', meal });
      setName(meal.manual_name ?? '');
      setMealType(meal.meal_type ?? defaultMealType(new Date(meal.created_at)));

      if (meal.photo_url) {
        const urls = await getPhotoUrls([meal.photo_url]);
        if (active) setPhotoUrl(urls[meal.photo_url] ?? null);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  function close() {
    goBack();
  }

  if (state.status !== 'ready') {
    return (
      <Screen onBack backgroundColor={colors.background}>
        <View style={styles.centered}>
          {state.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="search-outline" size={32} color={colors.textMuted} />
              <Text style={styles.missingTitle}>Meal not found</Text>
              <Text style={styles.missingText}>It may have been deleted.</Text>
            </>
          )}
        </View>
      </Screen>
    );
  }

  const { meal } = state;
  const analysis = meal.analysis_json ?? {};
  const totals = scaleNutrients(nutrientsOf(analysis), portion);
  const fallbackName = meal.is_manual ? 'Manual entry' : 'AI-analyzed meal';
  const dirty =
    portion !== 1 || name.trim() !== (meal.manual_name ?? '') || mealType !== (meal.meal_type ?? null);

  async function handleSave() {
    if (isSaving) return;
    if (name.trim().length > 120) {
      setError('That name is too long.');
      return;
    }

    setIsSaving(true);
    setError(null);
    const servings = Number(analysis.servings) > 0 ? Number(analysis.servings) : 1;
    const { data, error: saveError } = await mealApi.update(meal.id, {
      manual_name: name.trim() || null,
      meal_type: mealType,
      analysis_json:
        portion === 1 ? analysis : { ...analysis, ...totals, servings: Math.round(servings * portion * 1000) / 1000 },
    });
    setIsSaving(false);

    if (saveError || !data?.[0]) {
      setError('Could not save your changes. Please try again.');
      return;
    }
    close();
  }

  function confirmDelete() {
    Alert.alert('Delete meal', 'Remove this meal from your diary?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          const { error: deleteError } = await mealApi.delete(meal.id);
          setIsDeleting(false);
          if (deleteError) {
            setError('Could not delete this meal. Please try again.');
            return;
          }
          close();
        },
      },
    ]);
  }

  return (
    <Screen
      onBack
      scroll
      backgroundColor={colors.background}
      contentStyle={styles.content}
      footer={<PrimaryButton title="Save Changes" onPress={handleSave} loading={isSaving} disabled={!dirty || isDeleting} />}
    >
      {meal.photo_url ? (
        <View style={styles.photo}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      ) : null}

      <View>
        <Text style={styles.title}>{name.trim() || meal.manual_name || fallbackName}</Text>
        <Text style={styles.meta}>
          {formatWhen(meal.created_at)}
          {mealTypeLabel(meal.meal_type) ? ` · ${mealTypeLabel(meal.meal_type)}` : ''}
          {meal.is_manual ? '' : ' · AI estimate'}
        </Text>
      </View>

      <Card style={styles.card}>
        <NutrientSummary nutrients={totals} />
        {Array.isArray(analysis.ingredients) && analysis.ingredients.length > 0 && (
          <Text style={styles.ingredients}>Detected: {analysis.ingredients.join(', ')}</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.portionRow}>
          <View style={styles.portionText}>
            <Text style={styles.cardTitle}>Portion</Text>
            <Text style={styles.hint}>Scale this entry if you ate more or less.</Text>
          </View>
          <Stepper value={portion} onChange={setPortion} step={0.25} min={0.25} max={5} label="portion" />
        </View>
      </Card>

      <Card style={styles.card}>
        <TextField label="Name" placeholder={fallbackName} value={name} onChangeText={setName} maxLength={120} />
        <Text style={styles.cardTitle}>Meal</Text>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={confirmDelete}
        disabled={isDeleting}
        accessibilityRole="button"
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
      >
        {isDeleting ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>Delete meal</Text>
          </>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  missingTitle: {
    ...type.subheading,
  },
  missingText: {
    ...type.body,
  },
  photo: {
    marginTop: 8,
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.title,
    marginTop: 8,
  },
  meta: {
    ...type.body,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...type.subheading,
  },
  hint: {
    ...type.caption,
    marginTop: 2,
  },
  ingredients: {
    ...type.body,
    fontSize: 13,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portionText: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  deleteText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
});
