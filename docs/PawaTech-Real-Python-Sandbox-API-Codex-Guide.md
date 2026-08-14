# PawaTech — Real Python Sandbox API Implementation
## Codex Context for Weeks 3, 6, and 7

### Purpose

This document gives Codex the context required to replace the current **mock Python sandbox API** with a real implementation before continuing development of Weeks 6 and 7.

The existing API files are mocks. They should **not** be treated as production implementations.

The goal is to create a secure, reusable Python execution service that can support:

- Week 3 — Microsoft Excel / Data Skills
- Week 6 — Arduino Basics
- Week 7 — Traffic Light & Sensors

The curriculum technology reference identifies Weeks **3, 6, and 7** as the weeks that require the Python code-execution sandbox.

---

# 1. Why This API Work Must Happen Now

Weeks 5–8 were reviewed against the current curriculum technology reference.

| Week | Module | API/Sandbox Requirement |
|---|---|---|
| 5 | AI & Prompt Engineering | LLM API, not the Python sandbox |
| 6 | Arduino Basics | Python execution + Wokwi |
| 7 | Traffic Light & Sensors | Python execution + video |
| 8 | Final Projects & Showcase | Supabase Storage/gallery, no Python sandbox |

Therefore, the existing Python API is not only a Week 3 concern.

It becomes shared infrastructure for Weeks 3, 6, and 7.

The correct approach is to fix the sandbox architecture **before building the remaining weeks**, rather than implementing three separate execution systems.

---

# 2. Existing Files

Two API route files currently exist.

They contain mock implementations.

## API 1 — Challenge Submission

The current route:

- accepts `{ code }`
- calls `/api/sandbox/execute`
- uses string matching to determine whether the challenge passed
- awards either 100 or 0
- returns mock feedback

Current mock grading logic effectively checks:

```ts
code.includes('pd.DataFrame') && code.includes('plot.bar')
```

This is not real grading.

It must eventually be replaced with proper challenge/test-case evaluation.

---

# 3. API 2 — Sandbox Execution

The second route currently pretends to execute Python.

It:

- accepts `{ code }`
- looks for `print(...)`
- extracts text from the print statement
- waits approximately 500ms
- returns a fabricated successful result

It does NOT execute Python.

It does NOT provide isolation.

It does NOT provide resource limits.

It does NOT protect the host system from untrusted code.

It is only a development mock.

---

# 4. Required Production Architecture

Do NOT execute arbitrary student Python directly inside the Next.js application.

The intended architecture is:

```text
Student Browser
      |
      v
Next.js / Vercel
      |
      | authenticated request
      v
Python Sandbox Service
(Piston or Judge0)
      |
      v
Isolated execution environment
      |
      v
Execution result
      |
      v
Next.js
      |
      v
Student
```

The Next.js application remains responsible for:

- authentication
- authorization
- curriculum
- lessons
- challenges
- progress
- persistence
- presenting results

The separate sandbox service is responsible only for:

- executing submitted code
- enforcing execution limits
- returning execution results

---

# 5. Important Architecture Rule

The sandbox service must NOT directly access Supabase.

Keep responsibilities separated:

```text
Next.js
    |
    +-- Auth
    +-- Students
    +-- Lessons
    +-- Progress
    +-- Challenge Attempts
    +-- Grading orchestration
    |
    v
Sandbox Service
    |
    +-- Execute code
    +-- Return stdout/stderr
    +-- Return execution status
```

This keeps the sandbox narrow and easier to secure.

---

# 6. Sandbox Technology

Use an established execution engine:

- Piston
- OR Judge0

Do not build a custom Docker/code-isolation system.

The curriculum reference explicitly recommends using an established purpose-built execution engine because safely running untrusted code is a difficult security problem.

Before finalizing the implementation, make a practical choice between Piston and Judge0 and document the choice.

---

# 7. Two Execution Modes

The platform should distinguish between:

## A. Practice Execution

Used while students are learning.

Technology:

```text
Pyodide
```

Pyodide runs Python in the browser.

Purpose:

- immediate feedback
- experimentation
- low-latency execution

Pyodide results are NOT authoritative for grading.

A student should be able to:

```text
Write code
    ↓
Run Code
    ↓
Pyodide
    ↓
See output
```

---

## B. Graded Submission

Used when the student submits a challenge.

Technology:

```text
Piston or Judge0
```

Flow:

```text
Student
   ↓
Submit Challenge
   ↓
Next.js API
   ↓
Authenticated Sandbox Request
   ↓
Piston/Judge0
   ↓
Isolated execution
   ↓
Test cases
   ↓
Pass/fail + score
   ↓
Next.js
   ↓
ChallengeAttempt
```

Only this server-side execution should determine the authoritative challenge result.

---

# 8. Security Requirements

The production sandbox MUST enforce:

### Isolation

Student code must not have:

