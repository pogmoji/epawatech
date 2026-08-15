'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Timer, Trophy, ArrowRight, ArrowLeft } from 'lucide-react'
import { Shell } from '@/components/site-shell'
import LearnLayout from '@/components/learn/learn-layout'
import Quiz from '@/components/learn/quiz'
import DragDrop, { DragClassify } from '@/components/learn/drag-drop'
import { KeyboardLesson, TypingTest } from '@/components/learn/typing-test'
import { RichTextEditor, SlideEditor } from '@/components/learn/editors'
import { PythonRunner } from '@/components/learn/python-runner'
import { HtmlPreview } from '@/components/learn/html-preview'
import { ScenarioQuestion } from '@/components/learn/scenario-question'
import { ExternalLink } from '@/components/learn/external-link'
import { AiChat } from '@/components/learn/ai-chat'
import { WokwiEmbed, YouTubeEmbed } from '@/components/learn/external-embeds'
import { getTrack } from '@/lib/curriculum'
import type { LessonActivity, Track } from '@/lib/curriculum'
import { getStudentEnrollmentContext } from '@/lib/api/student/enrollment'
import { getStudentProgress, saveActivityProgress } from '@/lib/api/student/progress'
import type { ProgressSource } from '@/lib/api/student/progress'
import { saveTypingAttempt } from '@/lib/api/student/typing'
import { getEffectiveStudentTracks, getStudentActivityRouteMap, type ActivityRouteMap } from '@/lib/api/student/curriculum'
import { GamificationService } from '@/lib/gamification'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

type Props = {
  trackSlug: string
  lessonSlug: string
}

