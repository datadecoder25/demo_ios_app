import { useAuth, useUser as useClerkUser } from '@clerk/expo';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';

import { deleteAccount as deleteAccountOnServer, syncAccount } from '@/lib/account';
import { AuthUnavailableError } from '@/lib/auth';
import { creditTransactionApi, profileApi, Profile, ProfileInput, weightApi } from '@/lib/db';
import { calculateTargets } from '@/lib/nutrition';
import { setPurchasesUser } from '@/lib/purchases';

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface UserContextType {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  /** Set when the session or profile couldn't be loaded (offline, rate-limited); see retryStartup. */
  startupError: string | null;
  retryStartup: () => void;
  /** The user's onboarding profile; null until onboarding is completed. */
  profile: Profile | null;
  needsOnboarding: boolean;
  /**
   * Saves profile fields and recalculates the daily calorie target from them. A changed
   * weight is also recorded as a weight check-in.
   */
  saveProfile: (data: ProfileInput) => Promise<Profile>;
  /** Records a weight check-in (optionally with a progress photo) and updates the profile. */
  logWeight: (weightKg: number, photoKey?: string | null) => Promise<void>;
  /** Removes a check-in; the profile weight falls back to the latest remaining one. */
  deleteWeightLog: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and all its data, then returns to the welcome screen. */
  deleteAccount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Adds the recalculated daily_calorie_target when the merged profile has everything it needs. */
function withTarget(current: Profile | null, data: ProfileInput): ProfileInput {
  const merged = { ...current, ...data };
  if (!merged.gender || !merged.height || !merged.weight || !merged.activity_level || !merged.goal) return data;
  const { calories } = calculateTargets({
    gender: merged.gender,
    heightCm: Number(merged.height),
    weightKg: Number(merged.weight),
    goalWeightKg: merged.goal_weight ? Number(merged.goal_weight) : null,
    activityLevel: merged.activity_level,
    goal: merged.goal,
    age: merged.age,
  });
  return { ...data, daily_calorie_target: calories };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Clerk owns the session (sign-in screens use its hooks); this context adds the app's own
  // per-user state: the profile, and a one-time bootstrap after each sign-in.
  const { isLoaded, isSignedIn, userId, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useClerkUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  // The user id whose bootstrap (account sync, free credits, profile) has finished.
  const [bootstrappedFor, setBootstrappedFor] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  // Bumped by retryStartup to re-run the bootstrap.
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    let cancelled = false;

    async function bootstrap(id: string) {
      try {
        // First, so data from a previous account is linked before we look for a profile.
        await syncAccount();
        // Idempotent, so one retry is safe; a failed claim would otherwise leave a new user
        // with no scans until the next app start.
        if ((await creditTransactionApi.claimFreeCredits()).error) {
          const { error: claimError } = await creditTransactionApi.claimFreeCredits();
          if (claimError) console.error('Free scans could not be claimed:', claimError);
        }
        const { data, error } = await profileApi.getByUserId(id);
        if (error) throw new AuthUnavailableError('Could not load your profile. Please try again.');
        if (cancelled) return;
        setProfile(data?.[0] ?? null);
        setStartupError(null);
        setBootstrappedFor(id);
      } catch (error) {
        console.error('Account bootstrap error:', error);
        if (!cancelled) {
          setStartupError(error instanceof Error ? error.message : 'Could not load your account. Please try again.');
        }
      }
    }

    bootstrap(userId);
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, startupAttempt]);

  const user: User | null =
    isSignedIn && userId && clerkUser
      ? {
          id: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        }
      : null;
  const ready = !!user && bootstrappedFor === user.id;
  const isLoading = !isLoaded || (!!isSignedIn && !ready);

  // Purchases belong to the signed-in user (RevenueCat app user id = Clerk user id).
  useEffect(() => {
    setPurchasesUser(ready ? userId ?? null : null);
  }, [ready, userId]);

  function retryStartup() {
    setStartupError(null);
    setStartupAttempt(n => n + 1);
  }

  async function signOut() {
    try {
      await clerkSignOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      setProfile(null);
      setBootstrappedFor(null);
      router.replace('/welcome');
    }
  }

  async function deleteAccount() {
    await deleteAccountOnServer();
    // The Clerk user is gone, so this only clears the local session.
    await signOut();
  }

  async function saveProfile(data: ProfileInput) {
    if (!user) throw new Error('Not signed in');
    const weightChanged = data.weight != null && Number(data.weight) !== Number(profile?.weight);
    const { data: saved, error } = await profileApi.upsert(user.id, withTarget(profile, data));
    if (error || !saved?.[0]) throw error ?? new Error('Failed to save profile');
    // Recorded before setProfile: finishing onboarding opens Home, whose stats should
    // already include this first weigh-in.
    if (weightChanged) {
      const { error: logError } = await weightApi.create({ weight_kg: Number(data.weight) });
      if (logError) console.error('Weight check-in failed:', logError);
    }
    setProfile(saved[0]);
    return saved[0];
  }

  async function logWeight(weightKg: number, photoKey?: string | null) {
    if (!user) throw new Error('Not signed in');
    const { error } = await weightApi.create({ weight_kg: weightKg, photo_key: photoKey ?? null });
    if (error) throw error;
    const { data: saved, error: profileError } = await profileApi.upsert(user.id, withTarget(profile, { weight: weightKg }));
    if (profileError || !saved?.[0]) throw profileError ?? new Error('Failed to update profile');
    setProfile(saved[0]);
  }

  async function deleteWeightLog(id: string) {
    if (!user) throw new Error('Not signed in');
    const { error } = await weightApi.delete(id);
    if (error) throw error;
    const { data: logs } = await weightApi.list(user.id);
    const latest = logs?.[logs.length - 1];
    if (latest && Number(latest.weight_kg) !== Number(profile?.weight)) {
      const { data: saved } = await profileApi.upsert(user.id, withTarget(profile, { weight: Number(latest.weight_kg) }));
      if (saved?.[0]) setProfile(saved[0]);
    }
  }

  const value: UserContextType = {
    user: ready ? user : null,
    isSignedIn: ready,
    isLoading,
    startupError,
    retryStartup,
    profile,
    needsOnboarding: ready && !profile,
    saveProfile,
    logWeight,
    deleteWeightLog,
    signOut,
    deleteAccount,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