- host filesystem access
- access to other students' data
- access to application secrets
- access to Supabase credentials
- access to the Next.js runtime
- access to other sandbox processes

### Network

Student code should have no outbound network access unless a future curriculum requirement explicitly requires it.

For Weeks 3, 6, and 7, there is no need for arbitrary internet access from student Python code.

### Resource limits

Enforce:

- execution timeout
- CPU limits
- memory limits
- output limits

Runaway code such as:

```python
while True:
    pass
```

must terminate safely.

Code attempting to consume excessive memory must also be terminated.

---

# 9. Authentication Between Next.js and Sandbox

The sandbox endpoint must NOT be public and unauthenticated.

The Next.js backend should authenticate requests using a server-side secret.

Conceptually:

```ts
await fetch(process.env.SANDBOX_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SANDBOX_SECRET}`,
  },
  body: JSON.stringify(payload),
})
```

The secret must:

- exist only on the server
- never be sent to the browser
- never be committed to Git
- never appear in client-side JavaScript

The exact authentication mechanism may be improved if Piston/Judge0 provides a better supported mechanism.

---

# 10. API Contract

Create a stable internal contract so Weeks 3, 6, and 7 do not care which sandbox engine is being used.

### Execute request

Conceptually:

```json
{
  "language": "python",
  "version": "...",
  "code": "print('Hello')",
  "stdin": ""
}
```

The exact fields should match the selected engine.

The application should normalize the engine-specific response into a PawaTech response.

---

# 11. Normalized Execution Response

The Next.js application should receive a predictable structure such as:

```json
{
  "success": true,
  "status": "completed",
  "stdout": "Hello\n",
  "stderr": "",
  "exitCode": 0,
  "executionTimeMs": 120
}
```

For failure:

```json
{
  "success": false,
  "status": "error",
  "stdout": "",
  "stderr": "NameError: ...",
  "exitCode": 1
}
```

For timeout:

```json
{
  "success": false,
  "status": "timeout",
  "stdout": "",
  "stderr": "Execution timed out",
  "exitCode": null
}
```

The frontend should not need to understand whether the underlying engine is Piston or Judge0.

---

# 12. Grading Must Be Separate From Execution

Do not mix generic sandbox execution with curriculum-specific grading.

The sandbox should answer:

> What happened when this code executed?

The challenge grader should answer:

> Did the student's solution satisfy this challenge?

Architecture:

```text
Code
 ↓
Sandbox
 ↓
Execution Result
 ↓
Challenge Grader
 ↓
Pass / Score / Feedback
```

This is important because different weeks will have different challenge requirements.

---

# 13. Challenge Grading

Replace the current mock:

```ts
code.includes(...)
```

with actual evaluation.

A challenge should define its requirements/test cases.

Conceptually:

```text
Challenge
  |
  +-- instructions
  +-- starter code
  +-- test cases
  +-- scoring rules
```

Student submission:

```text
Student Code
      ↓
Sandbox
      ↓
Test Case 1
Test Case 2
Test Case 3
      ↓
Score
```

Hidden tests should remain server-side.

Students should not be able to retrieve hidden test cases from the client.

---

# 14. Week 3 Requirements

Week 3 is the first curriculum week that uses this infrastructure.

The technology reference specifies:

```text
Pyodide
+
Piston/Judge0
+
pandas
+
matplotlib
```

The sandbox environment must therefore be tested for:

```python
import pandas as pd
import matplotlib.pyplot as plt
```

Do NOT assume these libraries are available.

Verify them in the selected execution image.

This is specifically identified as an open item in the curriculum technology reference.

---

# 15. Week 6 Requirements

Week 6 is:

```text
Arduino Basics
```

It uses:

```text
Pyodide
+
Piston/Judge0
+
Wokwi iframe
```

The Python sandbox is used for the programming/logic challenges.

Wokwi handles the circuit simulation separately.

Architecture:

```text
Arduino Lesson
      |
      +------------------+
      |                  |
      v                  v
Python Challenge       Wokwi
      |               Simulation
      v
Piston/Judge0
```

Do NOT attempt to make the Python sandbox simulate the Arduino circuit.

Wokwi remains an iframe-based circuit simulation.

---

# 16. Week 7 Requirements

Week 7 is:

```text
Traffic Light & Sensors
```

It uses the same Python sandbox infrastructure:

```text
Pyodide
+
Piston/Judge0
```

It also uses YouTube iframe embeds for video content.

The sandbox should therefore be reusable without modification for Week 7.

---

# 17. Week 5 Does Not Depend on This Sandbox

Week 5 is:

```text
AI & Prompt Engineering
```

Its API requirement is an LLM API called from a Next.js server route.

It is separate from the Python sandbox.

Do not add AI API functionality to this sandbox project.

The AI API should be implemented separately when Week 5 is developed.

---

# 18. Week 8 Does Not Depend on This Sandbox

Week 8 is:

```text
Final Projects & Showcase
```

Its technology requirement is primarily:

```text
Supabase Storage
+
Showcase Gallery
```

Video should preferably be linked through YouTube rather than storing raw video files.

The Python sandbox does not need to be modified specifically for Week 8.

---

# 19. Recommended Route Structure

Keep the application routes conceptually separated.

```text
/api/sandbox/execute
    |
    +-- generic Python execution

