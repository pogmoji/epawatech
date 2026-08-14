'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Props = { instruction: string; starterPrompt?: string; onComplete: (score: number, total: number) => void }

export function AiChat({ instruction, starterPrompt = '', onComplete }: Props) {
  const [prompt, setPrompt] = useState(starterPrompt)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function ask() {
    const value = prompt.trim()
    if (!value) { setError('Write a question before asking AI.'); return }
    setLoading(true); setError(''); setAnswer('')
    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const token = sessionData.session?.access_token
      const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ prompt: value }) })
      const data = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(data.error || 'We could not get an answer right now.')
      setAnswer(data.message || 'No response was returned.')
      onComplete(100, 100)
    } catch (err) { setError(err instanceof Error ? err.message : 'We could not get an answer right now.') }
    finally { setLoading(false) }
  }

  return <div className="space-y-5">
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">{instruction}</div>
    <label className="block text-sm font-semibold text-code-bg" htmlFor="ai-prompt">Your prompt</label>
    <textarea id="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} className="min-h-36 w-full rounded-xl border border-border bg-card p-4 text-sm outline-none focus:border-primary" placeholder="Ask a safe learning question…" />
    <p className="text-xs text-muted-foreground">Do not include private information such as passwords, phone numbers, or addresses.</p>
    <div className="flex flex-wrap gap-3">
      <button onClick={ask} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Ask AI</button>
      {error && <button onClick={ask} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold"><RefreshCw size={16} /> Retry</button>}
    </div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {answer && <section aria-live="polite" className="rounded-xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold text-code-bg">AI response</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{answer}</p></section>}
  </div>
}
