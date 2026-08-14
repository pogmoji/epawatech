'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import { gradePythonChallenge } from '@/lib/python/challenge-grader'
import { getPythonRuntime, type PyodideRuntime } from '@/lib/python/pyodide'

type Props = {
  instruction: string
  initialCode?: string
  isChallenge?: boolean
  challengeId?: string
  onComplete: (score: number, total: number) => void
}

type ExecutionResult = { success: boolean; stdout: string; stderr: string; error?: string; executionTimeMs: number }

async function explainPythonError(runtime: PyodideRuntime, error: string) {
  const missingColumn = error.match(/KeyError:\s*['"]([^'"]+)['"]/)?.[1]
  if (!missingColumn) return error

  try {
    const columns = JSON.parse(String(await runtime.runPythonAsync(`
import json as _pawa_json
_pawa_json.dumps(list(df.columns)) if 'df' in globals() else '[]'
    `))) as string[]
    if (columns.length > 0) {
      return `Column "${missingColumn}" was not found. Column names are case-sensitive. Available columns: ${columns.map((column) => `"${column}"`).join(', ')}. Update both the data keys and x=/y= values so they match exactly.`
    }
  } catch {
    // Keep the original Python error when no DataFrame can be inspected.
  }

  return error
}

export function PythonRunner({ instruction, initialCode = '', isChallenge = false, challengeId, onComplete }: Props) {
  const [code, setCode] = useState(initialCode)
  const [textOutput, setTextOutput] = useState('')
  const [plotImages, setPlotImages] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isPyodideReady, setIsPyodideReady] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('Preparing Python…')
  const [completed, setCompleted] = useState(false)
  const pyodideRef = useRef<PyodideRuntime | null>(null)

  useEffect(() => {
    let active = true
    getPythonRuntime()
      .then((runtime) => {
        if (!active) return
        pyodideRef.current = runtime
        setIsPyodideReady(true)
        setLoadingStatus('')
      })
      .catch((error) => {
        console.error('Failed to load Pyodide', error)
        if (active) setTextOutput('We could not prepare Python. Check your connection and refresh the page.')
      })
    return () => { active = false }
  }, [])

  const executeCode = async (): Promise<ExecutionResult | null> => {
    const pyodide = pyodideRef.current
    if (!pyodide || isRunning) return null

    setIsRunning(true)
    setTextOutput('Running…')
    setPlotImages([])
    const startedAt = performance.now()

    try {
      await pyodide.runPythonAsync(`
        import sys, io
        import matplotlib.pyplot as plt
        plt.close('all')
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
      `)

      await pyodide.runPythonAsync(code)
      const stdout = String(await pyodide.runPythonAsync(`sys.stdout.getvalue()`))
      const stderr = String(await pyodide.runPythonAsync(`sys.stderr.getvalue()`))
      const images: string[] = []
      const figCount = Number(await pyodide.runPythonAsync(`
        import matplotlib.pyplot as plt
        len(plt.get_fignums())
      `))

      if (figCount > 0) {
        await pyodide.runPythonAsync(`
          import base64, io as _io
          import matplotlib.pyplot as plt

          _plot_images = []
          for _fig_num in plt.get_fignums():
              _fig = plt.figure(_fig_num)
              _buf = _io.BytesIO()
              _fig.savefig(_buf, format='png', bbox_inches='tight', dpi=100)
              _buf.seek(0)
              _plot_images.append(base64.b64encode(_buf.read()).decode('utf-8'))
              _buf.close()

        `)

        const imgList = await pyodide.runPythonAsync(`_plot_images`)
        const jsImgList = (imgList as { toJs: () => Iterable<string> }).toJs()
        for (const img of jsImgList) {
          images.push(`data:image/png;base64,${img}`)
        }
      }

      setPlotImages(images)

      let displayText = stdout || ''
      if (stderr) {
        displayText += (displayText ? '\n' : '') + stderr
      }
      if (!displayText && images.length === 0) {
        displayText = 'Code executed successfully with no output.'
      }
      setTextOutput(displayText)
      return { success: true, stdout, stderr, executionTimeMs: Math.round(performance.now() - startedAt) }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      const explanation = await explainPythonError(pyodide, error)
      setTextOutput(`Python error:\n${explanation}`)
      setPlotImages([])
      return { success: false, stdout: '', stderr: '', error: explanation, executionTimeMs: Math.round(performance.now() - startedAt) }
    } finally {
      setIsRunning(false)
    }
  }

  const runCode = async () => {
    const result = await executeCode()
    if (result?.success && !isChallenge && !completed) {
      setCompleted(true)
      onComplete(100, 100)
    }
  }

  const submitChallenge = async () => {
    const result = await executeCode()
    if (!result?.success || !pyodideRef.current) return
    const grade = await gradePythonChallenge(pyodideRef.current, challengeId || 'data-skills/challenge')
    if (grade.passed) {
      setTextOutput(`✅ Test Passed! Score: ${grade.score}\n\n${grade.feedback}`)
      if (!completed) {
        setCompleted(true)
        onComplete(grade.score, 100)
      }
    } else {
      setTextOutput(`❌ ${grade.feedback} Score: ${grade.score}`)
    }
  }

  const resetCode = () => {
    setCode(initialCode)
    setTextOutput('')
    setPlotImages([])
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <p>{instruction}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Code editor */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Python Code</label>
            {!isPyodideReady && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> {loadingStatus}
              </span>
            )}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-[300px] w-full flex-1 rounded-xl border border-border bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none focus:border-primary/50"
            spellCheck={false}
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Output</label>
          <div className="min-h-[300px] flex-1 overflow-auto rounded-xl border border-border bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4]">
            {textOutput && <pre className="whitespace-pre-wrap">{textOutput}</pre>}
            {plotImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Plot ${i + 1}`}
                className="mt-4 max-w-full rounded-lg border border-border"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={resetCode}
          disabled={isRunning}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-bold text-foreground transition hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <RotateCcw size={18} /> Reset
        </button>
        <button
          onClick={runCode}
          disabled={!isPyodideReady || isRunning}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-bold text-foreground transition hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
          Run Code
        </button>

        {isChallenge && (
          <button
            onClick={submitChallenge}
            disabled={!isPyodideReady || isRunning || completed}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {completed ? (
              <><CheckCircle2 size={18} /> Completed</>
            ) : isRunning ? (
              <><Loader2 size={18} className="animate-spin" /> Submitting…</>
            ) : (
              'Submit Challenge'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
