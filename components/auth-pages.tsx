"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, FileText, Gamepad2, GraduationCap, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  dashboardPath,
  friendlyAuthError,
  isValidPhoneNumber,
  isValidStudentUsername,
  normalizePhoneNumber,
  normalizeStudentUsername,
  studentUsernameAuthEmail,
} from "@/lib/auth";
import { uploadMyTrainerCertificate, validateTrainerCertificate } from "@/lib/api/trainer/profile";
import { supabase } from "@/lib/supabase";

const inputClass =
  "h-12 w-full rounded-xl border border-primary/25 bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
const studentWelcomeStorageKey = "epawatech:student-welcome";
type LoginRole = "student" | "trainer";

function queueStudentWelcome(userId: string) {
  window.sessionStorage.setItem(studentWelcomeStorageKey, userId);
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-28 sm:px-6">
      {children}
    </main>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <>
      <h1 className="font-display text-3xl font-bold italic text-primary sm:text-4xl">
        {children}
      </h1>
      <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
    </>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  name,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          aria-label={label}
          className={`${inputClass} pr-11`}
          autoComplete={
            name.includes("confirm") ? "new-password" : "current-password"
          }
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FormMessage({ message }: { message: string }) {
  return message ? (
    <p
      role="status"
      className="rounded-lg bg-secondary px-3 py-2 text-center text-sm text-primary"
    >
      {message}
    </p>
  ) : null;
}

export function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loginRole, setLoginRole] = useState<LoginRole | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier || !password)
      return setError("Enter your email or student username and password.");
    if (!supabase)
      return setError("Authentication is not configured for this deployment.");
    const signInEmail = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : isValidStudentUsername(identifier)
        ? studentUsernameAuthEmail(identifier)
        : null;
    if (!signInEmail)
      return setError(
        "Enter a valid email address or student username, for example KE0476-213.",
      );
    setError("");
    setBusy(true);
    const { data, error: signInError } = await supabase.auth
      .signInWithPassword({ email: signInEmail, password })
      .catch(() => ({
        data: { user: null, session: null },
        error: { message: "Network error" },
      }));
    if (signInError || !data.user) {
      setError(
        signInError?.message === "Network error"
          ? "Could not reach Supabase. Check your internet connection, Supabase project status, or network firewall, then try again."
          : friendlyAuthError(signInError?.message ?? "Unable to sign in."),
      );
      setBusy(false);
      return;
    }
    const profile = await refreshProfile(data.user.id);
    setBusy(false);
    if (!profile) return;
    if (profile.role === "student") {
      queueStudentWelcome(profile.id);
      router.replace("/student");
      return;
    }
    router.replace(dashboardPath(profile));
  }

  if (!loginRole) {
    return (
      <PageFrame>
        <section className="mx-auto w-full max-w-3xl text-center">
          <Title>Welcome Back!</Title>
          <p className="mt-6 text-sm text-muted-foreground">
            Choose how you want to sign in.
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <LoginRoleCard
              icon={<Gamepad2 />}
              title="I'm a Student"
              description="Use your student username to get back to your profile, challenges, projects, and classroom."
              tone="teal"
              onClick={() => setLoginRole("student")}
            />
            <LoginRoleCard
              icon={<GraduationCap />}
              title="I'm an Adjunct Trainer"
              description="Use your email address to open trainer tools. Admins can sign in here too."
              tone="yellow"
              onClick={() => setLoginRole("trainer")}
            />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </section>
      </PageFrame>
    );
  }

  const studentLogin = loginRole === "student";
  const identifierLabel = studentLogin
    ? "Student username"
    : "Email address";

  return (
    <PageFrame>
      <section className="mx-auto w-full max-w-113.5 rounded-2xl border border-border bg-card p-8 shadow-[0_16px_32px_rgba(18,50,70,0.12)] sm:p-9">
        <div className="text-center">
          <Title>{studentLogin ? "Student Sign In" : "Trainer Sign In"}</Title>
          <p className="mt-6 text-sm text-muted-foreground">
            {studentLogin
              ? "Use your student username and password."
              : "Trainers and admins use email and password."}
          </p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={identifierLabel}
            aria-label={identifierLabel}
            type={studentLogin ? "text" : "email"}
            autoComplete="username"
            className={inputClass}
          />
          <PasswordField
            name="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          {error && (
            <p className="text-center text-xs text-destructive">{error}</p>
          )}
          <button
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {busy ? (
              "Signing in…"
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setLoginRole(null);
            setIdentifier("");
            setPassword("");
            setError("");
          }}
          className="mt-4 w-full text-sm font-semibold text-primary hover:underline"
        >
          Change sign-in type
        </button>
        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

