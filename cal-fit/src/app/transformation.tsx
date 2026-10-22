import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, IconCircle, ProgressBar, Screen } from '@/components/kit';
import { colors, fonts, radius, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { Alert } from '@/lib/alert';

// SAMPLE: there is no program tracking or progress-photo storage yet.
const CURRENT_WEEK = 4;
const PROGRAM_WEEKS = 12;
const SAMPLE_START_DELTA_KG = -1.5;
const WEEKLY_SUMMARY = [
  { icon: 'scale-outline', value: '+1.5 kg', label: 'Weight gain' },
  { icon: 'flame-outline', value: '+320 kcal', label: 'Avg. daily intake' },
  { icon: 'barbell-outline', value: '4/5', label: 'Workout completion' },
] as const;

function PhotoCard({ week, weight }: { week: number; weight: number }) {
  return (
    <Pressable
      onPress={() => Alert.alert('Coming soon', 'Progress photos will be available in a future update.')}
      accessibilityRole="button"
      accessibilityLabel={`Add week ${week} photo`}
      style={({ pressed }) => [styles.photoCard, pressed && styles.pressed]}
    >
      <View style={styles.photo}>
        <Ionicons name="person" size={56} color={colors.primaryBorder} />
        <View style={styles.addPhoto}>
          <Ionicons name="camera-outline" size={14} color={colors.primary} />
          <Text style={styles.addPhotoText}>Add photo</Text>
        </View>
      </View>
      <Text style={styles.photoWeek}>Week {week}</Text>
      <Text style={styles.photoWeight}>{weight} kg</Text>
    </Pressable>
  );
}

export default function TransformationScreen() {
  const { profile } = useUser();
  const currentWeight = Number(profile?.weight) || 62;
  const startWeight = Math.round((currentWeight + SAMPLE_START_DELTA_KG) * 10) / 10;
  const progress = CURRENT_WEEK / PROGRAM_WEEKS;

  return (
    <Screen onBack scroll backgroundColor={colors.background} contentStyle={styles.content}>
      <Text style={styles.title}>Your Transformation</Text>

      <Card>
        <View style={styles.row}>
          <Text style={styles.weekText}>
            Week {CURRENT_WEEK} of {PROGRAM_WEEKS}
          </Text>
          <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} style={styles.bar} />
      </Card>

      <View style={styles.photos}>
        <PhotoCard week={1} weight={startWeight} />
        <View style={styles.vs}>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
        <PhotoCard week={CURRENT_WEEK} weight={currentWeight} />
      </View>

      <Text style={styles.sectionTitle}>Weekly Summary</Text>
      <View style={styles.summary}>
        {WEEKLY_SUMMARY.map(item => (
          <Card key={item.label} style={styles.stat}>
            <IconCircle name={item.icon} size={34} />
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  title: {
    ...type.title,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  percent: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  bar: {
    marginTop: 12,
  },
  photos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  photo: {
    aspectRatio: 0.85,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addPhotoText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
  },
  photoWeek: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
    marginTop: 10,
  },
  photoWeight: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  vs: {
    width: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    ...type.subheading,
    marginTop: 4,
  },
  summary: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
