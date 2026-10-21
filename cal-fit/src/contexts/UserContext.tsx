import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'calfit_user';

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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  anonymousId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        const id = Date.now().toString();
        setAnonymousId(id);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    const mockUser: User = {
      id: 'user_' + Date.now(),
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: null,
    };
    
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
    router.replace('/home' as any);
  }

  async function signInWithApple() {
    const mockUser: User = {
      id: 'user_' + Date.now(),
      email: 'apple@example.com',
      firstName: 'Apple',
      lastName: 'User',
      imageUrl: null,
    };
    
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
    router.replace('/home' as any);
  }

  async function signOut() {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      setUser(null);
      setAnonymousId(null);
      router.replace('/' as any);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  }

  const value: UserContextType = {
    user,
    isSignedIn: !!user,
    isLoading,
    signInWithGoogle,
    signInWithApple,
    signOut,
    anonymousId,
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
