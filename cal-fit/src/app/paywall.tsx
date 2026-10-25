import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/kit';
import { colors, fonts, radius, shadow, type } from '@/constants/design';
import { useUser } from '@/contexts/UserContext';
import { FREE_MONTHLY_CREDITS, useCredits } from '@/hooks/useCredits';
import { Alert } from '@/lib/alert';
import { goBack } from '@/lib/navigation';
import {
  buyScanPack,
  getScanPacks,
  isPurchasingAvailable,
  PurchaseCancelledError,
  ScanPackOffer,
  syncPurchases,
} from '@/lib/purchases';

// What every account gets; AI scans are the only metered feature.
const FREE_FEATURES = [
  `${FREE_MONTHLY_CREDITS} free AI meal scans every month`,
  'Unlimited manual food logging',
  'Daily calorie & macro targets',
  'Streaks, XP and daily tasks',
  'Weight tracking & progress photos',
];

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "$0.25" / "₹1.99" in the store's currency; falls back to "USD 0.25" if Intl can't format it. */
function formatPerScan(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

type PacksState =
  | { status: 'loading' }
  | { status: 'ready'; packs: ScanPackOffer[] }
  | { status: 'unavailable'; message: string };

/** Loads the scan packs from the store, via RevenueCat's current offering. */
function useScanPacks(): PacksState {
  const { user } = useUser();
  const userId = user?.id;
  const [state, setState] = useState<PacksState>(
    isPurchasingAvailable
      ? { status: 'loading' }
      : { status: 'unavailable', message: 'Scan packs aren’t available in this version of the app yet.' }
  );

  useEffect(() => {
    if (!isPurchasingAvailable || !userId) return;
    let active = true;
    getScanPacks(userId)
      .then(packs => {
        if (!active) return;
        setState(
          packs.length > 0
            ? { status: 'ready', packs }
            : { status: 'unavailable', message: 'No scan packs are on sale right now. Please check back later.' }
        );
      })
      .catch(error => {
        console.error('Loading scan packs failed:', error);
        if (active) setState({ status: 'unavailable', message: 'Couldn’t reach the store. Please try again later.' });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}

/** Credits screen: balance, free plan, and scan packs sold as in-app purchases. */
export default function PaywallScreen() {
  const { balance, usedThisMonth, renewsOn, reload } = useCredits();
  const packsState = useScanPacks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const packs = packsState.status === 'ready' ? packsState.packs : [];
  // Default to the best value (lowest price per scan).
  const bestValue = packs.reduce<ScanPackOffer | null>(
    (best, p) => (!best || p.pricePerScan < best.pricePerScan ? p : best),
    null
  );
  const selected = packs.find(p => p.id === selectedId) ?? bestValue;

  async function buy() {
    if (!selected) return;
    setIsBuying(true);
    try {
      const { balance: newBalance } = await buyScanPack(selected);
      await reload();
      Alert.alert('Scans added', `${selected.title} added. You now have ${newBalance} AI scans.`);
    } catch (error) {
      if (!(error instanceof PurchaseCancelledError)) {
        console.error('Purchase failed:', error);
        Alert.alert('Purchase not completed', error instanceof Error ? error.message : 'Please try again.');
      }
    } finally {
      setIsBuying(false);
    }
  }

  async function restore() {
    setIsRestoring(true);
    try {
      const { granted } = await syncPurchases();
      await reload();
      Alert.alert(
        granted > 0 ? 'Scans added' : 'All up to date',
        granted > 0 ? `${granted} scans from earlier purchases were added.` : 'All your purchases are already in your balance.'
      );
    } catch (error) {
      Alert.alert('Couldn’t check purchases', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Screen
      onBack
      scroll
      footer={
        <>
          {selected ? (
            <PrimaryButton title={`Buy ${selected.title} • ${selected.price}`} onPress={buy} loading={isBuying} />
          ) : (
            <PrimaryButton title="Got It" onPress={() => goBack()} />
          )}
          <Text style={styles.footnote}>
            One-time purchase, no subscription. Purchased scans never expire.
          </Text>
        </>
      }
    >
      <View style={styles.badge}>
        <Ionicons name="sparkles" size={12} color={colors.white} />
        <Text style={styles.badgeText}>AI scans</Text>
      </View>
      <Text style={styles.title}>Get More Scans</Text>
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
            {usedThisMonth} used this month • {FREE_MONTHLY_CREDITS} free on {formatDay(renewsOn)}
          </Text>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Scan packs</Text>
      {packsState.status === 'loading' && <ActivityIndicator style={styles.loading} color={colors.primary} />}
      {packsState.status === 'unavailable' && <Text style={styles.unavailable}>{packsState.message}</Text>}
      {packs.length > 0 && (
        <View style={styles.plans}>
          {packs.map(pack => {
            const isSelected = pack.id === selected?.id;
            return (
              <Pressable
                key={pack.id}
                onPress={() => setSelectedId(pack.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.plan, isSelected && styles.planSelected]}
              >
                {pack.id === bestValue?.id && packs.length > 1 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Best value</Text>
                  </View>
                )}
                <Text style={styles.planName}>{pack.credits} scans</Text>
                <Text style={styles.planPrice}>{pack.price}</Text>
                <Text style={styles.planPeriod}>
                  {formatPerScan(pack.pricePerScan, pack.pkg.product.currencyCode)} per scan
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {isPurchasingAvailable && (
        <Pressable onPress={restore} disabled={isRestoring} accessibilityRole="button" style={styles.restore}>
          <Text style={styles.restoreText}>{isRestoring ? 'Checking…' : 'Missing scans from a purchase? Check again'}</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Always included</Text>
      <View style={styles.features}>
        {FREE_FEATURES.map(feature => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark" size={18} color={colors.primary} />
            <Text style={styles.featureText}>{feature}</Text>
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
    marginTop: 16,
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
  tag: {
    position: 'absolute',
    top: -11,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
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
  loading: {
    marginTop: 16,
  },
  unavailable: {
    ...type.body,
    marginTop: 8,
  },
  restore: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  restoreText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: 10,
  },
});
