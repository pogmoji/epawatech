# PawaTech — Pyodide Python Execution Implementation Guide
## Revised Codex Context for Weeks 3, 6, and 7

## Purpose

This document replaces the previous Piston/Judge0-based sandbox plan.

The current decision is to use **Pyodide as the primary Python execution environment** for the PawaTech learning platform.

The Python execution requirements for the curriculum are relatively lightweight. Weeks 3, 6, and 7 use Python mainly for learning, practice, programming logic, and challenge evaluation. They do not currently require a heavy remote code-execution infrastructure.

The goal of this task is therefore to replace the existing mock sandbox implementation with a reusable **client-side Pyodide execution layer**.

---

# 1. Curriculum Context

The Python execution layer is relevant to these weeks:

| Week | Curriculum | Python Use |
|---|---|---|
| 3 | Microsoft Excel / Data Skills | Python data exercises, pandas, matplotlib |
| 6 | Coding & Arduino Basics | Python programming logic, boolean/sequence challenges |
| 7 | Traffic Light & Sensors | Python sequence/timing logic and sensor decision logic |

Important:

The Python environment is **not an Arduino/C++ execution environment**.

Week 6's curriculum identifies a gap around running Arduino/C++ code and simulating circuits. The Python environment should therefore be used for the **coding logic exercises**, while Arduino/circuit simulation remains a separate concern.

Week 7 similarly uses Python for traffic-light and sensor decision logic.

---

# 2. Current API Files

Two API routes currently exist as mock implementations.

They should not be treated as the final execution architecture.

## Current challenge submission route

The current implementation:

- receives `{ code }`
- calls `/api/sandbox/execute`
- uses string matching to determine whether the challenge passed
- returns a mock score
- returns mock feedback

Example of the current mock approach:

```ts
code.includes('pd.DataFrame') && code.includes('plot.bar')
```

This must be removed.

Challenge success must not depend on checking whether certain strings appear in the student's source code.

---

## Current sandbox execution route

The current implementation:

- receives Python code
- looks for a `print(...)` statement
- extracts text from the statement
- returns fabricated output
- waits approximately 500ms to simulate execution

It does not actually execute Python.

This mock execution behavior should be replaced by real Pyodide execution in the browser.

---

# 3. New Architecture

Use Pyodide as the actual Python execution environment.

The intended architecture is:

```text
Student Browser
      |
      v
Next.js Learning UI
      |
      v
PythonRunner
      |
      v
Pyodide
      |
      +---- Python execution
      +---- stdout
      +---- stderr
      +---- result
      |
      v
Challenge evaluation
      |
      v
Next.js API
      |
      v
Supabase / Progress
```

The key difference from the previous architecture is:

**Python code does not need to be sent to a remote Piston/Judge0 service for normal execution.**

Execution happens in the student's browser.

---

# 4. Do Not Build Piston/Judge0

Do NOT implement:

- Piston
- Judge0
- a remote Docker execution service
- a custom server-side Python sandbox
- a separate sandbox hosting service

unless a future curriculum requirement demonstrates that Pyodide is insufficient.

For the current curriculum, keep the Python execution layer lightweight.

---

# 5. What Pyodide Is Responsible For

Pyodide should provide:

- Python runtime
- code execution
- stdout capture
- stderr capture
- Python exceptions
- interactive practice
- challenge execution
- data exercises
- programming logic exercises

The reusable component should hide Pyodide-specific implementation details from the curriculum pages.

---

# 6. PythonRunner Component

Create a reusable component/service such as:

```text
components/
  sandbox/
    PythonRunner.tsx
```

or, depending on the existing project structure:

```text
lib/
  python/
    pyodide.ts

components/
  learning/
    PythonRunner.tsx
```

The exact folder structure should follow the existing project's conventions.

The important requirement is to keep Pyodide initialization and execution reusable.

---

# 7. Pyodide Initialization

Do not load and initialize Pyodide every time a student clicks "Run".

Create a reusable initialization mechanism.

Conceptually:

```text
First Python execution
        |
        v
Load Pyodide
        |
        v
Load required packages
        |
        v
Cache runtime
```

Subsequent executions should reuse the initialized runtime.

The UI should display a loading state such as:

```text
Preparing Python...
```

during initialization.

---

# 8. Browser-Only Execution

Pyodide depends on the browser environment.

Do not execute Pyodide during Next.js server-side rendering.

The Python runner should initialize only on the client.

Be careful with:

- SSR
- server components
- hydration
- browser-only globals
- WebAssembly loading

Use the project's existing Next.js conventions for client components.

---

# 9. Python Editor

The student should have a code editor.

Conceptually:

