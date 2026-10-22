import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, ProgressBar, SecondaryButton } from '@/components/kit';
import { colors, fonts, screenPadding } from '@/constants/design';
import type { AiAnalysisResponse } from '@/lib/ai';

interface ResultSheetProps {
  imageUri: string;
  title: string;
  analysis: AiAnalysisResponse;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  saveError: string | null;
}

/** Share of the meal's calories from each macro (4/4/9 kcal per gram). */
function macroShares(a: AiAnalysisResponse) {
  const kcal = { protein: a.protein * 4, carbs: a.carbs * 4, fat: a.fat * 9 };
  const total = kcal.protein + kcal.carbs + kcal.fat || 1;
  return { protein: kcal.protein / total, carbs: kcal.carbs / total, fat: kcal.fat / total };
}

function MacroRow({ label, grams, share, color }: { label: string; grams: number; share: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGrams}>{Math.round(grams)}g</Text>
        <Text style={styles.macroShare}>{Math.round(share * 100)}%</Text>
      </View>
      <ProgressBar progress={share} color={color} />
    </View>
  );
}

/** AI Result Modal (design #16): bottom sheet over the photo. */
export function ResultSheet({ imageUri, title, analysis, onSave, onClose, isSaving, saveError }: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const shares = macroShares(analysis);

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>

      <View style={styles.header}>
        <Image source={{ uri: imageUri }} style={styles.thumb} contentFit="cover" />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.kcal}>{Math.round(analysis.calories)} kcal</Text>
        </View>
      </View>

      <MacroRow label="Protein" grams={analysis.protein} share={shares.protein} color={colors.primary} />
      <MacroRow label="Carbs" grams={analysis.carbs} share={shares.carbs} color="#5AB0F0" />
      <MacroRow label="Fats" grams={analysis.fat} share={shares.fat} color={colors.amber} />

      {analysis.fiber !== undefined && (
        <Text style={styles.fiber}>Fiber {Math.round(analysis.fiber)}g</Text>
      )}

      {saveError && <Text style={styles.error}>{saveError}</Text>}

      <View style={styles.actions}>
        <PrimaryButton title="Save to Diary" onPress={onSave} loading={isSaving} />
        <SecondaryButton title="Close" onPress={onClose} disabled={isSaving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: screenPadding + 4,
    gap: 16,
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.track,
  },
  headerText: {
    flex: 1,
    paddingRight: 24,
    gap: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.navy,
  },
  kcal: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.navy,
  },
  macro: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  macroGrams: {
    width: 64,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  macroShare: {
    width: 44,
    textAlign: 'right',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  fiber: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
});
