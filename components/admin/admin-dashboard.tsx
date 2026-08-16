"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Building2, CalendarDays, Check, ClipboardCheck, ClipboardList, GraduationCap, LayoutDashboard, Menu, MessageSquareText, Plus, School, Trophy, Users, X } from "lucide-react";
import {
  activateClassroom,
  archiveClassroom,
  assignTrainerToClassroom,
  assignTrainerToCohort,
  completeClassroom,
  createCentre,
  createClassroom,
  createCohort,
  createUniversalChallenge,
  createWeeklyTopic,
  getAdminDashboardData,
  markClassroomWeeklyReportReviewed,
  markWeeklyTopicSubmissionReviewed,
  reassignTrainerToClassroom,
  removeTrainerFromClassroom,
  updateTrainerAdminReportStatus,
  updateTrainerStatus,
  updateUniversalChallenge,
  updateWeeklyTopic,
  type AdminDashboardData,
  type Centre,
  type Classroom,
  type ClassroomWeeklyReportRecord,
  type Cohort,
  type ProfileRecord,
  type TrainerAdminReportRecord,
  type UniversalChallengeRecord,
  type WeeklyTopicRecord,
} from "@/lib/api/admin/dashboard";
import { ProfileCorrections } from "@/components/admin/profile-corrections";
import { TrainerPasswordReset } from "@/components/admin/trainer-password-reset";
import { useAuth } from "@/components/auth-provider";

type View = "overview" | "centres" | "cohorts" | "trainers" | "classrooms" | "students" | "trainer-reports" | "weekly-topics" | "weekly-reports" | "challenges" | "feedback" | "activity";
type AssignmentRole = "lead" | "co_teacher";
type ClassroomStatus = "pending" | "active";

