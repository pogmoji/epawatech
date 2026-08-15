"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { tracks, type Track } from "@/lib/curriculum";
import { getMyAttendance, type StudentAttendanceRecord } from "@/lib/api/student/attendance";
import { getStudentChallenges, type StudentChallenge } from "@/lib/api/student/challenges";
import { getMyWeeklyComments, type StudentWeeklyComment } from "@/lib/api/student/comments";
import { getEffectiveStudentTracks, getStudentActivityRouteMap } from "@/lib/api/student/curriculum";
import { getStudentEnrollmentContext, joinClassroomByCode, type EnrollmentContext } from "@/lib/api/student/enrollment";
import { getStudentProgress, type ActivityProgress } from "@/lib/api/student/progress";
import { getClassroomTypingLeaderboard, getMyTypingAttempts, summarizeTypingAttempts, type TypingAttempt, type TypingSummary } from "@/lib/api/student/typing";

type View = "overview" | "learn" | "assignments" | "challenges" | "progress" | "profile";

type DashboardState = {
  enrollment: EnrollmentContext | null;
  progressRows: ActivityProgress[];
  progress: Record<string, string[]>;
  effectiveTracks: Track[];
  attendance: StudentAttendanceRecord[];
  comments: StudentWeeklyComment[];
  assignments: StudentChallenge[];
  typingSummary: TypingSummary;
  typingAttempts: TypingAttempt[];
  typingLeaderboard: TypingAttempt[];
};

const emptyState: DashboardState = {
  enrollment: null,
  progressRows: [],
  progress: {},
  effectiveTracks: tracks,
  attendance: [],
  comments: [],
  assignments: [],
  typingSummary: { bestWpm: null, bestAccuracy: null, latestWpm: null, attempts: 0 },
  typingAttempts: [],
  typingLeaderboard: [],
};

const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: User },
];

const ICONS: Record<string, typeof BookOpen> = { Monitor: BookOpen, FileText: ClipboardList };

export default function StudentDashboard() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [state, setState] = useState<DashboardState>(emptyState);

  const studentName = profile?.full_name?.trim() || profile?.username || "Student";
  const initials = studentName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const contextRes = await getStudentEnrollmentContext();
    if (contextRes.error || !contextRes.data) {
      setState(emptyState);
      setLoading(false);
      return;
    }

    const classroomId = contextRes.data.classroomId;
    const [progressRes, activityMapRes, curriculumRes, attendanceRes, commentsRes, assignmentsRes, typingRes, leaderboardRes] = await Promise.all([
      getStudentProgress(classroomId),
      getStudentActivityRouteMap(),
      getEffectiveStudentTracks(classroomId),
      getMyAttendance(classroomId),
      getMyWeeklyComments(classroomId),
      getStudentChallenges(classroomId),
      getMyTypingAttempts(classroomId),
      getClassroomTypingLeaderboard(classroomId),
    ]);

    const effectiveTracks = curriculumRes.data ?? tracks;
    const progressRows = progressRes.data ?? [];
    const routeByActivityId = new Map(Object.entries(activityMapRes.data ?? {}).map(([route, id]) => [id, route]));
    const progress = groupCompletedProgress(progressRows, routeByActivityId, effectiveTracks);

    setState({
      enrollment: contextRes.data,
      progressRows,
      progress,
      effectiveTracks,
      attendance: attendanceRes.data ?? [],
      comments: commentsRes.data ?? [],
      assignments: assignmentsRes.data ?? [],
      typingAttempts: typingRes.data ?? [],
      typingSummary: summarizeTypingAttempts(typingRes.data ?? []),
      typingLeaderboard: leaderboardRes.data ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const totals = useMemo(() => progressTotals(state.effectiveTracks, state.progress), [state.effectiveTracks, state.progress]);
  const present = state.attendance.filter((record) => record.status === "present").length;
  const attendancePct = state.attendance.length ? Math.round((present / state.attendance.length) * 100) : null;

  const changeView = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.error) router.push("/");
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setJoining(true);
    setNotice("");
    const result = await joinClassroomByCode(joinCode);
    setJoining(false);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setJoinCode("");
    setNotice("Classroom joined. Loading your dashboard...");
    void loadDashboard();
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">Loading your student dashboard...</main>;
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-code-bg">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col bg-primary px-4 py-6 text-primary-foreground shadow-xl transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-3">
          <div>
            <p className="font-display text-xl font-bold">ePawatech</p>
            <p className="text-xs text-primary-foreground/65">Student workspace</p>
          </div>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>
        <div className="mt-9 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-primary-foreground/55">My dashboard</div>
        <nav className="mt-3 space-y-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => changeView(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "bg-primary-foreground text-primary shadow-sm" : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-primary-foreground/10 p-4">
          <button onClick={() => changeView("profile")} className="flex w-full items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary-foreground">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{studentName}</span>
              <span className="block truncate text-xs text-primary-foreground/70">{state.enrollment?.classroomName ?? "Exploration mode"}</span>
            </span>
          </button>
          <button onClick={handleSignOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-foreground/25 py-2 text-xs font-bold hover:bg-primary-foreground/10">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      {menuOpen && <button className="fixed inset-0 z-30 bg-code-bg/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="lg:pl-70">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur sm:px-9">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-border p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={19} />
            </button>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{state.enrollment ? `${state.enrollment.centreName} - ${state.enrollment.cohortName}` : "Student dashboard"}</p>
              <h1 className="font-display text-lg font-bold">{nav.find((item) => item.id === view)?.label}</h1>
            </div>
          </div>
          <button onClick={() => changeView("profile")} className="flex items-center gap-3">
            <span className="hidden text-right text-xs text-muted-foreground sm:block">
              Welcome back,
              <br />
              <b className="text-foreground">{studentName}</b>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary-foreground">{initials}</span>
          </button>
        </header>
        <div className="mx-auto max-w-360 px-5 py-7 sm:px-9 sm:py-10">
          {notice && <div role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{notice}</div>}
          {view === "overview" && <Overview state={state} studentName={studentName} totals={totals} attendancePct={attendancePct} joinCode={joinCode} setJoinCode={setJoinCode} joining={joining} onJoin={handleJoin} go={changeView} />}
          {view === "learn" && <Learn state={state} totals={totals} go={changeView} />}
          {view === "assignments" && <Assignments enrollment={state.enrollment} assignments={state.assignments} go={changeView} />}
          {view === "challenges" && <Challenges />}
          {view === "progress" && <Progress state={state} totals={totals} attendancePct={attendancePct} />}
          {view === "profile" && <ProfilePanel studentName={studentName} initials={initials} enrollment={state.enrollment} />}
        </div>
      </main>
    </div>
  );
}