/api/challenges/submit
    |
    +-- challenge submission
    +-- calls sandbox
    +-- performs grading
    +-- records result
```

Do not make `/api/sandbox/execute` perform Week 3-specific grading.

It must remain generic.

---

# 20. Current Mock → Target Implementation

## Current

```text
/api/challenges/submit
       |
       v
string matching
       |
       v
100 / 0
```

## Target

```text
/api/challenges/submit
       |
       v
validate request
       |
       v
load challenge definition
       |
       v
send code to sandbox
       |
       v
run hidden/public tests
       |
       v
calculate score
       |
       v
save ChallengeAttempt
       |
       v
return result
```

---

# 21. Error Handling

The API must distinguish between:

- invalid request
- authentication failure
- sandbox unavailable
- execution timeout
- execution error
- compilation/syntax error
- challenge failure
- internal server error

Do not return HTTP 200 for every failure.

Use meaningful HTTP status codes where appropriate.

Do not expose internal infrastructure errors to students.

For example, students should see:

```text
The code could not be executed right now.
Please try again.
```

rather than:

```text
ECONNREFUSED 10.0.0.5:8080
```

Detailed infrastructure errors should remain in server logs.

---

# 22. Rate Limiting

Because code execution consumes server resources, the API should eventually include rate limiting.

At minimum, consider limits for:

- executions per student
- submissions per challenge
- requests per minute

Do not allow a student to send unlimited sandbox requests.

The exact limits can be configured after observing actual usage.

---

# 23. Logging

Log enough information to diagnose failures without logging sensitive data unnecessarily.

Useful server-side fields:

```text
student ID
challenge ID
execution status
execution duration
sandbox status
timestamp
```

Avoid logging:

- authentication secrets
- API keys
- unnecessary personal data

---

# 24. Do Not Implement Gamification Here

The existing project intentionally uses a placeholder gamification service.

The sandbox API should NOT:

- award XP
- award badges
- update leaderboards
- manage streaks
- unlock achievements

The challenge layer may report:

```text
passed
score
```

The existing/future gamification service can consume that event later.

---

# 25. Deliverables for Codex

Before moving on to the remaining curriculum implementation, Codex should complete:

### 1. Sandbox provider decision

Choose:

```text
Piston
OR
Judge0
```

Document why.

### 2. Real sandbox service

Replace the mocked execution route with a real isolated execution service.

### 3. Secure communication

Implement authenticated communication between:

```text
Next.js
↔
Sandbox Service
```

### 4. Normalized API response

Create a stable PawaTech execution response independent of the chosen provider.

### 5. Real challenge grading

Remove:

```ts
code.includes(...)
```

and implement proper challenge/test-case grading.

### 6. Resource limits

Implement and test:

- timeout
- memory
- CPU
- output limits

### 7. Python dependencies

Verify:

```python
pandas
matplotlib
```

for Week 3.

### 8. Reusable design

Ensure the same infrastructure can support:

```text
Week 3
Week 6
Week 7
```

without creating separate sandbox implementations.

### 9. Documentation

Document:

- environment variables
- local development setup
- production deployment
- sandbox URL
- authentication
- supported Python version
- installed libraries
- limits
- API request/response format

---

# 26. Definition of Done

This task is complete when a developer can run:

```text
Student
  ↓
Next.js
  ↓
Submit Python code
  ↓
Authenticated sandbox
  ↓
Real Python execution
  ↓
Normalized result
  ↓
Challenge grading
  ↓
Pass/fail + score
```

and the result is produced by actual isolated Python execution rather than mock heuristics.

The implementation must be reusable for Weeks 3, 6, and 7.

---

# 27. Important Context for Codex

This is not a request to build Week 3, 6, or 7 curriculum content yet.

This task is specifically to replace the current **mock sandbox API infrastructure** with the real reusable infrastructure required by those weeks.

After this work is complete:

1. Verify the sandbox independently.
2. Verify pandas/matplotlib support.
3. Verify timeout/resource limits.
4. Verify authenticated communication.
5. Verify real challenge grading.
6. Then proceed with building Weeks 5–8.

Do not redesign unrelated curriculum features during this task.

Do not implement the full gamification system.

Do not implement the Week 5 AI API.

Do not implement the Week 8 showcase.

The objective is to make the Python execution infrastructure production-ready enough for the curriculum features that depend on it.