export default function TrackPage({ trackSlug, lessonSlug }: Props) {
  const { user } = useAuth()
  const fallbackTrack = getTrack(trackSlug)
  const [track, setTrack] = useState<Track | undefined>(fallbackTrack)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [lessonDone, setLessonDone] = useState(false)
  const [progressNotice, setProgressNotice] = useState("")

  const [classroomId, setClassroomId] = useState<string | null>(null)
  const [activityRouteMap, setActivityRouteMap] = useState<ActivityRouteMap>({})

  // Load progress from API
  useEffect(() => {
    async function loadProgress() {
      try {
        if (!user) {
          setCompletedLessons([])
          setTrack(fallbackTrack)
          setClassroomId(null)
          return
        }
        
        const contextRes = await getStudentEnrollmentContext();
        if (contextRes.error || !contextRes.data) {
          setCompletedLessons([])
          setTrack(fallbackTrack)
          setClassroomId(null)
          return;
        }
        
        setClassroomId(contextRes.data.classroomId);
        
        const [progressRes, activityMapRes, curriculumRes] = await Promise.all([
          getStudentProgress(contextRes.data.classroomId),
          getStudentActivityRouteMap(),
          getEffectiveStudentTracks(contextRes.data.classroomId),
        ]);
        setTrack(curriculumRes.data?.find((item) => item.slug === trackSlug) ?? fallbackTrack);
        const data = progressRes.data || [];
        const routeByActivityId = new Map(
          Object.entries(activityMapRes.data ?? {}).map(([route, id]) => [id, route])
        );
        setActivityRouteMap(activityMapRes.data ?? {});
        
        const done = data
          .flatMap((p) => {
            if (p.status !== "completed") return [];
            const route = p.curriculum_activity_id ? routeByActivityId.get(p.curriculum_activity_id) : null;
            const customRoute = p.classroom_curriculum_item_id ? findCustomLessonRoute(curriculumRes.data ?? [], p.classroom_curriculum_item_id) : null;
            const completedRoute = route ?? customRoute;
            if (!completedRoute?.startsWith(`${trackSlug}/`)) return [];
            return [completedRoute.split("/").slice(1).join("/")];
          })
        
        setCompletedLessons(done)
        setLessonDone(done.includes(lessonSlug))
      } catch (err) {
        console.warn('Could not load progress:', err)
        setTrack(fallbackTrack)
      }
    }
    loadProgress()
  }, [trackSlug, lessonSlug, user, fallbackTrack])

  const handleLessonComplete = useCallback(
    async (score?: number) => {
      if (lessonDone) return
      if (!user || !classroomId) {
        setProgressNotice("You can keep exploring, but completion is not saved until you join a classroom.")
        return
      }

      const activityId = activityRouteMap[`${trackSlug}/${lessonSlug}`];
      const customItemId = lessonSlug.startsWith("custom-") ? lessonSlug.slice("custom-".length) : null;
      const progressSource = activityId
        ? { type: "master" as const, activityId }
        : customItemId
          ? { type: "classroom_item" as const, itemId: customItemId }
          : null;
      if (!progressSource) {
        setProgressNotice("This activity is available to view, but it does not have a saveable curriculum reference yet.")
        return;
      }
      const saveResult = await saveActivityProgress(classroomId, progressSource, "completed", { score });
      if (saveResult.error) {
        setProgressNotice(saveResult.error)
        return;
      }

      setProgressNotice("")
      setLessonDone(true)
      setCompletedLessons((prev) => (prev.includes(lessonSlug) ? prev : [...prev, lessonSlug]))

      if (lessonSlug === 'challenge') {
        GamificationService.onChallengeCompleted(user.id, `${trackSlug}-challenge`)
      } else {
        GamificationService.onLessonCompleted(user.id, `${trackSlug}/${lessonSlug}`)
      }
    },
    [trackSlug, lessonSlug, lessonDone, user, classroomId, activityRouteMap]
  )

  const progressSourceForCurrentLesson = useCallback((): ProgressSource | null => {
    const activityId = activityRouteMap[`${trackSlug}/${lessonSlug}`]
    const customItemId = lessonSlug.startsWith("custom-") ? lessonSlug.slice("custom-".length) : null
    if (activityId) return { type: "master", activityId }
    if (customItemId) return { type: "classroom_item", itemId: customItemId }
    return null
  }, [activityRouteMap, lessonSlug, trackSlug])

  const handleTypingAttempt = useCallback(
    async (wpm: number, accuracy: number, durationSeconds: number) => {
      if (!user || !classroomId) {
        setProgressNotice("Join a classroom to save typing attempts.")
        return
      }

      const source = progressSourceForCurrentLesson()
      if (!source) {
        setProgressNotice("Typing attempt could not be linked to a curriculum item.")
        return
      }

      const attemptResult = await saveTypingAttempt({ classroomId, source, wpm, accuracy, durationSeconds })
      if (attemptResult.error) {
        setProgressNotice(attemptResult.error)
        return
      }

      await handleLessonComplete(accuracy)
    },
    [classroomId, handleLessonComplete, progressSourceForCurrentLesson, user]
  )

  if (!track) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-code-bg">Track Not Found</h2>
            <p className="mt-2 text-muted-foreground">The learning track &quot;{trackSlug}&quot; doesn&apos;t exist yet.</p>
            <Link href="/learn" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft size={16} /> Back to tracks
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  // Determine what to render
  const isChallenge = lessonSlug === 'challenge'
  const lesson = isChallenge ? null : track.lessons.find((item) => item.slug === lessonSlug)
  const challenge = isChallenge ? track.challenge : null
  const activity = isChallenge ? challenge?.activity : lesson?.activity

  if (!activity) {
    return (
      <Shell>
        <LearnLayout track={track} completedLessons={completedLessons}>
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-code-bg">Lesson Not Found</h2>
              <p className="mt-2 text-muted-foreground">Could not find &quot;{lessonSlug}&quot; in {track.title}.</p>
            </div>
          </div>
        </LearnLayout>
      </Shell>
    )
  }

  // Find next lesson
  const currentLessonIndex = track.lessons.findIndex((l) => l.slug === lessonSlug)
  const nextLesson = isChallenge ? null : track.lessons[currentLessonIndex + 1]
  const nextHref = nextLesson
    ? `/learn/${trackSlug}/${nextLesson.slug}`
    : !isChallenge && track.challenge
    ? `/learn/${trackSlug}/challenge`
    : null

  return (
    <Shell>
      <LearnLayout track={track} completedLessons={completedLessons}>
        <motion.div
          key={lessonSlug}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {isChallenge ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
                  <Trophy size={20} />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={20} />
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl font-bold text-code-bg">
                  {isChallenge ? challenge?.title : lesson?.title}
                </h1>
                {isChallenge && challenge?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>
                )}
              </div>
            </div>

            {/* Topics */}
            {lesson && lesson.topics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.topics.map((topic) => (
                  <span key={topic} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          {(!classroomId || progressNotice) && (
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
              {progressNotice || "You are exploring the master curriculum. Join a classroom from the Learn page to save lesson completion."}
            </div>
          )}
          <div className="min-h-75">
            <ActivityRenderer
              activity={activity}
              onComplete={handleLessonComplete}
              onTypingComplete={handleTypingAttempt}
              userId={user?.id}
              isChallenge={isChallenge}
              timeLimitSeconds={challenge?.timeLimitSeconds}
              challengeId={isChallenge ? `${trackSlug}/challenge` : undefined}
            />
          </div>

          {/* Next lesson navigation */}
          {lessonDone && nextHref && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex justify-end">
              <Link
                href={nextHref}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
              >
                {nextLesson ? `Next: ${nextLesson.title}` : 'Final Challenge'} <ArrowRight size={16} />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </LearnLayout>
    </Shell>
  )
}

function findCustomLessonRoute(sourceTracks: Track[], itemId: string) {
  for (const track of sourceTracks) {
    const lesson = track.lessons.find((item) => item.slug === `custom-${itemId}`)
    if (lesson) return `${track.slug}/${lesson.slug}`
  }
  return null
}

// ─── Activity Renderer ─────────────────────────────────────────────────
function ActivityRenderer({
  activity,
  onComplete,
  onTypingComplete,
  userId,
  isChallenge,
  timeLimitSeconds,
  challengeId,
}: {
  activity: LessonActivity
  onComplete: (score?: number) => void
  onTypingComplete: (wpm: number, accuracy: number, durationSeconds: number) => void
  userId?: string
  isChallenge: boolean
  timeLimitSeconds?: number
  challengeId?: string
}) {
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds || 0)

  // Timer for challenges
  useEffect(() => {
    if (!timeLimitSeconds) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLimitSeconds])

  return (
    <>
      {timeLimitSeconds && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <Timer size={18} className="text-accent-foreground" />
          <span className="text-sm font-semibold text-accent-foreground">
            Time remaining: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {activity.type === 'quiz' && (
        <Quiz
          questions={activity.questions}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'drag-label' && (
        <DragDrop
          items={activity.items}
          zones={activity.zones}
          instruction={activity.instruction}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'drag-classify' && (
        <DragClassify
          items={activity.items}
          zones={activity.zones}
          instruction={activity.instruction}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'keyboard' && (
        <KeyboardLesson
          instruction={activity.instruction}
          onComplete={(correct, total) => onComplete(Math.round((correct / total) * 100))}
        />
      )}

      {activity.type === 'typing-test' && (
        <TypingTest
          instruction={activity.instruction}
          onComplete={async (wpm, accuracy, durationSeconds) => {
            if (!userId) return
            GamificationService.onTypingTestCompleted(userId, wpm, accuracy)
            onTypingComplete(wpm, accuracy, durationSeconds)
          }}
        />
      )}

      {activity.type === 'rich-text-editor' && (
        <RichTextEditor
          mission={activity.mission}
          requiredFormats={activity.requiredFormats}
          onComplete={(formats) => {
            const met = activity.requiredFormats.filter((f: string) => formats.includes(f)).length
            if (met >= activity.requiredFormats.length) onComplete(100)
          }}
        />
      )}

      {activity.type === 'slide-editor' && (
        <SlideEditor
          instruction={activity.instruction}
          onComplete={() => onComplete(100)}
        />
      )}

      {activity.type === 'python-runner' && (
        <PythonRunner
          instruction={activity.instruction}
          initialCode={activity.initialCode}
          isChallenge={isChallenge}
          challengeId={challengeId}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'html-preview' && (
        <HtmlPreview
          instruction={activity.instruction}
          initialHtml={activity.initialHtml}
          initialCss={activity.initialCss}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'scenario-question' && (
        <ScenarioQuestion
          scenario={activity.scenario}
          options={activity.options}
          correctIndex={activity.correctIndex}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'external-link' && (
        <ExternalLink
          url={activity.url}
          title={activity.title}
          instruction={activity.instruction}
          onComplete={(score, total) => onComplete(Math.round((score / total) * 100))}
        />
      )}

      {activity.type === 'ai-chat' && <AiChat instruction={activity.instruction} starterPrompt={activity.starterPrompt} onComplete={onComplete} />}
      {activity.type === 'wokwi-embed' && <WokwiEmbed instruction={activity.instruction} title={activity.title} src={activity.src} />}
      {activity.type === 'youtube-embed' && <YouTubeEmbed instruction={activity.instruction} title={activity.title} videoId={activity.videoId} />}
    </>
  )
}
