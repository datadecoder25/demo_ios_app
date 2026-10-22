import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/kit';
import { colors, fonts } from '@/constants/design';

/** Value card with a slider and min/max labels (onboarding height/weight steps). */
export function SliderCard({
  label,
  value,
  unit,
  min,
  max,
  icon,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  icon: keyof typeof Ionicons.glyphMap;
  onChange: (value: number) => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.value}>
        {value}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={v => onChange(Math.round(v))}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.track}
        thumbTintColor={colors.primary}
        accessibilityLabel={label}
      />
      <View style={styles.range}>
        <Text style={styles.rangeText}>{min}</Text>
        <Text style={styles.rangeText}>{max}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.navy,
    marginTop: 4,
  },
  unit: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.navy,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 10,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
