"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Headset,
  Copy,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileText,
  GripVertical,
  HardHat,
  LayoutDashboard,
  ListChecks,
  Lock,
  Unlock,
  Menu,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Send,
  LogOut,
  Upload,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { tracks, type LessonActivity } from "@/lib/curriculum";
import Quiz from "@/components/learn/quiz";
import DragDrop, { DragClassify } from "@/components/learn/drag-drop";
import { KeyboardLesson, TypingTest } from "@/components/learn/typing-test";
import { RichTextEditor, SlideEditor } from "@/components/learn/editors";
import { PythonRunner } from "@/components/learn/python-runner";
import { HtmlPreview } from "@/components/learn/html-preview";
import { ScenarioQuestion } from "@/components/learn/scenario-question";
import { ExternalLink } from "@/components/learn/external-link";
import { AiChat } from "@/components/learn/ai-chat";
import { WokwiEmbed, YouTubeEmbed } from "@/components/learn/external-embeds";
import { useAuth } from "@/components/auth-provider";
import {
  getTrainerClassroomContext,
  rotateClassroomJoinCode,
  type TrainerClassroom,
  type TrainerClassroomContext,
} from "@/lib/api/trainer/classrooms";
import { getTrainerClassroomStudents, type StudentSummary } from "@/lib/api/trainer/students";
import { getAttendance, getAttendanceSessions, recordAttendance, type AttendanceRecord, type AttendanceSessionSummary } from "@/lib/api/trainer/attendance";
import { getClassroomCurriculum, saveClassroomCurriculum, type ClassroomCurriculumData, type CurriculumSaveItem } from "@/lib/api/trainer/curriculum";
import { createWeeklyComment, getStudentWeeklyComments, updateWeeklyComment, type WeeklyComment } from "@/lib/api/trainer/comments";
import { getStudentFeedbackForTrainer, type TrainerStudentFeedback } from "@/lib/api/trainer/feedback";
import { createHardwareSession, getHardwareEvidence, getHardwareSessions, updateHardwareSession, uploadHardwareEvidence, type HardwareEvidence, type HardwareSession } from "@/lib/api/trainer/hardware";
import { getStudentTypingHistory, getTrainerClassroomTypingSummary, type TrainerTypingSummary } from "@/lib/api/trainer/typing";
import { createTrainerAdminReport, getMyTrainerAdminReports, type TrainerAdminReport } from "@/lib/api/trainer/admin-reports";
import { getTrainerWeeklyTopics, submitWeeklyTopicResponse, type TrainerWeeklyTopicSubmission, type WeeklyTopic } from "@/lib/api/trainer/weekly-topics";
import { getClassroomWeeklyReports, submitClassroomWeeklyReport, type ClassroomWeeklyReport } from "@/lib/api/trainer/weekly-reports";
import { getMyTrainerProfile, removeMyTrainerCertificate, updateMyTrainerProfile, uploadMyTrainerCertificate, validateTrainerCertificate, type TrainerProfileDetails } from "@/lib/api/trainer/profile";
import type { TypingAttempt } from "@/lib/api/student/typing";

type View =
  | "overview"
  | "curriculum"
  | "attendance"
  | "homework"
  | "hardware"
  | "students"
  | "badges"
  | "reports"
  | "weekly-report"
  | "weekly-topics"
  | "profile"
  | "contact";
type CurriculumItem = {
  id: string;
  title: string;
  kind: string;
  origin: "core" | "trainer";
  removed?: boolean;
  isUnlocked?: boolean;
  masterTitle?: string;
  masterKind?: string;
  instruction?: string;
  masterInstruction?: string;
  masterActivity?: LessonActivity;
  resourceNote?: string;
  activity?: LessonActivity;
  isChallenge?: boolean;
};
type Module = {
  id: string;
  title: string;
  week: number;
  items: CurriculumItem[];
};

const activityLabels: Record<LessonActivity["type"], string> = {
  quiz: "Quiz",
  "drag-label": "Interactive activity",
  "drag-classify": "Interactive activity",
  keyboard: "Keyboard activity",
  "typing-test": "Typing activity",
  "rich-text-editor": "Document activity",
  "slide-editor": "Presentation activity",
  "python-runner": "Python challenge",
  "ai-chat": "AI activity",
  "wokwi-embed": "Circuit activity",
  "youtube-embed": "Video",
  "html-preview": "Web activity",
  "scenario-question": "Scenario question",
  "external-link": "Resource",
};
function activityInstruction(activity: LessonActivity) {
  if ("instruction" in activity) return activity.instruction;
  if ("mission" in activity) return activity.mission;
  if ("scenario" in activity) return activity.scenario;
  return "Use this supported platform activity in your classroom.";
}

function defaultActivity(type: LessonActivity["type"]): LessonActivity {
  switch (type) {
    case "quiz":
      return {
        type,
        questions: [{ question: "", options: ["", ""], correctIndex: 0 }],
      };
    case "scenario-question":
      return { type, scenario: "", options: ["", ""], correctIndex: 0 };
    case "drag-label":
    case "drag-classify":
      return { type, instruction: "", items: [], zones: [] };
    case "python-runner":
      return { type, instruction: "", initialCode: "" };
    case "ai-chat":
      return { type, instruction: "", starterPrompt: "" };
    case "wokwi-embed":
      return { type, instruction: "", src: "", title: "" };
    case "youtube-embed":
      return { type, instruction: "", videoId: "", title: "" };
    case "html-preview":
      return { type, instruction: "", initialHtml: "", initialCss: "" };
    case "external-link":
      return { type, instruction: "", url: "", title: "" };
    case "rich-text-editor":
      return { type, mission: "", requiredFormats: [] };
    case "keyboard":
    case "typing-test":
    case "slide-editor":
      return { type, instruction: "" };
  }
}

function initialModules(): Module[] {
  return tracks.map((track) => ({
    id: track.slug,
    title: track.title,
    week: track.weekNumber,
    items: [
      ...track.lessons.map((lesson) => ({
        id: `${track.slug}-${lesson.slug}`,
        title: lesson.title,
        kind: activityLabels[lesson.activity.type],
        origin: "core" as const,
        masterTitle: lesson.title,
        masterKind: activityLabels[lesson.activity.type],
        instruction: activityInstruction(lesson.activity),
        masterInstruction: activityInstruction(lesson.activity),
        masterActivity: lesson.activity,
        activity: lesson.activity,
        isUnlocked: true,
      })),
      ...(track.challenge
        ? [{
            id: `${track.slug}-challenge`,
            title: track.challenge.title,
            kind: activityLabels[track.challenge.activity.type],
            origin: "core" as const,
            isChallenge: true,
            masterTitle: track.challenge.title,
            masterKind: activityLabels[track.challenge.activity.type],
            instruction: activityInstruction(track.challenge.activity),
            masterInstruction: activityInstruction(track.challenge.activity),
            masterActivity: track.challenge.activity,
            activity: track.challenge.activity,
            isUnlocked: true,
          }]
        : []),
    ],
  }));
}

function applyClassroomCurriculum(modules: Module[], data: ClassroomCurriculumData) {
  const routeByActivityId = new Map(data.masterActivities.map((activity) => [activity.id, activity.route]));
  const overrideByRoute = new Map(
    data.overrides.flatMap((override) => {
      const route = routeByActivityId.get(override.master_activity_id);
      return route ? [[route, override]] : [];
    }),
  );
  const next = modules.map((module, moduleIndex) => {
    const items = module.items.map((item, itemIndex) => {
      const lessonSlug = item.id.startsWith(`${module.id}-`) ? item.id.slice(module.id.length + 1) : "";
      const override = overrideByRoute.get(`${module.id}/${lessonSlug}`);
      if (!override) return { item, order: moduleIndex * 100 + itemIndex };
      return {
        item: {
          ...item,
          title: override.title_override ?? item.title,
          activity: override.configuration_override ?? item.activity,
          instruction: override.configuration_override ? activityInstruction(override.configuration_override) : item.instruction,
          removed: override.removed,
          isUnlocked: override.is_unlocked,
        },
        order: override.sort_order_override ?? moduleIndex * 100 + itemIndex,
      };
    });

    const customItems = data.items
      .filter((item) => item.origin === "custom" && Math.floor(item.sort_order / 100) === moduleIndex)
      .map((item) => ({
        item: {
          id: item.id,
          title: item.title,
          kind: item.configuration ? activityLabels[item.configuration.type] : "Trainer activity",
          origin: "trainer" as const,
          removed: item.removed,
          isUnlocked: item.is_unlocked,
          instruction: item.configuration ? activityInstruction(item.configuration) : "",
          activity: item.configuration ?? undefined,
        },
        order: item.sort_order,
      }));

    return {
      ...module,
      items: [...items, ...customItems]
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.item),
    };
  });

  return next;
}

function flattenCurriculumForSave(modules: Module[]): CurriculumSaveItem[] {
  return modules.flatMap((module, moduleIndex) =>
    module.items.map((item, itemIndex) => ({
      moduleId: module.id,
      moduleIndex,
      itemId: item.id,
      itemIndex,
      title: item.title,
      origin: item.origin,
      removed: item.removed,
      isUnlocked: item.isUnlocked !== false,
      masterTitle: item.masterTitle,
      activity: item.activity,
    })),
  );
}

const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "curriculum", label: "Curriculum", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "homework", label: "Homework", icon: ClipboardList },
  { id: "hardware", label: "Hardware sessions", icon: HardHat },
  { id: "students", label: "Students", icon: Users },
  { id: "badges", label: "Badge awards", icon: Award },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "weekly-report", label: "Weekly Report", icon: ClipboardCheck },
  { id: "weekly-topics", label: "Weekly Inputs", icon: CalendarDays },
  { id: "profile", label: "Profile", icon: User },
  { id: "contact", label: "Contact Admin", icon: Headset },
];

const emptyTypingSummary: TrainerTypingSummary = {
  byStudent: {},
  classAverageWpm: null,
  classBestWpm: null,
  classAverageAccuracy: null,
};

