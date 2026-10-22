import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/kit';
import { colors, fonts, radius, shadow, type } from '@/constants/design';
import { Alert } from '@/lib/alert';

// Placeholder pricing until in-app purchases (react-native-iap) are wired up.
const PLANS = [
  { id: 'monthly', name: 'Monthly', price: '$9.99', period: 'per month' },
  { id: 'yearly', name: 'Yearly', price: '$79.99', period: 'per year', badge: 'Most Popular', save: 'Save 33%' },
] as const;

const FEATURES = [
  'AI Meal Scanner (unlimited)',
  'Personalized Meal Plans',
  'Advanced Progress Analytics',
  'Exclusive High-Calorie Recipes',
  'Habit & Streak Tracking',
  'Priority Support',
];

type PlanId = (typeof PLANS)[number]['id'];

export default function PaywallScreen() {
  const [plan, setPlan] = useState<PlanId>('yearly');

  return (
    <Screen
      onBack
      scroll
      footer={
        <>
          <PrimaryButton
            title="Start Free Trial"
            onPress={() => Alert.alert('Coming Soon', 'In-app purchases are coming soon.')}
          />
          <Text style={styles.footnote}>Cancel anytime. No hidden fees.</Text>
        </>
      }
    >
      <View style={styles.badge}>
        <Ionicons name="diamond" size={12} color={colors.white} />
        <Text style={styles.badgeText}>Premium</Text>
      </View>
      <Text style={styles.title}>Unlock Your Full Potential</Text>
      <Text style={styles.subtitle}>Get personalized plans, AI meal analysis, progress tracking and more.</Text>

      <LinearGradient
        colors={['#E3F0FF', '#D3F4F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.trial}
      >
        <View style={styles.trialIcon}>
          <Ionicons name="water" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.trialTitle}>
            <Text style={{ color: colors.primary }}>3 Day</Text> Free Trial
          </Text>
          <Text style={styles.trialSub}>Then $9.99/month or $79.99/year</Text>
        </View>
      </LinearGradient>

      <View style={styles.plans}>
        {PLANS.map(p => {
          const selected = plan === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPlan(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.plan, selected && styles.planSelected]}
            >
              {'badge' in p && (
                <View style={styles.popular}>
                  <Text style={styles.popularText}>{p.badge}</Text>
                </View>
              )}
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.planPrice}>{p.price}</Text>
              <Text style={styles.planPeriod}>{p.period}</Text>
              {'save' in p && (
                <View style={styles.save}>
                  <Text style={styles.saveText}>{p.save}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature, i) => {
          const last = i === FEATURES.length - 1;
          return (
            <View key={feature} style={styles.feature}>
              <Ionicons name="checkmark" size={18} color={colors.primary} />
              <Text style={[styles.featureText, last && { color: colors.primary }]}>{feature}</Text>
            </View>
          );
        })}
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
  trial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 16,
    marginTop: 20,
  },
  trialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  trialSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  plans: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
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
  planSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F7FAFF',
  },
  popular: {
    position: 'absolute',
    top: -11,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularText: {
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
  save: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.md,
    borderBottomRightRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.white,
  },
  features: {
    gap: 12,
    marginTop: 22,
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
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 10,
  },
});
