'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react'

type Props = {
  scenario: string
  options: string[]
  correctIndex: number
  onComplete: (score: number, total: number) => void
}

export function ScenarioQuestion({ scenario, options, correctIndex, onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    if (selected === null || isSubmitted) return
    setIsSubmitted(true)
    const isCorrect = selected === correctIndex
    onComplete(isCorrect ? 100 : 0, 100)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <HelpCircle className="mt-1 shrink-0 text-primary" size={24} />
        <p className="text-lg font-medium leading-relaxed text-foreground">{scenario}</p>
      </div>

      <div className="space-y-3">
        {options.map((opt, i) => {
          const isSelected = selected === i
          const showCorrect = isSubmitted && i === correctIndex
          const showWrong = isSubmitted && isSelected && i !== correctIndex

          return (
            <button
              key={i}
              onClick={() => !isSubmitted && setSelected(i)}
              disabled={isSubmitted}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                isSelected && !isSubmitted
                  ? 'border-primary bg-primary/10'
                  : showCorrect
                  ? 'border-green-500 bg-green-500/10'
                  : showWrong
                  ? 'border-destructive bg-destructive/10'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <span className={showCorrect ? 'font-medium text-green-700 dark:text-green-400' : showWrong ? 'font-medium text-destructive' : 'text-foreground'}>
                {opt}
              </span>
              {showCorrect && <CheckCircle2 className="text-green-500" size={20} />}
              {showWrong && <XCircle className="text-destructive" size={20} />}
            </button>
          )
        })}
      </div>

      <motion.button
        animate={{ opacity: selected !== null && !isSubmitted ? 1 : 0.5 }}
        disabled={selected === null || isSubmitted}
        onClick={handleSubmit}
        className="mt-8 w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitted ? 'Completed' : 'Submit Answer'}
      </motion.button>
    </div>
  )
}
