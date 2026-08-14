'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowRight, RotateCcw, Trophy } from 'lucide-react'
import type { QuizQuestion } from '@/lib/curriculum'

type Props = {
  questions: QuizQuestion[]
  onComplete: (score: number, total: number) => void
}

export default function Quiz({ questions, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = questions[currentIndex]
  const isCorrect = selectedIndex === q?.correctIndex

  function handleSelect(index: number) {
    if (answered) return
    setSelectedIndex(index)
    setAnswered(true)
    if (index === q.correctIndex) {
      setCorrectCount((c) => c + 1)
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = correctCount + (isCorrect ? 0 : 0) // already counted
      setFinished(true)
      onComplete(finalScore, questions.length)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedIndex(null)
      setAnswered(false)
    }
  }

  function handleRetry() {
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswered(false)
    setCorrectCount(0)
    setFinished(false)
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="text-primary" size={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Quiz Complete!</h3>
        <p className="mt-3 text-lg text-muted-foreground">
          You scored <span className="font-bold text-primary">{correctCount}</span> out of{' '}
          <span className="font-bold">{questions.length}</span> ({pct}%)
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        {pct < 100 && (
          <button
            onClick={handleRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:border-primary"
          >
            <RotateCcw size={15} /> Try Again
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="font-semibold text-primary">{correctCount} correct</span>
      </div>
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <h3 className="font-display text-xl font-bold text-code-bg">{q.question}</h3>
          <div className="mt-6 space-y-3">
            {q.options.map((opt, i) => {
              let style = 'border-border bg-card hover:border-primary/50'
              if (answered) {
                if (i === q.correctIndex) style = 'border-primary bg-primary/10 text-primary'
                else if (i === selectedIndex) style = 'border-destructive bg-destructive/10 text-destructive'
                else style = 'border-border bg-card opacity-50'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left text-sm font-medium transition ${style}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {answered && i === q.correctIndex && <Check size={18} className="text-primary" />}
                  {answered && i === selectedIndex && i !== q.correctIndex && <X size={18} className="text-destructive" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      {answered && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
          >
            {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
          </button>
        </motion.div>
      )}
    </div>
  )
}
