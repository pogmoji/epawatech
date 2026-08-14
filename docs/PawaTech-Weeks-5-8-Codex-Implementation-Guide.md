# PawaTech — Weeks 5–8 Codex Implementation Guide

## Purpose

Implement the remaining PawaTech curriculum:

- Week 5 — AI & Prompt Engineering
- Week 6 — Coding & Arduino Basics
- Week 7 — Traffic Light & Sensors
- Week 8 — Final Projects & Showcase

The Pyodide Python execution layer should already be active and working before this task begins.

Use the existing architecture wherever possible. Do not implement the full gamification system yet.

---

## 1. Current Architecture

Core stack:

- Next.js
- Supabase
- Pyodide for client-side Python execution

Pyodide is reused by Weeks 6 and 7. Do not introduce Piston, Judge0, Docker, or a remote Python execution service.

Gamification remains a placeholder:

```ts
GamificationService.onLessonCompleted()
GamificationService.onChallengeCompleted()
```

Do not implement XP, badges, leaderboards, streaks, or achievements.

---

# Week 5 — AI & Prompt Engineering

## Technology

The curriculum specifies a Claude or Gemini API called from a Next.js server route. This is an LLM API, not Python execution. API keys must never be exposed client-side. The curriculum also flags rate limiting, cost controls, and content moderation/guardrails because the platform serves minors. fileciteturn3file0

## Track

Use the topic-based route:

```text
/learn/ai-and-prompting
```

Do not use `/learn/week-5`.

Use the approved curriculum content for lessons. Do not invent official curriculum requirements where the source does not specify them.

## AI API

Create/reuse a server-side route such as:

```text
/api/ai/chat
```

Flow:

```text
Student
  ↓
Prompt UI
  ↓
Next.js API route
  ↓
Claude/Gemini
  ↓
Normalized response
  ↓
Student
```

The server route must:

1. Authenticate the student.
2. Validate input.
3. Apply basic rate limiting.
4. Apply the project's safety/guardrail layer.
5. Call the configured provider.
6. Return a normalized response.
7. Keep API secrets server-side.

Do not use `NEXT_PUBLIC_*` variables for provider secrets.

## Provider abstraction

Avoid tying lessons directly to one provider.

Use a small server-side adapter/provider abstraction so Claude or Gemini can be changed later without rewriting lessons.

Conceptually:

```text
AIProvider
 ├── Claude
 └── Gemini
```

or an equivalent simple adapter.

## AI UI

Create/reuse a component with:

- prompt input
- Ask AI button
- loading state
- response area
- error state
- retry where appropriate

Do not put provider-specific API calls in lesson components.

## Safety

Provide a modular location for:

- input moderation
- output moderation where appropriate
- system instructions
- topic restrictions
- safety messaging

Do not assume the model itself is the application's complete safety layer.

## Challenge

Week 5 is a hybrid:

```text
Learning Track + Challenge
```

Use the approved Week 5 challenge requirements. Connect it to the existing Challenge/ChallengeAttempt architecture. Do not invent unsupported scoring rules.

## Definition of Done

- AI track works.
- Approved lessons work.
- AI interaction works through a server route.
- API keys remain server-side.
- Basic rate limiting exists.
- Safety/guardrail hooks exist.
- Challenge functionality works where required.
- Progress saves.
- Gamification placeholder fires.
- No full gamification system is implemented.

---

# Week 6 — Coding & Arduino Basics

## Technology

The curriculum uses:

```text
Pyodide
+
Python logic challenges
+
Wokwi iframe
```

The attached curriculum identifies a major gap around running Arduino/C++ code and simulating circuits. Therefore Python is for **programming logic**, not Arduino/C++ execution.

## Python

Reuse the existing `PythonRunner`.

Use it for the approved coding-logic challenges, including concepts such as:

- boolean logic
- sequences
- Blink Logic

Example only:

```python
led_on = True
print(led_on)

led_on = False
print(led_on)
```

Do not create another Python execution system.

