# PawaTech Weeks 3 & 4 Implementation Guide

## Purpose

This document is a Codex implementation guide for **Week 3** and **Week 4** of the PawaTech curriculum.

The implementation should follow the same philosophy used for Weeks 1 and 2:

- Build the learning experience first.
- Save student progress.
- Keep gamification lightweight.
- Do not implement the full badge/XP/leaderboard system yet.
- Keep clear hooks/placeholders so the complete gamification system can be connected later.

Week 3 introduces the platform's first **Python code-execution environment**.

Week 4 does **not** require Python execution. It uses external Canva resources and a safely sandboxed HTML/CSS preview.

---

# 1. General Architecture

The application remains:

```text
Next.js
   |
   +-- Learning UI
   |
   +-- Lesson Progress
   |
   +-- Challenge Submission
   |
   +-- Supabase
   |
   +-- Python Sandbox
          |
          +-- Pyodide
          |
          +-- Piston/Judge0
```

For Week 3, separate **practice execution** from **graded execution**.

### Practice

Use:

```text
Pyodide
```

This runs Python in the student's browser and provides immediate feedback.

### Graded Submission

Use:

```text
Piston OR Judge0
```

The final submission must be executed server-side in an isolated environment.

Do not build a custom Python sandbox.

The curriculum reference specifically recommends established execution engines because running untrusted code safely is a security-sensitive problem.

---

# 2. Gamification

Do not implement:

- XP system
- Badges
- Leaderboards
- Streaks
- Achievement engine

Continue using the placeholder service from Weeks 1 and 2.

```ts
GamificationService.onLessonCompleted()
GamificationService.onChallengeCompleted()
```

For now these can simply log the event or return successfully.

The important thing is that Week 3 and Week 4 use the same interface.

Later:

```text
Lesson
   ↓
GamificationService
   ↓
XP
Badges
Achievements
Leaderboard
Streaks
```

No lesson should contain its own XP or badge logic.

---

# 3. Week 3 — Microsoft Excel / Data Skills

## Track

Use the topic-based track:

```text
data-skills
```

Route:

```text
/learn/data-skills
```

Do not use:

```text
/learn/week-3
```

The curriculum architecture specifies that learning tracks should be topic-based rather than week-based.

---

# 4. Week 3 Technology

Required technology:

```text
Pyodide
Piston or Judge0
pandas
matplotlib
```

The curriculum reference identifies Week 3 as the first week requiring the Python sandbox. It also specifically requires pandas and matplotlib to be available in the execution environment.

Before considering Week 3 complete, verify that the selected sandbox image actually supports:

```python
import pandas as pd
import matplotlib.pyplot as plt
```

This is an explicit open item in the technology reference and should not be assumed.

---

# 5. Week 3 Learning Experience

The implementation should teach students practical data skills through an interactive environment rather than presenting only static text.

The exact lesson content should come from the approved curriculum content.

Do not invent additional official curriculum topics inside the database.

Each lesson should support:

- Explanation
- Example
- Interactive activity
- Practice
- Completion
- Progress saving

---

# 6. Excel/Data Interface

Build a simple spreadsheet-style interface.

The student should be able to interact with tabular data.

The interface can contain:

```text
+------------------------------------------------+
| Data Skills                                    |
+------------------------------------------------+
| Name       | Age | County    | Score           |
| Jane       | 14  | Nairobi   | 78              |
| Brian      | 15  | Kiambu    | 84              |
| Amina      | 14  | Mombasa   | 91              |
+------------------------------------------------+
```

The first version does not need to reproduce Microsoft Excel completely.

Focus on the concepts required by the curriculum.

---

# 7. Python Practice Area

Provide a code editor next to or below the data activity.

Example:

```python
import pandas as pd

data = {
    "name": ["Jane", "Brian", "Amina"],
    "score": [78, 84, 91]
}

df = pd.DataFrame(data)

print(df)
```

Student clicks:

```text
Run Code
```

Pyodide executes the code locally.

Display:

```text
Output
```

below the editor.

---

# 8. Python Sandbox UX

The student should see something similar to:

```text
┌─────────────────────────────┐
│ Python Code                 │
│                             │
│ import pandas as pd         │
│ ...                         │
│                             │
└─────────────────────────────┘

[ Run Code ]

Output
─────────────────────────────
...
```

The interface should make it clear that this is a practice environment.

Do not expose infrastructure details such as:

- Piston
- Judge0
- Docker
- server URLs
- API keys

to the student.

---

# 9. Practice vs Grading

This distinction is important.

## Run Code

Uses:

```text
Pyodide
```

Purpose:

```text
Learning + instant feedback
```

It should NOT be treated as authoritative grading.

## Submit Challenge

Uses:

```text
Next.js API
     ↓
Piston/Judge0
     ↓
Isolated execution
     ↓
Test results
```

Only the server-side result should determine whether a challenge has passed.

This follows the sandbox architecture in the curriculum reference.

---

# 10. Week 3 Challenge

Create a final practical data challenge.

