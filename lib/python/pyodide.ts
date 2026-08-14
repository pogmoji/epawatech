export type PyodideRuntime = {
  loadPackage: (packages: string[]) => Promise<void>
  runPythonAsync: (code: string) => Promise<unknown>
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideRuntime>
  }
}

const PYODIDE_BASE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
let runtimePromise: Promise<PyodideRuntime> | null = null

function loadScript() {
  if (window.loadPyodide) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pawatech-pyodide]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Could not load Python.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `${PYODIDE_BASE_URL}pyodide.js`
    script.async = true
    script.dataset.pawatechPyodide = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Python. Check your internet connection and try again.'))
    document.head.appendChild(script)
  })
}

/** Lazily creates one browser-only Python runtime which all runners reuse. */
export function getPythonRuntime(): Promise<PyodideRuntime> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Python is available only in the browser.'))

  if (!runtimePromise) {
    runtimePromise = (async () => {
      await loadScript()
      if (!window.loadPyodide) throw new Error('Python could not be started.')

      const runtime = await window.loadPyodide({ indexURL: PYODIDE_BASE_URL })
      await runtime.loadPackage(['pandas', 'matplotlib'])
      await runtime.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib')
plt.show = lambda *args, **kwargs: None
      `)
      return runtime
    })().catch((error) => {
      runtimePromise = null
      throw error
    })
  }

  return runtimePromise
}
