# ePawatech — Trainer & Student Dashboard API Migration Guide

## Purpose

This guide covers the next implementation phase after Supabase authentication, the Admin APIs, classroom lifecycle APIs, and the Admin Dashboard are working.

The objective is to replace prototype/localStorage persistence in the **Trainer Dashboard and Student Dashboard** with the real Supabase-backed API architecture.

This is a **real implementation**, not another UI prototype.

The existing dashboard UI and curriculum architecture should be preserved where they already represent the intended product. The goal is to connect them to authenticated, database-backed data without unnecessarily redesigning the dashboards.

---

# 1. Product Context

The platform has three primary roles:

```text
ADMIN
  ↓
Manages Centres, Cohorts, Trainers, Classrooms
  ↓
TRAINER
  ↓
Manages their classroom and students
  ↓
STUDENT
  ↓
Learns, completes activities, submits work, and tracks progress
```

The classroom is the critical boundary for Trainer operations.

A Trainer's curriculum customization is **always within their classroom**.

A Trainer must never modify the master curriculum for the whole platform.

```text
MASTER CURRICULUM
        │
        ├── Classroom A
        │      └── Trainer customization
        │
        ├── Classroom B
        │      └── Trainer customization
        │
        └── Classroom C
               └── Trainer customization
```

A customization in Classroom A must not affect Classroom B or C.

---

# 2. Non-Negotiable Rules

For migrated features:

- No localStorage persistence.
- No mock API responses.
- No demo users.
- No hardcoded student records.
- No hardcoded attendance records.
- No fake classroom data.
- No fake progress records.
- No client-side role impersonation.
- No client-supplied user ID as proof of authorization.
- No weakening RLS to make the UI work.

The authenticated Supabase session is the source of identity.

---

# 3. Database Safety Rule

Codex must **not**:

- create tables from the CLI
- execute migrations
- seed data
- create Supabase users
- reset the database
- alter RLS automatically
- execute unapproved SQL
- modify database types automatically

If a missing table, column, enum, RPC, policy, trigger, index, or constraint is discovered:

1. Stop at that database boundary.
2. Document the exact gap.
3. Provide proposed SQL/migration.
4. Explain why it is required.
5. Do not execute it.

The developer will apply database changes manually.

---

# 4. Reuse the Existing API Architecture

The project already has working Admin API conventions.

Trainer and Student APIs must follow the same reusable architecture.

Use the existing repository conventions for:

- route handlers/server actions
- authenticated Supabase server client
- role verification
- validation
- error handling
- response shapes
- audit behavior
- server/client separation

The general pattern should be:

```text
Authentication
      ↓
Role verification
      ↓
Input validation
      ↓
Authorization / RLS
      ↓
Database operation
      ↓
Audit where required
      ↓
Typed response
```

Do not create a completely separate API style.

---

# 5. Authentication Context

Always derive the current user from the authenticated Supabase session.

Never trust these values from the browser as proof of access:

```text
trainerId
studentId
userId
centreId
classroomId
```

Client identifiers may be request parameters, but authorization must be established from the authenticated user, database relationships, and RLS.

---

# 6. Trainer Dashboard Migration

Migrate the Trainer Dashboard's real data areas:

1. Trainer identity
2. Centre/Cohort/Classroom context
3. Students
4. Attendance
5. Curriculum customization
6. Weekly student comments
7. Challenges/homework
8. Hardware session outcomes
9. Hardware evidence
10. Dashboard metrics
11. Badges, when the badge system is ready

The badge system is **not a blocking requirement**.

Keep the badge area extensible and use a simple placeholder where necessary.

Do not create a large permanent badge implementation just to replace a placeholder.

---

# 7. Trainer Classroom Context

The existing Trainer context API is already real and RLS-scoped.

Preserve it.

The Trainer should see only classrooms they are currently authorized to operate.

Conceptually:

```text
Authenticated Trainer
       ↓
Active Trainer assignment(s)
       ↓
Centre
       ↓
Cohort
       ↓
Classroom(s)
```

Historical classrooms should remain available for appropriate historical views if supported by the product.

Active operations must remain restricted to active assignments.

---

# 8. Trainer Student List

Create/reuse a real API for students in the Trainer's authorized classroom.

Conceptually:

