'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Lock, Trophy, ChevronRight } from 'lucide-react'
import type { Track } from '@/lib/curriculum'
import type { ReactNode } from 'react'

type Props = {
  track: Track
  completedLessons: string[] // slugs of completed lessons
  children: ReactNode
}

export default function LearnLayout({ track, completedLessons, children }: Props) {
  const pathname = usePathname()
  const totalLessons = track.lessons.length + (track.challenge ? 1 : 0)
  const completedCount = completedLessons.length

  return (
    <div className="mx-auto max-w-370 px-5 py-8 sm:px-10 sm:py-12">
      {/* Back link */}
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} /> All Tracks
      </Link>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <h2 className="font-display text-lg font-bold text-code-bg">{track.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Module {track.weekNumber}</p>

          {/* Overall progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedCount}/{totalLessons} complete</span>
              <span className="font-semibold text-primary">{Math.round((completedCount / totalLessons) * 100)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${(completedCount / totalLessons) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Lesson list */}
          <nav className="mt-6 space-y-1.5" aria-label="Lesson navigation">
            {track.lessons.map((lesson, i) => {
              const href = `/learn/${track.slug}/${lesson.slug}`
              const isActive = pathname === href
              const isDone = completedLessons.includes(lesson.slug)

              return (
                <Link
                  key={lesson.slug}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : isDone
                      ? 'text-muted-foreground hover:bg-muted/50'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check size={12} /> : i + 1}
                  </span>
                  <span className="truncate">{lesson.title}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-primary" />}
                </Link>
              )
            })}

            {/* Challenge link */}
            {track.challenge && (
              <>
                <div className="mx-3 border-t border-border" />
                <Link
                  href={`/learn/${track.slug}/challenge`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    pathname === `/learn/${track.slug}/challenge`
                      ? 'bg-accent/20 font-semibold text-accent-foreground'
                      : completedLessons.includes('challenge')
                      ? 'text-muted-foreground hover:bg-muted/50'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completedLessons.includes('challenge')
                        ? 'bg-accent text-foreground'
                        : 'border border-accent text-accent-foreground'
                    }`}
                  >
                    {completedLessons.includes('challenge') ? <Check size={12} /> : <Trophy size={12} />}
                  </span>
                  <span className="truncate">{track.challenge.title}</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
