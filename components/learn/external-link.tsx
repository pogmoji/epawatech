'use client'

import { useState } from 'react'
import { ExternalLink as ExternalLinkIcon, CheckCircle2 } from 'lucide-react'

type Props = {
  url: string
  title: string
  instruction: string
  onComplete: (score: number, total: number) => void
}

export function ExternalLink({ url, title, instruction, onComplete }: Props) {
  const [completed, setCompleted] = useState(false)

  const handleComplete = () => {
    setCompleted(true)
    onComplete(100, 100)
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mb-8 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ExternalLinkIcon size={40} />
        </div>
      </div>
      
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <p className="mb-8 text-muted-foreground">{instruction}</p>

      <div className="flex flex-col gap-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 font-bold text-primary transition hover:bg-primary/10"
        >
          {title} <ExternalLinkIcon size={18} />
        </a>

        <button
          onClick={handleComplete}
          disabled={completed}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 font-bold text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {completed ? (
            <>
              <CheckCircle2 size={18} /> Completed
            </>
          ) : (
            'Mark as Complete'
          )}
        </button>
      </div>
    </div>
  )
}