```text
getTrainerClassroomStudents
```

The exact route/action should follow the existing API conventions.

Useful real data may include:

```text
student
name
enrollment status
attendance summary
progress summary
homework summary
```

Do not return students from another classroom.

Do not rely only on frontend filtering.

---

# 9. Attendance

The current product decision is intentionally simple:

```text
Present
Absent
```

Do **not** implement complex check-in/check-out.

Trainer flow:

```text
Trainer
 ↓
Classroom
 ↓
Session/date
 ↓
Students
 ↓
Present / Absent
 ↓
Save
```

The API must verify that the Trainer can record attendance for that classroom.

---

# 10. Attendance API

Create/reuse shared operations such as:

```text
getAttendance
recordAttendance
updateAttendance
```

Use the repository's established API naming style.

Do not create separate incompatible attendance implementations for Trainer, Student, and Admin.

A shared attendance data/service layer should support the different authorized views.

---

# 11. Module Duration

The earlier idea of allowing Trainers to define how many days a module takes is **not part of this migration unless the current schema already supports it**.

Keep attendance simple:

```text
Present / Absent
```

Do not introduce a complex module scheduling system now.

The architecture may support it later.

---

# 12. Trainer Curriculum Customization

This is a major migration priority.

The existing Trainer prototype already has classroom curriculum customization.

Preserve the concept.

The master curriculum remains controlled by the platform.

Trainer customization is classroom-scoped:

```text
MASTER CURRICULUM
        ↓
CLASSROOM CURRICULUM
        ↓
TRAINER CUSTOMIZATION
```

A Trainer may, within the supported architecture:

- add existing supported curriculum items
- remove/hide classroom lessons
- reorder supported items where supported
- restructure classroom sequencing
- adjust the classroom's curriculum

A Trainer may **not**:

- invent unsupported activity types
- modify the global master curriculum
- modify another classroom
- modify another Trainer's classroom
- create arbitrary curriculum types outside the shared curriculum contract

The Trainer is the master of their classroom's teaching arrangement, but not the master of the platform's curriculum architecture.

---

# 13. Curriculum Contract

The shared curriculum contract remains authoritative for supported content and activity types.

If the Trainer UI offers an item for selection, that item must already exist in the supported architecture.

Do not turn the Trainer Dashboard into a general-purpose CMS.

The principle is:

> Trainers configure the curriculum; they do not redefine the platform's curriculum schema.

---

# 14. Classroom Curriculum API

Implement/reuse operations such as:

```text
getClassroomCurriculum
addClassroomCurriculumItem
updateClassroomCurriculumItem
removeClassroomCurriculumItem
reorderClassroomCurriculum
```

Only implement operations supported by the deployed schema.

Every operation must verify that the authenticated Trainer is authorized for that classroom.

Never treat a supplied `classroomId` as proof of access.

---

# 15. Master vs Classroom Curriculum

A Trainer change must never mutate the master curriculum.

Example:

```text
Master Week 3
   ├── Activity A
   ├── Activity B
   └── Activity C

Classroom A
   ├── Activity A
   ├── Activity C
   └── Supported Activity D
```

Classroom B must remain independent:

```text
Activity A
Activity B
Activity C
```

This isolation is mandatory.

---

# 16. Student Curriculum

The Student Dashboard should display the **effective curriculum for the student's classroom**, not simply the master curriculum.

Conceptually:

```text
Master Curriculum
       +
Classroom Overrides
       ↓
Effective Classroom Curriculum
       ↓
Student Dashboard
```

A Trainer's classroom customization should therefore appear to students in that classroom only.

---

# 17. Future Module Publishing

The curriculum architecture has room for states such as:

```text
draft
live
completed
hidden
```

Do not build a complete publishing workflow unless currently required.

However, preserve the existing state architecture so a future:

```text
Trainer → Make Module Live
```

feature can be added without redesigning the curriculum model.

Do not hardcode every curriculum item as permanently live.

---

# 18. Student Enrollment

The established product decision is:

```text
Trainer creates classroom
       ↓
Trainer has classroom join code
       ↓
Student enters code
       ↓
Student joins classroom
```

The enrollment API must:

- authenticate the Student
- validate the join code
- use the controlled/hash-based join-code mechanism
- prevent duplicate active enrollment
- preserve historical enrollment where applicable
- reject invalid/inactive classrooms

