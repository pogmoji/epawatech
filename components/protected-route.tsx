"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/auth";
import { dashboardPath, profileStatusMessage } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";

export function ProtectedRoute({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, profile, error } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile?.status === "active" && profile.role !== role) {
      router.replace(dashboardPath(profile));
    }
  }, [loading, user, profile, role, router]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">Loading your account…</main>;
  }

  if (!user || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm text-destructive">{error ?? "Redirecting to sign in…"}</main>;
  }

  const statusMessage = profileStatusMessage(profile);
  if (statusMessage) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"><h1 className="font-display text-2xl font-bold text-foreground">Account access unavailable</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{statusMessage}</p></section></main>;
  }

  if (profile.role !== role) return null;
  return <>{children}</>;
}
