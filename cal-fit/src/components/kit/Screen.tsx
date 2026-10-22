import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

import { colors, screenPadding } from '@/constants/design';

interface ScreenProps {
  children: ReactNode;
  /** Show the back chevron; defaults to router.back(). */
  onBack?: (() => void) | true;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Content pinned below the scroll area (e.g. a Next button). */
  footer?: ReactNode;
  backgroundColor?: string;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

/** Safe-area page with the mockup's padding, optional back chevron and pinned footer. */
export function Screen({
  children,
  onBack,
  scroll,
  footer,
  backgroundColor = colors.surface,
  edges = ['top', 'bottom'],
  contentStyle,
}: ScreenProps) {
  const back = onBack === true ? () => router.back() : onBack;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor }]} edges={edges}>
      <View style={styles.inner}>
        {back && (
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.navy} />
          </Pressable>
        )}
        {body}
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  back: {
    marginTop: 8,
    marginLeft: screenPadding - 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