```text
┌─────────────────────────────────┐
│ Python Code                     │
│                                 │
│ import pandas as pd             │
│                                 │
│ data = [1, 2, 3]                │
│ print(data)                     │
│                                 │
└─────────────────────────────────┘

[ Run Code ]

Output
──────────────────────────────────
[1, 2, 3]
```

The editor should support:

- editing
- running
- clearing/resetting
- displaying output
- displaying errors

The implementation should reuse the project's existing editor conventions if one already exists.

Do not unnecessarily introduce a new editor library if an appropriate editor already exists.

---

# 10. Execution Result

Normalize Python execution into a predictable application-level result.

For example:

```ts
type PythonExecutionResult = {
  success: boolean
  stdout: string
  stderr: string
  error?: string
  executionTimeMs?: number
}
```

Example success:

```json
{
  "success": true,
  "stdout": "Hello World\n",
  "stderr": ""
}
```

Example error:

```json
{
  "success": false,
  "stdout": "",
  "stderr": "NameError: name 'x' is not defined"
}
```

The exact implementation can follow the existing TypeScript conventions.

---

# 11. Output Capture

Capture Python output properly.

For:

```python
print("Hello")
```

the UI should show:

```text
Hello
```

For:

```python
print(2 + 3)
```

the UI should show:

```text
5
```

For an exception:

```python
print(undefined_variable)
```

the student should receive useful error information.

Errors should be presented as learning feedback rather than as raw application errors.

---

# 12. Execution State

The Python runner should expose clear states.

At minimum:

```text
idle
loading
running
success
error
```

Example UI:

```text
Preparing Python...
```

then:

```text
Running...
```

then:

```text
Output
5
```

or:

```text
Python Error
NameError: ...
```

Prevent duplicate execution requests while code is already running where appropriate.

---

# 13. Week 3 — Data Skills

Week 3 is the most important package requirement for the Pyodide implementation.

The curriculum technology reference specifies:

```text
Pyodide
+
pandas
+
matplotlib
```

The implementation must verify that the selected Pyodide version/environment supports the required packages.

Do not assume package availability without testing it.

---

# 14. pandas

The Week 3 environment should support:

```python
import pandas as pd
```

Students should be able to perform the data operations required by the approved curriculum.

For example:

```python
import pandas as pd

data = {
    "name": ["Jane", "Brian", "Amina"],
    "score": [78, 84, 91]
}

df = pd.DataFrame(data)

print(df)
```

The exact exercises and datasets should come from the approved Week 3 curriculum content.

Do not invent additional official curriculum requirements.

---

# 15. matplotlib

The Week 3 environment should support:

```python
import matplotlib.pyplot as plt
```

Students should be able to produce the charts required by the curriculum.

Example:

```python
import matplotlib.pyplot as plt

names = ["Jane", "Brian", "Amina"]
scores = [78, 84, 91]

plt.bar(names, scores)
plt.show()
```

The application needs an appropriate way to display matplotlib output in the learning interface.

Do not simply print a Python representation of the chart.

The student should see the actual generated visualization where the lesson requires it.

---

# 16. Week 6 — Coding & Arduino Basics

The attached Week 6 curriculum identifies the coding component as:

```text
Coding logic:
Python Learning Track
```

with challenges such as:

```text
Blink Logic
Circuit Diagram Quiz
```

The Python environment should therefore teach and evaluate the **logic behind the Arduino concept**, not run Arduino/C++ code.

Example conceptual exercise:

```python
led_on = True

print(led_on)

led_on = False

print(led_on)
```

Another challenge could represent a sequence:

```python
sequence = ["ON", "OFF", "ON", "OFF"]

for state in sequence:
    print(state)
```

The exact exercises must follow the approved curriculum.

---

# 17. Arduino Simulation Is Separate

Do not attempt to make Pyodide:

- execute Arduino C++
- emulate an Arduino board
- control a physical Arduino
- simulate electrical circuits
- simulate sensors

The curriculum identifies Arduino/C++ execution and circuit simulation as separate gaps.

If an Arduino simulator is later added, it should be implemented as a separate integration, such as an iframe/external simulator.

Conceptually:

```text
Week 6
   |
   +---- Python logic
   |        |
   |      Pyodide
   |
   +---- Circuit simulation
            |
          Simulator
```

Keep these systems independent.

---

# 18. Week 7 — Traffic Light & Sensors

The Week 7 curriculum specifies Python challenges around:

- Traffic Light Logic
- Sensor Decision Tree

The Python runner should support these as normal Python exercises.

Example traffic-light logic:

```python
lights = ["red", "green", "yellow"]

for light in lights:
    print(light)
```

Example sensor decision logic:

```python
distance = 15

if distance < 10:
    print("STOP")
elif distance < 20:
    print("SLOW")
else:
    print("GO")
```

