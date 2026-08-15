import type { PyodideRuntime } from '@/lib/python/pyodide'

export type PythonChallengeGrade = {
  passed: boolean
  score: number
  feedback: string
}

const dataSkillsTest = `
import json as _pawa_json
import pandas as _pawa_pd
import matplotlib.pyplot as _pawa_plt
_pawa_frames = [value for value in globals().values() if isinstance(value, _pawa_pd.DataFrame)]
_pawa_has_table = any({'item', 'cost'}.issubset({str(column).lower() for column in frame.columns}) for frame in _pawa_frames)
_pawa_has_bar_chart = any(
    any(len(axis.patches) > 0 for axis in figure.axes)
    for figure_number in _pawa_plt.get_fignums()
    for figure in [_pawa_plt.figure(figure_number)]
)
_pawa_json.dumps({'table': _pawa_has_table, 'barChart': _pawa_has_bar_chart})
`
const blinkLogicTest = `
import json as _pawa_json
_pawa_output = sys.stdout.getvalue().upper()
_pawa_json.dumps({'on': 'ON' in _pawa_output, 'off': 'OFF' in _pawa_output})
`
const trafficTest = `
import json as _pawa_json
_pawa_output = sys.stdout.getvalue().upper()
_pawa_json.dumps({'stop': 'STOP' in _pawa_output, 'slow': 'SLOW' in _pawa_output, 'go': 'GO' in _pawa_output})
`

/**
 * Grades the runtime result rather than searching the student's source code.
 * Client-side grades are intentionally lightweight for the current curriculum.
 */
export async function gradePythonChallenge(runtime: PyodideRuntime, challengeId: string): Promise<PythonChallengeGrade> {
  try {
    if (challengeId === 'coding-and-arduino/challenge') {
      const result = JSON.parse(String(await runtime.runPythonAsync(blinkLogicTest))) as { on: boolean; off: boolean }
      const score = [result.on, result.off].filter(Boolean).length * 50
      return { passed: score === 100, score, feedback: score === 100 ? 'Great blink sequence! You printed both LED states.' : 'Print both "ON" and "OFF" in your blink sequence.' }
    }
    if (challengeId === 'traffic-and-sensors/challenge') {
      const result = JSON.parse(String(await runtime.runPythonAsync(trafficTest))) as { stop: boolean; slow: boolean; go: boolean }
      const score = [result.stop, result.slow, result.go].filter(Boolean).length * 34
      return { passed: result.stop && result.slow && result.go, score: result.stop && result.slow && result.go ? 100 : score, feedback: result.stop && result.slow && result.go ? 'Great work! Your decision tree includes every safe outcome.' : 'Test your code so it can print STOP, SLOW, and GO for different distances.' }
    }
    if (challengeId !== 'data-skills/challenge') return { passed: false, score: 0, feedback: 'This challenge is not ready yet.' }
    const result = JSON.parse(String(await runtime.runPythonAsync(dataSkillsTest))) as { table?: boolean; barChart?: boolean }
    const score = [result.table === true, result.barChart === true].filter(Boolean).length * 50
    const feedback = score === 100
      ? 'Great job! Your DataFrame and bar chart both passed the tests.'
      : !result.table
        ? 'Create a pandas DataFrame with columns named Item and Cost, then try again.'
        : 'Your DataFrame is correct. Now create a bar chart from the data.'
    return { passed: score === 100, score, feedback }
  } catch {
    return { passed: false, score: 0, feedback: 'We could not evaluate your solution. Run your code and try again.' }
  }
}
