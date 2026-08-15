"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { getAdminDashboardData, type ProfileRecord } from "@/lib/api/admin/dashboard";

export function TrainerPasswordReset() {
  const { session } = useAuth();
  const [trainers, setTrainers] = useState<ProfileRecord[]>([]);
  const [trainerId, setTrainerId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getAdminDashboardData().then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else setTrainers(result.data?.trainers ?? []);
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!trainerId) return setError("Choose the trainer who requested a password reset.");
    if (temporaryPassword.length < 8) return setError("Use a temporary password of at least 8 characters.");
    if (temporaryPassword !== confirmPassword) return setError("The temporary passwords do not match.");
    if (!session?.access_token) return setError("Your admin session has expired. Please sign in again.");

    setBusy(true);
    const response = await fetch("/api/admin/trainer-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ trainerId, temporaryPassword }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(result.error || "The trainer password could not be reset.");
    setTemporaryPassword(""); setConfirmPassword("");
    setMessage("Temporary password set. Share it with the trainer through a secure channel.");
  }

  return <section className="mt-8 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="font-display text-xl font-bold text-foreground">Reset a trainer password</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Set a temporary password only after confirming the trainer&apos;s identity. This action is recorded in the audit log.</p><form onSubmit={submit} className="mt-5 space-y-4"><select value={trainerId} onChange={(event) => setTrainerId(event.target.value)} aria-label="Trainer account" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose a trainer</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.full_name || "Unnamed trainer"} ({trainer.status})</option>)}</select><input value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} type="password" minLength={8} placeholder="Temporary password" autoComplete="new-password" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={8} placeholder="Confirm temporary password" autoComplete="new-password" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />{error && <p className="text-sm text-destructive">{error}</p>}{message && <p className="text-sm text-primary">{message}</p>}<button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Updating…" : "Set temporary password"}</button></form></section>;
}