These examples are implementation illustrations only.

The actual challenge requirements should come from the approved curriculum.

---

# 19. Sensor Science Module

Week 7 also includes a Sensor Science reading module with embedded YouTube demonstrations for distance/ultrasonic sensors.

This does not require Pyodide.

Keep it separate:

```text
Sensor Science
    |
    +-- Reading
    +-- Explanation
    +-- YouTube embed
```

Pyodide is only needed for the Python coding challenges.

---

# 20. Challenge Execution vs Challenge Grading

There is an important distinction.

### Execution

Pyodide answers:

> What happens when the student's Python code runs?

### Grading

The challenge system answers:

> Did the student's solution satisfy the requirements?

Do not use source-code string matching.

Do not do:

```ts
code.includes(...)
```

Instead, execute the student's code and evaluate the actual result.

---

# 21. Lightweight Client-Side Grading

Because Pyodide is client-side, grading results can technically be manipulated by a knowledgeable user.

For the current curriculum and lightweight learning challenges, the implementation may use client-side evaluation initially.

However, the architecture should keep grading logic separate from the lesson UI.

Conceptually:

```text
Student Code
     |
     v
Pyodide
     |
     v
Challenge Tests
     |
     v
Pass / Fail / Score
```

Create a reusable grading abstraction rather than embedding test logic directly inside individual React components.

---

# 22. Challenge Grader

Conceptually create something like:

```text
lib/
  challenges/
    grader.ts
```

Possible interface:

```ts
gradePythonChallenge({
  code,
  challenge
})
```

The challenge definition can contain:

```text
challenge ID
instructions
starter code
expected behavior
test cases
scoring rules
```

The exact schema should fit the existing application's database/content architecture.

---

# 23. Do Not Put Secrets in Python

Student Python code must not have access to:

- Supabase keys
- service-role credentials
- Next.js secrets
- authentication tokens
- private API keys

Because execution happens in the browser, assume the student can inspect the runtime.

Never place secrets into the Pyodide environment.

---

# 24. API Routes After the Change

The current API routes should be reconsidered.

A generic:

```text
/api/sandbox/execute
```

route may no longer be necessary for normal execution because Pyodide executes locally.

Do not automatically delete it without checking existing callers.

Instead:

1. Search the project for all references to `/api/sandbox/execute`.
2. Determine whether anything depends on it.
3. Replace those callers with the Pyodide runner where appropriate.
4. Remove the mock route only after confirming it is no longer needed.

Similarly, `/api/challenges/submit` should be retained if it is useful for:

- recording submissions
- saving challenge attempts
- persisting scores
- recording completion

But it should no longer pretend that a server-side sandbox executed the code.

---

# 25. Submission Flow

A lightweight submission flow can be:

```text
Student clicks Submit
        |
        v
Run solution in Pyodide
        |
        v
Evaluate challenge
        |
        v
Create result
        |
        v
POST result to Next.js
        |
        v
Save ChallengeAttempt
        |
        v
Mark completion if passed
```

The server should validate the submission data and authorization before saving.

Do not trust the student's identity or student ID from arbitrary client input.

Use the authenticated session/user context.

---

# 26. Gamification

Do not implement the complete gamification system.

Continue using the existing placeholder architecture.

When a lesson is completed:

```ts
GamificationService.onLessonCompleted()
```

When a challenge is completed:

```ts
GamificationService.onChallengeCompleted()
```

For now these methods can simply log the event or return successfully.

Do not implement:

- XP
- badges
- leaderboard
- streaks
- achievement engine

The purpose is to make later integration easy without making it part of this task.

---

# 27. Performance

Pyodide can be relatively heavy to load initially.

The implementation should therefore:

- initialize lazily
- avoid loading it on pages that do not use Python
- reuse the initialized runtime
- show a clear loading state
- avoid reloading the runtime for every execution

Do not load Pyodide globally for every PawaTech page.

Weeks 1, 2, 4, 5, and 8 should not pay the Pyodide loading cost unless a page actually requires it.

---

# 28. Error Handling

Handle at least:

- Pyodide failed to load
- package failed to load
- Python syntax error
- Python runtime exception
- unsupported operation
- execution timeout/long-running code where practical
- browser/runtime failure

The UI should provide useful student-facing feedback.

Example:

```text
We couldn't run your Python code.
Check your code and try again.
```

rather than exposing internal stack traces or application implementation details.

---

# 29. Infinite Loops and Resource Use

Pyodide runs in the browser, so the platform does not have the same server-host compromise concerns as a remote execution service.

However, student code can still freeze or heavily consume the browser.

Consider reasonable client-side safeguards for the learning environment.

