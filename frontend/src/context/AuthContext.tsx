"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "analyst" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  organization: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (defaultTab?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  authModalTab: "signin" | "signup";
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    organization: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  quickDemoLogin: (role: UserRole, customName?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

const GUEST_STORAGE_KEY = "spendsense_guest_mode";
const DEMO_PROFILE_KEY = "spendsense_demo_profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");

  const openAuthModal = useCallback((defaultTab: "signin" | "signup" = "signin") => {
    setAuthModalTab(defaultTab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Fetch or sync user profile
  const syncProfile = useCallback(async (authUser: User) => {
    try {
      const meta = authUser.user_metadata || {};
      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || "",
        display_name: meta.full_name || meta.display_name || authUser.email?.split("@")[0] || "Auditor",
        role: (meta.role as UserRole) || "admin",
        organization: meta.organization || "Independent Audit",
      };

      setProfile(userProfile);
      setIsGuest(false);

      // Save to Supabase profiles table if accessible
      try {
        await supabase.from("profiles").upsert({
          id: authUser.id,
          email: authUser.email,
          display_name: userProfile.display_name,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Table permission or offline fallback
      }
    } catch (e) {
      console.warn("Failed to sync profile:", e);
    }
  }, []);

  // Initial session check
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Check active Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await syncProfile(session.user);
          setLoading(false);
          return;
        }

        // 2. Check local demo profile fallback
        const savedDemoProfile = localStorage.getItem(DEMO_PROFILE_KEY);
        if (savedDemoProfile) {
          try {
            const parsed = JSON.parse(savedDemoProfile);
            setProfile(parsed);
            setIsGuest(false);
          } catch {
            localStorage.removeItem(DEMO_PROFILE_KEY);
          }
        }
      } catch (e) {
        console.warn("Auth check error, defaulting to guest:", e);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await syncProfile(session.user);
      } else {
        setUser(null);
        // keep demo profile if active, otherwise guest
        if (!localStorage.getItem(DEMO_PROFILE_KEY)) {
          setProfile(null);
          setIsGuest(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  // Sign In with Supabase
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await syncProfile(data.user);
        localStorage.removeItem(DEMO_PROFILE_KEY);
        closeAuthModal();
        return { success: true };
      }

      return { success: false, error: "Unable to sign in" };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Authentication failed" };
    }
  }, [syncProfile, closeAuthModal]);

  // Sign Up with Supabase
  const signUp = useCallback(async ({
    email,
    password,
    fullName,
    role,
    organization,
  }: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    organization: string;
  }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            display_name: fullName,
            role,
            organization,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await syncProfile(data.user);
        localStorage.removeItem(DEMO_PROFILE_KEY);
        closeAuthModal();
        return { success: true };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Registration failed" };
    }
  }, [syncProfile, closeAuthModal]);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // offline
    }
    setUser(null);
    setProfile(null);
    setIsGuest(true);
    localStorage.removeItem(DEMO_PROFILE_KEY);
  }, []);

  // Continue as Guest (Instant Demo)
  const continueAsGuest = useCallback(() => {
    setUser(null);
    setProfile(null);
    setIsGuest(true);
    localStorage.removeItem(DEMO_PROFILE_KEY);
    closeAuthModal();
  }, [closeAuthModal]);

  // Quick Demo Login for presentations / testing
  const quickDemoLogin = useCallback((role: UserRole, customName?: string) => {
    const demoProfile: UserProfile = {
      id: "demo-" + role + "-" + Date.now().toString().slice(-4),
      email: `${role}@spendsense.ai`,
      display_name: customName || (role === "admin" ? "Lead Auditor (Admin)" : role === "analyst" ? "Senior Risk Analyst" : "Audit Observer"),
      role,
      organization: "SpendSense Demo Enterprise",
    };

    setProfile(demoProfile);
    setIsGuest(false);
    localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoProfile));
    closeAuthModal();
  }, [closeAuthModal]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user || (!!profile && !isGuest),
        isGuest,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalTab,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