## Arduino/Circuit Simulation

Use Wokwi as a separate integration.

Architecture:

```text
Week 6
 ├── Python logic → Pyodide
 └── Circuit simulation → Wokwi
```

Do not make Pyodide:

- execute Arduino/C++
- emulate an Arduino
- simulate electrical circuits
- control physical hardware

Create/reuse a `WokwiEmbed` component and use the approved simulator resources.

## Circuit Diagram Quiz

The curriculum identifies a Circuit Diagram Quiz as an offline component. If implemented digitally, use normal quiz/diagram components rather than the Python sandbox.

## Definition of Done

- Arduino Basics content works.
- Python logic challenges use existing Pyodide.
- Circuit Diagram Quiz works where required.
- Wokwi embed works where required.
- Challenge results and progress save.
- Gamification placeholder fires.
- No Arduino/C++ execution is falsely represented.
- No second Python sandbox is created.

---

# Week 7 — Traffic Light & Sensors

## Technology

Use:

```text
Pyodide
+
YouTube iframe embeds
```

Reuse the existing Python runner.

## Traffic Light Logic

Implement the approved Traffic Light Logic challenge using Python sequence/timing logic.

Flow:

```text
Student Code
 ↓
Pyodide
 ↓
Challenge Evaluation
 ↓
Result
```

## Sensor Decision Tree

Implement the approved Sensor Decision Tree challenge using Python `if/else` distance-threshold logic.

Example only:

```python
distance = 15

if distance < 10:
    print("STOP")
elif distance < 20:
    print("SLOW")
else:
    print("GO")
```

Use the actual curriculum requirements for the final challenge.

## Sensor Science

The curriculum calls for a Sensor Science reading module with YouTube demonstrations for distance/ultrasonic sensors.

Create/reuse:

```text
YouTubeEmbed
```

Do not download or host the videos.

## Project

Implement the approved Week 7 project requirements using the existing lesson/challenge/progress architecture.

## Definition of Done

- Traffic Light Logic works.
- Sensor Decision Tree works.
- Both use Pyodide.
- Sensor Science reading works.
- YouTube embeds work.
- Project/challenge functionality works.
- Progress saves.
- Gamification placeholder fires.

---

# Week 8 — Final Projects & Showcase

## Technology

The curriculum specifies:

```text
Supabase Storage
+
Showcase Gallery
```

There is no Python requirement.

## Final Project Submission

Use Supabase Storage for image/photo uploads.

Do not create another file-storage backend.

Before adding tables/buckets, inspect the existing Supabase schema and reuse existing project/submission infrastructure if present.

## Upload Component

Create/reuse a component such as:

```text
ProjectUpload
```

It should support:

- file selection
- type validation
- size validation
- upload progress where practical
- success state
- error state
- retry

Do not build video transcoding.

## Video

The curriculum recommends linking to YouTube rather than storing raw video files.

Where a student has a video:

```text
YouTube URL
```

should be stored with the project rather than uploading a large raw video file.

Validate the URL before saving.

## Showcase Gallery

Create/reuse a simple gallery:

```text
Final Projects
------------------------------
[Project] [Project] [Project]
[Project] [Project] [Project]
------------------------------
```

Project cards may contain:

- title
- permitted attribution
- description
- image
- optional video
- project details

Respect the existing application's privacy/authorization model.

## Moderation

Do not automatically publish every student project.

If the existing schema has moderation/status fields, reuse them.

If no suitable state exists and a state is genuinely required, use a lightweight model such as:

```text
draft
submitted
approved
rejected
```

Only approved projects should appear in the showcase.

## Definition of Done

- Final project submission works.
- Images/photos upload to Supabase Storage.
- File validation works.
- YouTube video links work where appropriate.
- Showcase gallery works.
- Approval status is respected.
- Progress saves.
- Gamification placeholder fires.

---

# Shared Architecture

Continue using the existing common models/components:

```text
LearningTrack
Lesson
LessonProgress
Challenge
ChallengeAttempt
GamificationService
PythonRunner
```

