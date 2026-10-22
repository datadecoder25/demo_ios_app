import { StyleSheet, Text, View } from 'react-native';

import type { Nutrients } from '@/components/foods/types';
import { colors, fonts, radius } from '@/constants/design';

const MACROS = [
  { key: 'protein', label: 'Protein', color: colors.primary },
  { key: 'carbs', label: 'Carbs', color: '#5AB0F0' },
  { key: 'fat', label: 'Fat', color: colors.amber },
  { key: 'fiber', label: 'Fiber', color: colors.teal },
] as const;

/** Big calorie number plus a four-up macro grid. */
export function NutrientSummary({ nutrients }: { nutrients: Nutrients }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.kcalRow}>
        <Text style={styles.kcal}>{Math.round(nutrients.calories).toLocaleString()}</Text>
        <Text style={styles.kcalUnit}>kcal</Text>
      </View>
      <View style={styles.grid}>
        {MACROS.map(m => (
          <View key={m.key} style={styles.cell}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <Text style={styles.value}>{Math.round(nutrients[m.key])}g</Text>
            <Text style={styles.label}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  kcal: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    color: colors.navy,
  },
  kcalUnit: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
