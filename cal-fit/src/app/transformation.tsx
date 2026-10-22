import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, IconCircle, PrimaryButton, ProgressBar, Screen } from '@/components/kit';
import { shortDate, signedKg, useProgressData } from '@/components/progress/useProgressData';
import { colors, fonts, radius, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { WeightLog } from '@/lib/db';
import { getPhotoUrls } from '@/lib/photos';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekOf(log: WeightLog, start: WeightLog): number {
  return Math.floor((new Date(log.logged_at).getTime() - new Date(start.logged_at).getTime()) / WEEK_MS) + 1;
}

function PhotoCard({
  title,
  log,
  url,
  emptyLabel,
}: {
  title: string;
  log: WeightLog | null;
  url?: string;
  emptyLabel: string;
}) {
  return (
    <Pressable
      onPress={() => router.push('/check-in')}
      accessibilityRole="button"
      accessibilityLabel={log?.photo_key ? `${title} photo` : 'Add a progress photo'}
      style={({ pressed }) => [styles.photoCard, pressed && styles.pressed]}
    >
      <View style={styles.photo}>
        {url ? (
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <Ionicons name="person" size={56} color={colors.primaryBorder} />
            <View style={styles.addPhoto}>
              <Ionicons name="camera-outline" size={14} color={colors.primary} />
              <Text style={styles.addPhotoText}>Add photo</Text>
            </View>
          </>
        )}
      </View>
      <Text style={styles.photoWeek}>{title}</Text>
      <Text style={styles.photoWeight}>{log ? `${log.weight_kg} kg • ${shortDate(log.logged_at)}` : emptyLabel}</Text>
    </Pressable>
  );
}

export default function TransformationScreen() {
  const { profile } = useUser();
  const { data } = useProgressData();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const weights = data?.weights ?? [];
  const start = weights[0] ?? null;
  const latest = weights[weights.length - 1] ?? null;
  const photos = weights.filter(w => w.photo_key);
  const firstPhoto = photos[0] ?? null;
  const latestPhoto = photos.length > 1 ? photos[photos.length - 1] : null;
  const photoKeys = photos.map(p => p.photo_key as string).join('|');

  // Photo data reloads on focus (useProgressData), so new photos change photoKeys.
  useEffect(() => {
    if (!photoKeys) return;
    let active = true;
    getPhotoUrls(photoKeys.split('|')).then(result => {
      if (active) setUrls(result);
    });
    return () => {
      active = false;
    };
  }, [photoKeys]);

  const goal = profile?.goal_weight != null ? Number(profile.goal_weight) : null;
  // Share of the way from the first check-in to the goal weight, in either direction.
  const goalProgress =
    start && latest && goal != null && goal !== start.weight_kg
      ? Math.max(0, Math.min(1, (start.weight_kg - latest.weight_kg) / (start.weight_kg - goal)))
      : null;

  const week = data?.days.slice(-7) ?? [];
  const loggedDays = week.filter(d => d.meals.length > 0);
  const avgCalories = loggedDays.length
    ? Math.round(loggedDays.reduce((sum, d) => sum + d.calories, 0) / loggedDays.length)
    : null;

  const summary = [
    {
      icon: 'scale-outline',
      value: start && latest ? `${signedKg(latest.weight_kg - start.weight_kg)} kg` : '–',
      label: 'Since start',
    },
    {
      icon: 'flame-outline',
      value: avgCalories != null ? `${avgCalories.toLocaleString()} kcal` : '–',
      label: 'Avg. daily intake (7d)',
    },
    {
      icon: 'barbell-outline',
      value: data ? `${data.workoutsThisWeek}/7` : '–',
      label: 'Workout days (7d)',
    },
  ] as const;

  return (
    <Screen onBack scroll backgroundColor={colors.background} contentStyle={styles.content}>
      <Text style={styles.title}>Your Transformation</Text>

      {data && weights.length === 0 ? (
        <Card style={styles.empty}>
          <IconCircle name="body-outline" size={52} />
          <Text style={styles.emptyTitle}>Start your transformation</Text>
          <Text style={styles.emptyText}>
            Log your weight with a progress photo. Check in every week to see how far you&apos;ve come.
          </Text>
          <PrimaryButton title="Add First Check-in" icon="add" onPress={() => router.push('/check-in')} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.row}>
              <Text style={styles.weekText}>
                {start && latest ? `Week ${weekOf(latest, start)} • since ${shortDate(start.logged_at)}` : '–'}
              </Text>
              {goalProgress != null && <Text style={styles.percent}>{Math.round(goalProgress * 100)}%</Text>}
            </View>
            {goalProgress != null ? (
              <>
                <ProgressBar progress={goalProgress} style={styles.bar} />
                <Text style={styles.barHint}>
                  {start?.weight_kg} kg → {latest?.weight_kg} kg of your {goal} kg goal
                </Text>
              </>
            ) : (
              <Text style={styles.barHint}>Set a goal weight to track your progress towards it.</Text>
            )}
          </Card>

          <View style={styles.photos}>
            <PhotoCard
              title={firstPhoto && start ? `Week ${weekOf(firstPhoto, start)}` : 'Before'}
              log={firstPhoto}
              url={firstPhoto?.photo_key ? urls[firstPhoto.photo_key] : undefined}
              emptyLabel="Add your first photo"
            />
            <View style={styles.vs}>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </View>
            <PhotoCard
              title={latestPhoto && start ? `Week ${weekOf(latestPhoto, start)}` : 'Now'}
              log={latestPhoto}
              url={latestPhoto?.photo_key ? urls[latestPhoto.photo_key] : undefined}
              emptyLabel={firstPhoto ? 'Add a newer photo to compare' : 'No photo yet'}
            />
          </View>

          <PrimaryButton title="New Check-in" icon="camera-outline" onPress={() => router.push('/check-in')} />

          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <View style={styles.summary}>
            {summary.map(item => (
              <Card key={item.label} style={styles.stat}>
                <IconCircle name={item.icon} size={34} />
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        </>
      )}
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
  barHint: {
    ...type.caption,
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  emptyTitle: {
    ...type.subheading,
  },
  emptyText: {
    ...type.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
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
    overflow: 'hidden',
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