function LoginRoleCard({
  icon,
  title,
  description,
  tone,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone: "teal" | "yellow";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-primary/20 bg-card p-8 text-center shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-xl ${tone === "yellow" ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-primary"}`}
      >
        {icon}
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

export function SignupLandingPage() {
  return (
    <PageFrame>
      <section className="mx-auto w-full max-w-3xl text-center">
        <Title>Join ePawatech!</Title>
        <p className="mt-6 text-sm text-muted-foreground">
          How would you like to use ePawatech?
        </p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <RoleCard
            href="/signup/student"
            icon={<Gamepad2 />}
            title="I'm a Student"
            description="Learn new skill, challenges, participate in projects, earn badges, and compete on the leaderboard."
            tone="teal"
          />
          <RoleCard
            href="/signup/teacher"
            icon={<GraduationCap />}
            title="I'm an Adjunct Trainer"
            description="Create classrooms, assign challenges, and track your students' progress."
            tone="yellow"
          />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </PageFrame>
  );
}

function RoleCard({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  tone: "teal" | "yellow";
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-primary/20 bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-xl ${tone === "yellow" ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-primary"}`}
      >
        {icon}
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

function SignupForm({ role }: { role: "student" | "trainer" }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const student = role === "student";

  useEffect(() => {
    if (!student) return;
    const username = normalizeStudentUsername(form.username);
    if (!username) {
      const timer = window.setTimeout(() => setUsernameStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }
    if (!isValidStudentUsername(username)) {
      const timer = window.setTimeout(() => setUsernameStatus("invalid"), 0);
      return () => window.clearTimeout(timer);
    }
    const supabaseClient = supabase;
    if (!supabaseClient) {
      const timer = window.setTimeout(() => setUsernameStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    const checkingTimer = window.setTimeout(
      () => setUsernameStatus("checking"),
      0,
    );
    const timeout = window.setTimeout(async () => {
      const { data, error: availabilityError } = await supabaseClient.rpc(
        "is_student_username_available",
        { p_username: username },
      );
      if (cancelled) return;
      setUsernameStatus(!availabilityError && data ? "available" : "taken");
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(checkingTimer);
      window.clearTimeout(timeout);
    };
  }, [form.username, student]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.name.trim() ||
      form.password.length < 6 ||
      form.password !== form.confirm
    )
      return setError(
        student
          ? "Enter your full name and matching passwords of at least 6 characters."
          : "Enter your full name and email, then use matching passwords of at least 6 characters.",
      );
    if (student && !isValidStudentUsername(form.username))
      return setError(
        "Choose a username like KE0476-213: 3–30 uppercase letters, numbers, and hyphens, starting with a letter.",
      );
    if (
      !student &&
      (!form.email.trim() || !isValidPhoneNumber(form.phoneNumber))
    )
      return setError(
        "Enter your full name, email, and phone number in international format, for example +254712345678.",
      );
    if (!student && certificate) {
      const certificateError = validateTrainerCertificate(certificate);
      if (certificateError) return setError(certificateError);
    }
    if (!supabase)
      return setError("Authentication is not configured for this deployment.");
    setBusy(true);
    setError("");
    setMessage("");
    if (student) {
      const response = await fetch("/api/auth/student-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          username: normalizeStudentUsername(form.username),
          password: form.password,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setBusy(false);
        return setError(
          result.error ||
            "We could not create the student account. Please try again.",
        );
      }
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: studentUsernameAuthEmail(form.username),
          password: form.password,
        });
      setBusy(false);
      if (signInError || !data.session)
        return setError(
          "Your account was created, but sign-in did not complete. Please sign in with your username.",
        );
      const profile = await refreshProfile(data.user.id);
      queueStudentWelcome(profile?.id ?? data.user.id);
      router.replace("/student");
      return;
    }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          full_name: form.name.trim(),
          requested_role: role,
          phone_number: normalizePhoneNumber(form.phoneNumber),
        },
      },
    });
    if (signUpError) {
      setBusy(false);
      return setError(friendlyAuthError(signUpError.message));
    }
    if (!data.session) {
      setBusy(false);
      return setMessage(
        certificate
          ? "Check your email to confirm your account, then sign in and upload your certificate from your profile."
          : "Check your email to confirm your account, then sign in.",
      );
    }
    if (certificate) {
      const upload = await uploadMyTrainerCertificate(certificate);
      if (upload.error) {
        setBusy(false);
        setMessage("Your trainer account was created. Sign in and upload your certificate from your profile.");
        return;
      }
    }
    setBusy(false);
    router.replace("/trainer");
  }

  const teacher = role === "trainer";
  const usernameMessage =
    usernameStatus === "checking"
      ? "Checking username…"
      : usernameStatus === "available"
        ? "Username is available."
        : usernameStatus === "taken"
          ? "That username is already in use."
          : usernameStatus === "invalid"
            ? "Use 3–30 uppercase letters, numbers, and hyphens; start with a letter."
            : "Example: KE0476-213";
  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <input
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        placeholder="Your name"
        aria-label="Your name"
        autoComplete="name"
        className={inputClass}
      />
      {student ? (
        <div>
          <input
            value={form.username}
            onChange={(event) =>
              update("username", normalizeStudentUsername(event.target.value))
            }
            placeholder="Username (for example KE0476-213)"
            aria-label="Student username"
            autoComplete="username"
            className={inputClass}
          />
          <p
            className={`mt-1 text-xs ${usernameStatus === "available" ? "text-primary" : usernameStatus === "taken" || usernameStatus === "invalid" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {usernameMessage}
          </p>
        </div>
      ) : (
        <>
          <input
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            required
            className={inputClass}
          />
          <input
            value={form.phoneNumber}
            onChange={(event) => update("phoneNumber", event.target.value)}
            type="tel"
            placeholder="Phone number (for example +254712345678)"
            aria-label="Phone number"
            autoComplete="tel"
            required
            className={inputClass}
          />
          <div className="rounded-xl border border-primary/20 bg-card p-3 text-left">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-primary/30 px-3 py-3 text-sm font-semibold text-primary hover:bg-secondary/40">
              <span className="flex items-center gap-2"><FileText size={18} />Upload certificate PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  const certificateError = validateTrainerCertificate(file);
                  if (certificateError) {
                    setCertificate(null);
                    setError(certificateError);
                    event.currentTarget.value = "";
                    return;
                  }
                  setError("");
                  setCertificate(file);
                }}
              />
            </label>
            {certificate ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{certificate.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.ceil(certificate.size / 1024)} KB · PDF</p>
                </div>
                <button type="button" onClick={() => setCertificate(null)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-destructive">
                  <Trash2 size={14} />Remove
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Optional during sign-up. PDF only, up to 5 MB.</p>
            )}
          </div>
        </>
      )}
      <PasswordField
        name={`${role}-password`}
        label="Password (min 6 characters)"
        value={form.password}
        onChange={(value) => update("password", value)}
      />
      <PasswordField
        name={`${role}-confirm`}
        label="Confirm password"
        value={form.confirm}
        onChange={(value) => update("confirm", value)}
      />
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
      <button
        disabled={
          busy ||
          (student &&
            (usernameStatus === "checking" ||
              usernameStatus === "taken" ||
              usernameStatus === "invalid"))
        }
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          "Creating account…"
        ) : (
          <>
            {teacher ? "Request Teacher Access" : "Sign Up"}{" "}
            <ArrowRight size={18} />
          </>
        )}
      </button>
      <FormMessage message={message} />
    </form>
  );
}

export function StudentSignupPage() {
  return (
    <PageFrame>
      <AuthCard>
        <Title>Join as a Student!</Title>
        <p className="mt-6 text-sm text-muted-foreground">
          Use a classroom username instead of an email, then start solving
          Python challenges and earning badges.
        </p>
        <SignupForm role="student" />
        <AuthLinks teacher />
      </AuthCard>
    </PageFrame>
  );
}

export function TeacherSignupPage() {
  return (
    <PageFrame>
      <AuthCard>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-primary">
          <GraduationCap size={30} />
        </div>
        <div className="mt-5">
          <Title>Join as a Teacher</Title>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Create your account and request teacher access. An admin will review
          your request.
        </p>
        <SignupForm role="trainer" />
        <AuthLinks />
      </AuthCard>
    </PageFrame>
  );
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-113.5 rounded-2xl bg-card p-8 shadow-[0_16px_32px_rgba(18,50,70,0.12)] sm:p-9">
      {children}
    </section>
  );
}
function AuthLinks({ teacher = false }: { teacher?: boolean }) {
  return (
    <div className="mt-6 border-t border-border pt-4 text-center text-sm leading-7 text-muted-foreground">
      {teacher && (
        <p>
          Are you a teacher?{" "}
          <Link href="/signup/teacher" className="text-primary hover:underline">
            Sign up as a teacher
          </Link>
        </p>
      )}
      {!teacher && (
        <p>
          Are you a student?{" "}
          <Link href="/signup/student" className="text-primary hover:underline">
            Sign up as a student
          </Link>
        </p>
      )}
      <p>
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
