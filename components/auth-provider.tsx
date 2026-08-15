"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Profile, friendlyAuthError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshProfile: (userId?: string) => Promise<Profile | null>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  if (!supabase) {
    return { profile: null, error: "Authentication is not configured for this deployment." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone_number, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { profile: null, error: "We could not load your account profile. Please try again." };
  if (!data) return { profile: null, error: "Your account is missing its application profile. Please contact an administrator." };

  return { profile: data as Profile, error: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(supabase ? null : "Authentication is not configured for this deployment.");

  const refreshProfile = useCallback(async (userId?: string) => {
    const id = userId ?? user?.id;
    if (!id) {
      setProfile(null);
      return null;
    }

    const result = await loadProfile(id);
    setProfile(result.profile);
    setError(result.error);
    return result.profile;
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const applySession = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setProfile(null);
        setError(null);
        if (active) setLoading(false);
        return;
      }

      const result = await loadProfile(nextSession.user.id);
      if (!active) return;
      setProfile(result.profile);
      setError(result.error);
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: "Authentication is not configured for this deployment." };
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) return { error: friendlyAuthError(signOutError.message) };
    setUser(null);
    setSession(null);
    setProfile(null);
    setError(null);
    return { error: null };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refreshProfile,
    signOut,
  }), [user, session, profile, loading, error, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
