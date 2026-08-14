"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isValidPhoneNumber, isValidStudentUsername, normalizePhoneNumber, normalizeStudentUsername } from "@/lib/auth";
import { getProfiles, updateProfileDetails, type ProfileRecord } from "@/lib/api/admin/dashboard";

export function ProfileCorrections() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getProfiles().then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else setProfiles(result.data ?? []);
      });
    return () => { active = false; };
  }, []);

  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;

  function chooseProfile(id: string) {
    const profile = profiles.find((item) => item.id === id) ?? null;
    setSelectedId(id); setName(profile?.full_name ?? ""); setUsername(profile?.username ?? ""); setPhoneNumber(profile?.phone_number ?? ""); setError(""); setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!selected || !name.trim()) return setError("Choose an account and enter a name.");
    const normalizedUsername = normalizeStudentUsername(username);
    if (selected.role === "student" && !isValidStudentUsername(normalizedUsername)) {
      return setError("Student usernames must look like KE0476-213.");
    }
    if (selected.role === "trainer" && phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return setError("Use an international phone number, for example +254712345678.");
    }
    setBusy(true);
    const result = await updateProfileDetails(selected.id, { fullName: name, username: selected.role === "student" ? normalizedUsername : null, phoneNumber: selected.role === "trainer" ? normalizePhoneNumber(phoneNumber) || null : null });
    setBusy(false);
    if (result.error) return setError(result.error);
    if (!result.data) return setError("The profile could not be updated.");
    setProfiles((current) => current.map((profile) => profile.id === selected.id ? result.data : profile));
    setMessage("Profile updated.");
  }

  return <section className="mt-8 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="font-display text-xl font-bold text-foreground">Correct account details</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Correct a displayed name, student username, or trainer contact number. Student usernames are stored in uppercase, for example KE0476-213.</p><form onSubmit={submit} className="mt-5 space-y-4"><select value={selectedId} onChange={(event) => chooseProfile(event.target.value)} aria-label="Account" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose an account</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || "Unnamed user"} — {profile.role} ({profile.status})</option>)}</select><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Full name" aria-label="Full name" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />{selected?.role === "student" && <input value={username} onChange={(event) => setUsername(normalizeStudentUsername(event.target.value))} placeholder="Student username" aria-label="Student username" autoComplete="off" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />}{selected?.role === "trainer" && <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Trainer phone number (+254712345678)" aria-label="Trainer phone number" autoComplete="tel" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />}{error && <p className="text-sm text-destructive">{error}</p>}{message && <p className="text-sm text-primary">{message}</p>}<button type="submit" disabled={busy || !selected} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save corrections"}</button></form></section>;
}