For example:

```python
while True:
    pass
```

should not be allowed to permanently freeze the learning page if a practical interruption mechanism can be implemented.

Do not over-engineer this before establishing that the curriculum actually needs advanced controls.

The priority is a stable, lightweight learning experience.

---

# 30. Testing Requirements

Before this work is considered complete, test the Python runner with:

### Basic Python

```python
print("Hello")
```

### Arithmetic

```python
print(10 + 20)
```

### Variables

```python
x = 10
y = 20
print(x + y)
```

### Conditional logic

```python
distance = 15

if distance < 10:
    print("STOP")
else:
    print("GO")
```

### Loop

```python
for i in range(3):
    print(i)
```

### Error

```python
print(undefined_variable)
```

### pandas

```python
import pandas as pd

df = pd.DataFrame({
    "score": [10, 20, 30]
})

print(df)
```

### matplotlib

```python
import matplotlib.pyplot as plt

plt.bar(["A", "B"], [10, 20])
plt.show()
```

### Week 6-style logic

Boolean and sequence exercise.

### Week 7-style logic

Traffic-light and sensor-threshold exercise.

---

# 31. Definition of Done

The Pyodide implementation is complete when:

- Real Python executes in the browser.
- The current mock execution behavior is removed from active use.
- Pyodide initializes lazily.
- Pyodide is reused after initialization.
- stdout is displayed.
- Python errors are displayed.
- pandas works for Week 3.
- matplotlib works for Week 3.
- Python boolean/sequence exercises work for Week 6.
- Python traffic/sensor logic works for Week 7.
- Challenge grading no longer relies on source-code string matching.
- Challenge results can be persisted through the existing application APIs.
- No Piston/Judge0 infrastructure is introduced.
- No Python secrets are exposed.
- Gamification remains a placeholder.
- Existing non-Python weeks do not unnecessarily load Pyodide.

---

# 32. What Codex Should NOT Do

Do not:

- build Piston
- build Judge0
- create a Docker sandbox
- create a remote Python execution server
- execute Arduino C++ through Pyodide
- attempt to simulate circuits through Pyodide
- implement the complete badge system
- implement XP
- implement leaderboards
- implement streaks
- implement Week 5's LLM API
- implement Week 8's showcase
- redesign unrelated curriculum components

---

# 33. Implementation Order

Codex should work in this order:

### Step 1 — Inspect existing implementation

Search for:

```text
/api/sandbox/execute
/api/challenges/submit
Python
Pyodide
sandbox
ChallengeAttempt
```

Understand existing callers and data models before modifying routes.

### Step 2 — Install/configure Pyodide

Add Pyodide using the approach most compatible with the existing Next.js project.

### Step 3 — Build the reusable Python runtime

Create the Pyodide initialization and execution layer.

### Step 4 — Build PythonRunner

Create the reusable UI component.

### Step 5 — Add output/error handling

Make basic Python execution reliable.

### Step 6 — Add pandas/matplotlib

Verify Week 3 requirements.

### Step 7 — Build reusable challenge grading

Remove mock string-based grading.

### Step 8 — Connect challenge results to existing APIs

Save results using the authenticated student context.

### Step 9 — Test Week 3/6/7 scenarios

Use representative challenges.

### Step 10 — Clean up mock APIs

Remove or refactor the old mock routes only after confirming their callers have been migrated.

---

# 34. Final Architecture

After this work, the Python learning architecture should look like:

```text
                         PAWATECH
                            |
                  ┌─────────┴─────────┐
                  |                   |
             Normal Lessons      Python Lessons
                                      |
                                      v
                                  PythonRunner
                                      |
                                      v
                                   Pyodide
                                      |
                         ┌────────────┼────────────┐
                         |            |            |
                       Week 3       Week 6       Week 7
                         |            |            |
                       Data        Arduino       Traffic /
                       Skills      Logic         Sensors
                         |
                    pandas /
                   matplotlib
```

Arduino simulation remains separate:

```text
Week 6
   |
   +-- Python logic → Pyodide
   |
   +-- Circuit simulation → future simulator/external integration
```

Week 7 video content remains separate:

```text
Week 7
   |
   +-- Python logic → Pyodide
   |
   +-- Sensor Science → YouTube embeds
```

---

# 35. Key Decision

The central implementation decision for this project is:

> **Use Pyodide as the lightweight, client-side Python execution environment for the current curriculum.**

The current curriculum does not require a heavy remote execution service for its Python activities.

Build the Python layer once, make it reusable, and use it for Weeks 3, 6, and 7.

Keep Arduino simulation and other external integrations separate.

Keep gamification as a placeholder.

After this infrastructure is working, proceed with the remaining curriculum implementation.
