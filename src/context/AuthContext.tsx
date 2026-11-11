'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { saveUserProfile, getUserProfile } from '@/lib/firestore-service';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          let userProf = await getUserProfile(currentUser.uid);
          if (!userProf) {
            userProf = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Producer',
              photoURL: currentUser.photoURL,
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
              providerId: currentUser.providerData[0]?.providerId || 'password',
            };
            await saveUserProfile(userProf);
          } else {
            userProf.lastLoginAt = Date.now();
            await saveUserProfile(userProf);
          }
          setProfile(userProf);
        } catch (e) {
          console.warn('Error loading user profile:', e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      if (p) setProfile(p);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) throw new Error('Firebase Auth is not initialized');
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const p: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'Producer',
        photoURL: result.user.photoURL,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        providerId: 'google.com',
      };
      await saveUserProfile(p);
      setProfile(p);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name?: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user && name) {
      await updateProfile(res.user, { displayName: name });
    }
    const p: UserProfile = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: name || email.split('@')[0],
      photoURL: null,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      providerId: 'password',
    };
    await saveUserProfile(p);
    setProfile(p);
  };

  const sendResetEmail = async (email: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (auth) {
      await fbSignOut(auth);
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendResetEmail,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

