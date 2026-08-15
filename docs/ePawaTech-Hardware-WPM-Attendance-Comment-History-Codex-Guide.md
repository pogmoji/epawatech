# ePawaTech — Hardware, WPM, Attendance History & Trainer Comment History
## Codex Implementation Guide

## Purpose

Implement the next focused Trainer/Student functionality batch:

1. **Hardware sessions + evidence**
2. **WPM persistence + classroom leaderboard**
3. **Attendance history**
4. **Trainer comment history**

The Trainer Dashboard audit confirms that hardware tables already exist, attendance and weekly comments already persist, while WPM still needs a finalized persistence model. fileciteturn11file0

This task must be **end-to-end**.

> If the backend functionality exists, the UI must expose a usable way to perform and view it.

Do not consider an API complete if the Trainer or Student cannot actually use it from the UI.

---

## 1. Database Safety

Codex must not:

- create tables from the CLI
- execute migrations
- seed data
- create Supabase users
- reset the database
- alter RLS automatically
- execute unapproved SQL
- modify database enums/types automatically

If a schema, RPC, trigger, RLS policy, Storage policy, or index is required:

1. Inspect the deployed schema.
2. Explain the exact gap.
3. Provide proposed SQL/configuration.
4. Explain affected APIs and UI.
5. Do not execute it.

The developer will apply database changes manually.

---

# PART A — Hardware Sessions

## 2. Goal

Hardware sessions record that a physical coding/Arduino class actually happened.

The platform cannot automatically detect physical hardware work, so the Trainer's record is the source of truth.

Keep the default model **classroom-level**, not one record per Student.

Conceptually:

```text
Classroom
   ↓
Hardware Session
   ↓
Module / Activity
   ↓
Date
   ↓
Notes
   ↓
Photo / Video Evidence
```

The existing database already includes:

```text
hardware_sessions
hardware_session_outcomes
hardware_evidence
```

The audit confirms the missing part is mainly API/UI wiring. fileciteturn11file0

---

## 3. Frequency

A hardware session is not a one-time cohort record.

Create one whenever a relevant physical practical session happens.

Example:

```text
Week 6
├── Arduino Introduction → session
└── Blink Circuit → session

Week 7
├── Traffic Light Circuit → session
└── Sensor Activity → session

Week 8
└── Final Hardware Project → session
```

---

## 4. Evidence

Trainer may upload one or more:

- photos
- short videos where supported

Do not require one photo per Student.

Use Supabase Storage for files and `hardware_evidence` for metadata.

Never store large media directly in PostgreSQL rows.

---

## 5. Hardware UI

Replace the current blocked Hardware tab.

Trainer should have:

```text
Hardware Sessions

[ + Log Hardware Session ]
```

History example:

```text
12 Aug 2026
Blink Logic
3 evidence files
Logged

15 Aug 2026
Traffic Light Circuit
2 evidence files
Logged
```

Selecting a session should show:

- date
- curriculum/module/activity
- notes
- evidence
- outcomes if already supported

---

## 6. Hardware Form

Use the active classroom context automatically.

Trainer should not select arbitrary Centre/Cohort/Classroom.

Fields may include:

- date
- module/activity
- notes
- optional outcomes
- evidence uploads

---

## 7. Hardware API

Implement/reuse:

```text
getHardwareSessions()
getHardwareSession(id)
createHardwareSession(input)
updateHardwareSession(id, input)
recordHardwareOutcome(...)
uploadHardwareEvidence(...)
getHardwareEvidence(...)
```

Follow existing API conventions.

Trainer A must not access Classroom B hardware.

---

## 8. Hardware Reporting

Replace static hardware messages with real derived values.

Examples:

```text
Hardware sessions logged: 4
Evidence files: 9
Last hardware session: 15 Aug
```

Do not keep hardcoded values such as `0 / 3`, `Due Fri`, or fixed Module 6 messaging unless backed by real data. fileciteturn11file0

---

# PART B — WPM Persistence

## 9. Goal

Every completed typing-test attempt must be stored.

Students may attempt the typing test multiple times.

**Never overwrite previous attempts.**

Example:

```text
Attempt 1 — 24 WPM — 88%
Attempt 2 — 27 WPM — 91%
Attempt 3 — 31 WPM — 89%
Attempt 4 — 33 WPM — 94%
Attempt 5 — 36 WPM — 96%
```

All attempts remain historical.

---

## 10. Attempt Data

Conceptually store:

```text
Typing Attempt
├── student
├── classroom
├── curriculum activity
├── wpm
├── accuracy
├── duration
└── attempted_at
```

This enables:

- latest WPM
- best WPM
- best accuracy
- attempt count
- improvement trend
- leaderboard

