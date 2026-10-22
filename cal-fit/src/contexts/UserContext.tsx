import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';

import * as auth from '@/lib/auth';
import { creditTransactionApi, profileApi, Profile, ProfileInput } from '@/lib/db';

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
  /** The user's onboarding profile; null until onboarding is completed. */
  profile: Profile | null;
  needsOnboarding: boolean;
  saveProfile: (data: ProfileInput) => Promise<Profile>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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

  async function loadProfile(userId: string) {
    const { data } = await profileApi.getByUserId(userId);
    setProfile(data?.[0] ?? null);
  }

  useEffect(() => {
    async function initializeAuth() {
      try {
        const sessionUser = await auth.getSessionUser();
        if (sessionUser) {
          setUser(toUser(sessionUser));
          creditTransactionApi.claimFreeCredits();
          const { data } = await profileApi.getByUserId(sessionUser.id);
          setProfile(data?.[0] ?? null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

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
    const { data: saved, error } = await profileApi.upsert(user.id, data);
    if (error || !saved?.[0]) throw error ?? new Error('Failed to save profile');
    setProfile(saved[0]);
    return saved[0];
  }

  const value: UserContextType = {
    user,
    isSignedIn: !!user,
    isLoading,
    profile,
    needsOnboarding: !!user && !profile,
    saveProfile,
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
