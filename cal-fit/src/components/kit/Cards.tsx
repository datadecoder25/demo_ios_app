import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, radius, shadow } from '@/constants/design';

type IconName = keyof typeof Ionicons.glyphMap;

/** White rounded card with the mockup's soft blue shadow. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Round icon badge: filled blue when active, pale otherwise. */
export function IconCircle({
  name,
  active,
  size = 44,
  color,
  background,
}: {
  name: IconName;
  active?: boolean;
  size?: number;
  color?: string;
  background?: string;
}) {
  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? (active ? colors.primary : colors.primaryTint),
        },
      ]}
    >
      <Ionicons name={name} size={size * 0.5} color={color ?? (active ? colors.white : colors.primary)} />
    </View>
  );
}

/** Check (selected) or empty ring (unselected). */
export function SelectionMark({ selected }: { selected: boolean }) {
  return selected ? (
    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
  ) : (
    <View style={styles.radio} />
  );
}

/** Selectable onboarding option: icon + title + optional subtitle + check. */
export function OptionCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
  leading,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Custom leading element instead of an IconCircle. */
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      {leading ?? (icon && <IconCircle name={icon} active={selected} />)}
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <SelectionMark selected={selected} />
    </Pressable>
  );
}

/** Thin rounded progress bar. */
export function ProgressBar({
  progress,
  color = colors.primary,
  height = 6,
  style,
}: {
  progress: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Horizontal pill chips (Breakfast/Lunch…, Weight/Calories…). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Settings-style row: icon, title, subtitle, chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  showChevron = true,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
}) {
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={tint} />
      <View style={styles.listText}>
        <Text style={[styles.listTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle && <Text style={styles.listSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && !danger && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9D3E6',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow,
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#F7FAFF',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  optionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  track: {
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.white,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listText: {
    flex: 1,
  },
  listTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  listSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
});