---

## 11. WPM Schema Decision

The audit suggests WPM could potentially use `lesson_progress.progress_data`, but the product now requires multiple permanent attempts. fileciteturn11file0

Inspect the current typing-test and `progress_data`.

If that cannot cleanly preserve independent attempts, propose a first-class table.

Conceptual only:

```text
typing_attempts
---------------
id
student_id
classroom_id
curriculum_activity_id
wpm
accuracy
duration_seconds
attempted_at
created_at
```

Do **not** create it.

Provide the exact manual schema proposal for developer approval.

---

## 12. WPM Save Flow

```text
Student completes typing test
       ↓
WPM + accuracy calculated
       ↓
Real API call
       ↓
New attempt saved
       ↓
History and summary update
```

No localStorage fallback.

If save fails, show a real error.

---

## 13. Student WPM UI

Student should see:

```text
Typing Performance

Best WPM:       36
Best Accuracy:  96%
Latest WPM:     34
Attempts:       8
```

And history:

```text
12 Aug   34 WPM   95%
10 Aug   31 WPM   94%
08 Aug   29 WPM   92%
```

---

## 14. Classroom Leaderboard

Add a Student-visible leaderboard scoped to the Student's classroom.

Example:

```text
Typing Leaderboard

1. Amina      51 WPM   98%
2. Brian      48 WPM   99%
3. Chloe      47 WPM   96%
4. David      44 WPM   97%
```

Do not start with Centre-wide or platform-wide ranking.

---

## 15. Leaderboard Rule

Do not rank purely by WPM if accuracy is very poor.

Preferred simple rule:

1. Require a minimum accuracy threshold.
2. Rank eligible Students by best WPM.
3. Use best accuracy as a tie-breaker.

If the threshold has not been decided, keep it as a clearly documented configuration constant.

Do not bury an unexplained scoring formula.

---

## 16. Trainer WPM UI

Main Student list should stay concise:

```text
Student      Best WPM    Best Accuracy    Latest WPM
Amina           51           98%             48
Brian           48           99%             48
```

Student detail can show full attempt history:

```text
12 Aug   48 WPM   98%
10 Aug   45 WPM   96%
07 Aug   41 WPM   95%
```

---

## 17. WPM Reports

Once attempts are real, replace the Trainer Reports `No data` state.

Useful real metrics:

- class average WPM
- class best WPM
- average accuracy
- top performers
- improvement over time

Only show metrics backed by saved attempts.

---

## 18. WPM API

Implement/reuse:

```text
saveTypingAttempt()
getMyTypingAttempts()
getMyTypingSummary()
getClassroomTypingLeaderboard()
getTrainerClassroomTypingSummary()
getStudentTypingHistory(studentId)
```

Use existing naming conventions.

Student identity must come from the authenticated session.

---

# PART C — Attendance History

## 19. Goal

Attendance writes already work using Present/Absent.

Add the missing historical UI/API.

The audit confirms attendance is live but currently centered around today. fileciteturn11file0

---

## 20. Attendance UI

Trainer should see:

```text
Attendance

[ Take Today's Attendance ]

Previous Sessions
────────────────────────
12 Aug   18 Present   2 Absent
10 Aug   19 Present   1 Absent
08 Aug   17 Present   3 Absent
```

Clicking one shows:

```text
12 Aug 2026

Amina      Present
Brian      Present
Chloe      Absent
```

---

## 21. Historical Editing

Do not assume old attendance can be edited.

Inspect existing rules.

If allowed, expose Edit and preserve audit requirements.

If not allowed, keep history read-only.

---

## 22. Attendance API

Use/reuse:

```text
getAttendanceSessions()
getAttendanceSession(id)
getAttendanceRecords(sessionId)
```

Do not duplicate attendance domain logic.

---

## 23. Remove Hardcoded Module Label

The current attendance UI still shows fixed Module 6 text. fileciteturn11file0

Remove it unless real session/module data supports it.

If `attendance_sessions.curriculum_item_id` provides real context, display that.

Otherwise use a neutral session/date heading.

---

# PART D — Trainer Comment History

## 24. Goal

Weekly Trainer comment creation already works.

Add Trainer-side comment history.

The audit confirms this is currently missing from the Students tab. fileciteturn11file0

---

## 25. Comment History UI

On Student detail:

```text
Trainer Comments

Week 6
Excellent work with the Arduino activity.

Week 5
Good improvement in coding exercises.

Week 4
Needs more confidence during challenges.
```

Newest first is preferred unless the existing UI uses another convention.

---

## 26. Comment API

Add/reuse:

```text
getStudentWeeklyComments(studentId)
```

Authorization must verify that the Student belongs to the Trainer's authorized classroom.