The challenge should require students to apply the data skills taught during the week.

The challenge should support:

```text
Code editor
+
Dataset
+
Instructions
+
Run Code
+
Submit
```

Example structure:

```text
Challenge

You have been given a dataset.

Your task is to:

1. Load the data.
2. Examine the data.
3. Perform the required operation.
4. Produce the required result.

[Run Code]

[Submit Challenge]
```

The exact challenge requirements should be based on the approved curriculum content.

---

# 11. Grading

Do not grade by comparing only the student's displayed output.

Use predefined test cases where appropriate.

Conceptually:

```text
Student Code
      ↓
Sandbox
      ↓
Test Cases
      ↓
Pass / Fail
```

The server should return something like:

```json
{
  "passed": true,
  "score": 100
}
```

or:

```json
{
  "passed": false,
  "score": 60,
  "feedback": "The expected result was not produced."
}
```

Do not expose hidden test cases to students.

---

# 12. Sandbox Security

The Week 3 sandbox must enforce:

- Execution timeout
- Memory limits
- CPU limits
- No host filesystem access
- No outbound network access
- Isolation from other students
- Controlled stdout/output

These requirements are explicitly identified in the technology reference.

Do not implement sandbox isolation from scratch.

---

# 13. Sandbox Hosting

Do not run Piston/Judge0 directly inside Vercel serverless functions.

Recommended architecture:

```text
                 ┌──────────────────┐
                 │    Next.js       │
                 │     Vercel       │
                 └────────┬─────────┘
                          │
                          │ authenticated request
                          ▼
                 ┌──────────────────┐
                 │ Piston / Judge0  │
                 │ Fly/Railway/etc.│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Isolated Runtime │
                 └──────────────────┘
```

The reference recommends keeping the sandbox as a separate service because these engines are designed to manage long-running isolated containers.

The Next.js application should authenticate requests to the sandbox using a server-side secret.

Never expose that secret to the browser.

---

# 14. Week 3 Progress

Continue using:

```text
LessonProgress
```

Suggested fields:

```text
id
student_id
lesson_id
completed
score
completed_at
```

For challenges, use the existing challenge-attempt pattern.

The sandbox result should determine:

```text
passed
```

for a graded challenge.

---

# 15. Week 4 — Graphic Design & Internet Safety

Week 4 is different from the other weeks.

It consists of two separate areas:

```text
Graphic Design
+
Internet Safety
```

The curriculum architecture specifically identifies Week 4 as an exception because it can map to multiple learning components rather than a single track.

Do not force both areas into one artificial lesson structure.

---

# 16. Internet Safety Track

Use:

```text
digital-citizenship
```

Route:

```text
/learn/digital-citizenship
```

This should be implemented as a normal Learning Track.

Lessons should contain:

- Educational content
- Examples
- Interactive questions
- Scenarios
- Completion tracking

The exact lesson content should come from the approved curriculum.

---

# 17. Internet Safety Activities

Prefer scenario-based activities.

Example:

```text
You receive a message from someone you don't know
asking for your password.

What should you do?

○ Send the password
○ Ignore/report the message
○ Ask for their password
○ Share it with friends
```

Another possible interaction:

```text
Safe
Unsafe
```

Students classify different online behaviours.

The important implementation requirement is that the activities remain interactive and progress can be saved.

---

# 18. Graphic Design

Graphic Design does not need a full Canva integration.

The technology reference explicitly specifies:

```text
Canva
External link
No integration
```

Therefore:

```text
[Open Canva]
```

can simply open the approved Canva resource externally.

Do not attempt to build a Canva API integration for Week 4.



---

# 19. HTML/CSS Design Playground

Week 4 can also provide a lightweight HTML/CSS practice environment.

This is NOT a Python sandbox.

The student can write:

```html
<h1>My Poster</h1>
<p>Welcome to my design.</p>
```

and CSS:

```css
h1 {
    font-size: 32px;
}

p {
    text-align: center;
}
```

Then show the result in a preview panel.

---

# 20. HTML/CSS Preview Security

Use a sandboxed iframe.

Conceptually:

```text
┌───────────────────────────┐
│ HTML/CSS Editor           │
│                           │
│ <h1>Hello</h1>            │
│                           │
└───────────────────────────┘

            ↓

┌───────────────────────────┐
│ Live Preview              │
│                           │
│        Hello              │
│                           │
└───────────────────────────┘
```

The preview is for static HTML/CSS.

It is NOT an arbitrary JavaScript execution environment.

Use the iframe `sandbox` attribute with restricted permissions.

The technology reference explicitly states that Week 4 requires an iframe-rendering approach rather than a code-execution sandbox.

---

# 21. Do Not Build This for Week 4

Do NOT build:

- Python execution
- Node.js execution
- arbitrary JavaScript execution
- Canva API integration
- custom graphic-design software
- image-processing infrastructure

Keep the implementation lightweight.

---

# 22. Week 4 Final Activity

The final activity should combine the concepts taught during the week.

For example:

```text
Internet Safety Scenario
+
Simple Design Task
```

