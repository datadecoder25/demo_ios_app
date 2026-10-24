/**
 * In-app purchases of AI scan packs via RevenueCat (StoreKit on iOS, Play Billing on Android).
 *
 * Native builds use the platform key; web and Expo Go run RevenueCat's Test Store (simulated
 * purchases), which only accepts a `test_` key. The app never grants credits itself: after a
 * purchase it asks /api/purchases/sync, which verifies the purchase with RevenueCat.
 */

import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, PurchasesPackage } from 'react-native-purchases';

import { apiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { scanPackFor } from '@/lib/scanPacks';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const TEST_STORE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;

let configuredFor: string | null = null;

function apiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_KEY || TEST_STORE_KEY;
  if (Platform.OS === 'android') return ANDROID_KEY || TEST_STORE_KEY;
  return TEST_STORE_KEY;
}

/** Whether this build has a RevenueCat key, i.e. whether the paywall can sell anything. */
export const isPurchasingAvailable = !!apiKey();

/** Configures RevenueCat for the signed-in user (their Clerk user id is the RevenueCat app user id). */
export async function setPurchasesUser(userId: string | null) {
  const key = apiKey();
  if (!key) return;

  try {
    if (!userId) {
      if (configuredFor) await Purchases.logOut().catch(() => {});
      configuredFor = null;
      return;
    }
    if (configuredFor === userId) return;
    if (await Purchases.isConfigured()) {
      await Purchases.logIn(userId);
    } else {
      Purchases.configure({ apiKey: key, appUserID: userId });
    }
    configuredFor = userId;
  } catch (error) {
    console.error('RevenueCat setup failed:', error);
  }
}

export interface ScanPackOffer {
  id: string;
  title: string;
  credits: number;
  price: string;
  /** Price per scan, for the "best value" hint. */
  pricePerScan: number;
  pkg: PurchasesPackage;
}

/** Scan packs from the current RevenueCat offering, cheapest per scan last. */
export async function getScanPacks(): Promise<ScanPackOffer[]> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return packages
    .map((pkg): ScanPackOffer | null => {
      const pack = scanPackFor(pkg.product.identifier);
      if (!pack) return null;
      return {
        id: pack.id,
        title: pack.title,
        credits: pack.credits,
        price: pkg.product.priceString,
        pricePerScan: pkg.product.price / pack.credits,
        pkg,
      };
    })
    .filter((offer): offer is ScanPackOffer => offer !== null)
    .sort((a, b) => a.credits - b.credits);
}

export class PurchaseCancelledError extends Error {}

/** Asks the server to credit any verified purchases; returns the new balance. */
export async function syncPurchases(): Promise<{ granted: number; balance: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(apiUrl('/api/purchases/sync'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Could not confirm your purchase.');
  return data;
}

const SYNC_ATTEMPTS = 4;
const SYNC_RETRY_MS = 1500;

/**
 * Buys a pack and waits for the server to credit it. RevenueCat can take a moment to see a
 * new transaction, so the sync is retried a few times before giving up.
 */
export async function buyScanPack(offer: ScanPackOffer): Promise<{ balance: number }> {
  try {
    await Purchases.purchasePackage(offer.pkg);
  } catch (error) {
    const e = error as { code?: string; userCancelled?: boolean };
    if (e.userCancelled || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      throw new PurchaseCancelledError('Purchase cancelled.');
    }
    throw error;
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt++) {
    try {
      const { granted, balance } = await syncPurchases();
      if (granted > 0 || attempt === SYNC_ATTEMPTS - 1) return { balance };
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, SYNC_RETRY_MS));
  }
  throw lastError ?? new Error('Your purchase went through but is still being confirmed. Your scans will appear shortly.');
}
