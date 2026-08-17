'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Monitor, FileText, BookOpen, ArrowRight, Check, Trophy, KeyRound, Lock } from 'lucide-react'
import { Navbar, Shell } from '@/components/site-shell'
import { StudentLearnShell } from '@/components/learn/student-learn-shell'
import { LoginPage } from '@/components/auth-pages'
import { tracks, type Track } from '@/lib/curriculum'
import { getStudentEnrollmentContext, joinClassroomByCode, type EnrollmentContext } from '@/lib/api/student/enrollment'
import { getStudentProgress } from '@/lib/api/student/progress'
import { getEffectiveStudentCurriculum, getStudentActivityRouteMap } from '@/lib/api/student/curriculum'
import { getMyAttendance, type StudentAttendanceRecord } from '@/lib/api/student/attendance'
import { getMyWeeklyComments, type StudentWeeklyComment } from '@/lib/api/student/comments'
import { getClassroomTypingLeaderboard, getMyTypingAttempts, summarizeTypingAttempts, type TypingAttempt, type TypingSummary } from '@/lib/api/student/typing'
import { useAuth } from '@/components/auth-provider'

const ICONS: Record<string, typeof Monitor> = { Monitor, FileText }

export default function LearnPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [progress, setProgress] = useState<Record<string, string[]>>({})
  const [effectiveTracks, setEffectiveTracks] = useState<Track[]>(tracks)
  const [enrollment, setEnrollment] = useState<EnrollmentContext | null>(null)
  const [attendance, setAttendance] = useState<StudentAttendanceRecord[]>([])
  const [comments, setComments] = useState<StudentWeeklyComment[]>([])
  const [typingSummary, setTypingSummary] = useState<TypingSummary>({ bestWpm: null, bestAccuracy: null, latestWpm: null, attempts: 0 })
  const [typingAttempts, setTypingAttempts] = useState<TypingAttempt[]>([])
  const [typingLeaderboard, setTypingLeaderboard] = useState<TypingAttempt[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function load() {
      if (authLoading) return
      try {
        if (!user) {
          setProgress({})
          setEffectiveTracks(tracks)
          setEnrollment(null)
          setAttendance([])
          setComments([])
          setTypingSummary({ bestWpm: null, bestAccuracy: null, latestWpm: null, attempts: 0 })
          setTypingAttempts([])
          setTypingLeaderboard([])
          return
        }
        
        const contextRes = await getStudentEnrollmentContext();
        if (contextRes.error || !contextRes.data) {
          setProgress({})
          setEffectiveTracks(tracks)
          setEnrollment(null)
          setAttendance([])
          setComments([])
          setTypingSummary({ bestWpm: null, bestAccuracy: null, latestWpm: null, attempts: 0 })
          setTypingAttempts([])
          setTypingLeaderboard([])
          return;
        }
        setEnrollment(contextRes.data)
        
        const [progressRes, activityMapRes, curriculumRes, attendanceRes, commentsRes, typingRes, leaderboardRes] = await Promise.all([
          getStudentProgress(contextRes.data.classroomId),
          getStudentActivityRouteMap(),
          getEffectiveStudentCurriculum(contextRes.data.classroomId),
          getMyAttendance(contextRes.data.classroomId),
          getMyWeeklyComments(contextRes.data.classroomId),
          getMyTypingAttempts(contextRes.data.classroomId),
          getClassroomTypingLeaderboard(contextRes.data.classroomId),
        ]);
        if (curriculumRes.data) setEffectiveTracks(curriculumRes.data.tracks)
        setAttendance(attendanceRes.data ?? [])
        setComments(commentsRes.data ?? [])
        setTypingAttempts(typingRes.data ?? [])
        setTypingSummary(summarizeTypingAttempts(typingRes.data ?? []))
        setTypingLeaderboard(leaderboardRes.data ?? [])
        const data = progressRes.data || [];
        const routeByActivityId = new Map(
          Object.entries(activityMapRes.data ?? {}).map(([route, id]) => [id, route])
        );
        
        const grouped: Record<string, string[]> = {}
        for (const item of data) {
          if (item.status === "completed") {
            const route = item.curriculum_activity_id ? routeByActivityId.get(item.curriculum_activity_id) : null;
            const customSlug = item.classroom_curriculum_item_id ? findCustomLessonRoute(curriculumRes.data?.tracks ?? [], item.classroom_curriculum_item_id) : null;
            const completedRoute = route ?? customSlug;
            if (!completedRoute) continue;
            const [trackSlug, lessonSlug] = completedRoute.split("/");
            
            if (!grouped[trackSlug]) grouped[trackSlug] = []
            grouped[trackSlug].push(lessonSlug)
          }
        }
        setProgress(grouped)
      } catch (err) {
        console.warn('Could not load progress:', err)
        setEffectiveTracks(tracks)
        setEnrollment(null)
        setAttendance([])
        setComments([])
        setTypingSummary({ bestWpm: null, bestAccuracy: null, latestWpm: null, attempts: 0 })
        setTypingAttempts([])
        setTypingLeaderboard([])
      }
    }
    load()
  }, [authLoading, user])

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setJoining(true)
    setJoinMessage('')
    const result = await joinClassroomByCode(joinCode)
    if (result.error) {
      setJoinMessage(result.error)
      setJoining(false)
      return
    }
    setJoinCode('')
    setJoinMessage('Classroom joined. Opening your student dashboard...')
    router.replace('/student')
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm font-semibold text-muted-foreground">Checking your session...</main>
  }

  if (!user) {
    return <><Navbar /><LoginPage /></>
  }

  const Chrome = profile?.role === "student" ? StudentLearnShell : Shell

  return (
    <Chrome>
      <div className="mx-auto max-w-370 px-5 py-14 sm:px-10 sm:py-20">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">PawaTech Curriculum</p>
          <h1 className="font-display text-3xl font-bold text-code-bg sm:text-4xl">Learning Tracks</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Interactive lessons designed for kids and teens. Complete each track to master essential digital skills.
          </p>
        </div>

        {enrollment ? (
          <StudentSnapshot
            enrollment={enrollment}
            attendance={attendance}
            comments={comments}
            typingSummary={typingSummary}
            typingAttempts={typingAttempts}
            typingLeaderboard={typingLeaderboard}
          />
        ) : user ? (
          <ExploreNotice
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            joining={joining}
            message={joinMessage}
            onSubmit={handleJoin}
          />
        ) : null}

        {enrollment ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {effectiveTracks.map((track, i) => {
            const Icon = ICONS[track.icon] || BookOpen
            const completed = progress[track.slug] || []
            const totalLessons = track.lessons.length + (track.challenge ? 1 : 0)
            const pct = Math.round((completed.length / totalLessons) * 100)
            const firstUnlockedLesson = track.lessons.find((lesson) => lesson.isUnlocked !== false)
            const firstAvailableHref = firstUnlockedLesson
              ? `/learn/${track.slug}/${firstUnlockedLesson.slug}`
              : track.challenge?.isUnlocked !== false && track.challenge
                ? `/learn/${track.slug}/challenge`
                : null

            return (
              <motion.article
                key={track.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-lg"
              >
                {/* Color header strip */}
                <div className="h-2 bg-primary" />

                <div className="p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Module {track.weekNumber}
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-xl font-bold text-code-bg">{track.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{track.description}</p>
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div className="mt-6 space-y-2">
                    {track.lessons.map((lesson, li) => {
                      const isDone = completed.includes(lesson.slug)
                      const isLocked = lesson.isUnlocked === false
                      return isLocked ? (
                        <div
                          key={lesson.slug}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                            <Lock size={12} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-700">{lesson.title}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Locked</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Your trainer will unlock this lesson when your class is ready.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <Link
                          key={lesson.slug}
                          href={`/learn/${track.slug}/${lesson.slug}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-muted/50"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isDone ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                            }`}
                          >
                            {isDone ? <Check size={12} /> : li + 1}
                          </span>
                          <span className={isDone ? 'text-muted-foreground line-through' : 'text-foreground'}>{lesson.title}</span>
                        </Link>
                      )
                    })}
                    {track.challenge && (
                      track.challenge.isUnlocked === false ? (
                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                            <Lock size={12} />
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-700">{track.challenge.title}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Locked</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">Your trainer will unlock this challenge when your class is ready.</p>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/learn/${track.slug}/challenge`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-accent/10"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent text-xs font-bold text-accent-foreground">
                            <Trophy size={12} />
                          </span>
                          <span className="font-semibold text-accent-foreground">{track.challenge.title}</span>
                        </Link>
                      )
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{completed.length}/{totalLessons} complete</span>
                      <span className="font-semibold text-primary">{pct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Start/Continue CTA */}
                  {firstAvailableHref ? (
                    <Link
                      href={firstAvailableHref}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
                    >
                      {completed.length > 0 ? 'Continue Learning' : 'Start Track'} <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-600">
                      <Lock size={16} /> Waiting for trainer unlock
                    </div>
                  )}
                </div>
              </motion.article>
            )
            })}
          </div>
        ) : (
          <ClassroomRequiredNotice
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            joining={joining}
            message={joinMessage}
            onSubmit={handleJoin}
          />
        )}
      </div>
    </Chrome>
  )
}

function findCustomLessonRoute(sourceTracks: Track[], itemId: string) {
  for (const track of sourceTracks) {
    const lesson = track.lessons.find((item) => item.slug === `custom-${itemId}`)
    if (lesson) return `${track.slug}/${lesson.slug}`
  }
  return null
}

function ExploreNotice({
  joinCode,
  setJoinCode,
  joining,
  message,
  onSubmit,
}: {
  joinCode: string
  setJoinCode: (value: string) => void
  joining: boolean
  message: string
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <section className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-950 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Exploring curriculum</p>
          <h2 className="mt-2 font-display text-xl font-bold">Join a classroom to save progress</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            You can browse lessons now. Completion and trainer assignments start saving after you join an active classroom.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80">
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Classroom code"
              className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-wide outline-none focus:border-primary"
            />
            <button
              disabled={joining}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <KeyRound size={16} />
              Join
            </button>
          </div>
          {message && <p className="text-xs font-semibold text-blue-900">{message}</p>}
        </form>
      </div>
    </section>
  )
}

function ClassroomRequiredNotice({
  joinCode,
  setJoinCode,
  joining,
  message,
  onSubmit,
}: {
  joinCode: string
  setJoinCode: (value: string) => void
  joining: boolean
  message: string
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <section className="mx-auto mt-12 max-w-2xl rounded-2xl border border-blue-100 bg-blue-50 p-7 text-center text-blue-950 shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
        <KeyRound size={24} />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold">Join your classroom first</h2>
      <p className="mt-3 text-sm leading-6 text-blue-900">
        Your trainer controls the classroom curriculum. Enter your classroom code to open the correct lessons and save your progress.
      </p>
      <form onSubmit={onSubmit} className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          placeholder="Classroom code"
          className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-semibold uppercase tracking-wide outline-none focus:border-primary"
        />
        <button disabled={joining} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          <KeyRound size={16} />
          {joining ? 'Joining...' : 'Join'}
        </button>
      </form>
      {message && <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-primary">{message}</p>}
    </section>
  )
}

function StudentSnapshot({
  enrollment,
  attendance,
  comments,
  typingSummary,
  typingAttempts,
  typingLeaderboard,
}: {
  enrollment: EnrollmentContext
  attendance: StudentAttendanceRecord[]
  comments: StudentWeeklyComment[]
  typingSummary: TypingSummary
  typingAttempts: TypingAttempt[]
  typingLeaderboard: TypingAttempt[]
}) {
  const present = attendance.filter((record) => record.status === 'present').length
  const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : null
  const latestComment = comments[0]

  return (
    <section className="mt-10 grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">My classroom</p>
        <h2 className="mt-2 font-display text-xl font-bold text-code-bg">{enrollment.classroomName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {enrollment.centreName} · {enrollment.cohortName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Trainer: {enrollment.trainerName}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Attendance</p>
        <h2 className="mt-2 font-display text-xl font-bold text-code-bg">
          {attendancePct === null ? 'No records yet' : `${attendancePct}% present`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {attendance.length
            ? `${present} present out of ${attendance.length} recorded class sessions.`
            : 'Your trainer has not recorded attendance for this classroom yet.'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Trainer comment</p>
        <h2 className="mt-2 font-display text-xl font-bold text-code-bg">
          {latestComment ? new Date(latestComment.createdAt).toLocaleDateString() : 'No comments yet'}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {latestComment
            ? latestComment.comment
            : 'Weekly trainer comments will appear here once your trainer writes them.'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Typing performance</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <MiniStat label="Best WPM" value={typingSummary.bestWpm === null ? '-' : String(typingSummary.bestWpm)} />
          <MiniStat label="Best accuracy" value={typingSummary.bestAccuracy === null ? '-' : `${typingSummary.bestAccuracy}%`} />
          <MiniStat label="Latest WPM" value={typingSummary.latestWpm === null ? '-' : String(typingSummary.latestWpm)} />
          <MiniStat label="Attempts" value={String(typingSummary.attempts)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold">Recent attempts</h3>
            <div className="mt-2 space-y-2">
              {typingAttempts.length ? typingAttempts.slice(0, 4).map((attempt) => (
                <p key={attempt.id} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {new Date(attempt.attemptedAt).toLocaleDateString()} · <b className="text-foreground">{attempt.wpm} WPM</b> · {attempt.accuracy}%
                </p>
              )) : <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Complete a typing test to start your history.</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold">Classroom leaderboard</h3>
            <div className="mt-2 space-y-2">
              {typingLeaderboard.length ? typingLeaderboard.slice(0, 5).map((attempt, index) => (
                <p key={attempt.id} className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span>{index + 1}. {attempt.studentName || 'Student'}</span>
                  <b>{attempt.wpm} WPM · {attempt.accuracy}%</b>
                </p>
              )) : <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">No qualifying classroom attempts yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
