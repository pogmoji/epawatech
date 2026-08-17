"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function StudentLearnShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    if (!result.error) router.replace("/");
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-code-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-370 items-center justify-between gap-4 px-5 sm:px-10">
          <div>
            <p className="font-display text-xl font-bold text-primary">ePawatech</p>
            <p className="text-xs font-semibold text-muted-foreground">Student learning workspace</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Student learning navigation">
            <Link href="/student" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <button onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground disabled:opacity-60">
              <LogOut size={16} />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </nav>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg border border-border p-2 md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background px-5 py-4 md:hidden">
            <div className="mx-auto flex max-w-370 flex-col gap-2">
              <Link href="/student" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <button onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground disabled:opacity-60">
                <LogOut size={16} />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        )}
      </header>
      <main>
        {profile?.full_name && (
          <div className="mx-auto max-w-370 px-5 pt-5 sm:px-10">
            <p className="text-sm text-muted-foreground">
              Learning as <b className="text-foreground">{profile.full_name}</b>
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