export default function TrainerDashboard() {
  const { profile, signOut } = useAuth();
  const [trainerContext, setTrainerContext] = useState<TrainerClassroomContext | null>(null);
  const [classrooms, setClassrooms] = useState<TrainerClassroom[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);
  const [classroomsError, setClassroomsError] = useState("");
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [notice, setNotice] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [rotatingCode, setRotatingCode] = useState(false);
  const [studentsList, setStudentsList] = useState<StudentSummary[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSessionSummary[]>([]);
  const [hardwareSessions, setHardwareSessions] = useState<HardwareSession[]>([]);
  const [typingSummary, setTypingSummary] = useState<TrainerTypingSummary>(emptyTypingSummary);
  const [trainerProfileDetails, setTrainerProfileDetails] = useState<TrainerProfileDetails | null>(null);
  const [trainerProfileError, setTrainerProfileError] = useState("");
  const [awards, setAwards] = useState<
    { student: string; badge: string; date: string }[]
  >([]);

  const loadClassrooms = useCallback(async () => {
    setClassroomsLoading(true);
    const result = await getTrainerClassroomContext();
    if (result.error) {
      setTrainerContext(null);
      setClassrooms([]);
      setClassroomsError(result.error);
      setActiveClassroomId(null);
    } else {
      const nextContext = result.data;
      const nextClassrooms = nextContext?.activeClassrooms ?? [];
      setTrainerContext(nextContext ?? null);
      setClassrooms(nextClassrooms);
      setClassroomsError("");
      setActiveClassroomId((current) =>
        nextClassrooms.some((classroom) => classroom.id === current)
          ? current
          : (nextClassrooms[0]?.id ?? null),
      );
    }
    setClassroomsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClassrooms();
  }, [loadClassrooms]);

  const loadDashboardData = useCallback(async () => {
    if (!activeClassroomId) {
      setStudentsList([]);
      setAttendance({});
      setAttendanceSessions([]);
      setHardwareSessions([]);
      setTypingSummary(emptyTypingSummary);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const [curRes, studRes, attRes, attHistoryRes, hardwareRes, typingRes] = await Promise.all([
      getClassroomCurriculum(activeClassroomId),
      getTrainerClassroomStudents(activeClassroomId),
      getAttendance(activeClassroomId, today),
      getAttendanceSessions(activeClassroomId),
      getHardwareSessions(activeClassroomId),
      getTrainerClassroomTypingSummary(activeClassroomId),
    ]);

    if (curRes.data) setModules(applyClassroomCurriculum(initialModules(), curRes.data));
    if (studRes.data) setStudentsList(studRes.data);
    if (attRes.data) setAttendance(Object.fromEntries(attRes.data.map((item) => [item.studentId, item.status])));
    if (attHistoryRes.data) setAttendanceSessions(attHistoryRes.data);
    if (hardwareRes.data) setHardwareSessions(hardwareRes.data);
    if (typingRes.data) setTypingSummary(typingRes.data);
  }, [activeClassroomId]);

  const loadTrainerProfile = useCallback(async () => {
    const result = await getMyTrainerProfile();
    if (result.error) {
      setTrainerProfileDetails(null);
      setTrainerProfileError(result.error);
      return;
    }
    setTrainerProfileDetails(result.data);
    setTrainerProfileError("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboardData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTrainerProfile(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTrainerProfile]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeLessons = useMemo(
    () =>
      modules.reduce(
        (total, module) =>
          total + module.items.filter((item) => !item.removed).length,
        0,
      ),
    [modules],
  );
  const activeClassroom =
    classrooms.find((classroom) => classroom.id === activeClassroomId) ?? null;
  const primaryAssignment = trainerContext?.activeAssignments[0] ?? null;
  const trainerName = profile?.full_name || "Trainer";
  const trainerInitials =
    profile?.full_name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "T";
  const changeView = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };
  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.error) window.location.assign("/");
  };
  const handleRotateJoinCode = async () => {
    if (!activeClassroomId) return;
    setRotatingCode(true);
    const result = await rotateClassroomJoinCode(activeClassroomId);
    setRotatingCode(false);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setJoinCode(result.data ?? "");
    setNotice("New classroom join code generated.");
  };
  if (classroomsLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">Loading your teaching context...</main>;
  }

  if (classroomsError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-bold text-foreground">Teaching context unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{classroomsError}</p>
          <button onClick={() => void loadClassrooms()} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Try again</button>
        </section>
      </main>
    );
  }

  if (!primaryAssignment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-bold text-foreground">No active teaching assignment</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Your trainer account has been approved, but no active Centre and Cohort assignment could be resolved for this deployment. Please contact an administrator.</p>
          {trainerContext?.schemaLimitation && (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {trainerContext.schemaLimitation}
            </p>
          )}
          <button onClick={handleSignOut} className="mt-5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground">Sign out</button>
        </section>
      </main>
    );
  }

  if (!activeClassroom) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Your teaching assignment
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
            Classroom not active yet
          </h1>
          {primaryAssignment.classroom ? (
            <div className="mt-5 grid gap-3 rounded-xl bg-muted p-4 text-sm">
              <p><b>Centre:</b> {primaryAssignment.classroom.centreName}</p>
              <p><b>Cohort:</b> {primaryAssignment.classroom.cohortName}</p>
              <p><b>Classroom:</b> {primaryAssignment.classroom.name}</p>
              <p><b>Status:</b> {primaryAssignment.classroom.status}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Your assignment exists, but the classroom record was not returned to this session.
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            You will be able to manage students and classroom activities once the backend returns an active classroom for this assignment.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void loadClassrooms()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Check again</button>
            <button onClick={handleSignOut} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground">Sign out</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-code-bg">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col overflow-hidden bg-primary px-4 py-6 text-primary-foreground shadow-xl transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex shrink-0 items-center justify-between px-3">
          <div>
            <p className="font-display text-xl font-bold">ePawatech</p>
            <p className="text-xs text-primary-foreground/65">
              Trainer workspace
            </p>
          </div>
          <button
            className="rounded-lg p-2 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mt-9 shrink-0 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-primary-foreground/55">
          Classroom tools
        </div>
        <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeView(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "bg-primary-foreground text-primary shadow-sm" : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-4 shrink-0 rounded-2xl bg-primary-foreground/10 p-4">
          <p className="text-xs font-bold">{activeClassroom.centreName}</p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            {activeClassroom.cohortName} · {activeClassroom.name}
          </p>
          {classrooms.length > 1 && (
            <label className="mt-3 block text-left text-xs font-bold">
              <span className="sr-only">Switch classroom</span>
              <select
                value={activeClassroom.id}
                onChange={(event) => {
                  setJoinCode("");
                  setActiveClassroomId(event.target.value);
                }}
                className="w-full rounded-lg border border-primary-foreground/25 bg-primary px-2 py-2 text-xs font-bold text-primary-foreground"
              >
                {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
              </select>
            </label>
          )}
          <button onClick={handleSignOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-foreground/25 py-2 text-xs font-bold hover:bg-primary-foreground/10"><LogOut size={14} />Sign out</button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-code-bg/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="lg:pl-70">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur sm:px-9">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                {activeClassroom.centreName} · {activeClassroom.cohortName}
              </p>
              <h1 className="font-display text-lg font-bold">
                {activeClassroom.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-xs text-muted-foreground sm:block">
              Welcome back,
              <br />
              <b className="text-foreground">{trainerName}</b>
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary-foreground">
              {trainerInitials}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-360 px-5 py-7 sm:px-9 sm:py-10">
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
            >
              <Check size={16} />
              {notice}
            </div>
          )}
          <ClassroomAccessBar
            classroomName={activeClassroom.name}
            joinCode={joinCode}
            rotatingCode={rotatingCode}
            onRotate={handleRotateJoinCode}
            notify={setNotice}
          />
          {view === "overview" && (
            <Overview
              go={changeView}
              activeLessons={activeLessons}
              classroomName={activeClassroom.name}
              trainerName={trainerName}
              studentsList={studentsList}
              attendance={attendance}
              attendanceSessions={attendanceSessions}
              hardwareSessions={hardwareSessions}
              typingSummary={typingSummary}
            />
          )}
          {view === "curriculum" && (
            <Curriculum
              modules={modules}
              setModules={setModules}
              notify={setNotice}
              classroomId={activeClassroom.id}
              classroomName={activeClassroom.name}
            />
          )}
          {view === "attendance" && (
            <Attendance
              classroomId={activeClassroom.id}
              classroomName={activeClassroom.name}
              studentsList={studentsList}
              attendance={attendance}
              setAttendance={setAttendance}
              notify={setNotice}
              attendanceSessions={attendanceSessions}
              onChanged={loadDashboardData}
            />
          )}
          {view === "homework" && <Homework classroomName={activeClassroom.name} />}
          {view === "hardware" && (
            <Hardware
              classroomId={activeClassroom.id}
              classroomName={activeClassroom.name}
              sessions={hardwareSessions}
              notify={setNotice}
              onChanged={loadDashboardData}
            />
          )}
          {view === "students" && (
            <Students
              notify={setNotice}
              studentsList={studentsList}
              classroomId={activeClassroom.id}
              classroomName={activeClassroom.name}
              typingSummary={typingSummary}
            />
          )}
          {view === "badges" && (
            <Badges
              awards={awards}
              setAwards={setAwards}
              notify={setNotice}
              studentsList={studentsList}
              classroomName={activeClassroom.name}
            />
          )}
          {view === "reports" && (
            <Reports
              studentsList={studentsList}
              classroomName={activeClassroom.name}
              typingSummary={typingSummary}
              hardwareSessions={hardwareSessions}
            />
          )}
          {view === "weekly-report" && <WeeklyReport classroom={activeClassroom} notify={setNotice} />}
          {view === "weekly-topics" && <WeeklyTopics notify={setNotice} />}
          {view === "profile" && (
            <TrainerProfile
              key={trainerProfileDetails?.id ?? "loading"}
              details={trainerProfileDetails}
              error={trainerProfileError}
              notify={setNotice}
              onChanged={loadTrainerProfile}
            />
          )}
          {view === "contact" && (
            <ContactAdmin
              classroomId={activeClassroom.id}
              classroomName={activeClassroom.name}
              classrooms={classrooms}
              notify={setNotice}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function ClassroomAccessBar({
  classroomName,
  joinCode,
  rotatingCode,
  onRotate,
  notify,
}: {
  classroomName: string;
  joinCode: string;
  rotatingCode: boolean;
  onRotate: () => void;
  notify: (message: string) => void;
}) {
  return (
    <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
            Classroom access
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold">Student join code</h2>
            <span className="rounded-lg bg-muted px-3 py-1 font-mono text-sm font-bold tracking-[0.16em]">
              {joinCode || "ROTATE TO VIEW"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Plain codes are shown only when generated. Rotate to create a new shareable code for {classroomName}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            disabled={rotatingCode}
            onClick={onRotate}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <RotateCcw className="mr-1 inline" size={15} />
            {rotatingCode ? "Rotating..." : "Rotate code"}
          </button>
          <button
            disabled={!joinCode}
            onClick={() => {
              void navigator.clipboard.writeText(joinCode);
              notify("Join code copied.");
            }}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            <Copy className="mr-1 inline" size={15} />
            Copy
          </button>
        </div>
      </div>
    </section>
  );
}

function Overview({
  go,
  activeLessons,
  classroomName,
  trainerName,
  studentsList,
  attendance,
  attendanceSessions,
  hardwareSessions,
  typingSummary,
}: {
  go: (view: View) => void;
  activeLessons: number;
  classroomName: string;
  trainerName: string;
  studentsList: StudentSummary[];
  attendance: Record<string, string>;
  attendanceSessions: AttendanceSessionSummary[];
  hardwareSessions: HardwareSession[];
  typingSummary: TrainerTypingSummary;
}) {
  const attendanceMarked = Object.keys(attendance).length;
  const presentCount = Object.values(attendance).filter((status) => status === "present").length;
  const progressValues = studentsList
    .map((student) => student.progressPercent)
    .filter((value): value is number => value !== null);
  const progressAverage = progressValues.length ? Math.round(progressValues.reduce((total, value) => total + value, 0) / progressValues.length) : null;
  const needAttention = studentsList.filter((student) => (student.progressPercent ?? 100) < 50 || (student.attendancePercent ?? 100) < 70).length;
  const latestAttendance = attendanceSessions[0] ?? null;
  const latestHardware = hardwareSessions[0] ?? null;
  const attentionItems = [
    ...studentsList
      .filter((student) => (student.progressPercent ?? 100) < 50 || (student.attendancePercent ?? 100) < 70)
      .slice(0, 3)
      .map((student) => ({
        title: student.name,
        detail: `${student.progressSummary} progress · ${student.attendancePercent === null ? "No attendance data" : `${student.attendancePercent}% attendance`}`,
      })),
    ...(hardwareSessions.length
      ? []
      : [{ title: "Hardware session", detail: "No physical hardware session recorded yet" }]),
  ];
  const activityItems = [
    latestAttendance
      ? {
          text: `Attendance recorded: ${latestAttendance.present}/${latestAttendance.total} present`,
          time: new Date(latestAttendance.sessionDate).toLocaleDateString(),
        }
      : null,
    latestHardware
      ? {
          text: `Hardware session logged with ${latestHardware.evidenceCount} evidence file${latestHardware.evidenceCount === 1 ? "" : "s"}`,
          time: new Date(latestHardware.sessionDate).toLocaleDateString(),
        }
      : null,
    typingSummary.classBestWpm !== null
      ? {
          text: `Best qualifying typing speed is ${typingSummary.classBestWpm} WPM`,
          time: "Typing leaderboard",
        }
      : null,
  ].filter((item): item is { text: string; time: string } => Boolean(item));
  const stats = [
    {
      label: "Class students",
      value: String(studentsList.length),
      icon: Users,
      tint: "bg-blue-50 text-blue-700",
    },
    {
      label: "Attendance today",
      value: attendanceMarked ? `${presentCount}/${attendanceMarked}` : "Not recorded",
      icon: ClipboardCheck,
      tint: "bg-green-50 text-green-700",
    },
    {
      label: "Curriculum progress",
      value: progressAverage === null ? "No data" : `${progressAverage}%`,
      icon: BarChart3,
      tint: "bg-violet-50 text-violet-700",
    },
    {
      label: "Need attention",
      value: String(needAttention),
      icon: CircleAlert,
      tint: "bg-amber-50 text-amber-700",
    },
  ];
  return (
    <>
      <PageHeading eyebrow="Trainer dashboard" title={`Welcome, ${trainerName}`}>
        <button
          onClick={() => go("attendance")}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Take attendance
        </button>
      </PageHeading>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-3xl font-bold">{value}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${tint}`}>
                <Icon size={19} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">
                This module&apos;s classroom pulse
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Module 6 · Coding & Arduino Basics
              </p>
            </div>
            <button
              onClick={() => go("reports")}
              className="text-sm font-bold text-primary"
            >
              View report
            </button>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Metric
              label="Lesson progress"
              value={progressAverage === null ? "No data" : `${progressAverage}%`}
              caption="Based on saved lesson progress"
            />
            <Metric
              label="Typing"
              value={typingSummary.classAverageWpm === null ? "No data" : `${typingSummary.classAverageWpm} WPM`}
              caption="Average qualifying WPM"
            />
            <Metric
              label="Hardware log"
              value={String(hardwareSessions.length)}
              caption={hardwareSessions.length ? "Recorded physical sessions" : "No session recorded yet"}
            />
          </div>
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Curriculum is classroom-specific
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              {activeLessons} active learning items are configured for {classroomName}.
              Changes here never modify the master curriculum or another class.
            </p>
            <button
              onClick={() => go("curriculum")}
              className="mt-3 text-sm font-bold text-primary"
            >
              Manage {classroomName} curriculum →
            </button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">
              Needs your attention
            </h3>
            <CircleAlert className="text-amber-500" size={20} />
          </div>
          <div className="mt-4 space-y-3">
            {attentionItems.length ? attentionItems.map((item) => (
              <Attention key={`${item.title}-${item.detail}`} title={item.title} detail={item.detail} />
            )) : (
              <p className="rounded-xl bg-muted/65 p-3 text-sm text-muted-foreground">
                No low-progress, low-attendance, or missing-hardware signal is showing right now.
              </p>
            )}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-bold">
            Recent classroom activity
          </h3>
          <div className="mt-4 space-y-4">
            {activityItems.length ? activityItems.map((item) => (
              <Activity key={`${item.text}-${item.time}`} text={item.text} time={item.time} />
            )) : (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                No attendance, hardware, or typing activity has been recorded yet.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <h3 className="font-display text-lg font-bold">Quick actions</h3>
            <CalendarDays className="text-primary" size={20} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Quick
              title="Record hardware session"
              onClick={() => go("hardware")}
              icon={HardHat}
            />
            <Quick
              title="Assign homework"
              onClick={() => go("homework")}
              icon={Send}
            />
            <Quick
              title="Write student comments"
              onClick={() => go("students")}
              icon={Users}
            />
            <Quick
              title="Award a badge"
              onClick={() => go("badges")}
              icon={Award}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
function Attention({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl bg-muted/65 p-3">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
function Activity({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
      <div>
        <p className="text-sm font-medium">{text}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}
function Quick({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick: () => void;
  icon: typeof Award;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border p-3 text-left text-sm font-bold transition hover:border-primary hover:bg-blue-50"
    >
      <Icon className="text-primary" size={19} />
      {title}
    </button>
  );
}

function Curriculum({
  modules,
  setModules,
  notify,
  classroomId,
  classroomName,
}: {
  modules: Module[];
  setModules: (value: Module[]) => void;
  notify: (message: string) => void;
  classroomId: string;
  classroomName: string;
}) {
  const [expanded, setExpanded] = useState<string[]>(
    modules.map((module) => module.id),
  );
  const [addTo, setAddTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    moduleId: string;
    item: CurriculumItem;
  } | null>(null);
  const [previewing, setPreviewing] = useState<CurriculumItem | null>(null);
  const [showMaster, setShowMaster] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const toggle = (id: string) =>
    setExpanded((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  async function saveChanges(nextModules = modules) {
    const result = await saveClassroomCurriculum(classroomId, flattenCurriculumForSave(nextModules));
    notify(result.error || `Curriculum saved for ${classroomName}.`);
    return !result.error;
  }

  const persistModules = async (nextModules: Module[]) => {
    setModules(nextModules);
    return saveChanges(nextModules);
  };

  const moveModule = async (index: number, direction: -1 | 1) => {
    const next = [...modules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await persistModules(next);
  };
  const moveItem = async (moduleId: string, index: number, direction: -1 | 1) => {
    const nextModules = modules.map((module) => {
        if (module.id !== moduleId) return module;
        const next = [...module.items];
        const target = index + direction;
        if (target < 0 || target >= next.length) return module;
        [next[index], next[target]] = [next[target], next[index]];
        return { ...module, items: next };
      });
    await persistModules(nextModules);
  };
  const updatedModulesForItem = (
    sourceModules: Module[],
    moduleId: string,
    itemId: string,
    update: Partial<CurriculumItem>,
  ) =>
    sourceModules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            items: module.items.map((item) =>
              item.id === itemId ? { ...item, ...update } : item,
            ),
          }
        : module,
    );
  const toggleRemoved = async (moduleId: string, itemId: string) => {
    const item = modules
      .find((module) => module.id === moduleId)
      ?.items.find((current) => current.id === itemId);
    if (!item) return;
    const nextModules = updatedModulesForItem(modules, moduleId, itemId, { removed: !item.removed });
    const saved = await persistModules(nextModules);
    if (saved) {
      notify(
        item.removed
          ? `Item restored to ${classroomName}.`
          : `Removed from ${classroomName} only. The master item is unchanged.`,
      );
    }
  };
  const toggleUnlocked = async (moduleId: string, itemId: string) => {
    const item = modules
      .find((module) => module.id === moduleId)
      ?.items.find((current) => current.id === itemId);
    if (!item || item.removed) return;
    const nextModules = updatedModulesForItem(modules, moduleId, itemId, { isUnlocked: item.isUnlocked === false });
    const saved = await persistModules(nextModules);
    if (saved) {
      notify(
        item.isUnlocked === false
          ? `${item.title} unlocked for ${classroomName}.`
          : `${item.title} locked for students until a trainer unlocks it.`,
      );
    }
  };
  const addItem = async (type: LessonActivity["type"], title: string) => {
    if (!addTo || !title.trim()) return;
    const activity = defaultActivity(type);
    const nextModules = modules.map((module) =>
        module.id === addTo
          ? {
              ...module,
              items: [
                ...module.items,
                {
                  id: `trainer-${Date.now()}`,
                  title: title.trim(),
                  kind: activityLabels[type],
                  origin: "trainer" as const,
                  instruction: activityInstruction(activity),
                  activity,
                  isUnlocked: true,
                },
              ],
            }
          : module,
    );
    const saved = await persistModules(nextModules);
    if (saved) {
      setAddTo(null);
      notify(
        `${activityLabels[type]} added and saved for ${classroomName}. It is not part of the master curriculum.`,
      );
    }
  };
  const changes = modules.flatMap((module) =>
    module.items.flatMap((item, index) => {
      const results: string[] = [];
      if (item.origin === "trainer") results.push("Trainer-added item");
      if (item.removed) results.push("Removed from classroom");
      if (item.isUnlocked === false) results.push("Locked for students");
      if (item.masterTitle && item.title !== item.masterTitle)
        results.push("Title customized");
      if (item.masterKind && item.kind !== item.masterKind)
        results.push("Activity type customized");
      if (item.masterInstruction && item.instruction !== item.masterInstruction)
        results.push("Instructions customized");
      if (
        item.origin === "core" &&
        item.masterActivity &&
        JSON.stringify(item.activity) !== JSON.stringify(item.masterActivity)
      )
        results.push("Activity content customized");
      if (item.resourceNote) results.push("Supplementary resource added");
      if (
        item.origin === "core" &&
        index !==
          initialModules()
            .find((master) => master.id === module.id)
            ?.items.findIndex((master) => master.id === item.id)
      )
        results.push("Reordered in classroom");
      return results.length ? [{ module, item, results }] : [];
    }),
  );
  return (
    <>
      <PageHeading
        eyebrow={`${classroomName} · classroom curriculum`}
        title="Curriculum builder"
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowMaster(true)}
            className="rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted"
          >
            <Eye className="mr-1 inline" size={15} />
            Master reference
          </button>
          <button
            onClick={() => setShowReview(true)}
            className="rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted"
          >
            <ListChecks className="mr-1 inline" size={15} />
            Review changes {changes.length ? `(${changes.length})` : ""}
          </button>
          <button
            onClick={() => setConfirmRestore(true)}
            className="rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted"
          >
            <RotateCcw className="mr-1 inline" size={15} />
            Restore master
          </button>
          <button
            onClick={() => setAddTo(modules[0]?.id ?? null)}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary"
          >
            <Plus className="mr-1 inline" size={16} />
            Add module content
          </button>
        </div>
      </PageHeading>
      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950">
        <b>Safe classroom customization:</b> the master curriculum is read-only.
        You can customize the learner-facing title, supported activity type,
        instructions and resources for <b>{classroomName} only</b>. These overrides
        never change the platform master or another classroom.
      </div>
      <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
          CORE CURRICULUM
        </span>
        <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">
          TRAINER ADDED
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
          CUSTOMIZED
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">
          REMOVED FROM CLASSROOM
        </span>
      </div>
      <div className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <div
            key={module.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-center gap-3 p-4 sm:p-5">
              <GripVertical
                className="hidden text-muted-foreground sm:block"
                size={18}
              />
              <button
                onClick={() => toggle(module.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  Module {module.week}
                </span>
                {expanded.includes(module.id) ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
                <span className="truncate font-display text-lg font-bold">
                  {module.title}
                </span>
              </button>
              <div className="hidden gap-1 sm:flex">
                <MiniButton
                  label="Move earlier"
                  onClick={() => void moveModule(moduleIndex, -1)}
                >
                  ↑
                </MiniButton>
                <MiniButton
                  label="Move later"
                  onClick={() => void moveModule(moduleIndex, 1)}
                >
                  ↓
                </MiniButton>
              </div>
              <button
                onClick={() => setAddTo(module.id)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
              >
                <Plus className="mr-1 inline" size={14} />
                Add
              </button>
            </div>
            {expanded.includes(module.id) && (
              <div className="border-t border-border bg-muted/30 p-3 sm:p-4">
                <div className="ml-0 border-l-2 border-primary/20 pl-3 sm:ml-5">
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                          Student lesson access
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-900">
                          Modules stay open. Use these controls to choose which lessons students can open.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">
                        {module.items.filter((item) => !item.removed && item.isUnlocked !== false).length}/{module.items.filter((item) => !item.removed).length} unlocked
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {module.items.filter((item) => !item.removed).map((item) => (
                        <div key={`access-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                            <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${item.isUnlocked === false ? "text-rose-700" : "text-emerald-700"}`}>
                              {item.isUnlocked === false ? <Lock size={12} /> : <Unlock size={12} />}
                              {item.isUnlocked === false ? "Locked for students" : "Available to students"}
                            </p>
                          </div>
                          <button
                            onClick={() => void toggleUnlocked(module.id, item.id)}
                            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${item.isUnlocked === false ? "bg-primary text-primary-foreground" : "border border-rose-200 text-rose-700 hover:bg-rose-50"}`}
                          >
                            {item.isUnlocked === false ? "Unlock" : "Lock"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {module.items.map((item, index) => {
                    const customized =
                      item.origin === "core" &&
                      !!item.masterTitle &&
                      (item.title !== item.masterTitle ||
                        item.kind !== item.masterKind ||
                        item.instruction !== item.masterInstruction ||
                        !!item.resourceNote);
                    return (
                      <div
                        key={item.id}
                        className={`mb-2 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-3 ${item.removed ? "border-amber-200 bg-amber-50/70 opacity-75" : "border-border"}`}
                      >
                        <GripVertical
                          className="text-muted-foreground"
                          size={17}
                        />
                        <div className="min-w-42 flex-1">
                          <p
                            className={`text-sm font-bold ${item.removed ? "line-through" : ""}`}
                          >
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.kind}
                            {item.masterTitle && item.title !== item.masterTitle
                              ? ` · Master: ${item.masterTitle}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.removed ? "bg-amber-100 text-amber-800" : item.origin === "trainer" ? "bg-violet-100 text-violet-700" : customized ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {item.removed
                            ? "REMOVED"
                            : item.origin === "trainer"
                              ? "TRAINER ADDED"
                              : customized
                                ? "CUSTOMIZED"
                                : "CORE"}
                        </span>
                        {item.isChallenge && (
                          <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent-foreground">
                            END-OF-MODULE CHALLENGE
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${item.removed ? "bg-slate-100 text-slate-500" : item.isUnlocked === false ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {item.isUnlocked === false ? <Lock size={11} /> : <Unlock size={11} />}
                          {item.isUnlocked === false ? "LOCKED" : "UNLOCKED"}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <MiniButton
                            label="Move earlier"
                            onClick={() => void moveItem(module.id, index, -1)}
                          >
                            ↑
                          </MiniButton>
                          <MiniButton
                            label="Move later"
                            onClick={() => void moveItem(module.id, index, 1)}
                          >
                            ↓
                          </MiniButton>
                          <button
                            onClick={() =>
                              setEditing({ moduleId: module.id, item })
                            }
                            className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                          >
                            <Pencil className="mr-1 inline" size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => setPreviewing(item)}
                            className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                          >
                            <Play className="mr-1 inline" size={13} />
                            Try
                          </button>
                          <button
                            disabled={item.removed}
                            onClick={() => void toggleUnlocked(module.id, item.id)}
                            className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {item.isUnlocked === false ? "Unlock lesson" : "Lock lesson"}
                          </button>
                          <button
                            onClick={() => void toggleRemoved(module.id, item.id)}
                            className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold hover:bg-muted"
                          >
                            {item.removed ? "Restore" : "Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setAddTo(module.id)}
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"
                  >
                    <Plus size={16} />
                    Add a supported item
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {addTo && (
        <AddItemModal classroomName={classroomName} onClose={() => setAddTo(null)} onAdd={addItem} />
      )}{" "}
      {editing && (
        <EditLessonModal
          item={editing.item}
          classroomName={classroomName}
          onClose={() => setEditing(null)}
          onSave={async (update) => {
            const nextModules = updatedModulesForItem(modules, editing.moduleId, editing.item.id, update);
            setModules(nextModules);
            const saved = await saveChanges(nextModules);
            if (saved) setEditing(null);
          }}
        />
      )}{" "}
      {previewing && (
        <LessonPlayground
          item={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}{" "}
      {showMaster && <MasterReference classroomName={classroomName} onClose={() => setShowMaster(false)} />}{" "}
      {showReview && (
        <ChangeReview classroomName={classroomName} changes={changes} onClose={() => setShowReview(false)} />
      )}{" "}
      {confirmRestore && (
        <Confirm
          title="Restore master order?"
          text={`This resets the ${classroomName} configuration and removes trainer-added items. The platform master curriculum remains unchanged.`}
          action={`Restore ${classroomName} default`}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => {
            void persistModules(initialModules());
            setConfirmRestore(false);
          }}
        />
      )}
    </>
  );
}
function MiniButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md border border-border px-2 py-1 text-sm font-bold hover:bg-muted"
    >
      {children}
    </button>
  );
}
function EditLessonModal({
  item,
  classroomName,
  onClose,
  onSave,
}: {
  item: CurriculumItem;
  classroomName: string;
  onClose: () => void;
  onSave: (update: Partial<CurriculumItem>) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [activity, setActivity] = useState<LessonActivity>(
    item.activity || defaultActivity("quiz"),
  );
  const [resourceNote, setResourceNote] = useState(item.resourceNote || "");
  const [saving, setSaving] = useState(false);
  const setType = (type: LessonActivity["type"]) =>
    setActivity(defaultActivity(type));
  return (
    <Modal title={`Edit for ${classroomName} · ${item.title}`} onClose={onClose}>
      <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">
        <b>Classroom override only.</b> Configure the real content students will
        receive. The master version below is read-only.
      </p>
      <label className="mt-4 block text-sm font-bold">
        Learner-facing title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
        />
      </label>
      <label className="mt-4 block text-sm font-bold">
        Supported activity type
        <select
          value={activity.type}
          onChange={(event) =>
            setType(event.target.value as LessonActivity["type"])
          }
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
        >
          {(Object.keys(activityLabels) as LessonActivity["type"][]).map(
            (type) => (
              <option key={type} value={type}>
                {activityLabels[type]}
              </option>
            ),
          )}
        </select>
      </label>
      <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/3 p-4">
        <div className="mb-3">
          <p className="text-sm font-bold">Activity content</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure the fields for this{" "}
            {activityLabels[activity.type].toLowerCase()}.
          </p>
        </div>
        <ActivityEditor activity={activity} onChange={setActivity} />
      </section>
      <label className="mt-4 block text-sm font-bold">
        Supplementary resource or note{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          value={resourceNote}
          onChange={(event) => setResourceNote(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          placeholder="e.g. Review the circuit diagram handout first"
        />
      </label>
      {item.masterTitle && (
        <div className="mt-5 rounded-xl border border-border bg-muted/60 p-3 text-sm">
          <p className="font-bold">Master reference · read-only</p>
          <p className="mt-1">
            <b>{item.masterTitle}</b> · {item.masterKind}
          </p>
          <p className="mt-1 text-muted-foreground">{item.masterInstruction}</p>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Cancel
        </button>
        <button
          disabled={!title.trim() || saving}
          onClick={async () => {
            setSaving(true);
            await onSave({
              title: title.trim(),
              kind: activityLabels[activity.type],
              instruction: activityInstruction(activity),
              resourceNote,
              activity,
            });
            setSaving(false);
          }}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : `Save ${classroomName} content`}
        </button>
      </div>
    </Modal>
  );
}
function ActivityEditor({
  activity,
  onChange,
}: {
  activity: LessonActivity;
  onChange: (activity: LessonActivity) => void;
}) {
  const instruction = "instruction" in activity ? activity.instruction : "";
  const setInstruction = (value: string) =>
    onChange({ ...activity, instruction: value } as LessonActivity);
  if (activity.type === "quiz")
    return (
      <QuizEditor
        questions={activity.questions}
        onChange={(questions) => onChange({ ...activity, questions })}
      />
    );
  if (activity.type === "scenario-question")
    return (
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-bold">
          Scenario
          <textarea
            value={activity.scenario}
            onChange={(event) =>
              onChange({ ...activity, scenario: event.target.value })
            }
            className="mt-2 min-h-22 w-full rounded-xl border border-input p-3 font-normal"
          />
        </label>
        <AnswerOptions
          options={activity.options}
          correctIndex={activity.correctIndex}
          onChange={(options, correctIndex) =>
            onChange({ ...activity, options, correctIndex })
          }
        />
      </div>
    );
  if (activity.type === "rich-text-editor")
    return <RichTextActivityEditor activity={activity} onChange={onChange} />;
  if (activity.type === "python-runner")
    return (
      <div className="mt-4">
        <Instruction value={activity.instruction} onChange={setInstruction} />
        <label className="mt-3 block text-sm font-bold">
          Starter Python code
          <textarea
            value={activity.initialCode || ""}
            onChange={(event) =>
              onChange({ ...activity, initialCode: event.target.value })
            }
            className="mt-2 min-h-32 w-full rounded-xl border border-input bg-code-bg p-3 font-mono text-sm text-white"
          />
        </label>
      </div>
    );
  if (activity.type === "html-preview")
    return (
      <div className="mt-4">
        <Instruction value={activity.instruction} onChange={setInstruction} />
        <label className="mt-3 block text-sm font-bold">
          Starter HTML
          <textarea
            value={activity.initialHtml || ""}
            onChange={(event) =>
              onChange({ ...activity, initialHtml: event.target.value })
            }
            className="mt-2 min-h-24 w-full rounded-xl border border-input bg-code-bg p-3 font-mono text-sm text-white"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          Starter CSS
          <textarea
            value={activity.initialCss || ""}
            onChange={(event) =>
              onChange({ ...activity, initialCss: event.target.value })
            }
            className="mt-2 min-h-24 w-full rounded-xl border border-input bg-code-bg p-3 font-mono text-sm text-white"
          />
        </label>
      </div>
    );
  if (activity.type === "wokwi-embed" || activity.type === "youtube-embed")
    return (
      <div className="mt-4">
        <Instruction value={activity.instruction} onChange={setInstruction} />
        <label className="mt-3 block text-sm font-bold">
          Embed title
          <input
            value={activity.title}
            onChange={(event) =>
              onChange({ ...activity, title: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          {activity.type === "youtube-embed" ? "YouTube video ID" : "Wokwi URL"}
          <input
            value={
              activity.type === "youtube-embed"
                ? activity.videoId
                : activity.src
            }
            onChange={(event) =>
              onChange(
                activity.type === "youtube-embed"
                  ? { ...activity, videoId: event.target.value }
                  : { ...activity, src: event.target.value },
              )
            }
            className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          />
        </label>
      </div>
    );
  if (activity.type === "external-link")
    return (
      <div className="mt-4">
        <Instruction value={activity.instruction} onChange={setInstruction} />
        <label className="mt-3 block text-sm font-bold">
          Link title
          <input
            value={activity.title}
            onChange={(event) =>
              onChange({ ...activity, title: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          URL
          <input
            value={activity.url}
            onChange={(event) =>
              onChange({ ...activity, url: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          />
        </label>
      </div>
    );
  if (activity.type === "drag-label" || activity.type === "drag-classify")
    return (
      <DragActivityEditor
        activity={activity}
        onChange={onChange}
        setInstruction={setInstruction}
      />
    );
  return (
    <div className="mt-4">
      <Instruction value={instruction} onChange={setInstruction} />
      {activity.type === "ai-chat" && (
        <label className="mt-3 block text-sm font-bold">
          Starter prompt
          <input
            value={activity.starterPrompt || ""}
            onChange={(event) =>
              onChange({ ...activity, starterPrompt: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
          />
        </label>
      )}
    </div>
  );
}
function Instruction({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      Classroom instructions
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-22 w-full rounded-xl border border-input p-3 font-normal"
      />
    </label>
  );
}
function DragActivityEditor({
  activity,
  onChange,
  setInstruction,
}: {
  activity: Extract<
    LessonActivity,
    { type: "drag-label" | "drag-classify" }
  >;
  onChange: (activity: LessonActivity) => void;
  setInstruction: (value: string) => void;
}) {
  const [itemsText, setItemsText] = useState(() =>
    activity.items.map((item) => item.label).join(", "),
  );
  const [zonesText, setZonesText] = useState(() =>
    activity.zones.map((zone) => zone.label).join(", "),
  );
  const saveItems = (value: string) => {
    setItemsText(value);
    onChange({
      ...activity,
      items: value
        .split(",")
        .map((label, index) => ({
          id: `item-${index}`,
          label: label.trim(),
          zone: activity.zones[0]?.id || "zone-0",
        }))
        .filter((item) => item.label),
    });
  };
  const saveZones = (value: string) => {
    setZonesText(value);
    onChange({
      ...activity,
      zones: value
        .split(",")
        .map((label, index) => ({ id: `zone-${index}`, label: label.trim() }))
        .filter((zone) => zone.label),
    });
  };
  return (
    <div className="mt-4">
      <Instruction value={activity.instruction} onChange={setInstruction} />
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Items and target zones remain the supported interactive building blocks.
        You can type naturally, including spaces and a trailing comma while
        adding the next entry.
      </p>
      <label className="mt-3 block text-sm font-bold">
        Item labels{" "}
        <span className="font-normal text-muted-foreground">
          (comma-separated)
        </span>
        <input
          value={itemsText}
          onChange={(event) => saveItems(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
        />
      </label>
      <label className="mt-3 block text-sm font-bold">
        Target zones{" "}
        <span className="font-normal text-muted-foreground">
          (comma-separated)
        </span>
        <input
          value={zonesText}
          onChange={(event) => saveZones(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
        />
      </label>
    </div>
  );
}
function RichTextActivityEditor({
  activity,
  onChange,
}: {
  activity: Extract<LessonActivity, { type: "rich-text-editor" }>;
  onChange: (activity: LessonActivity) => void;
}) {
  const [formatsText, setFormatsText] = useState(() =>
    activity.requiredFormats.join(", "),
  );
  const saveFormats = (value: string) => {
    setFormatsText(value);
    onChange({
      ...activity,
      requiredFormats: value
        .split(",")
        .map((format) => format.trim())
        .filter(Boolean),
    });
  };
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-bold">
        Learner mission
        <textarea
          value={activity.mission}
          onChange={(event) =>
            onChange({ ...activity, mission: event.target.value })
          }
          className="mt-2 min-h-22 w-full rounded-xl border border-input p-3 font-normal"
        />
      </label>
      <label className="block text-sm font-bold">
        Required formats{" "}
        <span className="font-normal text-muted-foreground">
          (comma-separated)
        </span>
        <input
          value={formatsText}
          onChange={(event) => saveFormats(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
        />
      </label>
    </div>
  );
}
function QuizEditor({
  questions,
  onChange,
}: {
  questions: { question: string; options: string[]; correctIndex: number }[];
  onChange: (
    questions: { question: string; options: string[]; correctIndex: number }[],
  ) => void;
}) {
  const update = (
    index: number,
    question: { question: string; options: string[]; correctIndex: number },
  ) =>
    onChange(
      questions.map((current, currentIndex) =>
        currentIndex === index ? question : current,
      ),
    );
  return (
    <div className="mt-4">
      <p className="text-sm font-bold">Quiz questions and answers</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Mark the correct answer; students will see only the quiz, not this
        authoring control.
      </p>
      <div className="mt-3 space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Question {index + 1}</p>
              <button
                onClick={() =>
                  onChange(
                    questions.filter(
                      (_, currentIndex) => currentIndex !== index,
                    ),
                  )
                }
                disabled={questions.length === 1}
                className="text-xs font-bold text-destructive disabled:opacity-40"
              >
                Remove
              </button>
            </div>
            <textarea
              value={question.question}
              onChange={(event) =>
                update(index, { ...question, question: event.target.value })
              }
              className="mt-2 min-h-18 w-full rounded-lg border border-input p-2.5 text-sm"
              placeholder="Write the question"
            />
            <AnswerOptions
              options={question.options}
              correctIndex={question.correctIndex}
              onChange={(options, correctIndex) =>
                update(index, { ...question, options, correctIndex })
              }
            />
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          onChange([
            ...questions,
            { question: "", options: ["", ""], correctIndex: 0 },
          ])
        }
        className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary"
      >
        <Plus className="mr-1 inline" size={15} />
        Add question
      </button>
    </div>
  );
}
function AnswerOptions({
  options,
  correctIndex,
  onChange,
}: {
  options: string[];
  correctIndex: number;
  onChange: (options: string[], correctIndex: number) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            aria-label={`Correct answer ${index + 1}`}
            type="radio"
            name={`answer-${options.join("-")}`}
            checked={correctIndex === index}
            onChange={() => onChange(options, index)}
          />
          <input
            value={option}
            onChange={(event) =>
              onChange(
                options.map((value, currentIndex) =>
                  currentIndex === index ? event.target.value : value,
                ),
                correctIndex,
              )
            }
            className="min-w-0 flex-1 rounded-lg border border-input px-2.5 py-2 text-sm"
            placeholder={`Answer ${index + 1}`}
          />
          <button
            onClick={() =>
              onChange(
                options.filter((_, currentIndex) => currentIndex !== index),
                Math.min(correctIndex, Math.max(0, options.length - 2)),
              )
            }
            disabled={options.length <= 2}
            className="text-xs font-bold text-destructive disabled:opacity-40"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, ""], correctIndex)}
        className="text-xs font-bold text-primary"
      >
        + Add answer option
      </button>
    </div>
  );
}
function LessonPlayground({
  item,
  onClose,
}: {
  item: CurriculumItem;
  onClose: () => void;
}) {
  const [result, setResult] = useState("");
  const activity = item.activity;
  return (
    <Modal title={`Try it out · ${item.title}`} onClose={onClose}>
      <p className="mt-2 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-900">
        <b>Trainer playground.</b> Nothing entered here is stored, shared with
        students, or sent to the database.
      </p>
      {item.isChallenge && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <b>Challenge grading note.</b> Quiz and other answer-key activities
          can evaluate this classroom configuration. Python challenge grading
          is currently defined by platform-owned tests, so changing the code or
          instructions here does not automatically create a new production
          checker.
        </p>
      )}
      <p className="mt-5 text-sm font-bold">{item.kind}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {item.instruction || "No classroom instructions added yet."}
      </p>
      {item.resourceNote && (
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <b>Supplementary note:</b> {item.resourceNote}
        </p>
      )}
      {activity ? (
        <ActivityPlayground
          activity={activity}
          onResult={(message) => setResult(message)}
        />
      ) : (
        <p className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          This older classroom item has no activity configuration yet. Edit and
          save it once to initialize its supported activity.
        </p>
      )}
      {result && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">
          {result}
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Close playground
        </button>
      </div>
    </Modal>
  );
}
function ActivityPlayground({
  activity,
  onResult,
}: {
  activity: LessonActivity;
  onResult: (message: string) => void;
}) {
  const done = (score?: number) =>
    onResult(
      score === undefined
        ? "Activity completed in the trainer playground. No progress was recorded."
        : `Playground result: ${score}%. No progress or data was recorded.`,
    );
  return (
    <div className="mt-5">
      {activity.type === "quiz" && (
        <Quiz
          questions={activity.questions}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "drag-label" && (
        <DragDrop
          items={activity.items}
          zones={activity.zones}
          instruction={activity.instruction}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "drag-classify" && (
        <DragClassify
          items={activity.items}
          zones={activity.zones}
          instruction={activity.instruction}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "keyboard" && (
        <KeyboardLesson
          instruction={activity.instruction}
          onComplete={(correct, total) => done(Math.round((correct / total) * 100))}
        />
      )}
      {activity.type === "typing-test" && (
        <TypingTest
          instruction={activity.instruction}
          onComplete={(_, accuracy) => done(accuracy)}
        />
      )}
      {activity.type === "rich-text-editor" && (
        <RichTextEditor
          mission={activity.mission}
          requiredFormats={activity.requiredFormats}
          onComplete={(formats) =>
            done(
              activity.requiredFormats.length
                ? Math.round(
                    (activity.requiredFormats.filter((format) =>
                      formats.includes(format),
                    ).length /
                      activity.requiredFormats.length) *
                      100,
                  )
                : 100,
            )
          }
        />
      )}
      {activity.type === "slide-editor" && (
        <SlideEditor instruction={activity.instruction} onComplete={() => done(100)} />
      )}
      {activity.type === "python-runner" && (
        <>
          <PythonRunner
            instruction={activity.instruction}
            initialCode={activity.initialCode}
            isChallenge={false}
            onComplete={() =>
              onResult(
                "Python ran successfully in the trainer playground. This does not create or change a production challenge grade.",
              )
            }
          />
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Python runs here use the same runtime. To grade a customized module
            challenge in production, an administrator must define and approve
            its server-side/platform test contract.
          </p>
        </>
      )}
      {activity.type === "html-preview" && (
        <HtmlPreview
          instruction={activity.instruction}
          initialHtml={activity.initialHtml}
          initialCss={activity.initialCss}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "scenario-question" && (
        <ScenarioQuestion
          scenario={activity.scenario}
          options={activity.options}
          correctIndex={activity.correctIndex}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "external-link" && (
        <ExternalLink
          url={activity.url}
          title={activity.title}
          instruction={activity.instruction}
          onComplete={(score, total) => done(Math.round((score / total) * 100))}
        />
      )}
      {activity.type === "ai-chat" && (
        <AiChat
          instruction={activity.instruction}
          starterPrompt={activity.starterPrompt}
          onComplete={() => done(100)}
        />
      )}
      {activity.type === "wokwi-embed" && (
        <WokwiEmbed
          instruction={activity.instruction}
          title={activity.title}
          src={activity.src}
        />
      )}
      {activity.type === "youtube-embed" && (
        <YouTubeEmbed
          instruction={activity.instruction}
          title={activity.title}
          videoId={activity.videoId}
        />
      )}
    </div>
  );
}
function MasterReference({ classroomName, onClose }: { classroomName: string; onClose: () => void }) {
  return (
    <Modal title="Master curriculum reference" onClose={onClose}>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Read-only reference of the existing platform curriculum. Use it for
        inspiration; editing happens only through a {classroomName} override.
      </p>
      <div className="mt-4 max-h-100 space-y-3 overflow-y-auto pr-1">
        {tracks.map((track) => (
          <div key={track.slug} className="rounded-xl border border-border p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Module {track.weekNumber}
            </p>
            <p className="mt-1 font-bold">{track.title}</p>
            <div className="mt-2 space-y-2">
              {track.lessons.map((lesson) => (
                <div
                  key={lesson.slug}
                  className="rounded-lg bg-muted/60 p-2.5 text-sm"
                >
                  <p className="font-semibold">
                    {lesson.title}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {activityLabels[lesson.activity.type]}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {activityInstruction(lesson.activity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
function ChangeReview({
  classroomName,
  changes,
  onClose,
}: {
  classroomName: string;
  changes: { module: Module; item: CurriculumItem; results: string[] }[];
  onClose: () => void;
}) {
  return (
    <Modal title={`Review ${classroomName} changes`} onClose={onClose}>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        A summary of the current classroom configuration compared with the
        platform master. This is for review, not a platform audit log.
      </p>
      <div className="mt-4 max-h-90 space-y-3 overflow-y-auto pr-1">
        {changes.length ? (
          changes.map(({ module, item, results }) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <p className="text-xs font-bold text-primary">
                Module {module.week} · {module.title}
              </p>
              <p className="mt-1 text-sm font-bold">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {results.map((result) => (
                  <span
                    key={result}
                    className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"
                  >
                    {result}
                  </span>
                ))}
              </div>
              {item.masterTitle && item.title !== item.masterTitle && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Master title: {item.masterTitle}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            {classroomName} currently matches the master curriculum. No classroom
            changes to review.
          </p>
        )}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
function AddItemModal({
  classroomName,
  onClose,
  onAdd,
}: {
  classroomName: string;
  onClose: () => void;
  onAdd: (type: LessonActivity["type"], title: string) => void | Promise<void>;
}) {
  const types = Object.keys(activityLabels) as LessonActivity["type"][];
  const [type, setType] = useState<LessonActivity["type"]>("quiz");
  const [title, setTitle] = useState("");
  return (
    <Modal title={`Add to ${classroomName}`} onClose={onClose}>
      <p className="text-sm leading-6 text-muted-foreground">
        Choose a capability the platform already supports. After adding it, use
        Edit to author its content: quiz questions, code, embeds, instructions,
        and more.
      </p>
      <label className="mt-5 block text-sm font-bold">
        Supported item type
        <select
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5"
          value={type}
          onChange={(event) =>
            setType(event.target.value as LessonActivity["type"])
          }
        >
          {types.map((current) => (
            <option key={current} value={current}>
              {activityLabels[current]}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-bold">
        Title
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
          placeholder="e.g. Extra Boolean Practice"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Cancel
        </button>
        <button
          onClick={() => void onAdd(type, title)}
          disabled={!title.trim()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Add and author content
        </button>
      </div>
    </Modal>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-code-bg/45 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl sm:p-6"
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-border bg-card px-5 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
          <h3 className="font-display text-lg font-bold sm:text-xl">{title}</h3>
          <button
            className="rounded-lg p-1 hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Confirm({
  title,
  text,
  action,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  action: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {action}
        </button>
      </div>
    </Modal>
  );
}

function Attendance({
  classroomId,
  classroomName,
  studentsList,
  attendance,
  setAttendance,
  notify,
  attendanceSessions,
  onChanged,
}: {
  classroomId: string;
  classroomName: string;
  studentsList: StudentSummary[];
  attendance: Record<string, string>;
  setAttendance: (value: Record<string, string>) => void;
  notify: (message: string) => void;
  attendanceSessions: AttendanceSessionSummary[];
  onChanged: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().split("T")[0];
  async function saveSession() {
    const records: AttendanceRecord[] = studentsList.map((student) => ({
      studentId: student.id,
      status: attendance[student.id] === "absent" ? "absent" : "present",
    }));
    const result = await recordAttendance(classroomId, today, records);
    notify(result.error || `Attendance saved for ${classroomName}.`);
    if (!result.error) await onChanged();
  }

  return (
    <>
      <PageHeading eyebrow={`${classroomName} · operational log`} title="Attendance">
        <button
          onClick={() => void saveSession()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Save session
        </button>
      </PageHeading>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div>
            <h3 className="font-display text-lg font-bold">
              {new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date(today))}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Today&apos;s classroom attendance record
            </p>
          </div>
          <select value={classroomId} disabled className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option>{classroomName}</option>
          </select>
        </div>
        <div className="mt-5 space-y-3">
          {studentsList.map((student) => (
            <div
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar student={student} />
                <div>
                  <p className="text-sm font-bold">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Saved progress: {student.progressSummary}
                  </p>
                </div>
              </div>
              <div className="flex rounded-lg border border-border bg-card p-1">
                {["present", "absent"].map((status) => (
                  <button
                    key={status}
                    onClick={() =>
                      setAttendance({ ...attendance, [student.id]: status })
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      attendance[student.id] === status
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-6">
        <h3 className="font-display text-lg font-bold">Attendance history</h3>
        <div className="mt-4 space-y-3">
          {attendanceSessions.length ? attendanceSessions.map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm">
              <div>
                <p className="font-bold">{new Date(session.sessionDate).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{session.total} student record{session.total === 1 ? "" : "s"}</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800">{session.present} present</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{session.absent} absent</span>
              </div>
            </div>
          )) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No previous attendance sessions have been saved for this classroom.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
function Homework({ classroomName }: { classroomName: string }) {
  return (
    <>
      <PageHeading eyebrow={`${classroomName} · assignment`} title="Assign homework" />
      <Card>
        <h3 className="font-display text-lg font-bold">Challenge API not connected yet</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Homework assignment needs the real challenge assignment API before this
          page can save anything. No prototype assignment is being stored or
          shown as complete.
        </p>
      </Card>
    </>
  );
}
function Hardware({
  classroomId,
  classroomName,
  sessions,
  notify,
  onChanged,
}: {
  classroomId: string;
  classroomName: string;
  sessions: HardwareSession[];
  notify: (message: string) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [evidence, setEvidence] = useState<HardwareEvidence[]>([]);
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const editingSession = sessions.find((session) => session.id === editingSessionId) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedSessionId((current) => (current && sessions.some((session) => session.id === current) ? current : sessions[0]?.id ?? null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sessions]);

  useEffect(() => {
    async function loadEvidence() {
      if (!selectedSession) {
        setEvidence([]);
        return;
      }
      const result = await getHardwareEvidence(selectedSession.id);
      setEvidence(result.data ?? []);
    }
    void loadEvidence();
  }, [selectedSession]);

  function beginEditSession(session: HardwareSession) {
    setEditingSessionId(session.id);
    setSelectedSessionId(session.id);
    setSessionDate(session.sessionDate);
    setNotes(session.notes ?? "");
  }

  function resetHardwareForm() {
    setEditingSessionId(null);
    setSessionDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setSessionFile(null);
  }

  async function saveSession() {
    setBusy(true);
    const result = editingSessionId
      ? await updateHardwareSession({ sessionId: editingSessionId, classroomId, sessionDate, notes })
      : await createHardwareSession({ classroomId, sessionDate, notes });
    if (result.data && sessionFile) {
      const upload = await uploadHardwareEvidence({ classroomId, sessionId: result.data.id, file: sessionFile });
      if (upload.error) {
        setBusy(false);
        notify(upload.error);
        return;
      }
    }
    setBusy(false);
    notify(result.error || (editingSessionId ? "Hardware session updated." : "Hardware session saved."));
    if (result.data) {
      resetHardwareForm();
      setSelectedSessionId(result.data.id);
      await onChanged();
    }
  }

  async function uploadEvidence() {
    if (!selectedSession || !evidenceFile) return;
    setBusy(true);
    const result = await uploadHardwareEvidence({ classroomId, sessionId: selectedSession.id, file: evidenceFile });
    setBusy(false);
    notify(result.error || "Hardware evidence uploaded.");
    if (!result.error) {
      setEvidenceFile(null);
      const refreshed = await getHardwareEvidence(selectedSession.id);
      setEvidence(refreshed.data ?? []);
      await onChanged();
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`${classroomName} · authoritative physical record`}
        title="Hardware session"
      >
        <button
          disabled={busy}
          onClick={() => void saveSession()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {editingSessionId ? "Save changes" : sessionFile ? "Save session with file" : "Save session"}
        </button>
      </PageHeading>
      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Video className="text-primary" size={20} />
            <h3 className="font-display text-lg font-bold">{editingSession ? "Edit hardware session" : "Log physical activity"}</h3>
          </div>
          <label className="mt-5 block text-sm font-bold">
            Session date
            <input
              type="date"
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-input px-3 py-2.5 font-normal"
            />
          </label>
          <label className="mt-4 block text-sm font-bold">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-32 w-full rounded-xl border border-input p-3 font-normal"
              placeholder="Describe the circuit, hardware task, troubleshooting, or learner evidence captured."
            />
          </label>
          <label className="mt-4 block text-sm font-bold">
            Supporting file
            <input
              type="file"
              onChange={(event) => setSessionFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-input px-3 py-2 text-sm font-normal file:cursor-pointer"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => void saveSession()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {editingSessionId ? "Save changes" : sessionFile ? "Save session with file" : "Save session"}
            </button>
            {editingSessionId && (
              <button
                onClick={resetHardwareForm}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
              >
                Cancel edit
              </button>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-lg font-bold">Session history</h3>
          <div className="mt-4 space-y-3">
            {sessions.length ? sessions.map((session) => (
              <div
                key={session.id}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedSession?.id === session.id ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:bg-muted"}`}
              >
                <button
                  onClick={() => setSelectedSessionId(session.id)}
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">{new Date(session.sessionDate).toLocaleDateString()}</p>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                      {session.evidenceCount} evidence file{session.evidenceCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.notes || "No notes added."}</p>
                </button>
                <button
                  onClick={() => beginEditSession(session)}
                  className="mt-3 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-card"
                >
                  <Pencil className="mr-1 inline" size={13} />
                  Edit
                </button>
              </div>
            )) : (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                No physical hardware sessions have been saved for this classroom yet.
              </p>
            )}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Evidence</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedSession ? `Selected session: ${new Date(selectedSession.sessionDate).toLocaleDateString()}` : "Save or select a session before uploading evidence."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              disabled={!selectedSession}
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              className="max-w-70 cursor-pointer rounded-xl border border-input px-3 py-2 text-sm file:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              disabled={!selectedSession || !evidenceFile || busy}
              onClick={() => void uploadEvidence()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <Upload className="mr-1 inline" size={15} />
              Upload
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {evidence.length ? evidence.map((item) => (
            <a
              key={item.id}
              href={item.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border p-3 text-sm hover:bg-muted"
            >
              <p className="font-bold">{item.fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.mimeType} · {item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : "size unknown"} · {new Date(item.createdAt).toLocaleString()}
              </p>
            </a>
          )) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground md:col-span-2">
              No evidence files are attached to the selected hardware session.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
function Students({
  notify,
  studentsList,
  classroomId,
  classroomName,
  typingSummary,
}: {
  notify: (message: string) => void;
  studentsList: StudentSummary[];
  classroomId: string;
  classroomName: string;
  typingSummary: TrainerTypingSummary;
}) {
  const [commentFor, setCommentFor] = useState<StudentSummary | null>(null);
  const [comment, setComment] = useState("");
  const [commentHistory, setCommentHistory] = useState<WeeklyComment[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<TrainerStudentFeedback[]>([]);
  const [typingHistory, setTypingHistory] = useState<TypingAttempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentMode, setCommentMode] = useState<"write" | "history">("history");
  const weekNumber = currentWeekNumber();

  async function openStudentRecord(student: StudentSummary, mode: "write" | "history") {
    setCommentFor(student);
    setCommentMode(mode);
    setComment("");
    setEditingCommentId(null);
    setCommentHistory([]);
    setFeedbackHistory([]);
    setTypingHistory([]);
    setLoadingHistory(true);
    const [commentsRes, feedbackRes, typingRes] = await Promise.all([
      getStudentWeeklyComments(classroomId, student.id),
      getStudentFeedbackForTrainer(classroomId, student.id),
      getStudentTypingHistory(classroomId, student.id),
    ]);
    setCommentHistory(commentsRes.data ?? []);
    setFeedbackHistory(feedbackRes.data ?? []);
    setTypingHistory(typingRes.data ?? []);
    setLoadingHistory(false);
  }

  return (
    <>
      <PageHeading eyebrow={`${classroomName} · student progress`} title="Students" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-175 text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-3 font-bold">Student</th>
              <th className="pb-3 font-bold">Curriculum progress</th>
              <th className="pb-3 font-bold">WPM</th>
              <th className="pb-3 font-bold">Homework</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {studentsList.map((student) => (
              <tr
                key={student.id}
                className="border-b border-border/70 last:border-0"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar student={student} />
                    <span className="font-bold">{student.name}</span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${student.progressPercent ?? 0}%` }}
                      />
                    </div>
                    <span>{student.progressSummary}</span>
                  </div>
                </td>
                <td className="py-4">
                  {typingSummary.byStudent[student.id]?.bestWpm === null || typingSummary.byStudent[student.id]?.bestWpm === undefined ? (
                    <span className="text-muted-foreground">No attempts</span>
                  ) : (
                    <div>
                      <p className="font-bold">{typingSummary.byStudent[student.id].bestWpm} WPM</p>
                      <p className="text-xs text-muted-foreground">
                        Latest {typingSummary.byStudent[student.id].latestWpm ?? "-"} · Best accuracy {typingSummary.byStudent[student.id].bestAccuracy ?? "-"}%
                      </p>
                    </div>
                  )}
                </td>
                <td className="py-4 text-muted-foreground">
                  {student.homeworkSummary}
                </td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <div className={`size-1.5 rounded-full ${(student.progressPercent ?? 100) < 50 || (student.attendancePercent ?? 100) < 70 ? "bg-amber-500" : "bg-green-500"}`} />
                    {(student.progressPercent ?? 100) < 50 || (student.attendancePercent ?? 100) < 70 ? "Review" : "On track"}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void openStudentRecord(student, "write")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      Write comment
                    </button>
                    <button
                      onClick={() => void openStudentRecord(student, "history")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-primary"
                    >
                      View history
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {commentFor && (
        <Modal
          title={`${commentMode === "write" ? "Write comment" : "Student history"} · ${commentFor.name}`}
          onClose={() => setCommentFor(null)}
        >
          <p className="mt-2 text-sm text-muted-foreground">
            {commentMode === "write"
              ? "Add a new trainer note for this student. Use an Edit button below only when changing a saved comment."
              : "Review previous trainer comments, student reflections, and saved typing attempts."}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <h3 className="text-sm font-bold">Comment history</h3>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {loadingHistory ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : commentHistory.length ? commentHistory.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-primary">{new Date(item.createdAt).toLocaleDateString()}</p>
                      <button
                        onClick={() => {
                          setComment(item.comment);
                          setEditingCommentId(item.id);
                          setCommentMode("write");
                        }}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs font-bold text-primary"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.comment}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No saved trainer comments yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <h3 className="text-sm font-bold">Student reflections</h3>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {loadingHistory ? (
                  <p className="text-sm text-muted-foreground">Loading reflections...</p>
                ) : feedbackHistory.length ? feedbackHistory.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted p-2.5 text-sm">
                    <p className="text-xs font-bold text-primary">
                      {new Date(item.createdAt).toLocaleDateString()}
                      {item.updatedAt !== item.createdAt ? " · edited" : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.feedbackText}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No student reflections yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <h3 className="text-sm font-bold">Typing history</h3>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {loadingHistory ? (
                  <p className="text-sm text-muted-foreground">Loading typing attempts...</p>
                ) : typingHistory.length ? typingHistory.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted p-2.5 text-sm">
                    <p className="font-bold">{item.wpm} WPM · {item.accuracy}% accuracy</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.attemptedAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No typing attempts saved yet.</p>
                )}
              </div>
            </div>
          </div>
          {(commentMode === "write" || editingCommentId) && (
            <>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-4 min-h-30 w-full rounded-xl border border-input p-3 text-sm"
                placeholder="Write an encouraging, specific progress comment..."
              />
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {editingCommentId ? (
                  <button
                    onClick={() => {
                      setEditingCommentId(null);
                      setComment("");
                      setCommentMode("history");
                    }}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
                  >
                    Cancel edit
                  </button>
                ) : (
                  <button
                    onClick={() => setCommentMode("history")}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
                  >
                    View history only
                  </button>
                )}
              <button
                disabled={!comment.trim()}
                onClick={async () => {
                  const result = editingCommentId
                    ? await updateWeeklyComment({
                        commentId: editingCommentId,
                        classroomId,
                        comment,
                      })
                    : await createWeeklyComment({
                        classroomId,
                        studentId: commentFor.id,
                        weekNumber,
                        comment,
                      });
                  notify(result.error || `Comment ${editingCommentId ? "updated" : "saved"} for ${commentFor.name}.`);
                  if (result.error) return;
                  setComment("");
                  setEditingCommentId(null);
                  setCommentMode("history");
                  const refreshed = await getStudentWeeklyComments(classroomId, commentFor.id);
                  setCommentHistory(refreshed.data ?? []);
                }}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {editingCommentId ? "Update comment" : "Save comment"}
              </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
function Badges({
  awards,
  setAwards,
  notify,
  studentsList,
  classroomName,
}: {
  awards: { student: string; badge: string; date: string }[];
  setAwards: (
    awards: { student: string; badge: string; date: string }[],
  ) => void;
  notify: (message: string) => void;
  studentsList: StudentSummary[];
  classroomName: string;
}) {
  const [student, setStudent] = useState(studentsList[0]?.name || "");
  const [badge, setBadge] = useState("Circuit Starter");
  const supported = [
    "Circuit Starter",
    "Traffic Controller",
    "Prompt Engineer",
    "Team Player",
    "Most Creative",
  ];
  return (
    <>
      <PageHeading eyebrow={`${classroomName} · recognition`} title="Award a badge" />
      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <Card>
          <p className="text-sm leading-6 text-muted-foreground">
            Trainer awards are insert-only. For corrections, an administrator
            must use the audit process.
          </p>
          <label className="mt-5 block text-sm font-bold">
            Student
            <select
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
            >
              {studentsList.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
            Supported trainer badge
            <select
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
            >
              {supported.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setAwards([
                ...awards,
                { student, badge, date: new Date().toLocaleDateString() },
              ]);
              notify(
                `${badge} awarded to ${student}. This record cannot be edited or revoked here.`,
              );
            }}
            className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Award badge
          </button>
        </Card>
        <Card>
          <h3 className="font-display text-lg font-bold">Recent awards</h3>
          {awards.length ? (
            <div className="mt-4 space-y-3">
              {awards.map((award, index) => (
                <div
                  key={`${award.student}-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-muted p-3"
                >
                  <BadgeCheck className="text-primary" />
                  <div>
                    <p className="text-sm font-bold">{award.badge}</p>
                    <p className="text-xs text-muted-foreground">
                      {award.student} · {award.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No trainer-awarded badges yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
function Reports({
  studentsList,
  classroomName,
  typingSummary,
  hardwareSessions,
}: {
  studentsList: StudentSummary[];
  classroomName: string;
  typingSummary: TrainerTypingSummary;
  hardwareSessions: HardwareSession[];
}) {
  const progressValues = studentsList
    .map((student) => student.progressPercent)
    .filter((value): value is number => value !== null);
  const attendanceValues = studentsList
    .map((student) => student.attendancePercent)
    .filter((value): value is number => value !== null);
  const progressAverage = progressValues.length ? Math.round(progressValues.reduce((total, value) => total + value, 0) / progressValues.length) : null;
  const attendanceAverage = attendanceValues.length ? Math.round(attendanceValues.reduce((total, value) => total + value, 0) / attendanceValues.length) : null;
  return (
    <>
      <PageHeading eyebrow={`${classroomName} · analytics`} title="Classroom reports" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-bold">Curriculum progress</p>
          <p className="mt-2 font-display text-4xl font-bold">{progressAverage === null ? "No data" : `${progressAverage}%`}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Average from saved lesson progress
          </p>
          <Progress value={progressAverage ?? 0} />
        </Card>
        <Card>
          <p className="text-sm font-bold">Attendance</p>
          <p className="mt-2 font-display text-4xl font-bold">{attendanceAverage === null ? "No data" : `${attendanceAverage}%`}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Average from recorded attendance sessions
          </p>
          <Progress value={attendanceAverage ?? 0} />
        </Card>
        <Card>
          <p className="text-sm font-bold">Average typing speed</p>
          <p className="mt-2 font-display text-4xl font-bold">
            {typingSummary.classAverageWpm === null ? "No data" : `${typingSummary.classAverageWpm} WPM`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Qualifying attempts require at least 85% accuracy
          </p>
          <Progress value={typingSummary.classAverageWpm === null ? 0 : Math.min(100, typingSummary.classAverageWpm)} />
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-bold">
            Students needing attention
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Signals shown as recorded; no new at-risk scoring is invented here.
          </p>
          <div className="grid gap-3">
            {studentsList.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Avatar student={student} />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {student.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="text-sm font-bold text-foreground">
                      {student.progressSummary}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Homework</p>
                    <p className="text-sm font-bold text-foreground">
                      {student.homeworkSummary}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-lg font-bold">
            Hardware-session reporting
          </h3>
          {hardwareSessions.length ? (
            <div className="mt-5 space-y-3">
              {hardwareSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{new Date(session.sessionDate).toLocaleDateString()}</p>
                    <span className="text-xs font-bold text-primary">{session.evidenceCount} evidence file{session.evidenceCount === 1 ? "" : "s"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.notes || "No notes added."}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                No hardware sessions recorded
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Save a hardware session from the Hardware sessions tab to include it in reporting.
              </p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Total physical sessions logged</span>
            <b>{hardwareSessions.length}</b>
          </div>
          <Progress value={Math.min(100, hardwareSessions.length * 25)} />
        </Card>
      </div>
    </>
  );
}

function WeeklyReport({ classroom, notify }: { classroom: TrainerClassroom; notify: (message: string) => void }) {
  const isLeadTrainer = classroom.assignmentRole === "lead";
  const [reports, setReports] = useState<ClassroomWeeklyReport[]>([]);
  const [weekKey, setWeekKey] = useState(`week-${currentWeekNumber()}`);
  const [reportText, setReportText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const currentReport = reports.find((report) => report.weekKey === weekKey) ?? null;

  const loadReports = useCallback(async () => {
    setLoading(true);
    const result = await getClassroomWeeklyReports(classroom.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReports(result.data ?? []);
    setError("");
  }, [classroom.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReportText(currentReport?.reportText ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentReport]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLeadTrainer) return setError("Only the active Lead Trainer can submit the official classroom weekly report.");
    if (!reportText.trim() && !file) return setError("Write a report or upload a PDF/DOCX file.");
    setSubmitting(true);
    setError("");
    const result = await submitClassroomWeeklyReport({
      classroomId: classroom.id,
      weekKey,
      reportText,
      file,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFile(null);
    if (result.data) {
      setReports((current) => [result.data!, ...current.filter((report) => report.id !== result.data!.id && report.weekKey !== result.data!.weekKey)]);
    }
    notify("Classroom weekly report submitted.");
  }

  return (
    <>
      <PageHeading eyebrow={`${classroom.name} · classroom accountability`} title="Weekly Report" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold">Official classroom report</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                One report is saved per classroom each week. Co-trainers can view it, but only the active Lead Trainer submits it.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isLeadTrainer ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {isLeadTrainer ? "Lead Trainer" : "Read-only"}
            </span>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <input
              value={weekKey}
              onChange={(event) => setWeekKey(event.target.value)}
              disabled={!isLeadTrainer}
              placeholder="week-12"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <p className="font-bold">Helpful prompts</p>
              <p className="mt-1">What went well? What was covered? How was student engagement? What challenges came up? Is follow-up needed?</p>
            </div>
            <textarea
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              disabled={!isLeadTrainer || currentReport?.status === "reviewed"}
              maxLength={5000}
              placeholder="Write this classroom's weekly report."
              className="min-h-44 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
            <label className={`flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm ${isLeadTrainer ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <span className="inline-flex items-center gap-2 font-semibold text-primary">
                <Upload size={16} />{file ? file.name : "Optional PDF/DOCX upload"}
              </span>
              <input type="file" accept=".pdf,.docx" disabled={!isLeadTrainer || currentReport?.status === "reviewed"} className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            {currentReport?.status === "reviewed" && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Admin has reviewed this report, so it is locked from further edits.</p>
            )}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button disabled={submitting || !isLeadTrainer || currentReport?.status === "reviewed"} type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
              <Send size={16} />{submitting ? "Submitting..." : currentReport ? "Update report" : "Submit report"}
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="font-display text-xl font-bold">Report history</h3>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading weekly reports...</p>
          ) : reports.length ? (
            <div className="mt-4 space-y-3">
              {reports.map((report) => (
                <article key={report.id} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{report.weekKey}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(report.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold capitalize text-primary">{report.status}</span>
                  </div>
                  {report.reportText && <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{report.reportText}</p>}
                  {report.signedFileUrl && (
                    <a href={report.signedFileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">
                      Open attachment
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              No classroom weekly reports have been submitted yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

const reportCategories = [
  { value: "classroom", label: "Classroom" },
  { value: "student", label: "Student" },
  { value: "equipment", label: "Equipment" },
  { value: "schedule", label: "Schedule" },
  { value: "platform", label: "Platform / Technical" },
  { value: "centre", label: "Centre" },
  { value: "administrative", label: "Administrative" },
  { value: "other", label: "Other" },
];

function formatFileSize(size: number | null) {
  if (!size) return "PDF";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function TrainerProfile({
  details,
  error,
  notify,
  onChanged,
}: {
  details: TrainerProfileDetails | null;
  error: string;
  notify: (message: string) => void;
  onChanged: () => Promise<void>;
}) {
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(() => details?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(() => details?.phoneNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setLocalError("");
    const result = await updateMyTrainerProfile({ fullName, phoneNumber });
    setSaving(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    await refreshProfile();
    await onChanged();
    notify("Profile updated.");
  }

  async function uploadCertificate(file: File) {
    const certificateError = validateTrainerCertificate(file);
    if (certificateError) {
      setLocalError(certificateError);
      return;
    }
    setUploading(true);
    setLocalError("");
    const result = await uploadMyTrainerCertificate(file, details?.certificatePath);
    setUploading(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    await onChanged();
    notify("Certificate uploaded.");
  }

  async function removeCertificate() {
    if (!details?.certificatePath) return;
    setUploading(true);
    setLocalError("");
    const result = await removeMyTrainerCertificate(details.certificatePath);
    setUploading(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    await onChanged();
    notify("Certificate removed.");
  }

  return (
    <>
      <PageHeading eyebrow="Trainer account" title="Profile" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <h3 className="font-display text-xl font-bold">My details</h3>
          <form onSubmit={save} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-foreground">
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary" />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Phone number
              <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+254712345678" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary" />
            </label>
            {(error || localError) && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{localError || error}</p>}
            <button disabled={saving || !details} type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
              <Check size={16} />{saving ? "Saving..." : "Save details"}
            </button>
          </form>
        </Card>
        <Card>
          <h3 className="font-display text-xl font-bold">Verification certificate</h3>
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            {details?.certificateFileName ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 size-5 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{details.certificateFileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(details.certificateFileSize)}
                      {details.certificateUploadedAt ? ` · Uploaded ${new Date(details.certificateUploadedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.signedCertificateUrl && (
                    <a href={details.signedCertificateUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-card px-3 py-2 text-xs font-bold text-primary shadow-sm hover:underline">
                      View PDF
                    </a>
                  )}
                  <button type="button" disabled={uploading} onClick={() => void removeCertificate()} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">
                    <Trash2 size={14} />Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Upload a PDF certificate so Admin can verify your trainer account.</p>
            )}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-primary"><Upload size={16} />{details?.certificatePath ? "Replace certificate" : "Upload certificate"}</span>
            <span className="text-xs text-muted-foreground">PDF · 5MB max</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadCertificate(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {uploading && <p className="mt-3 text-sm font-semibold text-primary">Updating certificate...</p>}
        </Card>
      </div>
    </>
  );
}

function ContactAdmin({
  classroomId,
  classroomName,
  classrooms,
  notify,
}: {
  classroomId: string;
  classroomName: string;
  classrooms: TrainerClassroom[];
  notify: (message: string) => void;
}) {
  const [reports, setReports] = useState<TrainerAdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    classroomId,
    category: "classroom",
    priority: "normal",
    subject: "",
    message: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const loadReports = useCallback(async () => {
    setLoading(true);
    const result = await getMyTrainerAdminReports();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReports(result.data ?? []);
    setError("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.subject.trim().length < 3) return setError("Add a short subject.");
    if (form.message.trim().length < 10) return setError("Add a little more detail for Admin.");
    setSubmitting(true);
    setError("");
    const result = await createTrainerAdminReport({
      classroomId: form.classroomId || null,
      category: form.category,
      priority: form.priority,
      subject: form.subject,
      message: form.message,
      attachment,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setForm((current) => ({ ...current, category: "classroom", priority: "normal", subject: "", message: "" }));
    setAttachment(null);
    setReports((current) => result.data ? [result.data, ...current] : current);
    notify("Report sent to Admin.");
  }

  return (
    <>
      <PageHeading eyebrow={`${classroomName} · support`} title="Contact Admin" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <h3 className="font-display text-xl font-bold">Report an issue</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Reports are saved in the admin inbox. Email notification can be configured later without risking the saved record.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <input
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
              maxLength={140}
              placeholder="Subject"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={form.category} onChange={(event) => update("category", event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
                {reportCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <select value={form.priority} onChange={(event) => update("priority", event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <select value={form.classroomId} onChange={(event) => update("classroomId", event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">No specific classroom</option>
              {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
            </select>
            <textarea
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
              maxLength={3000}
              placeholder="Describe what happened, what you need, or what Admin should check."
              className="min-h-36 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
            />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-primary"><Upload size={16} />{attachment ? attachment.name : "Optional attachment"}</span>
              <span className="text-xs text-muted-foreground">PDF, Word, or image · 5MB max</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
              />
            </label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button disabled={submitting} type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
              <Send size={16} />{submitting ? "Sending..." : "Send report"}
            </button>
          </form>
        </Card>
        <Card>
          <h3 className="font-display text-xl font-bold">My report history</h3>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading reports...</p>
          ) : reports.length ? (
            <div className="mt-4 space-y-3">
              {reports.map((report) => {
                const category = reportCategories.find((item) => item.value === report.category)?.label ?? report.category;
                return (
                  <article key={report.id} className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{report.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {category} · {report.priority} · {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold capitalize text-primary">{report.status}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{report.message}</p>
                    {report.signedAttachmentUrl && (
                      <a href={report.signedAttachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">
                        Open attachment
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              No reports sent yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

function WeeklyTopics({ notify }: { notify: (message: string) => void }) {
  const [topics, setTopics] = useState<WeeklyTopic[]>([]);
  const [submissions, setSubmissions] = useState<TrainerWeeklyTopicSubmission[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentTime] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submissionByTopic = useMemo(
    () => new Map(submissions.map((submission) => [submission.weeklyTopicId, submission])),
    [submissions],
  );
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0] ?? null;
  const selectedSubmission = selectedTopic ? submissionByTopic.get(selectedTopic.id) : null;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTrainerWeeklyTopics();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const nextTopics = result.data?.topics ?? [];
    setTopics(nextTopics);
    setSubmissions(result.data?.submissions ?? []);
    setSelectedTopicId((current) => current && nextTopics.some((topic) => topic.id === current) ? current : nextTopics[0]?.id ?? "");
    setError("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTopic) return setError("Choose a weekly topic.");
    if (!textResponse.trim() && !file) return setError("Write a response or upload a PDF/DOCX file.");
    setSubmitting(true);
    setError("");
    const result = await submitWeeklyTopicResponse({
      topicId: selectedTopic.id,
      textResponse,
      file,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTextResponse("");
    setFile(null);
    if (result.data) {
      setSubmissions((current) => [result.data!, ...current.filter((item) => item.weeklyTopicId !== result.data!.weeklyTopicId)]);
    }
    notify("Weekly topic response submitted.");
  }

  return (
    <>
      <PageHeading eyebrow="individual trainer task" title="Weekly Inputs" />
      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Loading Weekly Inputs...</p></Card>
      ) : topics.length ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <h3 className="font-display text-xl font-bold">Submit response</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Weekly Topic submissions belong to you as an individual trainer, even when multiple trainers share a classroom.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <select value={selectedTopic?.id ?? ""} onChange={(event) => setSelectedTopicId(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.weekKey} · {topic.title}
                  </option>
                ))}
              </select>
              {selectedTopic && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-950">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-display text-lg font-bold">{selectedTopic.title}</h4>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800">
                      Due {new Date(selectedTopic.dueAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">{selectedTopic.instructions}</p>
                </div>
              )}
              {selectedSubmission && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Current status: <b className="capitalize">{selectedSubmission.status}</b>. Submitting again updates your response while it is still submitted.
                </div>
              )}
              <textarea
                value={textResponse}
                onChange={(event) => setTextResponse(event.target.value)}
                maxLength={5000}
                placeholder="Write your weekly response here."
                className="min-h-40 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-primary">
                  <Upload size={16} />{file ? file.name : "Optional PDF/DOCX upload"}
                </span>
                <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button disabled={submitting} type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
                <Send size={16} />{submitting ? "Submitting..." : "Submit weekly topic"}
              </button>
            </form>
          </Card>
          <Card>
            <h3 className="font-display text-xl font-bold">My topic history</h3>
            <div className="mt-4 space-y-3">
              {topics.map((topic) => {
                const submission = submissionByTopic.get(topic.id);
                const overdue = !submission && new Date(topic.dueAt).getTime() < currentTime;
                return (
                  <article key={topic.id} className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{topic.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{topic.weekKey} · Due {new Date(topic.dueAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${submission ? "bg-emerald-100 text-emerald-700" : overdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {submission?.status ?? (overdue ? "overdue" : "missing")}
                      </span>
                    </div>
                    {submission?.textResponse && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{submission.textResponse}</p>}
                    {submission?.signedFileUrl && <a href={submission.signedFileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:underline">Open uploaded file</a>}
                  </article>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <h3 className="font-display text-xl font-bold">No weekly topic has been posted yet.</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Admin-published Weekly Inputs will appear here.
          </p>
        </Card>
      )}
    </>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function currentWeekNumber() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const elapsedDays = Math.floor((now.getTime() - firstDay.getTime()) / 86_400_000);
  return Math.min(52, Math.max(1, Math.ceil((elapsedDays + firstDay.getDay() + 1) / 7)));
}

function Avatar({ student }: { student: { initials: string; name: string } }) {
  return (
    <div
      aria-label={student.name}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
    >
      {student.initials}
    </div>
  );
}
