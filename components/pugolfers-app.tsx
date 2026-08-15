"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Mail,
  MapPin,
  Play,
  Search,
  Sparkles,
  Trophy,
  Users,
  Phone,
  Eye,
  GitFork,
  Target,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "./site-shell";
import { tracks } from "@/lib/curriculum";
import { getApprovedProjects } from "@/lib/api/student/projects";
import { getStudentEnrollmentContext } from "@/lib/api/student/enrollment";
import { getStudentChallenges, type StudentChallenge } from "@/lib/api/student/challenges";
import { useAuth } from "@/components/auth-provider";

const projects = [
  {
    title: "My First Calculator",
    author: "Amani K.",
    language: "Python",
    color: "bg-primary/10",
    likes: 24,
    remixes: 8,
    code: "def add(a, b):\n  return a + b\n\nprint(add(4, 7))",
  },
  {
    title: "Turtle Garden",
    author: "Brian O.",
    language: "Python Turtle",
    color: "bg-accent/20",
    likes: 41,
    remixes: 12,
    code: "for petal in range(8):\n  turtle.circle(30)\n  turtle.left(45)",
  },
  {
    title: "Rainbow Button",
    author: "Zuri M.",
    language: "HTML / CSS / JS",
    color: "bg-primary/10",
    likes: 18,
    remixes: 5,
    code: '<button class="rainbow">\n  Click me!\n</button>',
  },
];

