'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

type Props = {
  instruction: string
  initialHtml?: string
  initialCss?: string
  onComplete: (score: number, total: number) => void
}

export function HtmlPreview({ instruction, initialHtml = '', initialCss = '', onComplete }: Props) {
  const [html, setHtml] = useState(initialHtml)
  const [css, setCss] = useState(initialCss)
  const [srcDoc, setSrcDoc] = useState('')
  const [completed, setCompleted] = useState(false)

  // Debounce iframe update
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>${html}</body>
        </html>
      `)
    }, 500)
    return () => clearTimeout(timeout)
  }, [html, css])

  const handleComplete = () => {
    setCompleted(true)
    onComplete(100, 100)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <p>{instruction}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">HTML</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="h-32 w-full rounded-xl border border-border bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none focus:border-primary/50"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">CSS</label>
            <textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              className="h-32 w-full rounded-xl border border-border bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none focus:border-primary/50"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Preview</label>
          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-white">
            <iframe
              srcDoc={srcDoc}
              title="Live Preview"
              className="h-full w-full border-none"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleComplete}
          disabled={completed}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-50"
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