type DashboardMaps = {
  centres: Map<string, Centre>;
  cohorts: Map<string, Cohort>;
  classrooms: Map<string, Classroom>;
  profiles: Map<string, ProfileRecord>;
};

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "centres", label: "Centres", icon: Building2 },
  { id: "cohorts", label: "Cohorts", icon: School },
  { id: "trainers", label: "Trainers", icon: GraduationCap },
  { id: "classrooms", label: "Classrooms", icon: ClipboardList },
  { id: "students", label: "Students", icon: Users },
  { id: "trainer-reports", label: "Trainer Reports", icon: MessageSquareText },
  { id: "weekly-topics", label: "Weekly Input", icon: CalendarDays },
  { id: "weekly-reports", label: "Weekly Reports", icon: ClipboardCheck },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "feedback", label: "Feedback", icon: MessageSquareText },
  { id: "activity", label: "Account tools", icon: Check },
];

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "pending" || status === "planned") return "bg-amber-50 text-amber-700";
  if (status === "rejected" || status === "suspended") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(value)}`}>{value.replace("_", " ")}</span>;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-";
}

function currentWeekNumber() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const elapsedDays = Math.floor((now.getTime() - firstDay.getTime()) / 86_400_000);
  return Math.min(52, Math.max(1, Math.ceil((elapsedDays + firstDay.getDay() + 1) / 7)));
}

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [centreName, setCentreName] = useState("");
  const [centreDescription, setCentreDescription] = useState("");
  const [cohortName, setCohortName] = useState("");
  const [cohortCentre, setCohortCentre] = useState("");
  const [cohortStatus, setCohortStatus] = useState("planned");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [cohortTrainer, setCohortTrainer] = useState("");
  const [trainerCohort, setTrainerCohort] = useState("");
  const [trainerCohortRole, setTrainerCohortRole] = useState<AssignmentRole>("lead");

  const [classroomCentre, setClassroomCentre] = useState("");
  const [classroomCohort, setClassroomCohort] = useState("");
  const [classroomName, setClassroomName] = useState("");
  const [classroomStatus, setClassroomStatus] = useState<ClassroomStatus>("pending");
  const [classroomTrainer, setClassroomTrainer] = useState("");
  const [classroomTrainerSelections, setClassroomTrainerSelections] = useState<Record<string, string>>({});
  const [challengeEditingId, setChallengeEditingId] = useState<string | null>(null);
  const [challengeLevel, setChallengeLevel] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeInstructions, setChallengeInstructions] = useState("");
  const [challengeSortOrder, setChallengeSortOrder] = useState("1");
  const [challengeRequired, setChallengeRequired] = useState(true);
  const [challengePublished, setChallengePublished] = useState(false);
  const [topicEditingId, setTopicEditingId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicInstructions, setTopicInstructions] = useState("");
  const [topicWeekKey, setTopicWeekKey] = useState(`week-${currentWeekNumber()}`);
  const [topicStartsAt, setTopicStartsAt] = useState("");
  const [topicDueAt, setTopicDueAt] = useState("");
  const [topicPublished, setTopicPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminDashboardData();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDashboard(result.data);
    setError("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const maps: DashboardMaps = useMemo(() => {
    const profiles = dashboard ? [...dashboard.admins, ...dashboard.trainers, ...dashboard.students] : [];
    return {
      centres: new Map(dashboard?.centres.map((item) => [item.id, item]) ?? []),
      cohorts: new Map(dashboard?.cohorts.map((item) => [item.id, item]) ?? []),
      classrooms: new Map(dashboard?.classrooms.map((item) => [item.id, item]) ?? []),
      profiles: new Map(profiles.map((item) => [item.id, item])),
    };
  }, [dashboard]);

  const activeTrainers = dashboard?.trainers.filter((trainer) => trainer.status === "active") ?? [];
  const classroomCohorts = dashboard?.cohorts.filter((cohort) => !classroomCentre || cohort.centre_id === classroomCentre) ?? [];
  const metrics = dashboard ? [
    { label: "Centres", value: dashboard.centres.length, icon: Building2 },
    { label: "Active cohorts", value: dashboard.cohorts.filter((item) => item.status === "active").length, icon: School },
    { label: "Active trainers", value: dashboard.trainers.filter((item) => item.status === "active").length, icon: GraduationCap },
    { label: "Active classrooms", value: dashboard.classrooms.filter((item) => item.status === "active").length, icon: ClipboardList },
    { label: "Pending classrooms", value: dashboard.classrooms.filter((item) => item.status === "pending").length, icon: Check },
    { label: "Active students", value: dashboard.students.filter((item) => item.status === "active").length, icon: Users },
    { label: "Trainer reports", value: dashboard.trainerReports.filter((item) => item.status !== "resolved").length, icon: MessageSquareText },
    { label: "Weekly input", value: dashboard.weeklyTopics.length, icon: CalendarDays },
    { label: "Classroom weekly reports", value: dashboard.classroomWeeklyReports.filter((item) => item.status !== "reviewed").length, icon: ClipboardCheck },
    { label: "Universal challenges", value: dashboard.universalChallenges.length, icon: Trophy },
    { label: "Student reflections", value: dashboard.feedback.length, icon: MessageSquareText },
  ] : [];

  async function runAdminAction<T>(action: () => Promise<{ data: T | null; error: string | null }>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    const result = await action();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    setNotice(successMessage);
    await load();
    return result.data;
  }

  async function submitCentre(event: FormEvent) {
    event.preventDefault();
    if (!centreName.trim()) return setError("Enter a name for the centre.");
    const result = await runAdminAction(() => createCentre({ name: centreName, description: centreDescription }), "Centre created.");
    if (result) {
      setCentreName("");
      setCentreDescription("");
    }
  }

  async function submitCohort(event: FormEvent) {
    event.preventDefault();
    if (!cohortCentre || !cohortName.trim()) return setError("Choose a centre and enter a cohort name.");
    const result = await runAdminAction(
      () => createCohort({ centreId: cohortCentre, name: cohortName, status: cohortStatus, startDate, endDate }),
      "Cohort created.",
    );
    if (result) {
      setCohortName("");
      setStartDate("");
      setEndDate("");
    }
  }

  async function reviewTrainer(id: string, status: "active" | "rejected") {
    await runAdminAction(() => updateTrainerStatus(id, status), `Trainer ${status === "active" ? "approved" : "rejected"}.`);
  }

  async function submitTrainerCohort(event: FormEvent) {
    event.preventDefault();
    if (!cohortTrainer || !trainerCohort) return setError("Choose an active trainer and a cohort.");
    const result = await runAdminAction(
      () => assignTrainerToCohort({ trainerId: cohortTrainer, cohortId: trainerCohort, role: trainerCohortRole }),
      "Trainer assigned to cohort.",
    );
    if (result) {
      setCohortTrainer("");
      setTrainerCohort("");
    }
  }

  async function submitClassroom(event: FormEvent) {
    event.preventDefault();
    if (!classroomCohort || !classroomName.trim()) return setError("Choose a cohort and enter a classroom name.");
    const result = await runAdminAction(
      () => createClassroom({
        cohortId: classroomCohort,
        name: classroomName,
        initialStatus: classroomStatus,
        trainerId: classroomTrainer || null,
      }),
      "Classroom created.",
    );
    if (result) {
      setClassroomName("");
      setClassroomTrainer("");
      setNotice(`Classroom created. Join code: ${result.join_code}`);
    }
  }

  function eligibleTrainersForCohort(cohortId: string) {
    const eligibleIds = new Set(
      dashboard?.assignments
        .filter((assignment) => assignment.classroom_id === null && assignment.cohort_id === cohortId && assignment.status === "active")
        .map((assignment) => assignment.trainer_id) ?? [],
    );
    return activeTrainers.filter((trainer) => eligibleIds.has(trainer.id));
  }

  async function activate(id: string) {
    await runAdminAction(() => activateClassroom(id, classroomTrainerSelections[id] || null), "Classroom activated.");
  }

  async function assignClassroomTrainer(room: Classroom, currentLeadId: string | null) {
    const trainerId = classroomTrainerSelections[room.id];
    if (!trainerId) return setError("Choose a trainer for this classroom.");
    const role = currentLeadId ? "co_teacher" : "lead";
    await runAdminAction(
      () => assignTrainerToClassroom({ classroomId: room.id, trainerId, role }),
      currentLeadId ? "Trainer added to classroom." : "Lead Trainer assigned to classroom.",
    );
  }

  async function makeLeadTrainer(room: Classroom, trainerId: string) {
    await runAdminAction(
      () => reassignTrainerToClassroom({ classroomId: room.id, trainerId }),
      "Lead Trainer updated. Previous lead stayed assigned as a classroom trainer.",
    );
  }

  async function removeClassroomTrainer(room: Classroom, trainerId: string) {
    await runAdminAction(
      () => removeTrainerFromClassroom({ classroomId: room.id, trainerId }),
      "Trainer removed from classroom.",
    );
  }

  async function updateTrainerReportStatus(report: TrainerAdminReportRecord, status: "reviewed" | "resolved") {
    await runAdminAction(
      () => updateTrainerAdminReportStatus({ id: report.id, status }),
      `Trainer report marked ${status}.`,
    );
  }

  async function complete(id: string) {
    await runAdminAction(() => completeClassroom(id), "Classroom completed.");
  }

  async function archive(id: string) {
    await runAdminAction(() => archiveClassroom(id), "Classroom archived.");
  }

  function resetChallengeForm() {
    setChallengeEditingId(null);
    setChallengeLevel("");
    setChallengeTitle("");
    setChallengeDescription("");
    setChallengeInstructions("");
    setChallengeSortOrder("1");
    setChallengeRequired(true);
    setChallengePublished(false);
  }

  function resetTopicForm() {
    setTopicEditingId(null);
    setTopicTitle("");
    setTopicInstructions("");
    setTopicWeekKey(`week-${currentWeekNumber()}`);
    setTopicStartsAt("");
    setTopicDueAt("");
    setTopicPublished(false);
  }

  function editTopic(topic: WeeklyTopicRecord) {
    setTopicEditingId(topic.id);
    setTopicTitle(topic.title);
    setTopicInstructions(topic.instructions);
    setTopicWeekKey(topic.week_key);
    setTopicStartsAt(topic.starts_at ? topic.starts_at.slice(0, 16) : "");
    setTopicDueAt(topic.due_at ? topic.due_at.slice(0, 16) : "");
    setTopicPublished(topic.published);
    setView("weekly-topics");
  }

  async function submitTopic(event: FormEvent) {
    event.preventDefault();
    if (!topicTitle.trim() || !topicInstructions.trim() || !topicWeekKey.trim() || !topicDueAt) {
      return setError("Enter a title, instructions, week key, and due date.");
    }
    const payload = {
      title: topicTitle,
      instructions: topicInstructions,
      weekKey: topicWeekKey,
      startsAt: topicStartsAt ? new Date(topicStartsAt).toISOString() : "",
      dueAt: new Date(topicDueAt).toISOString(),
      published: topicPublished,
    };
    const result = await runAdminAction(
      () => topicEditingId ? updateWeeklyTopic({ id: topicEditingId, ...payload }) : createWeeklyTopic(payload),
      topicEditingId ? "Weekly topic updated." : "Weekly topic created.",
    );
    if (result) resetTopicForm();
  }

  async function reviewWeeklyTopicSubmission(id: string) {
    await runAdminAction(() => markWeeklyTopicSubmissionReviewed(id), "Weekly topic submission marked reviewed.");
  }

  async function reviewClassroomWeeklyReport(report: ClassroomWeeklyReportRecord) {
    await runAdminAction(() => markClassroomWeeklyReportReviewed(report.id), "Classroom weekly report marked reviewed.");
  }

  function editChallenge(challenge: UniversalChallengeRecord) {
    setChallengeEditingId(challenge.id);
    setChallengeLevel(challenge.level_id);
    setChallengeTitle(challenge.title);
    setChallengeDescription(challenge.description);
    setChallengeInstructions(challenge.instructions);
    setChallengeSortOrder(String(challenge.sort_order));
    setChallengeRequired(challenge.is_required);
    setChallengePublished(challenge.is_published);
    setView("challenges");
  }

  async function submitChallenge(event: FormEvent) {
    event.preventDefault();
    if (!challengeLevel || !challengeTitle.trim()) return setError("Choose a level and enter a challenge title.");
    const payload = {
      levelId: challengeLevel,
      title: challengeTitle,
      description: challengeDescription,
      instructions: challengeInstructions,
      sortOrder: Number(challengeSortOrder) || 0,
      isRequired: challengeRequired,
      isPublished: challengePublished,
    };
    const result = await runAdminAction(
      () => challengeEditingId ? updateUniversalChallenge({ id: challengeEditingId, ...payload }) : createUniversalChallenge(payload),
      challengeEditingId ? "Universal challenge updated." : "Universal challenge created.",
    );
    if (result) resetChallengeForm();
  }

  const changeView = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-code-bg">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col overflow-hidden bg-primary p-5 text-primary-foreground shadow-xl transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center justify-between">
          <div><p className="font-display text-xl font-bold">ePawatech</p><p className="text-xs text-white/70">Administration</p></div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <nav className="mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => changeView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${view === item.id ? "bg-white/18" : "hover:bg-white/10"}`}><Icon className="size-4" />{item.label}</button>; })}</nav>
        <div className="mt-4 shrink-0 border-t border-white/15 pt-4">
          <p className="truncate text-sm font-semibold">{profile?.full_name || "Administrator"}</p>
          <button onClick={() => void signOut()} className="mt-3 text-sm text-white/75 hover:text-white">Sign out</button>
        </div>
      </aside>
      <main className="min-h-screen lg:pl-70">
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:px-9">
          <button className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Control centre</p><h1 className="font-display text-2xl font-bold text-foreground">{navigation.find((item) => item.id === view)?.label}</h1></div>
        </header>
        <section className="p-5 lg:p-9">
          {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
          {error && <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}<button onClick={() => { setError(""); void load(); }} className="font-semibold underline">Try again</button></div>}
          {loading ? <DashboardSkeleton /> : dashboard && (
            <DashboardContent
              view={view}
              dashboard={dashboard}
              maps={maps}
              metrics={metrics}
              busy={busy}
              activeTrainers={activeTrainers}
              classroomCohorts={classroomCohorts}
              classroomTrainerSelections={classroomTrainerSelections}
              setClassroomTrainerSelections={setClassroomTrainerSelections}
              centreName={centreName}
              setCentreName={setCentreName}
              centreDescription={centreDescription}
              setCentreDescription={setCentreDescription}
              cohortName={cohortName}
              setCohortName={setCohortName}
              cohortCentre={cohortCentre}
              setCohortCentre={setCohortCentre}
              cohortStatus={cohortStatus}
              setCohortStatus={setCohortStatus}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              cohortTrainer={cohortTrainer}
              setCohortTrainer={setCohortTrainer}
              trainerCohort={trainerCohort}
              setTrainerCohort={setTrainerCohort}
              trainerCohortRole={trainerCohortRole}
              setTrainerCohortRole={setTrainerCohortRole}
              classroomCentre={classroomCentre}
              setClassroomCentre={setClassroomCentre}
              classroomCohort={classroomCohort}
              setClassroomCohort={setClassroomCohort}
              classroomName={classroomName}
              setClassroomName={setClassroomName}
              classroomStatus={classroomStatus}
              setClassroomStatus={setClassroomStatus}
              classroomTrainer={classroomTrainer}
              setClassroomTrainer={setClassroomTrainer}
              eligibleTrainersForCohort={eligibleTrainersForCohort}
              onCentreSubmit={submitCentre}
              onCohortSubmit={submitCohort}
              onReviewTrainer={reviewTrainer}
              onTrainerCohortSubmit={submitTrainerCohort}
              onClassroomSubmit={submitClassroom}
              onActivate={activate}
              onAssignClassroomTrainer={assignClassroomTrainer}
              onMakeLeadTrainer={makeLeadTrainer}
              onRemoveClassroomTrainer={removeClassroomTrainer}
              onComplete={complete}
              onArchive={archive}
              onTrainerReportStatus={updateTrainerReportStatus}
              topicEditingId={topicEditingId}
              topicTitle={topicTitle}
              setTopicTitle={setTopicTitle}
              topicInstructions={topicInstructions}
              setTopicInstructions={setTopicInstructions}
              topicWeekKey={topicWeekKey}
              setTopicWeekKey={setTopicWeekKey}
              topicStartsAt={topicStartsAt}
              setTopicStartsAt={setTopicStartsAt}
              topicDueAt={topicDueAt}
              setTopicDueAt={setTopicDueAt}
              topicPublished={topicPublished}
              setTopicPublished={setTopicPublished}
              onTopicSubmit={submitTopic}
              onEditTopic={editTopic}
              onCancelTopicEdit={resetTopicForm}
              onReviewWeeklyTopicSubmission={reviewWeeklyTopicSubmission}
              onReviewClassroomWeeklyReport={reviewClassroomWeeklyReport}
              challengeEditingId={challengeEditingId}
              challengeLevel={challengeLevel}
              setChallengeLevel={setChallengeLevel}
              challengeTitle={challengeTitle}
              setChallengeTitle={setChallengeTitle}
              challengeDescription={challengeDescription}
              setChallengeDescription={setChallengeDescription}
              challengeInstructions={challengeInstructions}
              setChallengeInstructions={setChallengeInstructions}
              challengeSortOrder={challengeSortOrder}
              setChallengeSortOrder={setChallengeSortOrder}
              challengeRequired={challengeRequired}
              setChallengeRequired={setChallengeRequired}
              challengePublished={challengePublished}
              setChallengePublished={setChallengePublished}
              onChallengeSubmit={submitChallenge}
              onEditChallenge={editChallenge}
              onCancelChallengeEdit={resetChallengeForm}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}

type ContentProps = {
  view: View;
  dashboard: AdminDashboardData;
  maps: DashboardMaps;
  metrics: { label: string; value: number; icon: typeof Building2 }[];
  busy: boolean;
  activeTrainers: ProfileRecord[];
  classroomCohorts: Cohort[];
  classroomTrainerSelections: Record<string, string>;
  setClassroomTrainerSelections: (value: Record<string, string>) => void;
  centreName: string;
  setCentreName: (value: string) => void;
  centreDescription: string;
  setCentreDescription: (value: string) => void;
  cohortName: string;
  setCohortName: (value: string) => void;
  cohortCentre: string;
  setCohortCentre: (value: string) => void;
  cohortStatus: string;
  setCohortStatus: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  cohortTrainer: string;
  setCohortTrainer: (value: string) => void;
  trainerCohort: string;
  setTrainerCohort: (value: string) => void;
  trainerCohortRole: AssignmentRole;
  setTrainerCohortRole: (value: AssignmentRole) => void;
  classroomCentre: string;
  setClassroomCentre: (value: string) => void;
  classroomCohort: string;
  setClassroomCohort: (value: string) => void;
  classroomName: string;
  setClassroomName: (value: string) => void;
  classroomStatus: ClassroomStatus;
  setClassroomStatus: (value: ClassroomStatus) => void;
  classroomTrainer: string;
  setClassroomTrainer: (value: string) => void;
  eligibleTrainersForCohort: (cohortId: string) => ProfileRecord[];
  onCentreSubmit: (event: FormEvent) => Promise<void>;
  onCohortSubmit: (event: FormEvent) => Promise<void>;
  onReviewTrainer: (id: string, status: "active" | "rejected") => Promise<void>;
  onTrainerCohortSubmit: (event: FormEvent) => Promise<void>;
  onClassroomSubmit: (event: FormEvent) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onAssignClassroomTrainer: (room: Classroom, currentLeadId: string | null) => Promise<void>;
  onMakeLeadTrainer: (room: Classroom, trainerId: string) => Promise<void>;
  onRemoveClassroomTrainer: (room: Classroom, trainerId: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onTrainerReportStatus: (report: TrainerAdminReportRecord, status: "reviewed" | "resolved") => Promise<void>;
  topicEditingId: string | null;
  topicTitle: string;
  setTopicTitle: (value: string) => void;
  topicInstructions: string;
  setTopicInstructions: (value: string) => void;
  topicWeekKey: string;
  setTopicWeekKey: (value: string) => void;
  topicStartsAt: string;
  setTopicStartsAt: (value: string) => void;
  topicDueAt: string;
  setTopicDueAt: (value: string) => void;
  topicPublished: boolean;
  setTopicPublished: (value: boolean) => void;
  onTopicSubmit: (event: FormEvent) => Promise<void>;
  onEditTopic: (topic: WeeklyTopicRecord) => void;
  onCancelTopicEdit: () => void;
  onReviewWeeklyTopicSubmission: (id: string) => Promise<void>;
  onReviewClassroomWeeklyReport: (report: ClassroomWeeklyReportRecord) => Promise<void>;
  challengeEditingId: string | null;
  challengeLevel: string;
  setChallengeLevel: (value: string) => void;
  challengeTitle: string;
  setChallengeTitle: (value: string) => void;
  challengeDescription: string;
  setChallengeDescription: (value: string) => void;
  challengeInstructions: string;
  setChallengeInstructions: (value: string) => void;
  challengeSortOrder: string;
  setChallengeSortOrder: (value: string) => void;
  challengeRequired: boolean;
  setChallengeRequired: (value: boolean) => void;
  challengePublished: boolean;
  setChallengePublished: (value: boolean) => void;
  onChallengeSubmit: (event: FormEvent) => Promise<void>;
  onEditChallenge: (challenge: UniversalChallengeRecord) => void;
  onCancelChallengeEdit: () => void;
};

function DashboardContent(p: ContentProps) {
  if (p.view === "overview") return <Overview metrics={p.metrics} />;
  if (p.view === "centres") return <CentresView {...p} />;
  if (p.view === "cohorts") return <CohortsView {...p} />;
  if (p.view === "trainers") return <TrainersView {...p} />;
  if (p.view === "classrooms") return <ClassroomsView {...p} />;
  if (p.view === "students") return <StudentsView {...p} />;
  if (p.view === "trainer-reports") return <TrainerReportsView {...p} />;
  if (p.view === "weekly-topics") return <WeeklyTopicsView {...p} />;
  if (p.view === "weekly-reports") return <ClassroomWeeklyReportsView {...p} />;
  if (p.view === "challenges") return <ChallengesView {...p} />;
  if (p.view === "feedback") return <FeedbackView {...p} />;
  return <div className="space-y-6"><div><h2 className="font-display text-xl font-bold">Account tools</h2><p className="mt-1 text-sm text-muted-foreground">Sensitive actions use the authenticated admin session and existing protected endpoints.</p></div><ProfileCorrections /><TrainerPasswordReset /></div>;
}

function Overview({ metrics }: Pick<ContentProps, "metrics">) {
  return <><p className="mb-6 text-sm text-muted-foreground">A live view of your organisation. Figures reflect records your administrator session can access.</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-6 size-5 text-secondary" /><p className="font-display text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></article>)}</div></>;
}