Do not expose stored join-code hashes to the browser.

---

# 19. Student Dashboard Migration

Replace prototype data with authenticated database-backed data for:

1. Student identity/profile
2. Current classroom
3. Centre/Cohort context where appropriate
4. Effective classroom curriculum
5. Activity progress
6. Scores where supported
7. Challenge/homework assignments
8. Challenge submissions
9. Attendance
10. Weekly Trainer comments
11. Project/evidence records
12. WPM where a real persistence model exists

Do not invent database records for features that do not have an approved schema.

---

# 20. Student Profile

Load the Student profile from the authenticated identity and database.

Conceptually:

```text
Auth session
    ↓
Profile
    ↓
Student enrollment
    ↓
Current classroom
```

Do not continue using demo profile objects.

Historical enrollment should remain available where the schema supports it.

---

# 21. Student Progress

Use the real curriculum activity identifier as the stable relationship:

```text
Curriculum Activity
       ↓
Student Progress
```

Do not restore obsolete prototype fields such as:

```text
track_slug
lesson_slug
completed
score
```

unless they actually exist in the deployed schema and are part of the approved architecture.

Use the deployed database contract.

---

# 22. Progress API

Implement/reuse operations such as:

```text
getStudentProgress
getActivityProgress
saveActivityProgress
completeActivity
```

Authorization:

```text
Student → own progress
Trainer → progress of students in authorized classroom
Admin → according to existing Admin policies
```

A Student must never be able to submit progress for another Student by changing an ID in the request.

---

# 23. Activity Completion

Conceptually:

```text
Student
 ↓
Classroom
 ↓
Curriculum Activity
 ↓
Progress Record
 ↓
Completed
```

Use real curriculum activity IDs.

If the deployed schema supports scores, use the real score field.

Do not add prototype-only fields simply to make old UI code work.

---

# 24. Challenges / Homework

Trainer-assigned challenges should be real classroom-scoped records:

```text
Trainer
 ↓
Classroom
 ↓
Challenge Assignment
 ↓
Student
 ↓
Submission
```

Trainer should be able to:

- assign supported challenges
- view completion
- review submissions where supported

Student should be able to:

- view assigned challenges
- submit work
- see completion/status
- see feedback where supported

A Trainer cannot assign challenges outside their classroom.

---

# 25. Challenge API

Use reusable operations such as:

```text
getClassroomChallenges
createChallengeAssignment
updateChallengeAssignment
getStudentChallenges
submitChallenge
getChallengeSubmission
```

Follow the existing API conventions.

Database/RLS must enforce classroom boundaries.

---

# 26. Weekly Trainer Comments

Trainer requirement:

> One new free-text comment per student per week.

These comments feed student/parent progress experiences.

Conceptually:

```text
Trainer
 ↓
Student
 ↓
Week
 ↓
Comment
```

Do not overwrite historical comments unless the deployed business rules explicitly permit editing.

If the schema requires one comment per student/week, enforce that through the database/API rather than the UI alone.

---

# 27. Comment API

Trainer-side operations:

```text
getWeeklyComments
createWeeklyComment
```

Student-side operation:

```text
getMyWeeklyComments
```

The Student sees only their own comments.

The Trainer sees only students in their authorized classroom.

---

# 28. Hardware / Arduino Sessions

Weeks 6–8 contain physical hardware work.

The platform cannot automatically detect physical robotics activity.

Therefore, Trainer logging remains the source of truth.

Trainer records may include:

```text
hardware session
student/classroom
week/module
date
outcome
notes where supported
evidence where supported
```

Do not infer hardware completion from browser activity.

---

# 29. Hardware Evidence / Supabase Storage

Use the existing Supabase Storage architecture.

Do not store large image/video files directly in normal database fields.

Conceptually:

```text
Storage
   ↓
Evidence object
   ↓
Database metadata
```

Authorization must be checked before upload/download.

A Student or Trainer must not be able to access another classroom's private evidence by guessing a storage path.

---

# 30. Hardware API

Use reusable operations such as:

```text
getHardwareSessions
createHardwareSession
updateHardwareSession
uploadHardwareEvidence
getHardwareEvidence
```