function Button({
  children,
  primary = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      className={`rounded-xl px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${
        primary
          ? "bg-linear-to-br from-secondary to-primary text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-110"
          : "border border-border bg-card text-foreground hover:border-primary"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl font-bold text-code-bg sm:text-4xl">
        {title}
      </h2>
      {text && <p className="mt-4 leading-7 text-muted-foreground">{text}</p>}
    </div>
  );
}

type ShowcaseProject = {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  video_url?: string;
};

const trackIcons: Record<string, typeof BookOpen> = {
  Monitor: Code2,
  FileText: BookOpen,
  Sparkles,
};
const studentWelcomeStorageKey = "epawatech:student-welcome";

function studentDisplayName(fullName: string) {
  const names = fullName.trim().split(/\s+/).filter(Boolean);
  return names.slice(0, 2).join(" ") || "Coder";
}

function StudentWelcomeBanner() {
  const { loading, profile } = useAuth();
  const freshWelcomeRef = useRef(false);
  const [freshWelcome, setFreshWelcome] = useState(false);
  const [typedText, setTypedText] = useState("");
  const message = "How are you doing?";
  const displayName = !loading && profile?.role === "student" ? studentDisplayName(profile.full_name) : "";

  useEffect(() => {
    if (loading || !profile || profile.role !== "student") {
      const timer = window.setTimeout(() => {
        setFreshWelcome(false);
        setTypedText("");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const queuedUserId = window.sessionStorage.getItem(studentWelcomeStorageKey);
    const shouldShowFreshWelcome = queuedUserId === profile.id;
    freshWelcomeRef.current = shouldShowFreshWelcome;
    if (shouldShowFreshWelcome) {
      window.sessionStorage.removeItem(studentWelcomeStorageKey);
    }

    const timer = window.setTimeout(() => {
      setFreshWelcome(freshWelcomeRef.current);
      setTypedText("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loading, profile]);

  useEffect(() => {
    if (!freshWelcome) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 115);

    return () => window.clearInterval(timer);
  }, [freshWelcome]);

  if (!displayName) return null;

  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <motion.section
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-15.5 z-40 mx-auto max-w-370 px-5 pt-4 sm:px-10"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-5 shadow-lg shadow-primary/10 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-2 bg-linear-to-r from-accent via-secondary to-primary" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles size={28} />
            </div>
            <div>
              <h2 className="mt-2 font-display text-2xl font-bold text-code-bg sm:text-3xl">
                {freshWelcome ? `Welcome ${firstName},` : displayName}
              </h2>
              <p className="mt-2 min-h-8 font-display text-xl font-bold text-primary sm:text-2xl">
                {freshWelcome ? typedText : "Happy Coding!"}
                {freshWelcome && (
                  <span className="ml-1 inline-block h-6 w-0.5 translate-y-1 bg-primary" />
                )}
              </p>
            </div>
          </div>
          <Link href="/learn">
            <Button primary className="rounded-full px-6">
              Keep Learning <ArrowRight size={16} className="ml-2 inline" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function Home() {
  const [showcaseProjects, setShowcaseProjects] = useState<ShowcaseProject[]>(
    [],
  );

  useEffect(() => {
    getApprovedProjects(3)
      .then((result) => {
        if (result.data) {
          setShowcaseProjects(result.data.map((project) => ({
            ...project,
            image_url: project.image_url ?? undefined,
            video_url: project.video_url ?? undefined,
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  const modules = [
    {
      icon: BookOpen,
      title: "Interactive Learning Modules",
      text: "Step-by-step curriculum to take you from beginner to advanced.",
      href: "/learn",
    },
    {
      icon: LayoutDashboard,
      title: "Hands-on Projects",
      text: "Build and showcase real-world applications in your personal portfolio.",
      href: "/projects",
    },
    {
      icon: Trophy,
      title: "Coding Challenges",
      text: "Sharpen your skills with bite-sized coding challenges and practical problem-solving exercises.",
      href: "/challenges",
    },
    {
      icon: Target,
      title: "Competency-Based Curriculum (CBC)",
      text: "Future CBC-aligned learning focused on practical skills, critical thinking, and creativity.",
      href: "/cbc",
    },
  ];
  const journey = [
    {
      icon: GraduationCap,
      title: "Learn",
      text: "Explore structured technology lessons and learning tracks.",
    },
    {
      icon: Code2,
      title: "Practice",
      text: "Test your knowledge through interactive activities and coding challenges.",
    },
    {
      icon: LayoutDashboard,
      title: "Build",
      text: "Apply your skills by creating practical projects.",
    },
    {
      icon: Sparkles,
      title: "Showcase",
      text: "Present completed work and build a technology portfolio.",
    },
  ];

  return (
    <Shell>
      <StudentWelcomeBanner />
      <div className="overflow-hidden">
        <section className="relative isolate">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_15%,hsl(214_89%_49%/0.14),transparent_25rem),radial-gradient(circle_at_10%_85%,hsl(227_96%_29%/0.1),transparent_28rem)]" />
          <div className="mx-auto grid max-w-370 items-center gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-primary shadow-sm">
                <Sparkles size={14} /> Learn. Practice. Build. Showcase.
              </p>
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] text-code-bg sm:text-6xl">
                Empowering the Next Generation of{" "}
                <span className="text-primary">Tech Innovators</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                ePawatech is your comprehensive learning platform to master
                coding, build real-world projects, and tackle interactive
                challenges.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/learn">
                  <Button primary className="rounded-full px-6">
                    Start Learning{" "}
                    <ArrowRight size={16} className="ml-2 inline" />
                  </Button>
                </Link>
                <Link href="/challenges">
                  <Button className="rounded-full px-6">
                    Explore Challenges
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
              <div className="rounded-[2rem] border border-primary/15 bg-code-bg p-5 shadow-2xl sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex gap-2">
                    <i className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <i className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-mono text-xs text-white/45">
                    ePawatech / journey
                  </span>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                  {journey.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className={`rounded-2xl border p-4 ${index === 0 ? "border-accent/40 bg-accent/15 text-white" : "border-white/10 bg-white/5 text-white/75"}`}
                      >
                        <Icon size={22} className="text-accent" />
                        <p className="mt-5 font-display text-lg font-bold">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/55">
                          {index === 0
                            ? "Start your first learning track."
                            : item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                    <ArrowRight size={18} />
                  </div>{" "}
                  Turn curiosity into practical skills.
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-370 px-5 py-16 sm:px-10 sm:py-24">
          <SectionTitle
            eyebrow="The platform"
            title="Everything you need to start creating"
            text="A connected learning experience designed to move from understanding ideas to making work you can be proud of."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.article
                  key={module.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group rounded-3xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl"
                >
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={25} />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-code-bg">
                    {module.title}
                  </h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {module.text}
                  </p>
                  <Link
                    href={module.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
                  >
                    Explore{" "}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 px-5 py-16 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-370">
            <SectionTitle
              eyebrow="Your path"
              title="How ePawatech Works"
              text="A clear journey that helps every learner put knowledge into action."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {journey.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative rounded-3xl border border-border bg-card p-6 shadow-sm"
                  >
                    <span className="text-xs font-bold tracking-widest text-primary">
                      0{index + 1}
                    </span>
                    <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold text-code-bg">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.text}
                    </p>
                    {index < journey.length - 1 && (
                      <ArrowRight
                        aria-hidden="true"
                        className="absolute -right-3 top-1/2 z-10 hidden rounded-full bg-primary p-1 text-primary-foreground lg:block"
                        size={24}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-370 px-5 py-16 sm:px-10 sm:py-24">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">
                Explore and grow
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-code-bg sm:text-4xl">
                Learning Tracks
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Choose from the learning areas already available in ePawatech
                and take the next step at your own pace.
              </p>
            </div>
            <Link
              href="/learn"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary"
            >
              View all tracks <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tracks.map((track) => {
              const Icon = trackIcons[track.icon] || BookOpen;
              const firstLesson = track.lessons[0];
              return (
                <article
                  key={track.slug}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={21} />
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                      Module {track.weekNumber}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-code-bg">
                    {track.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {track.description}
                  </p>
                  <Link
                    href={`/learn/${track.slug}/${firstLesson.slug}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
                  >
                    Explore Track{" "}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-code-bg px-5 py-16 text-primary-foreground sm:px-10 sm:py-24">
          <div className="mx-auto max-w-370">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">
                Project showcase
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Build Something Real
              </h2>
              <p className="mt-4 text-lg leading-8 text-primary-foreground/70">
                Learning becomes more powerful when you turn it into something
                you can show.
              </p>
            </div>
            {showcaseProjects.length > 0 ? (
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {showcaseProjects.map((project) => (
                  <article
                    key={project.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  >
                    <div className="aspect-video bg-white/10">
                      {project.image_url && (
                        <img
                          src={project.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg font-bold">
                        {project.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-primary-foreground/65">
                        {project.description}
                      </p>
                      <Link
                        href="/projects"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent"
                      >
                        View Project <ArrowRight size={15} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-start gap-5 rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold">
                    The showcase is waiting for its first project.
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/65">
                    Create a project, submit it for review, and approved work
                    will appear here.
                  </p>
                </div>
                <Link href="/projects">
                  <Button className="border-white/20 bg-white/10 text-white hover:border-accent">
                    Visit Projects
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

      </div>
    </Shell>
  );
}

function Challenges() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Newest First");
  const [page, setPage] = useState(1);
  const [assignedChallenges, setAssignedChallenges] = useState<StudentChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChallenges() {
      if (!user) {
        setAssignedChallenges([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      const contextRes = await getStudentEnrollmentContext();
      if (contextRes.error || !contextRes.data) {
        setAssignedChallenges([]);
        setError(contextRes.error || "No active classroom enrollment found.");
        setLoading(false);
        return;
      }

      const challengeRes = await getStudentChallenges(contextRes.data.classroomId);
      if (challengeRes.error || !challengeRes.data) {
        setAssignedChallenges([]);
        setError(challengeRes.error || "Failed to load assigned challenges.");
        setLoading(false);
        return;
      }

      setAssignedChallenges(challengeRes.data);
      setLoading(false);
    }

    void loadChallenges();
  }, [user]);

  const filtered = useMemo(
    () =>
      assignedChallenges
        .filter(
          (c) =>
            (!query ||
              `${c.title} ${c.moduleTitle} ${c.activityType}`
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .sort((a, b) =>
          sort === "Due date"
            ? (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
            : new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
        ),
    [assignedChallenges, query, sort],
  );

  return (
    <Shell>
      <div className="mx-auto max-w-295 px-5 py-14 sm:px-10 sm:py-20">
        <SectionTitle title="Coding Challenges" />
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4">
            <Search size={18} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search challenges..."
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            <option>Newest First</option>
            <option>Due date</option>
          </select>
        </div>

        {!user && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <h3 className="font-display text-xl font-bold text-code-bg">Sign in to see your assigned challenges</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Challenges are assigned by your trainer to your classroom. We no longer show prototype challenge data here.
            </p>
            <Link href="/login" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
              Sign in
            </Link>
          </div>
        )}

        {user && loading && (
          <p className="py-16 text-center text-muted-foreground">Loading assigned challenges…</p>
        )}

        {user && error && !loading && (
          <p className="py-16 text-center text-muted-foreground">{error}</p>
        )}

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {user && !loading && !error && filtered.slice((page - 1) * 6, page * 6).map((c, i) => (
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              key={c.id}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {c.activityType.replaceAll("-", " ")}
                </span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold">
                  Assigned
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-code-bg">
                {c.title}
              </h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {c.moduleTitle}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">
                  Due: {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No due date"}
                </span>
              </div>
              <Link href={`/learn/${c.moduleSlug}/${c.lessonSlug}`}>
                <Button primary className="mt-5 w-full py-2">
                  Start Challenge{" "}
                  <ArrowRight size={15} className="ml-1 inline" />
                </Button>
              </Link>
            </motion.article>
          ))}
        </div>
        {user && !loading && !error && filtered.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            No assigned challenges found.
          </p>
        )}
        {user && !loading && !error && filtered.length > 6 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            className="rounded-lg border border-border p-2"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={filtered.length <= page * 6}
            className="rounded-lg border border-border p-2 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        )}
      </div>
    </Shell>
  );
}

function Projects() {
  const [filter, setFilter] = useState("All");
  const [liked, setLiked] = useState<string[]>([]);
  const shown =
    filter === "All" ? projects : projects.filter((p) => p.language === filter);

  return (
    <Shell>
      <div className="mx-auto max-w-295 px-5 py-14 sm:px-10 sm:py-20">
        <SectionTitle
          eyebrow="Playground showcase"
          title="Projects built by ePawatech"
          text="Browse published playground work by language. Like, favorite, or remix from each card."
        />
        <div className="mt-10 flex justify-center gap-2">
          {["All", "Python", "Python Turtle", "HTML / CSS / JS"].map((x) => (
            <button
              key={x}
              onClick={() => setFilter(x)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                filter === x
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <article
              key={p.title}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className={`h-48 ${p.color} p-5`}>
                <pre className="h-full overflow-hidden rounded-xl bg-code-bg p-4 font-mono text-xs leading-5 text-accent">
                  <code>{p.code}</code>
                </pre>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold text-code-bg">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      by {p.author} · {p.language}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setLiked((v) =>
                        v.includes(p.title)
                          ? v.filter((x) => x !== p.title)
                          : [...v, p.title],
                      )
                    }
                    aria-label={`Like ${p.title}`}
                    className="rounded-lg p-2 text-primary hover:bg-primary/10"
                  >
                    <Heart
                      size={19}
                      fill={liked.includes(p.title) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <Heart size={14} className="mr-1 inline" />
                    {p.likes + (liked.includes(p.title) ? 1 : 0)}
                  </span>
                  <span>
                    <GitFork size={14} className="mr-1 inline" />
                    {p.remixes} remixes
                  </span>
                  <button className="ml-auto hover:text-primary">
                    <Eye size={14} className="mr-1 inline" />
                    Preview
                  </button>
                </div>
                <Button primary className="mt-5 w-full py-2">
                  <GitFork size={15} className="mr-2 inline" />
                  Remix
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <Shell>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-295 px-5 py-14 sm:px-10 sm:py-20">
          <div className="rounded-2xl border-t-4 border-primary bg-card px-5 py-8 text-center shadow-sm sm:px-12">
            <h1 className="font-display text-4xl font-bold leading-tight text-code-bg sm:text-5xl">
              Got Questions About
              <br />
              ePawatech?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
              Our friendly team is here to help young coders and their families!
              Whether you need technical help, have questions about your
              account, or just want to say hello, we&apos;d love to hear from
              you.
            </p>
          </div>
          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr]">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-code-bg">
                  Send Us a Message
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We typically respond within 24 hours!
                </p>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your name *
                <input
                  required
                  name="name"
                  className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email address *
                <input
                  required
                  type="email"
                  name="email"
                  className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your message *
                <textarea
                  required
                  name="message"
                  rows={5}
                  className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <Button primary type="submit" className="w-full">
                {sent ? "Message sent — thank you!" : "Send Message"}
              </Button>
            </form>
            <div className="rounded-2xl border border-primary/25 bg-card p-7">
              <h2 className="font-display text-2xl font-bold text-code-bg">
                Contact Information
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We&apos;re here to help and answer any questions you might have.
              </p>
              <div className="mt-7 space-y-4">
                {[
                  [Phone, "Phone & WhatsApp", "+254 748 881 679"],
                  [Mail, "Email Us", "info@codewithkids.africa"],
                  [
                    MapPin,
                    "Visit Us",
                    "Ole Dume Road, Kilimani, Nairobi",
                  ],
                ].map(([Icon, title, detail]) => (
                  <div
                    key={title as string}
                    className="rounded-xl border border-border p-5"
                  >
                    <div className="mb-4 inline-flex rounded-lg bg-primary p-3 text-primary-foreground">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-display font-bold text-code-bg">
                      {title as string}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {detail as string}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CBC() {
  const features = [
    {
      title: "Learner-Centered Approach",
      text: "Learning is built around active participation, exploration, and real understanding.",
    },
    {
      title: "Skills and Competencies",
      text: "CBC emphasizes critical thinking, problem-solving, communication, digital literacy, and socio-emotional skills.",
    },
    {
      title: "Continuous Assessment",
      text: "Progress is measured through practical tasks, projects, and demonstrated competencies.",
    },
    {
      title: "Life Skills Integration",
      text: "Subjects connect to real-life situations, preparing learners for work, community involvement, and lifelong learning.",
    },
  ];

  return (
    <Shell>
      <div className="overflow-hidden">
        <section className="border-b border-border bg-muted/40 px-5 py-16 sm:px-10 sm:py-24">
          <div className="mx-auto grid max-w-370 items-center gap-10 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm">
                <Target size={14} /> Coming soon
              </p>
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-code-bg sm:text-6xl">
                Competency-Based Curriculum (CBC)
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                This CBC learning area is being worked on and will be available
                soon. It will help learners grow beyond knowledge alone by
                building practical skills, critical thinking, and creativity.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/learn">
                  <Button primary className="rounded-full px-6">
                    Explore Current Lessons{" "}
                    <ArrowRight size={16} className="ml-2 inline" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button className="rounded-full px-6">
                    Ask About CBC
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-primary/15 bg-card p-7 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <GraduationCap size={28} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-code-bg">
                What CBC Focuses On
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                CBC focuses on what learners can do, not only what they know.
                The goal is to connect classroom learning with practical,
                creative, and useful outcomes.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-370 px-5 py-16 sm:px-10 sm:py-24">
          <SectionTitle
            eyebrow="Key features"
            title="A practical path for future-ready learners"
            text="The CBC section will be designed around real-world tasks, reflection, and evidence of skill."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <span className="text-xs font-bold tracking-widest text-primary">
                  0{index + 1}
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-code-bg">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

export default function PyGolfersApp({ page = "home" }: { page?: string }) {
  const router = useRouter();
  const { loading, profile } = useAuth();

  useEffect(() => {
    if (page === "home" && !loading && profile?.role === "student") {
      router.replace("/student");
    }
  }, [loading, page, profile?.role, router]);

  if (page === "home" && !loading && profile?.role === "student") {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">Opening your student dashboard...</main>;
  }

  return page === "challenges" ? (
    <Challenges />
  ) : page === "projects" ? (
    <Projects />
  ) : page === "contact" ? (
    <Contact />
  ) : page === "cbc" ? (
    <CBC />
  ) : (
    <Home />
  );
}