function CentresView(p: ContentProps) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><ListCard title="Centres" empty="No centres have been created yet.">{p.dashboard.centres.map((centre) => <div key={centre.id} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"><div><p className="font-semibold">{centre.name}</p><p className="mt-1 text-sm text-muted-foreground">{centre.description || "No description"}</p></div><Status value={centre.status} /></div>)}</ListCard><FormCard title="Create centre" onSubmit={p.onCentreSubmit} busy={p.busy} button="Create centre"><Input value={p.centreName} onChange={p.setCentreName} placeholder="Centre name" /><textarea value={p.centreDescription} onChange={(event) => p.setCentreDescription(event.target.value)} placeholder="Description (optional)" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></FormCard></div>;
}

function CohortsView(p: ContentProps) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><ListCard title="Cohorts" empty="No cohorts have been created yet.">{p.dashboard.cohorts.map((cohort) => <div key={cohort.id} className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0"><div><p className="font-semibold">{cohort.name}</p><p className="mt-1 text-sm text-muted-foreground">{p.maps.centres.get(cohort.centre_id)?.name || "Unknown centre"} · {formatDate(cohort.start_date)} - {formatDate(cohort.end_date)}</p></div><Status value={cohort.status} /></div>)}</ListCard><FormCard title="Create cohort" onSubmit={p.onCohortSubmit} busy={p.busy} button="Create cohort"><select value={p.cohortCentre} onChange={(event) => p.setCohortCentre(event.target.value)} className="input"><option value="">Choose a centre</option>{p.dashboard.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}</select><Input value={p.cohortName} onChange={p.setCohortName} placeholder="Cohort name" /><select value={p.cohortStatus} onChange={(event) => p.setCohortStatus(event.target.value)} className="input"><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><Input type="date" value={p.startDate} onChange={p.setStartDate} /><Input type="date" value={p.endDate} onChange={p.setEndDate} /></FormCard></div>;
}

function TrainersView(p: ContentProps) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><ListCard title="Trainer accounts" empty="No trainer accounts found.">{p.dashboard.trainers.map((trainer) => <div key={trainer.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-0"><div><p className="font-semibold">{trainer.full_name || "Unnamed trainer"}</p><p className="mt-1 text-sm text-muted-foreground">{trainer.phone_number || "No phone"} · {p.dashboard.assignments.filter((assignment) => assignment.trainer_id === trainer.id && assignment.status === "active").length} active assignment(s)</p></div><div className="flex items-center gap-2"><Status value={trainer.status} />{trainer.status === "pending" && <><button disabled={p.busy} onClick={() => void p.onReviewTrainer(trainer.id, "active")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button><button disabled={p.busy} onClick={() => void p.onReviewTrainer(trainer.id, "rejected")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Reject</button></>}</div></div>)}</ListCard><FormCard title="Assign trainer to cohort" onSubmit={p.onTrainerCohortSubmit} busy={p.busy} button="Assign trainer"><select value={p.cohortTrainer} onChange={(event) => p.setCohortTrainer(event.target.value)} className="input"><option value="">Choose active trainer</option>{p.activeTrainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.full_name || "Unnamed trainer"}</option>)}</select><select value={p.trainerCohort} onChange={(event) => p.setTrainerCohort(event.target.value)} className="input"><option value="">Choose cohort</option>{p.dashboard.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{p.maps.centres.get(cohort.centre_id)?.name || "Centre"} / {cohort.name}</option>)}</select><select value={p.trainerCohortRole} onChange={(event) => p.setTrainerCohortRole(event.target.value as AssignmentRole)} className="input"><option value="lead">Lead trainer</option><option value="co_teacher">Co-teacher</option></select></FormCard></div>;
}

function ClassroomsView(p: ContentProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <ListCard title="Classroom lifecycle" empty="No classrooms have been created yet.">
        {p.dashboard.classrooms.map((room) => {
          const cohort = p.maps.cohorts.get(room.cohort_id);
          const centre = cohort ? p.maps.centres.get(cohort.centre_id) : undefined;
          const classroomAssignments = p.dashboard.assignments
            .filter((assignment) => assignment.classroom_id === room.id && ["active", "pending"].includes(assignment.status))
            .sort((a, b) => (a.role === "lead" ? -1 : 0) - (b.role === "lead" ? -1 : 0));
          const lead = classroomAssignments.find((assignment) => assignment.role === "lead");
          const activeLeadId = lead?.status === "active" ? lead.trainer_id : null;
          const assignedTrainerIds = new Set(classroomAssignments.map((assignment) => assignment.trainer_id));
          const eligible = cohort
            ? p.eligibleTrainersForCohort(cohort.id).filter((trainer) => !assignedTrainerIds.has(trainer.id))
            : [];
          const selectedTrainer = p.classroomTrainerSelections[room.id] ?? "";

          return (
            <div key={room.id} className="space-y-4 border-b border-slate-100 py-4 last:border-0">
              <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <div className="mt-2"><Status value={room.status} /></div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {centre?.name || "Unknown centre"}<br />
                  {cohort?.name || "Unknown cohort"}<br />
                  Created by {p.maps.profiles.get(room.created_by)?.full_name || "Unknown admin"}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Lead: {lead ? `${p.maps.profiles.get(lead.trainer_id)?.full_name || "Unknown trainer"} (${lead.status})` : "Unassigned"}<br />
                  Trainers: {classroomAssignments.length}<br />
                  Students: {p.dashboard.enrollments.filter((item) => item.classroom_id === room.id && item.status === "active").length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Classroom trainers
                </p>
                <div className="mt-2 space-y-2">
                  {classroomAssignments.length ? classroomAssignments.map((assignment) => {
                    const trainer = p.maps.profiles.get(assignment.trainer_id);
                    const isLead = assignment.role === "lead";
                    return (
                      <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold">{trainer?.full_name || "Unknown trainer"}</p>
                          <p className="text-xs text-muted-foreground">{isLead ? "Lead Trainer" : "Classroom trainer"} · {assignment.status}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isLead && room.status !== "archived" && (
                            <button disabled={p.busy} onClick={() => void p.onMakeLeadTrainer(room, assignment.trainer_id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">
                              Make Lead
                            </button>
                          )}
                          {room.status !== "archived" && (
                            <button disabled={p.busy} onClick={() => void p.onRemoveClassroomTrainer(room, assignment.trainer_id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-muted-foreground">No classroom trainers assigned yet.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select value={selectedTrainer} onChange={(event) => p.setClassroomTrainerSelections({ ...p.classroomTrainerSelections, [room.id]: event.target.value })} className="h-9 min-w-48 rounded-lg border border-border bg-background px-2 text-xs">
                  <option value="">Choose cohort trainer</option>
                  {eligible.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.full_name || "Unnamed trainer"}</option>)}
                </select>
                {room.status === "pending" && (
                  <button disabled={p.busy} onClick={() => void p.onActivate(room.id)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    <Check className="mr-1 inline size-3" />Activate
                  </button>
                )}
                {room.status !== "archived" && (
                  <button disabled={p.busy || !selectedTrainer} onClick={() => void p.onAssignClassroomTrainer(room, activeLeadId)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                    <Plus className="mr-1 inline size-3" />{activeLeadId ? "Add trainer" : "Assign lead"}
                  </button>
                )}
                {room.status === "active" && <button disabled={p.busy} onClick={() => void p.onComplete(room.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Complete</button>}
                {(room.status === "active" || room.status === "completed") && (
                  <button disabled={p.busy} onClick={() => void p.onArchive(room.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                    <Archive className="mr-1 inline size-3" />Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </ListCard>
      <FormCard title="Create classroom" onSubmit={p.onClassroomSubmit} busy={p.busy} button="Create classroom">
        <select value={p.classroomCentre} onChange={(event) => { p.setClassroomCentre(event.target.value); p.setClassroomCohort(""); p.setClassroomTrainer(""); }} className="input">
          <option value="">Choose centre</option>
          {p.dashboard.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
        </select>
        <select value={p.classroomCohort} onChange={(event) => { p.setClassroomCohort(event.target.value); p.setClassroomTrainer(""); }} className="input">
          <option value="">Choose cohort</option>
          {p.classroomCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
        </select>
        <Input value={p.classroomName} onChange={p.setClassroomName} placeholder="Classroom name" />
        <select value={p.classroomStatus} onChange={(event) => p.setClassroomStatus(event.target.value as ClassroomStatus)} className="input">
          <option value="pending">Pending approval</option>
          <option value="active">Active now</option>
        </select>
        <select value={p.classroomTrainer} onChange={(event) => p.setClassroomTrainer(event.target.value)} className="input">
          <option value="">Optional lead trainer</option>
          {p.eligibleTrainersForCohort(p.classroomCohort).map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.full_name || "Unnamed trainer"}</option>)}
        </select>
      </FormCard>
    </div>
  );
}

function StudentsView(p: ContentProps) {
  return <ListCard title="Student enrollments" empty="No student accounts found.">{p.dashboard.students.map((student) => { const enrollment = p.dashboard.enrollments.find((item) => item.student_id === student.id && item.status === "active"); const classroom = enrollment ? p.maps.classrooms.get(enrollment.classroom_id) : undefined; const cohort = classroom ? p.maps.cohorts.get(classroom.cohort_id) : undefined; const feedbackCount = p.dashboard.feedback.filter((item) => item.student_id === student.id).length; return <div key={student.id} className="grid gap-2 border-b border-slate-100 py-4 md:grid-cols-4"><div><p className="font-semibold">{student.full_name || student.username || "Unnamed student"}</p><p className="text-sm text-muted-foreground">{student.username || "No username"}</p></div><p className="text-sm text-muted-foreground">{classroom?.name || "Not actively enrolled"}</p><p className="text-sm text-muted-foreground">{cohort ? p.maps.centres.get(cohort.centre_id)?.name || "Unknown centre" : "-"}</p><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{feedbackCount} reflection{feedbackCount === 1 ? "" : "s"}</p><Status value={student.status} /></div></div>; })}</ListCard>;
}

function TrainerReportsView(p: ContentProps) {
  return (
    <ListCard title="Trainer reports" empty="No trainer reports have been submitted yet.">
      {p.dashboard.trainerReports.map((report) => {
        const trainer = p.maps.profiles.get(report.trainer_id);
        const classroom = report.classroom_id ? p.maps.classrooms.get(report.classroom_id) : undefined;
        const cohort = classroom ? p.maps.cohorts.get(classroom.cohort_id) : undefined;
        const centre = cohort ? p.maps.centres.get(cohort.centre_id) : undefined;
        return (
          <article key={report.id} className="border-b border-slate-100 py-5 last:border-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-bold">{report.subject}</p>
                  <Status value={report.priority} />
                  <Status value={report.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trainer?.full_name || "Unknown trainer"}{report.trainer_email ? ` · ${report.trainer_email}` : ""} · {formatDate(report.created_at)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {classroom?.name || "No classroom"} · {centre?.name || "No centre"} · {report.category.replace("_", " ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {report.status === "submitted" && (
                  <button disabled={p.busy} onClick={() => void p.onTrainerReportStatus(report, "reviewed")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                    Mark reviewed
                  </button>
                )}
                {report.status !== "resolved" && (
                  <button disabled={p.busy} onClick={() => void p.onTrainerReportStatus(report, "resolved")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Resolve
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{report.message}</p>
            {report.attachment_file_name && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Attachment: {report.attachment_file_name}
              </p>
            )}
            {report.signed_attachment_url && (
              <a href={report.signed_attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">
                Open attachment
              </a>
            )}
          </article>
        );
      })}
    </ListCard>
  );
}

function WeeklyTopicsView(p: ContentProps) {
  const [currentTime] = useState(() => Date.now());
  const activeTrainers = p.dashboard.trainers.filter((trainer) => trainer.status === "active");

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <FormCard className="order-first" title={p.topicEditingId ? "Edit weekly topic" : "Post weekly topic"} onSubmit={p.onTopicSubmit} busy={p.busy} button={p.topicEditingId ? "Update topic" : "Post topic"}>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Topic title
          <Input value={p.topicTitle} onChange={p.setTopicTitle} placeholder="Example: Introducing loops" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Week key
          <Input value={p.topicWeekKey} onChange={p.setTopicWeekKey} placeholder="week-12" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Opens at
          <Input type="datetime-local" value={p.topicStartsAt} onChange={p.setTopicStartsAt} />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Due at
          <Input type="datetime-local" value={p.topicDueAt} onChange={p.setTopicDueAt} />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Instructions for trainers
          <textarea value={p.topicInstructions} onChange={(event) => p.setTopicInstructions(event.target.value)} maxLength={3000} placeholder="What should every trainer respond to this week?" className="mt-1 min-h-36 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={p.topicPublished} onChange={(event) => p.setTopicPublished(event.target.checked)} />
          Published to trainers
        </label>
        {p.topicEditingId && (
          <button type="button" onClick={p.onCancelTopicEdit} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-slate-700">Cancel edit</button>
        )}
      </FormCard>

      <ListCard title="Weekly Inputs" empty="No Weekly Inputs have been posted yet.">
        {p.dashboard.weeklyTopics.map((topic) => {
          const submissions = p.dashboard.weeklyTopicSubmissions.filter((submission) => submission.weekly_topic_id === topic.id);
          const dueDate = new Date(topic.due_at);
          const overdue = Number.isFinite(dueDate.getTime()) && dueDate.getTime() < currentTime;

          return (
            <section key={topic.id} className="border-b border-slate-100 py-5 last:border-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold">{topic.title}</p>
                    <Status value={topic.published ? "published" : "draft"} />
                    {overdue && <Status value="overdue" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.week_key} · Opens {formatDate(topic.starts_at)} · Due {formatDate(topic.due_at)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{topic.instructions}</p>
                </div>
                <button onClick={() => p.onEditTopic(topic)} className="w-fit rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary">
                  Edit
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white">
                <div className="grid gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[1fr_130px_110px]">
                  <span>Trainer</span>
                  <span>Submitted</span>
                  <span>Status</span>
                </div>
                {activeTrainers.length ? activeTrainers.map((trainer) => {
                  const submission = submissions.find((item) => item.trainer_id === trainer.id);
                  const status = submission ? submission.status : overdue ? "missing" : "pending";
                  return (
                    <div key={`${topic.id}-${trainer.id}`} className="grid gap-2 border-b border-slate-100 px-3 py-3 text-sm last:border-0 sm:grid-cols-[1fr_130px_110px] sm:items-center">
                      <div>
                        <p className="font-semibold">{trainer.full_name || "Unnamed trainer"}</p>
                        {submission?.text_response && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{submission.text_response}</p>}
                        {submission?.file_name && <p className="mt-1 text-xs font-semibold text-muted-foreground">File: {submission.file_name}</p>}
                        {submission?.signed_file_url && (
                          <a href={submission.signed_file_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-bold text-primary hover:underline">
                            Open file
                          </a>
                        )}
                      </div>
                      <p className="text-muted-foreground">{submission ? formatDate(submission.submitted_at) : "-"}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Status value={status} />
                        {submission?.status === "submitted" && (
                          <button disabled={p.busy} onClick={() => void p.onReviewWeeklyTopicSubmission(submission.id)} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No active trainers are available for this topic.</p>
                )}
                <p className="border-t border-slate-100 px-3 py-2 text-xs text-muted-foreground">
                  {submissions.length} of {activeTrainers.length} active trainer{submissions.length === 1 ? "" : "s"} submitted.
                </p>
              </div>
            </section>
          );
        })}
      </ListCard>
    </div>
  );
}

function ClassroomWeeklyReportsView(p: ContentProps) {
  const currentWeekKey = `week-${currentWeekNumber()}`;
  const activeClassrooms = p.dashboard.classrooms.filter((room) => room.status === "active");
  const reportsByClassroomAndWeek = new Map(p.dashboard.classroomWeeklyReports.map((report) => [`${report.classroom_id}:${report.week_key}`, report]));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ListCard title="Classroom weekly reports" empty="No classroom weekly reports have been submitted yet.">
        {p.dashboard.classroomWeeklyReports.map((report) => {
          const classroom = p.maps.classrooms.get(report.classroom_id);
          const cohort = classroom ? p.maps.cohorts.get(classroom.cohort_id) : undefined;
          const centre = cohort ? p.maps.centres.get(cohort.centre_id) : undefined;
          const trainer = p.maps.profiles.get(report.submitted_by_trainer_id);
          return (
            <article key={report.id} className="border-b border-slate-100 py-5 last:border-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold">{classroom?.name || "Unknown classroom"}</p>
                    <Status value={report.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.week_key} · {centre?.name || "No centre"} · Submitted by {trainer?.full_name || "Unknown trainer"} · {formatDate(report.submitted_at)}
                  </p>
                  {report.report_text && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{report.report_text}</p>}
                  {report.file_name && <p className="mt-2 text-xs font-semibold text-muted-foreground">Attachment: {report.file_name}</p>}
                  {report.signed_file_url && (
                    <a href={report.signed_file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">
                      Open attachment
                    </a>
                  )}
                </div>
                {report.status === "submitted" && (
                  <button disabled={p.busy} onClick={() => void p.onReviewClassroomWeeklyReport(report)} className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    Mark reviewed
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </ListCard>

      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Current week checklist</h2>
        <p className="mt-1 text-sm text-muted-foreground">Expected official reports for {currentWeekKey}.</p>
        <div className="mt-4 space-y-3">
          {activeClassrooms.length ? activeClassrooms.map((room) => {
            const report = reportsByClassroomAndWeek.get(`${room.id}:${currentWeekKey}`);
            const lead = p.dashboard.assignments.find((assignment) => assignment.classroom_id === room.id && assignment.role === "lead" && assignment.status === "active");
            const cohort = p.maps.cohorts.get(room.cohort_id);
            const centre = cohort ? p.maps.centres.get(cohort.centre_id) : undefined;
            return (
              <div key={room.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{room.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{centre?.name || "No centre"} · Lead: {lead ? p.maps.profiles.get(lead.trainer_id)?.full_name || "Unknown trainer" : "Unassigned"}</p>
                  </div>
                  <Status value={report ? report.status : "missing"} />
                </div>
              </div>
            );
          }) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">No active classrooms need weekly reports right now.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ChallengesView(p: ContentProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ListCard title="Universal challenges" empty="No universal challenges created yet.">
        {p.dashboard.challengeLevels.map((level) => {
          const challenges = p.dashboard.universalChallenges
            .filter((challenge) => challenge.level_id === level.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          return (
            <section key={level.id} className="border-b border-slate-100 py-4 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{level.name}</p>
                  <p className="text-sm text-muted-foreground">Level {level.sort_order} · {level.difficulty}</p>
                </div>
                <Status value={level.is_active ? "active" : "hidden"} />
              </div>
              <div className="mt-3 space-y-2">
                {challenges.length ? challenges.map((challenge) => (
                  <article key={challenge.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{challenge.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{challenge.description || "No description"}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Order {challenge.sort_order} · {challenge.is_required ? "Required" : "Optional"} · {challenge.completions ?? 0} completion{challenge.completions === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Status value={challenge.is_published ? "published" : "draft"} />
                        <button onClick={() => p.onEditChallenge(challenge)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary">Edit</button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">No challenges in this level yet.</p>
                )}
              </div>
            </section>
          );
        })}
      </ListCard>
      <FormCard title={p.challengeEditingId ? "Edit challenge" : "Create challenge"} onSubmit={p.onChallengeSubmit} busy={p.busy} button={p.challengeEditingId ? "Update challenge" : "Create challenge"}>
        <select value={p.challengeLevel} onChange={(event) => p.setChallengeLevel(event.target.value)} className="input">
          <option value="">Choose level</option>
          {p.dashboard.challengeLevels.map((level) => <option key={level.id} value={level.id}>{level.sort_order}. {level.name}</option>)}
        </select>
        <Input value={p.challengeTitle} onChange={p.setChallengeTitle} placeholder="Challenge title" />
        <Input type="number" value={p.challengeSortOrder} onChange={p.setChallengeSortOrder} placeholder="Sort order" />
        <textarea value={p.challengeDescription} onChange={(event) => p.setChallengeDescription(event.target.value)} maxLength={600} placeholder="Short description" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <textarea value={p.challengeInstructions} onChange={(event) => p.setChallengeInstructions(event.target.value)} maxLength={4000} placeholder="Instructions students should follow" className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={p.challengeRequired} onChange={(event) => p.setChallengeRequired(event.target.checked)} />
          Required for level unlock
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={p.challengePublished} onChange={(event) => p.setChallengePublished(event.target.checked)} />
          Published to students
        </label>
        {p.challengeEditingId && (
          <button type="button" onClick={p.onCancelChallengeEdit} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-slate-700">Cancel edit</button>
        )}
      </FormCard>
    </div>
  );
}

function FeedbackView(p: ContentProps) {
  return (
    <ListCard title="Student feedback" empty="No student reflections have been written yet.">
      {p.dashboard.feedback.map((item) => {
        const student = p.maps.profiles.get(item.student_id);
        const classroom = item.classroom_id ? p.maps.classrooms.get(item.classroom_id) : undefined;
        const cohort = classroom ? p.maps.cohorts.get(classroom.cohort_id) : undefined;
        const centre = cohort ? p.maps.centres.get(cohort.centre_id) : undefined;
        return (
          <article key={item.id} className="border-b border-slate-100 py-4 last:border-0">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">{student?.full_name || student?.username || "Student"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {classroom?.name || "No classroom"} · {centre?.name || "No centre"} · {formatDate(item.created_at)}
                  {item.updated_at !== item.created_at ? " · edited" : ""}
                </p>
              </div>
              <Status value="read-only" />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item.feedback_text}</p>
          </article>
        );
      })}
    </ListCard>
  );
}

function ListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-display text-xl font-bold">{title}</h2><div className="mt-3">{items.length ? children : <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>}</div></section>;
}

function FormCard({ title, onSubmit, busy, button, children, className = "" }: { title: string; onSubmit: (event: FormEvent) => Promise<void>; busy: boolean; button: string; children: React.ReactNode; className?: string }) {
  return <form onSubmit={(event) => void onSubmit(event)} className={`h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><h2 className="font-display text-xl font-bold">{title}</h2><div className="mt-4 space-y-3">{children}</div><button disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="size-4" />{busy ? "Saving..." : button}</button></form>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="input" />;
}
