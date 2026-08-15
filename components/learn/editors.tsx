'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Check, Trophy, Plus, Trash2, ChevronLeft, ChevronRight, Type, Image as ImageIcon, Palette } from 'lucide-react'

// ─── Rich Text Editor (Week 2, Lesson 3) ───────────────────────────────
type RichTextEditorProps = {
  mission: string
  requiredFormats: string[]
  onComplete: (usedFormats: string[]) => void
}

export function RichTextEditor({ mission, requiredFormats, onComplete }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [usedFormats, setUsedFormats] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)

  function execCommand(cmd: string, formatName: string) {
    document.execCommand(cmd, false)
    editorRef.current?.focus()
    setUsedFormats((prev) => {
      const next = new Set(prev)
      next.add(formatName)
      return next
    })
  }

  function execList() {
    document.execCommand('insertUnorderedList', false)
    editorRef.current?.focus()
    setUsedFormats((prev) => {
      const next = new Set(prev)
      next.add('bullet')
      return next
    })
  }

  function handleCheckWork() {
    const used = Array.from(usedFormats)
    const allMet = requiredFormats.every((f) => usedFormats.has(f))
    if (allMet) {
      setCompleted(true)
    }
    onComplete(used)
  }

  const progress = requiredFormats.filter((f) => usedFormats.has(f)).length

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="text-primary" size={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Document Complete!</h3>
        <p className="mt-3 text-muted-foreground">
          You used all required formatting: {requiredFormats.join(', ')}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-code-bg">
        <strong>Mission:</strong> {mission}
      </div>

      {/* Requirements checklist */}
      <div className="mb-4 flex flex-wrap gap-2">
        {requiredFormats.map((f) => (
          <span
            key={f}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              usedFormats.has(f) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {usedFormats.has(f) && <Check size={12} />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{progress}/{requiredFormats.length} used</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-border bg-muted/50 px-3 py-2">
        <button onClick={() => execCommand('bold', 'bold')} title="Bold" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><Bold size={16} /></button>
        <button onClick={() => execCommand('italic', 'italic')} title="Italic" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><Italic size={16} /></button>
        <button onClick={() => execCommand('underline', 'underline')} title="Underline" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><Underline size={16} /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => execList()} title="Bulleted list" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><List size={16} /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => { document.execCommand('justifyLeft'); editorRef.current?.focus() }} title="Align left" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><AlignLeft size={16} /></button>
        <button onClick={() => { document.execCommand('justifyCenter'); editorRef.current?.focus() }} title="Align center" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><AlignCenter size={16} /></button>
        <button onClick={() => { document.execCommand('justifyRight'); editorRef.current?.focus() }} title="Align right" className="rounded-lg p-2 hover:bg-primary/10 hover:text-primary"><AlignRight size={16} /></button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[240px] rounded-b-xl border border-t-0 border-border bg-card px-5 py-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-primary/15 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_li]:list-item [&_li]:ml-2"
        style={{ whiteSpace: 'pre-wrap' }}
      />

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCheckWork}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
        >
          <Check size={16} /> Check My Work
        </button>
      </div>
    </div>
  )
}

// ─── Slide Editor (Week 2, Lesson 4) ───────────────────────────────────
type Slide = {
  id: number
  title: string
  body: string
  theme: 'light' | 'teal' | 'dark'
}

type SlideEditorProps = {
  instruction: string
  onComplete: (slides: Slide[]) => void
}

const THEMES: { value: Slide['theme']; label: string; bg: string; text: string }[] = [
  { value: 'light', label: 'Light', bg: 'bg-card', text: 'text-code-bg' },
  { value: 'teal', label: 'Teal', bg: 'bg-primary', text: 'text-primary-foreground' },
  { value: 'dark', label: 'Dark', bg: 'bg-code-bg', text: 'text-accent' },
]

export function SlideEditor({ instruction, onComplete }: SlideEditorProps) {
  const [slides, setSlides] = useState<Slide[]>([
    { id: 1, title: 'My Presentation', body: '', theme: 'teal' },
    { id: 2, title: 'Main Content', body: '', theme: 'light' },
    { id: 3, title: 'Thank You!', body: '', theme: 'dark' },
  ])
  const [activeIndex, setActiveIndex] = useState(0)
  const [completed, setCompleted] = useState(false)

  const slide = slides[activeIndex]
  const theme = THEMES.find((t) => t.value === slide.theme) || THEMES[0]

  function updateSlide(field: 'title' | 'body' | 'theme', value: string) {
    setSlides((prev) =>
      prev.map((s, i) => (i === activeIndex ? { ...s, [field]: value } : s))
    )
  }

  function addSlide() {
    const newSlide: Slide = { id: Date.now(), title: 'New Slide', body: '', theme: 'light' }
    setSlides((prev) => [...prev, newSlide])
    setActiveIndex(slides.length)
  }

  function removeSlide(index: number) {
    if (slides.length <= 1) return
    setSlides((prev) => prev.filter((_, i) => i !== index))
    if (activeIndex >= index && activeIndex > 0) setActiveIndex(activeIndex - 1)
  }

  function handleSubmit() {
    const allFilled = slides.every((s) => s.title.trim().length > 0)
    if (allFilled && slides.length >= 3) {
      setCompleted(true)
      onComplete(slides)
    }
  }

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="text-primary" size={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Presentation Complete!</h3>
        <p className="mt-3 text-muted-foreground">{slides.length} slides created successfully.</p>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm text-muted-foreground">{instruction}</p>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Slide list sidebar */}
        <div className="space-y-2">
          {slides.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActiveIndex(i)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${
                i === activeIndex ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <span className="truncate">Slide {i + 1}</span>
              {slides.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(i) }}
                  className="ml-2 rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSlide}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus size={14} /> Add Slide
          </button>
        </div>

        {/* Active slide preview + editor */}
        <div>
          {/* Preview */}
          <div className={`mb-4 flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-border p-8 ${theme.bg} ${theme.text}`}>
            <h3 className="font-display text-2xl font-bold">{slide.title || 'Slide Title'}</h3>
            {slide.body && <p className="mt-3 text-sm opacity-80">{slide.body}</p>}
          </div>

          {/* Editor */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
              <input
                value={slide.title}
                onChange={(e) => updateSlide('title', e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</label>
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide('body', e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</label>
              <div className="flex gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => updateSlide('theme', t.value)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${
                      slide.theme === t.value ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border bg-card'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${t.bg} border border-border`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation + Submit */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setActiveIndex(Math.min(slides.length - 1, activeIndex + 1))}
                disabled={activeIndex >= slides.length - 1}
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
            >
              <Check size={16} /> Submit Presentation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