Students complete the required activities and submit/finish the learning experience.

The exact requirements should follow the approved curriculum content.

---

# 23. Gamification Integration

Both Week 3 and Week 4 should use the same placeholder methods:

```ts
GamificationService.onLessonCompleted()
```

and, where applicable:

```ts
GamificationService.onChallengeCompleted()
```

For now:

```ts
async onLessonCompleted() {
    console.log("Gamification placeholder");
}

async onChallengeCompleted() {
    console.log("Gamification placeholder");
}
```

Do not create Week 3-specific or Week 4-specific reward systems.

---

# 24. Reusable Components

Where possible, build reusable components.

```text
LessonLayout
ProgressBar
Quiz
ScenarioQuestion
CodeEditor
PythonRunner
DataTable
ChallengeScreen
HtmlCssEditor
LivePreview
ExternalResourceCard
```

Week 3:

```text
CodeEditor
PythonRunner
DataTable
ChallengeScreen
```

Week 4:

```text
ScenarioQuestion
HtmlCssEditor
LivePreview
ExternalResourceCard
```

---

# 25. Suggested API Structure

```text
/api/progress
/api/challenges/submit
/api/sandbox/execute
```

The browser should NOT call the sandbox service directly for graded submissions.

Instead:

```text
Browser
   ↓
Next.js API
   ↓
Sandbox Service
```

This keeps the sandbox service protected.

---

# 26. Suggested Folder Structure

```text
app/
  learn/
    data-skills/
      page.tsx
      lesson-1/
      lesson-2/
      ...
      challenge/

    digital-citizenship/
      page.tsx
      lesson-1/
      lesson-2/
      ...
```

Reusable components:

```text
components/
  learning/
    LessonLayout.tsx
    ProgressBar.tsx
    Quiz.tsx
    ScenarioQuestion.tsx
    ChallengeScreen.tsx

  sandbox/
    CodeEditor.tsx
    PythonRunner.tsx
    DataTable.tsx

  design/
    HtmlCssEditor.tsx
    LivePreview.tsx
```

---

# 27. Important Database Principle

Do not create separate progress systems for every week.

Use the common:

```text
LearningTrack
Lesson
LessonProgress
Challenge
ChallengeAttempt
```

pattern.

This allows future Weeks 5–8 to reuse the same infrastructure.

The curriculum reference proposes `LearningTrack`, `Lesson`, `CurriculumWeek`, and `LessonProgress` specifically for this purpose.

---

# 28. Definition of Done — Week 3

Week 3 is complete when:

- The `data-skills` track exists.
- Lessons can be displayed and completed.
- Student progress is saved.
- Python code can run through Pyodide.
- Required pandas/matplotlib support has been verified.
- Students can see execution output.
- Final submissions can be sent to the server.
- Piston/Judge0 executes submissions securely.
- Challenge results are recorded.
- The gamification placeholder is called.
- No badge/XP/leaderboard system is implemented.

---

# 29. Definition of Done — Week 4

Week 4 is complete when:

- The Internet Safety learning track exists.
- Student progress is saved.
- Interactive safety scenarios work.
- Graphic Design resources can link to Canva externally.
- HTML/CSS practice can be displayed.
- Live preview works inside a restricted iframe.
- No arbitrary code-execution environment is exposed.
- The gamification placeholder is called.
- No badge/XP/leaderboard system is implemented.

---

# 30. Critical Implementation Notes for Codex

### Do not overbuild.

Week 3 is the first technically complex week because of the Python sandbox.

Build the sandbox as a reusable infrastructure component rather than something tightly coupled to one challenge.

```text
PythonSandbox
      ↓
Week 3
      ↓
Week 6
      ↓
Week 7
```

The same infrastructure will later support the other Python-based weeks. The reference explicitly identifies Weeks 3, 6, and 7 as the weeks requiring the code-execution sandbox.

### Week 4 should remain simple.

```text
Internet Safety
    ↓
Normal Learning Track

Graphic Design
    ↓
External Canva resources
+
Static HTML/CSS preview
```

Do not turn Week 4 into another sandbox project.

### Future-proof the interfaces.

The implementation should make it possible to add:

```text
XP
Badges
Achievements
Streaks
Leaderboards
```

later without rewriting the lessons or challenges.

---

# Final Architecture

After Weeks 1–4:

```text
                    PAWATECH LEARNING
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Learning Tracks              Challenges
             │                           │
       ┌─────┴─────┐              ┌──────┴──────┐
       │           │              │             │
   Week 1/2     Week 4         Week 2        Week 3
       │           │                            │
       │           │                     Python Sandbox
       │           │                     ┌──────┴──────┐
       │           │                  Pyodide       Piston/
       │           │                                Judge0
       │
       └────────────── Progress ─────────────────────┘
                              │
                       GamificationService
                              │
                         PLACEHOLDER
                              │
                    Future XP / Badges /
                  Achievements / Leaderboard
```

The goal is to make Weeks 3 and 4 fully functional while keeping the architecture reusable for Weeks 5–8.