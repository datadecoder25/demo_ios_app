import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/design';

interface TextFieldProps extends TextInputProps {
  label: string;
  /** Adds the eye toggle used on password fields. */
  password?: boolean;
}

/** Bordered box with the label inside it, as on the Sign In / Sign Up screens. */
export function TextField({ label, password, style, ...inputProps }: TextFieldProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.box, focused && styles.boxFocused]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && hidden}
          onFocus={e => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...inputProps}
        />
        {password && (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Horizontal rule with a centered word ("or"). */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  boxFocused: {
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.navy,
    paddingVertical: 4,
    outlineStyle: 'none',
  } as any,
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
