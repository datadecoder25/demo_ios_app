import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';

import * as auth from '@/lib/auth';
import { creditTransactionApi, profileApi, Profile, ProfileInput, weightApi } from '@/lib/db';
import { calculateTargets } from '@/lib/nutrition';

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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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

function toUser(authUser: auth.AuthUser): User {
  const [firstName, ...rest] = (authUser.name ?? '').trim().split(/\s+/);
  return {
    id: authUser.id,
    email: authUser.email,
    firstName: firstName || null,
    lastName: rest.join(' ') || null,
    imageUrl: authUser.image,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [startupError, setStartupError] = useState<string | null>(null);

  /** Loads the profile; a failed request throws rather than looking like "no profile yet". */
  async function loadProfile(userId: string) {
    const { data, error } = await profileApi.getByUserId(userId);
    if (error) throw new auth.AuthUnavailableError('Could not load your profile. Please try again.');
    setProfile(data?.[0] ?? null);
  }

  // Bumped by retryStartup to re-run the startup effect.
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    async function initializeAuth() {
      try {
        const sessionUser = await auth.getSessionUser();
        if (sessionUser) {
          creditTransactionApi.claimFreeCredits();
          const { data, error } = await profileApi.getByUserId(sessionUser.id);
          if (error) throw new auth.AuthUnavailableError('Could not load your profile. Please try again.');
          setProfile(data?.[0] ?? null);
          setUser(toUser(sessionUser));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Only an explicit "no session" signs the user out; outages keep them on the splash.
        if (error instanceof auth.AuthUnavailableError) {
          setStartupError(error.message);
          return;
        }
      }
      setIsLoading(false);
    }

    initializeAuth();
  }, [startupAttempt]);

  function retryStartup() {
    setStartupError(null);
    setStartupAttempt(n => n + 1);
  }

  async function signIn(email: string, password: string) {
    const authUser = await auth.signInWithEmail(email, password);
    await loadProfile(authUser.id);
    setUser(toUser(authUser));
    await creditTransactionApi.claimFreeCredits();
    router.replace('/');
  }

  async function signUp(name: string, email: string, password: string) {
    const authUser = await auth.signUpWithEmail(name, email, password);
    setProfile(null);
    setUser(toUser(authUser));
    await creditTransactionApi.claimFreeCredits();
    router.replace('/onboarding');
  }

  async function signOut() {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      router.replace('/welcome');
    }
  }

  async function saveProfile(data: ProfileInput) {
    if (!user) throw new Error('Not signed in');
    const weightChanged = data.weight != null && Number(data.weight) !== Number(profile?.weight);
    const { data: saved, error } = await profileApi.upsert(user.id, withTarget(profile, data));
    if (error || !saved?.[0]) throw error ?? new Error('Failed to save profile');
    setProfile(saved[0]);
    if (weightChanged) {
      const { error: logError } = await weightApi.create({ weight_kg: Number(data.weight) });
      if (logError) console.error('Weight check-in failed:', logError);
    }
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
    user,
    isSignedIn: !!user,
    isLoading,
    startupError,
    retryStartup,
    profile,
    needsOnboarding: !!user && !profile,
    saveProfile,
    logWeight,
    deleteWeightLog,
    signIn,
    signUp,
    signOut,
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
