'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, RotateCcw, Trophy, Keyboard as KeyboardIcon } from 'lucide-react'

// ─── Keyboard Basics (Week 2, Lesson 1) ────────────────────────────────
const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

const KEY_SEQUENCE = ['F', 'J', 'D', 'K', 'S', 'L', 'A', 'G', 'H', 'E', 'I', 'R', 'U', 'T', 'Y', 'W', 'O', 'Q', 'P']

type KeyboardLessonProps = {
  instruction: string
  onComplete: (correct: number, total: number) => void
}

export function KeyboardLesson({ instruction, onComplete }: KeyboardLessonProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [finished, setFinished] = useState(false)
  const total = KEY_SEQUENCE.length

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (finished) return
      const key = e.key.toUpperCase()
      const expected = KEY_SEQUENCE[currentIndex]

      if (key === expected) {
        setCorrectCount((c) => c + 1)
        if (currentIndex + 1 >= total) {
          setFinished(true)
          onComplete(correctCount + 1, total)
        } else {
          setCurrentIndex((i) => i + 1)
        }
      } else {
        setWrongFlash(true)
        setTimeout(() => setWrongFlash(false), 300)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, correctCount, finished, total, onComplete])

  function handleReset() {
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongFlash(false)
    setFinished(false)
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="text-primary" size={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Keyboard Lesson Complete!</h3>
        <p className="mt-3 text-muted-foreground">
          {correctCount}/{total} correct ({pct}%)
        </p>
      </motion.div>
    )
  }

  const targetKey = KEY_SEQUENCE[currentIndex]

  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-2 text-sm text-muted-foreground">{instruction}</p>
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{currentIndex} of {total} keys pressed</span>
        <button onClick={handleReset} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(currentIndex / total) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <p className="mb-6 text-lg font-semibold text-code-bg">
        Press the <span className="rounded-lg bg-primary px-3 py-1 font-mono text-xl text-primary-foreground">{targetKey}</span> key
      </p>

      {wrongFlash && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-sm font-semibold text-destructive">
          Wrong key! Try again.
        </motion.p>
      )}

      {/* Visual keyboard */}
      <div className="inline-block rounded-2xl border border-border bg-card p-4 shadow-sm">
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1.5 py-1" style={{ paddingLeft: ri === 1 ? 12 : ri === 2 ? 28 : 0 }}>
            {row.map((key) => {
              let cls = 'bg-muted text-foreground'
              if (key === targetKey) cls = 'bg-primary text-primary-foreground shadow-lg scale-110'
              const alreadyDone = KEY_SEQUENCE.indexOf(key) < currentIndex && KEY_SEQUENCE.indexOf(key) !== -1
              if (alreadyDone) cls = 'bg-primary/20 text-primary'

              return (
                <div
                  key={key}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold transition-all ${cls}`}
                >
                  {key}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Typing Test (Week 2, Lesson 2) ────────────────────────────────────
const TYPING_TEXTS = [
  'The quick brown fox jumps over the lazy dog near the river bank on a sunny afternoon.',
  'Python is a fun programming language that kids and teens love to learn and explore.',
  'Computers help us communicate with people around the world through email and messages.',
]

type TypingTestProps = {
  instruction: string
  onComplete: (wpm: number, accuracy: number, durationSeconds: number) => void
}

export function TypingTest({ instruction, onComplete }: TypingTestProps) {
  const [text] = useState(() => TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)])
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      if (finished) return
      if (!startTime) setStartTime(Date.now())
      setTyped(value)

      if (value.length >= text.length) {
        const elapsedSeconds = (Date.now() - (startTime || Date.now())) / 1000
        const elapsed = elapsedSeconds / 60 // minutes
        const words = text.split(' ').length
        const calcWpm = Math.round(words / Math.max(elapsed, 0.01))
        let correct = 0
        for (let i = 0; i < text.length; i++) {
          if (value[i] === text[i]) correct++
        }
        const calcAccuracy = Math.round((correct / text.length) * 100)
        setWpm(calcWpm)
        setAccuracy(calcAccuracy)
        setFinished(true)
        onComplete(calcWpm, calcAccuracy, Math.max(1, Math.round(elapsedSeconds)))
      }
    },
    [text, startTime, finished, onComplete]
  )

  function handleReset() {
    setTyped('')
    setStartTime(null)
    setFinished(false)
    setWpm(0)
    setAccuracy(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="text-primary" size={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Typing Test Complete!</h3>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-3xl font-bold text-primary">{wpm}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">WPM</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-3xl font-bold text-primary">{accuracy}%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accuracy</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:border-primary"
        >
          <RotateCcw size={15} /> Try Again
        </button>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-2 text-sm text-muted-foreground">{instruction}</p>
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <KeyboardIcon size={16} className="text-primary" />
        <span>{typed.length} / {text.length} characters</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(typed.length / text.length) * 100}%` }} transition={{ duration: 0.1 }} />
      </div>

      {/* Text to type with character-level highlighting */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 font-mono text-lg leading-8 text-foreground shadow-sm">
        {text.split('').map((ch, i) => {
          let cls = 'text-slate-500'
          if (i < typed.length) {
            cls = typed[i] === ch ? 'text-green-700' : 'text-destructive underline'
          }
          if (i === typed.length) cls = 'rounded bg-yellow-200 px-0.5 text-code-bg'
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          )
        })}
      </div>

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-5 py-4 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        placeholder="Start typing here..."
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}