Use the actual repository conventions.

If the current database lacks required hardware fields, stop and report the manual database change required.

---

# 31. Dashboard Metrics

Trainer metrics may include:

```text
attendance
weekly progress score
cohort/classroom comparison
WPM tracking
homework completion
hardware-session reporting
student progress
```

Student metrics may include:

```text
overall progress
weekly progress
completed activities
attendance
challenge completion
Trainer comments
project progress
WPM
```

Only display metrics backed by real data.

Do not invent formulas where the product/database has not defined one.

If a metric is blocked:

```text
Metric: BLOCKED
Missing data/formula: ...
Required schema/API: ...
```

Do not display a fake number.

---

# 32. WPM

If WPM records already exist, migrate the dashboard to real WPM data.

If WPM persistence does not exist:

- do not invent a database architecture during this task
- do not silently persist WPM to localStorage
- report the missing persistence model

The UI may remain safely read-only/placeholder until approved.

---

# 33. Badge System

Badges remain intentionally open for later.

Do not make this migration dependent on the final badge architecture.

Where the dashboard contains a badge section:

- preserve the UI structure
- use a simple placeholder if necessary
- do not implement irreversible badge logic
- do not implement revocation/award workflows unless the real badge API already exists

The architecture should remain easy to connect later.

---

# 34. Classroom Boundaries

## Trainer

Trainer can operate only their authorized classroom(s).

Trainer cannot:

```text
access another Trainer's classroom
modify another classroom
modify master curriculum
access another Centre's students
```

## Student

Student can access only their own:

```text
profile
enrollment
progress
submissions
comments
attendance
classroom curriculum
```

A Student cannot access another Student's data or another classroom.

These restrictions must be enforced by RLS/API, not just frontend filtering.

---

# 35. Parent Compatibility

Weekly Trainer comments and student progress may later feed parent-facing progress cards.

Do not build the Parent Dashboard in this task unless separately requested.

However, records should remain usable through:

```text
Trainer
 ↓
Student
 ↓
Weekly Progress
 ↓
Parent-facing Progress
```

Do not store important information only in Trainer-specific UI state.

---

# 36. Migration Strategy

Do not replace every prototype feature in one giant refactor.

Migrate in controlled phases.

## Phase 1 — Identity and context

Replace:

- demo Trainer
- demo Student
- demo classroom
- demo students

with authenticated Supabase data.

Verify RLS.

## Phase 2 — Student enrollment

Implement real classroom joining through the approved join-code API.

## Phase 3 — Curriculum

Replace Trainer curriculum localStorage with:

```text
Master Curriculum
+
Classroom Overrides
```

Then connect the Student Dashboard to the effective classroom curriculum.

## Phase 4 — Progress

Replace prototype activity completion/progress.

## Phase 5 — Attendance

Replace Trainer localStorage attendance.

## Phase 6 — Challenges

Replace Trainer/Student challenge persistence.

## Phase 7 — Weekly comments

Replace Trainer comments and Student comment display.

## Phase 8 — Hardware

Replace hardware session/evidence persistence.

## Phase 9 — Metrics

Replace dashboard metrics with real queries/calculations.

## Phase 10 — Cleanup

Remove migrated localStorage keys, mock stores, fallback persistence, and obsolete API paths.

---

# 37. Migration Compatibility

Some prototype features may temporarily remain during migration.

If so:

- isolate them clearly
- never allow prototype data to overwrite real data
- do not silently fall back to localStorage after an API failure
- show a real API error
- remove the prototype path when that feature is migrated

A failed database request must never appear to the user as a successful save.

---

# 38. Replace the Old Supabase Helper

The previous `lib/supabase.ts` used mock identifiers and fields that do not match the new schema.

Do not restore those old fields.

All new queries must use the deployed schema.

If an old helper is no longer compatible:

1. Replace it.
2. Update consumers.
3. Remove obsolete fields.
4. Do not alter the database merely to satisfy prototype code.

---

# 39. API Error Handling

Use the existing API response conventions.

Conceptually:

```text
401 — unauthenticated
403 — unauthorized
404 — not found
409 — conflict
422 — invalid input
500 — unexpected error
```

Do not expose sensitive database details to users.

---

# 40. Validation

Validate inputs server-side.