function Overview({
  state,
  studentName,
  totals,
  attendancePct,
  joinCode,
  setJoinCode,
  joining,
  onJoin,
  go,
}: {
  state: DashboardState;
  studentName: string;
  totals: { completed: number; total: number; percent: number };
  attendancePct: number | null;
  joinCode: string;
  setJoinCode: (value: string) => void;
  joining: boolean;
  onJoin: (event: FormEvent) => void;
  go: (view: View) => void;
}) {
  const nextTrack = state.effectiveTracks.find((track) => (state.progress[track.slug]?.length ?? 0) < track.lessons.length + (track.challenge ? 1 : 0)) ?? state.effectiveTracks[0];
  const latestComment = state.comments[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Welcome</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Hi, {firstName(studentName)}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {state.enrollment ? `You are learning with ${state.enrollment.classroomName}.` : "You can explore lessons now. Join your classroom when your trainer gives you a code."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Curriculum" value={`${totals.percent}%`} />
          <Stat label="Assignments" value={String(state.assignments.length)} />
          <Stat label="Best WPM" value={state.typingSummary.bestWpm === null ? "-" : String(state.typingSummary.bestWpm)} />
        </div>
      </section>

      {state.enrollment ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">My classroom</p>
          <h3 className="mt-2 font-display text-xl font-bold text-foreground">{state.enrollment.classroomName}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{state.enrollment.centreName} - {state.enrollment.cohortName}</p>
          <p className="mt-1 text-sm text-muted-foreground">Trainer: {state.enrollment.trainerName}</p>
        </section>
      ) : (
        <JoinClassroomCard joinCode={joinCode} setJoinCode={setJoinCode} joining={joining} onJoin={onJoin} />
      )}

      <ActionCard title="Continue Learning" icon={BookOpen} action="Open Learn" onAction={() => go("learn")}>
        <p className="text-sm leading-6 text-muted-foreground">{nextTrack ? `${nextTrack.title} is ready for you.` : "Your lessons are ready."}</p>
      </ActionCard>
      <ActionCard title="Assignments" icon={ClipboardList} action="View Assignments" onAction={() => go("assignments")}>
        <p className="text-sm leading-6 text-muted-foreground">{state.enrollment ? (state.assignments.length ? `${state.assignments.length} classroom assignment${state.assignments.length === 1 ? "" : "s"} available.` : "No assignments yet.") : "Join a classroom to receive trainer assignments."}</p>
      </ActionCard>
      <ActionCard title="Progress Snapshot" icon={BarChart3} action="View Progress" onAction={() => go("progress")}>
        <p className="text-sm leading-6 text-muted-foreground">
          {attendancePct === null ? "Attendance and typing history will appear as you learn." : `Attendance: ${attendancePct}% present across recorded sessions.`}
        </p>
      </ActionCard>
      <ActionCard title="Trainer Comment" icon={User} action="View Profile" onAction={() => go("profile")}>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{latestComment ? latestComment.comment : "Weekly trainer comments will appear here."}</p>
      </ActionCard>
    </div>
  );
}

