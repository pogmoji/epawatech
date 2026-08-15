"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Learn", href: "/learn" },
  { label: "Challenges", href: "/challenges" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isAuthenticated, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    if (!result.error) {
      setOpen(false);
      window.location.assign("/");
    }
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-15.5 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex h-full max-w-370 items-center justify-between px-5 sm:px-10">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight"
            onClick={() => setOpen(false)}
          >
            ePawatech
          </Link>
          <nav
            className="hidden items-center gap-7 md:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[15px] font-semibold transition-colors hover:text-accent ${pathname === item.href ? "text-accent" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {!loading && isAuthenticated ? (
              <button type="button" onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/45 px-4 py-2 text-sm font-semibold hover:bg-primary-foreground/10 disabled:opacity-60">
                <LogOut size={16} />{signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : !loading ? <><Link href="/login" className="rounded-xl border border-primary-foreground/45 px-4 py-2 text-sm font-semibold hover:bg-primary-foreground/10">Log In</Link><Link href="/signup" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:brightness-95">Sign Up</Link></> : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      <div className="h-15.5" />
      {open && (
        <div className="fixed inset-x-0 top-15.5 z-40 border-t border-primary-foreground/20 bg-primary px-5 py-5 text-primary-foreground shadow-lg md:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`font-semibold ${pathname === item.href ? "text-accent" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {!loading && isAuthenticated ? <button type="button" onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/45 px-4 py-2 text-sm font-semibold disabled:opacity-60"><LogOut size={16} />{signingOut ? "Signing out…" : "Sign out"}</button> : !loading ? <><Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-primary-foreground/45 px-4 py-2 text-sm font-semibold">Log In</Link><Link href="/signup" onClick={() => setOpen(false)} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-foreground">Sign Up</Link></> : null}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-1 bg-primary px-5 py-14 text-primary-foreground sm:px-10">
      <div className="mx-auto grid max-w-370 gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold text-primary-foreground">
            ePawatech
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/80">
            Empowering the next generation of tech innovators.
          </p>
        </div>
        <div>
          <p className="font-display font-bold">ePawatech</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link
              href="/challenges"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              Explore Coding Challenges
            </Link>
            <Link
              href="/learn"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              Interactive Modules
            </Link>
          </div>
        </div>
        <div>
          <p className="font-display font-bold">Get Started</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link
              href="/learn"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              Learning Tracks
            </Link>
            <Link
              href="/projects"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              Student Projects
            </Link>
            <Link
              href="/trainer"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              ePawatech trainer
            </Link>
            <Link
              href="/contact"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              Contact ePawatech
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-370 border-t border-primary-foreground/20 pt-6 text-center text-xs leading-6 text-primary-foreground/80">
        <p>
          © 2026 ePawatech — Empowering youth livelihoods through holistic
          digital empowerment.
        </p>
        <p>
          This is a{" "}
          <span className="text-primary-foreground font-bold">
            Pawatech Solutions
          </span>{" "}
          project.
        </p>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