Examples:

- curriculum activity ID
- classroom
- challenge
- attendance state
- week
- student
- Trainer assignment
- file/evidence metadata

TypeScript types and UI controls are not sufficient authorization or validation.

---

# 41. Authorization Testing

Every migrated feature must include authorization tests.

## Trainer

```text
Trainer A → Classroom A → allowed
Trainer A → Classroom B → denied
Trainer A → Centre B → denied
Trainer A → Student in Classroom B → denied
Trainer A → Master Curriculum mutation → denied
```

## Student

```text
Student A → own profile → allowed
Student A → own progress → allowed
Student A → own classroom → allowed
Student A → Student B progress → denied
Student A → Classroom B → denied
Student A → Trainer-only mutation → denied
```

## Admin

Continue using the existing Admin authorization architecture.

---

# 42. Reusable Service Layer

Avoid creating duplicate implementations for the same domain.

Prefer shared services/data access for:

```text
attendance
curriculum
progress
challenges
comments
hardware
enrollment
```

The exact folder structure should follow the existing repository architecture.

The principle is:

> One source of truth for each domain operation.

Do not put important authorization logic only inside React components.

---

# 43. Definition of Done — Trainer

Trainer migration is complete when:

- Trainer identity is real.
- Centre/Cohort/Classroom context is real.
- Students are real.
- Attendance is real.
- Curriculum customization is real.
- Weekly student comments are real.
- Challenges are real.
- Hardware sessions are real.
- Evidence uses real Storage.
- Dashboard metrics use real data where supported.
- No migrated feature uses localStorage for persistence.
- Cross-classroom access is denied.
- Admin controls remain separate.
- Badge functionality remains safely extensible.

---

# 44. Definition of Done — Student

Student migration is complete when:

- Student identity is real.
- Current classroom is real.
- Enrollment is real.
- Effective classroom curriculum is real.
- Activity progress is real.
- Challenges are real.
- Submissions are real.
- Attendance is real.
- Trainer comments are real.
- Hardware/project records visible to students are real.
- Dashboard metrics use real data where supported.
- Cross-student access is denied.
- Cross-classroom access is denied.
- No migrated feature relies on localStorage.

---

# 45. Final Implementation Sequence

Codex should work in this order:

```text
1. Inspect deployed schema and current dashboard prototypes
        ↓
2. Confirm API/database gaps
        ↓
3. Report required manual database changes
        ↓
4. Migrate authenticated identity/context
        ↓
5. Migrate Student enrollment
        ↓
6. Migrate classroom curriculum
        ↓
7. Migrate student progress
        ↓
8. Migrate Trainer attendance
        ↓
9. Migrate challenges/homework
        ↓
10. Migrate weekly comments
        ↓
11. Migrate hardware/evidence
        ↓
12. Migrate dashboard metrics
        ↓
13. Run authorization/integration tests
        ↓
14. Remove obsolete prototype persistence
```

Do not skip directly to cleanup while features still depend on localStorage.

---

# 46. Final Instruction to Codex

This is the point where the Trainer and Student dashboards stop being prototypes.

The target architecture is:

```text
SUPABASE AUTH
      ↓
REAL PROFILE
      ↓
REAL ENROLLMENT / ASSIGNMENT
      ↓
REAL CLASSROOM
      ↓
REAL CURRICULUM
      ↓
REAL PROGRESS
      ↓
REAL ATTENDANCE
      ↓
REAL CHALLENGES
      ↓
REAL COMMENTS
      ↓
REAL HARDWARE / EVIDENCE
      ↓
REAL DASHBOARD METRICS
```

The core principle is:

> **The database and authenticated API become the source of truth. The dashboards become clients of that source of truth.**

Do not simply replace localStorage with unrestricted browser-side Supabase writes.

Use the established reusable API/server architecture.

Do not weaken RLS to make the UI work.

Do not create mock records to make empty states disappear.

Do not invent schema fields to preserve prototype code.

Do not execute database changes from the CLI.

When a database capability is missing, document the exact requirement for manual implementation.

When a feature has no approved persistence model, leave it safely isolated and report the dependency.

The result should be Trainer and Student dashboards connected to the same underlying platform data, with classroom boundaries enforced by the database and APIs rather than frontend assumptions.
