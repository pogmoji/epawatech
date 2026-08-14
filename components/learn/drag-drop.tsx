'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, GripVertical, RotateCcw, Trophy } from 'lucide-react'
import type { DragDropItem, DragDropZone } from '@/lib/curriculum'

type Props = {
  items: DragDropItem[]
  zones: DragDropZone[]
  instruction: string
  onComplete: (score: number, total: number) => void
}

export default function DragDrop({ items: initialItems, zones, instruction, onComplete }: Props) {
  // shuffle items on first render
  const [pool, setPool] = useState<DragDropItem[]>(() =>
    [...initialItems].sort(() => Math.random() - 0.5)
  )
  const [placed, setPlaced] = useState<Record<string, DragDropItem | null>>(() =>
    Object.fromEntries(zones.map((z) => [z.id, null]))
  )
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({})
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null)
  const [completed, setCompleted] = useState(false)

  const totalCorrect = Object.values(feedback).filter((v) => v === 'correct').length

  const handleDragStart = useCallback((item: DragDropItem) => {
    setDraggedItem(item)
  }, [])

  const handleDrop = useCallback(
    (zoneId: string) => {
      if (!draggedItem) return
      if (placed[zoneId]) return // zone already has an item

      if (draggedItem.zone === zoneId) {
        // Correct placement
        setPlaced((prev) => ({ ...prev, [zoneId]: draggedItem }))
        setPool((prev) => prev.filter((i) => i.id !== draggedItem.id))
        setFeedback((prev) => ({ ...prev, [zoneId]: 'correct' }))

        // Check completion
        const newCorrect = totalCorrect + 1
        if (newCorrect >= zones.length) {
          setTimeout(() => {
            setCompleted(true)
            onComplete(zones.length, zones.length)
          }, 600)
        }
      } else {
        // Wrong — flash red then reset
        setFeedback((prev) => ({ ...prev, [zoneId]: 'wrong' }))
        setTimeout(() => {
          setFeedback((prev) => ({ ...prev, [zoneId]: null }))
        }, 700)
      }
      setDraggedItem(null)
    },
    [draggedItem, placed, totalCorrect, zones.length, onComplete]
  )

  function handleReset() {
    setPool([...initialItems].sort(() => Math.random() - 0.5))
    setPlaced(Object.fromEntries(zones.map((z) => [z.id, null])))
    setFeedback({})
    setDraggedItem(null)
    setCompleted(false)
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
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">Perfect Score!</h3>
        <p className="mt-3 text-muted-foreground">
          All {zones.length} items placed correctly.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">{instruction}</p>

      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCorrect} of {zones.length} placed
        </span>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${(totalCorrect / zones.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Draggable pool */}
      <div className="mb-8 flex flex-wrap gap-3">
        <AnimatePresence>
          {pool.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              draggable
              onDragStart={() => handleDragStart(item)}
              className="flex cursor-grab items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm font-semibold shadow-sm transition active:cursor-grabbing active:shadow-md hover:border-primary hover:bg-primary/5"
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {item.label}
            </motion.div>
          ))}
        </AnimatePresence>
        {pool.length === 0 && (
          <p className="text-sm italic text-muted-foreground">All items placed!</p>
        )}
      </div>

      {/* Drop zones */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => {
          const fb = feedback[zone.id]
          const item = placed[zone.id]
          let borderColor = 'border-dashed border-border'
          let bg = 'bg-muted/30'
          if (fb === 'correct') {
            borderColor = 'border-primary'
            bg = 'bg-primary/10'
          }
          if (fb === 'wrong') {
            borderColor = 'border-destructive'
            bg = 'bg-destructive/10'
          }

          return (
            <div
              key={zone.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(zone.id)}
              className={`flex min-h-[100px] flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition-colors ${borderColor} ${bg}`}
            >
              <span className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {zone.label}
              </span>
              {item ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  <Check size={14} /> {item.label}
                </motion.div>
              ) : (
                <span className="text-xs text-muted-foreground">Drop here</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Classify variant ──────────────────────────────────────────────────
// Same as DragDrop but for two-column classification
export function DragClassify({ items: initialItems, zones, instruction, onComplete }: Props) {
  const [pool, setPool] = useState<DragDropItem[]>(() =>
    [...initialItems].sort(() => Math.random() - 0.5)
  )
  const [classified, setClassified] = useState<Record<string, DragDropItem[]>>(() =>
    Object.fromEntries(zones.map((z) => [z.id, []]))
  )
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null)
  const [completed, setCompleted] = useState(false)

  const totalPlaced = Object.values(classified).flat().length

  const handleDrop = useCallback(
    (zoneId: string) => {
      if (!draggedItem) return

      if (draggedItem.zone === zoneId) {
        setClassified((prev) => ({ ...prev, [zoneId]: [...prev[zoneId], draggedItem] }))
        setPool((prev) => prev.filter((i) => i.id !== draggedItem.id))

        if (totalPlaced + 1 >= initialItems.length) {
          setTimeout(() => {
            setCompleted(true)
            onComplete(initialItems.length, initialItems.length)
          }, 500)
        }
      } else {
        setWrongFlash(zoneId)
        setTimeout(() => setWrongFlash(null), 600)
      }
      setDraggedItem(null)
    },
    [draggedItem, totalPlaced, initialItems.length, onComplete]
  )

  function handleReset() {
    setPool([...initialItems].sort(() => Math.random() - 0.5))
    setClassified(Object.fromEntries(zones.map((z) => [z.id, []])))
    setWrongFlash(null)
    setDraggedItem(null)
    setCompleted(false)
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
        <h3 className="mt-5 font-display text-2xl font-bold text-code-bg">All Classified!</h3>
        <p className="mt-3 text-muted-foreground">
          All {initialItems.length} items sorted correctly.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">{instruction}</p>

      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalPlaced} of {initialItems.length} classified
        </span>
        <button onClick={handleReset} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${(totalPlaced / initialItems.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Pool */}
      <div className="mb-8 flex flex-wrap gap-3">
        <AnimatePresence>
          {pool.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              draggable
              onDragStart={() => setDraggedItem(item)}
              className="flex cursor-grab items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm font-semibold shadow-sm transition active:cursor-grabbing active:shadow-md hover:border-primary hover:bg-primary/5"
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {item.label}
            </motion.div>
          ))}
        </AnimatePresence>
        {pool.length === 0 && <p className="text-sm italic text-muted-foreground">All items classified!</p>}
      </div>

      {/* Classification columns */}
      <div className="grid gap-6 sm:grid-cols-2">
        {zones.map((zone) => {
          const isWrong = wrongFlash === zone.id
          return (
            <div
              key={zone.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(zone.id)}
              className={`min-h-[160px] rounded-2xl border-2 border-dashed p-5 transition-colors ${
                isWrong ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/20'
              }`}
            >
              <h4 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {zone.label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {classified[zone.id].map((item) => (
                  <motion.span
                    key={item.id}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                  >
                    <Check size={12} /> {item.label}
                  </motion.span>
                ))}
                {classified[zone.id].length === 0 && (
                  <p className="w-full text-center text-xs text-muted-foreground">Drop items here</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