Do not trust `studentId` alone.

---

## 27. Preserve Comment History

Do not overwrite older comments.

If editing is not already supported, keep history read-only.

---

# 28. UI Parity — Mandatory

For every API added, ensure the interface can actually use it.

Examples:

```text
createHardwareSession()
    → [Log Hardware Session]

uploadHardwareEvidence()
    → Upload control + progress/error state

saveTypingAttempt()
    → automatic save at typing-test completion

getStudentTypingHistory()
    → Trainer Student-detail history

getAttendanceSessions()
    → Previous Sessions UI

getStudentWeeklyComments()
    → Comment History panel
```

A backend-only feature is **not complete**.

Each feature must include:

- visible entry point
- form/control where needed
- loading state
- empty state
- success feedback
- error feedback
- historical/result view

---

# 29. Overview / Reports Integration

After the underlying workflows are real, update Overview/Reports to consume them.

Do not create separate fake dashboard values.

Examples:

```text
Hardware Sessions Logged
Last Hardware Session
Class Best WPM
Class Average WPM
Attendance Trend
```

Only add useful cards backed by real data.

---

# 30. Integration Tests

## Hardware

```text
Create session
→ persists
→ refresh
→ still present

Upload evidence
→ metadata persists
→ authorized classroom can access
→ another classroom denied
```

## WPM

```text
Student completes 3 tests
→ 3 attempts persist
→ history shows all 3
→ best/latest calculated correctly
```

## Leaderboard

```text
Classroom A leaderboard
→ only Classroom A students
```

## Attendance

```text
Save multiple attendance dates
→ Previous Sessions lists all
→ detail matches saved records
```

## Comments

```text
Create comments across multiple weeks
→ history shows all
→ older comments remain unchanged
```

---

# 31. RLS Tests

Verify:

```text
Trainer A → Classroom A hardware → allowed
Trainer A → Classroom B hardware → denied

Trainer A → own Student WPM history → allowed
Trainer A → other classroom Student → denied

Student A → own WPM attempts → allowed
Student A → another Student private history → denied

Trainer A → Classroom A attendance → allowed
Trainer A → Classroom B attendance → denied

Trainer A → own Student comments → allowed
Trainer A → other classroom Student comments → denied
```

Do not weaken RLS to make UI work.

---

# 32. Implementation Order

```text
1. Inspect hardware tables/API gaps
2. Implement Hardware APIs
3. Build Hardware UI + evidence
4. Inspect typing-test + progress_data
5. Produce WPM schema proposal if needed
6. Developer manually applies approved WPM schema
7. Implement WPM attempt API
8. Build Student WPM history + leaderboard
9. Build Trainer WPM summary/history
10. Add Attendance history API/UI
11. Add Trainer comment history API/UI
12. Replace affected Overview/Reports placeholders
13. Run authorization/integration tests
```

---

# 33. Definition of Done

## Hardware

- Trainer can log a classroom hardware session.
- Trainer can view hardware session history.
- Trainer can upload photo/video evidence.
- Evidence uses Supabase Storage.
- Reports use real hardware data.

## WPM

- Every typing attempt persists.
- Previous attempts remain.
- Student sees personal history.
- Student sees classroom leaderboard.
- Leaderboard uses WPM + accuracy rules.
- Trainer sees best/latest summaries.
- Trainer can open Student attempt history.
- Reports use real WPM data.

## Attendance

- Trainer can browse prior sessions.
- Trainer can open session details.
- Static Module 6 text is removed/replaced by real context.

## Comments

- Trainer can view Student comment history.
- Historical comments remain preserved.

## UI parity

- Every backend capability has a usable UI.
- Loading, empty, success, and error states exist.
- No implemented feature is inaccessible from the dashboard.
- No mock/localStorage fallback exists.

---

# 34. Final Instruction to Codex

This implementation must be end-to-end.

Do not stop at:

```text
API works
```

The completion standard is:

```text
API works
   ↓
UI exposes it
   ↓
Trainer/Student can use it
   ↓
Data persists
   ↓
History can be viewed
   ↓
Reports consume real data
   ↓
RLS blocks unauthorized access
```

For Hardware:

> Keep the flow simple and classroom-level. Evidence proves that the physical practical session happened; do not require one image per Student.

For WPM:

> Store every typing attempt. Preserve history. Add Student classroom leaderboard and useful Trainer summaries.

For Attendance and Comments:

> The write flows already exist; complete the product by exposing historical data.

Do not create database changes automatically.

If WPM requires a first-class table, provide the exact manual schema proposal before continuing.

Most importantly:

> **The UI must stay at par with every functionality added. A backend capability without a usable UI is not considered implemented.**
