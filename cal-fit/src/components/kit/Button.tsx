import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { buttonShadow, colors, fonts, primaryGradient, radius, type } from '@/constants/design';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/** Blue gradient pill — the main call to action on every screen. */
export function PrimaryButton({ title, onPress, disabled, loading, icon, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [styles.shadowWrap, !inactive && buttonShadow, pressed && styles.pressed, style]}
    >
      <LinearGradient
        colors={primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, inactive && styles.inactive]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={20} color={colors.white} />}
            <Text style={type.button}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** White pill with a light blue border (e.g. "I Already Have an Account", "Close"). */
export function SecondaryButton({ title, onPress, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed, disabled && styles.inactive, style]}
    >
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={18} color={colors.navy} />}
        <Text style={styles.secondaryText}>{title}</Text>
      </View>
    </Pressable>
  );
}

/** Outlined row button with a leading icon (Continue with Google / Apple). */
export function SocialButton({ title, onPress, icon, iconColor, disabled }: ButtonProps & { iconColor?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.social, pressed && styles.pressed, disabled && styles.inactive]}
    >
      {icon && <Ionicons name={icon} size={22} color={iconColor ?? colors.navy} style={styles.socialIcon} />}
      <Text style={styles.socialText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: radius.pill,
  },
  primary: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inactive: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  secondary: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 24,
  },
  secondaryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
  social: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    position: 'absolute',
    left: 20,
  },
  socialText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
});