function Learn({ state, totals, go }: { state: DashboardState; totals: { completed: number; total: number; percent: number }; go: (view: View) => void }) {
  return (
    <div>
      {!state.enrollment && (
        <section className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-950">
          Exploration mode: join a classroom from Overview to save classroom progress.
        </section>
      )}
      {state.enrollment && (
        <section className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Learning with <b className="text-foreground">{state.enrollment.classroomName}</b>. {totals.completed}/{totals.total} activities complete.
        </section>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {state.effectiveTracks.map((track) => <TrackCard key={track.slug} track={track} completed={state.progress[track.slug] ?? []} />)}
      </div>
      {!state.enrollment && (
        <button onClick={() => go("overview")} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm">
          <KeyRound size={16} />
          Join a classroom
        </button>
      )}
    </div>
  );
}

function Assignments({ enrollment, assignments, go }: { enrollment: EnrollmentContext | null; assignments: StudentChallenge[]; go: (view: View) => void }) {
  if (!enrollment) {
    return <EmptyPanel title="No classroom yet" message="Join your trainer's classroom to unlock assignments and saved classroom progress." action="Go to Overview" onAction={() => go("overview")} />;
  }

  if (!assignments.length) {
    return <EmptyPanel title="No assignments yet" message="Your trainer's homework will appear here." />;
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => (
        <article key={assignment.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{assignment.moduleTitle}</p>
              <h2 className="mt-1 font-display text-xl font-bold text-foreground">{assignment.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Assigned {formatDate(assignment.assignedAt)}{assignment.dueDate ? ` - Due ${formatDate(assignment.dueDate)}` : ""}</p>
            </div>
            <Link href={`/learn/${assignment.moduleSlug}/${assignment.lessonSlug}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              Start <ChevronRight size={16} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function Challenges() {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Trophy size={24} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Universal challenges</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Challenge levels need the next database step</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This tab is reserved for admin-published level challenges. The current database only has trainer-assigned classroom work, which is shown under Assignments.
          </p>
        </div>
      </div>
    </section>
  );
}

function Progress({ state, totals, attendancePct }: { state: DashboardState; totals: { completed: number; total: number; percent: number }; attendancePct: number | null }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Snapshot</p>
        <div className="mt-4 grid gap-3">
          <Stat label="Curriculum complete" value={`${totals.percent}%`} />
          <Stat label="Attendance" value={attendancePct === null ? "-" : `${attendancePct}%`} />
          <Stat label="Typing attempts" value={String(state.typingSummary.attempts)} />
          <Stat label="Best accuracy" value={state.typingSummary.bestAccuracy === null ? "-" : `${state.typingSummary.bestAccuracy}%`} />
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Typing leaderboard</p>
        <div className="mt-4 space-y-2">
          {state.typingLeaderboard.length ? state.typingLeaderboard.slice(0, 8).map((attempt, index) => (
            <p key={attempt.id} className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span>{index + 1}. {attempt.studentName || "Student"}</span>
              <b>{attempt.wpm} WPM - {attempt.accuracy}%</b>
            </p>
          )) : <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">No qualifying classroom attempts yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ProfilePanel({ studentName, initials, enrollment }: { studentName: string; initials: string; enrollment: EnrollmentContext | null }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
      <section className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-primary-foreground">{initials}</div>
        <h2 className="mt-4 font-display text-2xl font-bold text-foreground">{studentName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Profile editing for bio, goals, grade, and avatar needs the next SQL-backed profile-fields step.</p>
      </section>
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Classroom information</p>
        {enrollment ? (
          <div className="mt-4 grid gap-3 text-sm">
            <Info label="Centre" value={enrollment.centreName} />
            <Info label="Cohort" value={enrollment.cohortName} />
            <Info label="Classroom" value={enrollment.classroomName} />
            <Info label="Trainer" value={enrollment.trainerName} />
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You are not in a classroom yet.</p>
        )}
      </section>
    </div>
  );
}

function JoinClassroomCard({ joinCode, setJoinCode, joining, onJoin }: { joinCode: string; setJoinCode: (value: string) => void; joining: boolean; onJoin: (event: FormEvent) => void }) {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-blue-950 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Join a classroom</p>
      <h3 className="mt-2 font-display text-xl font-bold">You are not in a classroom yet.</h3>
      <p className="mt-2 text-sm leading-6 text-blue-900">Enter the code from your trainer to start saving classroom progress.</p>
      <form onSubmit={onJoin} className="mt-4 flex gap-2">
        <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Classroom code" className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-wide outline-none focus:border-primary" />
        <button disabled={joining} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          <KeyRound size={16} />
          Join
        </button>
      </form>
    </section>
  );
}

function TrackCard({ track, completed }: { track: Track; completed: string[] }) {
  const Icon = ICONS[track.icon] || BookOpen;
  const totalLessons = track.lessons.length + (track.challenge ? 1 : 0);
  const pct = Math.round((completed.length / totalLessons) * 100);
  const firstLesson = track.lessons[0];

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="h-2 bg-primary" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Module {track.weekNumber}</span>
            <h2 className="mt-2 font-display text-xl font-bold text-code-bg">{track.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{track.description}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {track.lessons.map((lesson, index) => {
            const isDone = completed.includes(lesson.slug);
            return (
              <Link key={lesson.slug} href={`/learn/${track.slug}/${lesson.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-muted/50">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                  {isDone ? <Check size={12} /> : index + 1}
                </span>
                <span className={isDone ? "text-muted-foreground line-through" : "text-foreground"}>{lesson.title}</span>
              </Link>
            );
          })}
          {track.challenge && (
            <Link href={`/learn/${track.slug}/challenge`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-accent/10">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent text-xs font-bold text-accent-foreground">
                <Trophy size={12} />
              </span>
              <span className="font-semibold text-accent-foreground">{track.challenge.title}</span>
            </Link>
          )}
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completed.length}/{totalLessons} complete</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {firstLesson && (
          <Link href={`/learn/${track.slug}/${firstLesson.slug}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-95">
            {completed.length > 0 ? "Continue Learning" : "Start Track"} <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}

function ActionCard({ title, icon: Icon, action, onAction, children }: { title: string; icon: typeof BookOpen; action: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon size={20} />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        </div>
        <button onClick={onAction} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground">{action}</button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyPanel({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Target size={24} />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {action && onAction && <button onClick={onAction} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{action}</button>}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4 rounded-lg bg-muted px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <b className="text-right text-foreground">{value}</b>
    </p>
  );
}

function groupCompletedProgress(rows: ActivityProgress[], routeByActivityId: Map<string, string>, sourceTracks: Track[]) {
  const grouped: Record<string, string[]> = {};
  for (const item of rows) {
    if (item.status !== "completed") continue;
    const route = item.curriculum_activity_id ? routeByActivityId.get(item.curriculum_activity_id) : null;
    const customRoute = item.classroom_curriculum_item_id ? findCustomLessonRoute(sourceTracks, item.classroom_curriculum_item_id) : null;
    const completedRoute = route ?? customRoute;
    if (!completedRoute) continue;
    const [trackSlug, lessonSlug] = completedRoute.split("/");
    if (!grouped[trackSlug]) grouped[trackSlug] = [];
    grouped[trackSlug].push(lessonSlug);
  }
  return grouped;
}

function findCustomLessonRoute(sourceTracks: Track[], itemId: string) {
  for (const track of sourceTracks) {
    const lesson = track.lessons.find((candidate) => candidate.slug === `custom-${itemId}`);
    if (lesson) return `${track.slug}/${lesson.slug}`;
  }
  return null;
}

function progressTotals(sourceTracks: Track[], progress: Record<string, string[]>) {
  const total = sourceTracks.reduce((sum, track) => sum + track.lessons.length + (track.challenge ? 1 : 0), 0);
  const completed = Object.values(progress).reduce((sum, lessonSlugs) => sum + lessonSlugs.length, 0);
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