Do not create separate progress systems for each week.

Use topic-based routes, not week-based routes.

Examples:

```text
/learn/ai-and-prompting
/learn/data-skills
/learn/digital-citizenship
```

---

# Suggested Reusable Components

Inspect the project first and reuse existing components.

Potential components:

```text
LessonLayout
ProgressBar
Quiz
ChallengeScreen
PythonRunner
YouTubeEmbed
WokwiEmbed
ExternalResourceCard
FileUpload
ProjectUpload
ProjectCard
ProjectGallery
```

Do not create duplicates if equivalent components already exist.

---

# Implementation Order

Because Pyodide will already be active, implement all remaining weeks as one coordinated task:

## Step 1 — Inspect

Search for:

```text
LearningTrack
Lesson
LessonProgress
Challenge
ChallengeAttempt
GamificationService
PythonRunner
Supabase Storage
```

Also inspect existing authentication, database, upload, and API patterns.

## Step 2 — Week 5

Implement:

```text
AI track
AI UI
server-side AI route
provider abstraction
rate limiting
safety/guardrail hooks
challenge/progress integration
```

## Step 3 — Week 6

Implement:

```text
Arduino content
Python logic challenges
Wokwi integration
Circuit Diagram Quiz
progress/challenge integration
```

## Step 4 — Week 7

Implement:

```text
Traffic Light Logic
Sensor Decision Tree
Sensor Science
YouTube embeds
project/challenge integration
```

## Step 5 — Week 8

Implement:

```text
Final project submission
Supabase Storage
YouTube URL support
Showcase gallery
project cards
approval/moderation state
```

## Step 6 — Cross-Week Verification

Verify:

- navigation
- lesson completion
- progress persistence
- challenge completion
- Pyodide still works
- AI API works
- Wokwi embeds work
- YouTube embeds work
- Supabase uploads work
- showcase works
- gamification placeholder events fire

---

# Important Constraints

Do NOT:

- replace working Pyodide
- add Piston/Judge0
- create remote Python infrastructure
- expose AI API keys client-side
- create a Canva API integration
- build an Arduino simulator
- execute Arduino/C++ through Pyodide
- download/host YouTube videos
- build video transcoding
- implement full badges
- implement XP
- implement leaderboards
- implement streaks
- redesign unrelated architecture

---

# Final Architecture

```text
                         PAWATECH
                            |
        ┌───────────────────┼───────────────────┐
        |                   |                   |
     Learning            Python               External
      Tracks             Runtime              Services
        |                   |                   |
   ┌────┴────┐          Pyodide          ┌──────┼────────┐
   |         |              |             |      |        |
 Week 5   Week 6/7       W3/W6/W7       AI API Wokwi  YouTube
   |         |                              |      |        |
 AI Track  Arduino/                       Week 5  W6      W7/8
 Prompt    Sensor
           Logic
                            |
                         Week 8
                            |
                     Supabase Storage
                            |
                     Showcase Gallery
```

# Final Codex Instruction

Treat Weeks 5–8 as one coordinated implementation task.

Before changing code:

1. Inspect the existing project.
2. Confirm Pyodide is active.
3. Reuse existing components and database models.
4. Confirm authentication and Supabase patterns.
5. Check for existing AI, Wokwi, YouTube, upload, and project components.
6. Implement incrementally and test each week.

Do not rewrite working infrastructure merely to introduce a different pattern.

The priority is:

```text
Reuse existing architecture
        ↓
Implement curriculum functionality
        ↓
Keep integrations modular
        ↓
Keep gamification as placeholder
        ↓
Avoid unnecessary infrastructure
```

The curriculum technology reference confirms that Week 5 uses a server-side Claude/Gemini API, Week 6 uses Pyodide plus Wokwi, Week 7 uses Pyodide plus YouTube embeds, and Week 8 uses Supabase Storage plus a showcase gallery. fileciteturn3file0turn3file2
