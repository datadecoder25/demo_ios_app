import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chips } from '@/components/kit';
import { colors, fonts, radius } from '@/constants/design';
import type { MealType } from '@/lib/db';

export const MEAL_TYPES = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
] as const satisfies readonly { label: string; value: MealType }[];

/** Breakfast before 11:00, lunch until 16:00, dinner until 22:00, otherwise a snack. */
export function defaultMealType(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export function mealTypeLabel(type: MealType | null | undefined): string | null {
  return MEAL_TYPES.find(t => t.value === type)?.label ?? null;
}

export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (value: MealType) => void }) {
  return <Chips options={MEAL_TYPES} value={value} onChange={onChange} />;
}

/** 1 → "1×", 0.25 → "0.25×", 1.5 → "1.5×". */
export function formatMultiplier(value: number): string {
  return `${parseFloat(value.toFixed(2))}×`;
}

/** − value + stepper used for servings and portion size. */
export function Stepper({
  value,
  onChange,
  step = 0.5,
  min = 0.5,
  max = 10,
  format = formatMultiplier,
  label,
  dark,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  label: string;
  /** Higher-contrast variant for use on tinted backgrounds. */
  dark?: boolean;
}) {
  const round = (v: number) => Math.round(v / step) * step;
  const dec = () => onChange(Math.max(min, round(value - step)));
  const inc = () => onChange(Math.min(max, round(value + step)));

  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={dec}
        disabled={value <= min}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        style={[styles.stepButton, dark && styles.stepButtonDark, value <= min && styles.disabled]}
      >
        <Ionicons name="remove" size={20} color={colors.primary} />
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${label} ${format(value)}`}>
        {format(value)}
      </Text>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        style={[styles.stepButton, dark && styles.stepButtonDark, value >= max && styles.disabled]}
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDark: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  stepValue: {
    minWidth: 56,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  disabled: {
    opacity: 0.4,
  },
});
