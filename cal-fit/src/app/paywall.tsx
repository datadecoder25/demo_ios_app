import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/kit';
import { colors, fonts, radius, shadow, type } from '@/constants/design';
import { FREE_MONTHLY_CREDITS, useCredits } from '@/hooks/useCredits';
import { goBack } from '@/lib/navigation';

// What every account gets today; AI scans are the only metered feature.
const FREE_FEATURES = [
  `${FREE_MONTHLY_CREDITS} AI meal scans every month`,
  'Unlimited manual food logging',
  'Daily calorie & macro targets',
  'Streaks, XP and daily tasks',
  'Weight tracking & progress photos',
];

const PREMIUM_FEATURES = ['Unlimited AI meal scans', 'Advanced progress analytics', 'Priority support'];

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Plan & credits screen. Purchases aren't available yet, so nothing here pretends to sell. */
export default function PaywallScreen() {
  const { balance, usedThisMonth, renewsOn } = useCredits();
  const close = () => goBack();

  return (
    <Screen
      onBack
      scroll
      footer={
        <>
          <PrimaryButton title="Got It" onPress={close} />
          <Text style={styles.footnote}>Free scans renew automatically on the 1st of every month.</Text>
        </>
      }
    >
      <View style={styles.badge}>
        <Ionicons name="sparkles" size={12} color={colors.white} />
        <Text style={styles.badgeText}>Free plan</Text>
      </View>
      <Text style={styles.title}>Your AI Scans</Text>
      <Text style={styles.subtitle}>Each AI meal scan uses one credit. Manual logging is always free.</Text>

      <LinearGradient
        colors={['#E3F0FF', '#D3F4F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balance}
      >
        <View style={styles.balanceIcon}>
          <Ionicons name="scan" size={22} color={colors.primary} />
        </View>
        <View style={styles.balanceText}>
          <Text style={styles.balanceTitle}>
            <Text style={{ color: colors.primary }}>{balance ?? '–'}</Text>{' '}
            {balance === 1 ? 'scan' : 'scans'} left
          </Text>
          <Text style={styles.balanceSub}>
            {usedThisMonth} used this month • {FREE_MONTHLY_CREDITS} more on {formatDay(renewsOn)}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.plans}>
        <View style={[styles.plan, styles.planCurrent]}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Current</Text>
          </View>
          <Text style={styles.planName}>Free</Text>
          <Text style={styles.planPrice}>$0</Text>
          <Text style={styles.planPeriod}>{FREE_MONTHLY_CREDITS} scans / month</Text>
        </View>
        <View style={[styles.plan, styles.planSoon]}>
          <View style={[styles.tag, styles.tagSoon]}>
            <Text style={styles.tagText}>Coming soon</Text>
          </View>
          <Text style={styles.planName}>Premium</Text>
          <Text style={styles.planPrice}>Soon</Text>
          <Text style={styles.planPeriod}>unlimited scans</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Included in your plan</Text>
      <View style={styles.features}>
        {FREE_FEATURES.map(feature => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark" size={18} color={colors.primary} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Coming with Premium</Text>
      <View style={styles.features}>
        {PREMIUM_FEATURES.map(feature => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.featureText, styles.featureSoon]}>{feature}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.white,
  },
  title: {
    ...type.title,
    marginTop: 14,
  },
  subtitle: {
    ...type.body,
    marginTop: 6,
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 16,
    marginTop: 20,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceText: {
    flex: 1,
  },
  balanceTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  balanceSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  plans: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  plan: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    paddingTop: 20,
    minHeight: 120,
    ...shadow,
  },
  planCurrent: {
    borderColor: colors.primary,
    backgroundColor: '#F7FAFF',
  },
  planSoon: {
    opacity: 0.75,
  },
  tag: {
    position: 'absolute',
    top: -11,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagSoon: {
    backgroundColor: colors.textMuted,
  },
  tagText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.white,
  },
  planName: {
    ...type.label,
  },
  planPrice: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.navy,
    marginTop: 6,
  },
  planPeriod: {
    ...type.caption,
  },
  sectionTitle: {
    ...type.label,
    marginTop: 24,
  },
  features: {
    gap: 12,
    marginTop: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
  },
  featureSoon: {
    color: colors.textSecondary,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 10,
  },
});
