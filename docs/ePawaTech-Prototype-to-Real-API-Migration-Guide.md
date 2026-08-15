# ePawatech — Prototype-to-Real API Migration Guide

## Purpose

Migrate the remaining **Trainer Dashboard** and **Student Dashboard** from prototype/mock/localStorage persistence to the real Supabase-backed application.

Authentication and the Admin Dashboard/API are already implemented and working.

This is **not a dashboard rewrite**.

The goal is:

> Preserve the existing UI, UX, curriculum structure, and product behavior while progressively replacing prototype persistence with the real authenticated Supabase/API layer.

The Admin implementation establishes the reusable API/data-access conventions that Trainer and Student should now follow.

---

## 1. Current Architecture

```text
Supabase Database              ✅
Supabase Auth                  ✅
Admin API                      ✅
Admin Dashboard                ✅
Trainer Dashboard              ⚠️ Prototype persistence
Student Dashboard              ⚠️ Prototype persistence
```

Target:

```text
Supabase Database
        ↓
Supabase Auth
        ↓
Reusable API/Data Layer
        ↓
┌───────────────┬────────────────┐
│               │                │
Admin         Trainer          Student
  ✅             ↓                ↓
             Real API         Real API
```

---

## 2. Non-Negotiable Database Rule

Codex must **not**:

- create tables
- alter tables
- create/apply migrations
- seed records
- create users
- create Admin users
- insert demo Centres/Cohorts/Trainers/Students
- reset the database

The developer manually manages database changes in Supabase.

If a database change is required:

1. Stop at that dependency.
2. Explain the exact missing capability.
3. Identify the table/column/function/policy required.
4. Provide SQL if useful.
5. Do not execute the change.
6. Do not create temporary tables or mock databases.

---

## 3. Deployed Database Is the Source of Truth

Before migrating a feature, inspect:

- actual Supabase tables
- actual columns
- foreign keys
- existing RPC/functions
- RLS policies
- existing seed data
- current TypeScript database types
- existing Admin API conventions

Do not assume the planning documents exactly match the deployed schema.

---

## 4. Core Migration Principle

Do not delete and rebuild the dashboards.

Use:

```text
Existing Dashboard UI
        ↓
Identify prototype data source
        ↓
Use/create real API
        ↓
Connect UI
        ↓
Verify behavior
        ↓
Remove prototype persistence
```

The same principle applies to both Trainer and Student.

---

## 5. No Supabase → localStorage Fallback

Once a feature is migrated, it must use the real backend.

Do not implement:

```text
try Supabase
   ↓
failure
   ↓
localStorage
```

Instead:

```text
Supabase success → real data
Supabase failure → real error state
```

LocalStorage may remain temporarily for features that have not yet been migrated, but it must never silently become a fallback for a migrated feature.

---

## 6. Reusable API Architecture

Follow the API conventions established by the Admin Dashboard.

Prefer:

```text
Dashboard Component
       ↓
Feature API/Data Function
       ↓
Supabase Client
       ↓
PostgreSQL / RPC
       ↓
RLS
```

Do not put raw Supabase queries throughout React components.

Use typed, resource-oriented functions such as:

```text
getClassroom(id)
getClassroomsForTrainer()
getStudentsForClassroom(classroomId)

getClassroomCurriculum(classroomId)
updateClassroomCurriculum(...)

getAttendance(...)
recordAttendance(...)

getStudentProgress(...)
updateStudentProgress(...)
```

Use actual repository naming conventions where already established.

Do not create a second API style.

---

# 7. Migration Order

Migrate in this order:

```text
1. Trainer identity/session
2. Trainer classroom context
3. Trainer students
4. Trainer classroom curriculum
5. Trainer attendance
6. Trainer weekly comments
7. Trainer challenges
8. Trainer hardware sessions/evidence
9. Trainer dashboard metrics

10. Student identity/session
11. Student enrollment/classroom
12. Student classroom curriculum
13. Student learning/progress
14. Student challenges/projects
15. Remaining Student dashboard data

16. Remove obsolete prototype persistence
17. Verify RLS and cross-user isolation
```

Do not migrate everything in one giant change.

Each feature should be independently testable.

---

# 8. Trainer Phase A — Identity

Use the existing real authentication implementation.

Expected:

```text
Supabase Auth
      ↓
profiles
      ↓
role = trainer
      ↓
Trainer Dashboard
```

Remove:

- mock Trainer IDs
- hardcoded Trainer accounts
- demo role selectors
- localStorage identity

Pending/rejected/suspended Trainers must not receive active Trainer functionality.

Use the actual deployed status values.

---

# 9. Trainer Phase B — Classroom Context

Trainer relationships are historical.

Do not assume a permanent:

```text
trainer.classroom_id
```

Use the deployed assignment model.

Conceptually:

```text
Trainer
   ↓
trainer_assignments
   ↓
Classroom
   ↓
Cohort
   ↓
Centre
```

The dashboard should determine which classroom(s) the authenticated Trainer currently teaches.

Historical assignments must not be deleted.

---

# 10. Trainer Phase C — Students

Replace mock/localStorage students with real enrollment data.

Conceptually:

```text
Trainer
   ↓
Classroom
   ↓
student_enrollments
   ↓
Students
```

Trainer access must be limited to authorized classroom students.

Never trust a browser-supplied `classroom_id` for authorization.

RLS must enforce the relationship.

---

# 11. Trainer Phase D — Classroom Curriculum

This is a critical migration because the Trainer Dashboard already supports classroom customization.

Preserve:

```text
Master Curriculum
        +
Classroom Customization
        ↓
Classroom Curriculum
```

Trainer customization remains **within the classroom**.

It must never modify:

- master curriculum
- another classroom's curriculum
- another Centre's curriculum

---

## 11.1 Preserve Existing Customization

The Trainer should retain the existing supported capabilities:

### Add

Add supported content/activity types already represented by the application architecture.

### Remove

Remove/hide master content from their classroom without deleting the master record.

### Reorder

Change ordering within their classroom.

### Modify

Customize supported properties within the existing architecture.

### Preserve Master

Master curriculum remains unchanged.

---

## 11.2 Curriculum Mapping

Inspect:

```text
lib/curriculum.ts
trainer-dashboard.tsx
```

Map the existing prototype concepts such as:

```text
origin
removed
masterTitle
sort order
state
custom items
```

to the actual deployed database/API.

Do not create a parallel curriculum model.

---

## 11.3 Curriculum Isolation Test

Test explicitly:

```text
Classroom A
Classroom B
```

Trainer changes Classroom A:

```text
Classroom A → changed
Classroom B → unchanged
Master → unchanged
```

This is a core business rule.

---

# 12. Future "Make Module Live"

Do not implement the complete publishing workflow unless already requested.

Preserve architecture for states such as:

```text
draft
live
completed
hidden
```

using the actual deployed values.

Do not force all content to be permanently visible simply to make the Student Dashboard work.

---

# 13. Trainer Phase E — Attendance

The agreed attendance model is intentionally simple.

Do **not** implement check-in/check-out.

Use:

```text
present
absent
```

Replace prototype attendance with the real API.

Conceptually:

```text
Trainer
 ↓
Classroom
 ↓
Attendance Session
 ↓
Attendance Records
 ↓
Student
```

Use database constraints where already deployed to prevent duplicates.

---

# 14. Trainer Phase F — Weekly Comments

Replace prototype/localStorage comments with real persistence.

Conceptually:

```text
Student
Classroom
Trainer
Week
Comment
```

Preserve historical weekly records.

Do not silently overwrite historical comments unless the deployed product explicitly supports editing them.

---

# 15. Trainer Phase G — Challenges

Replace prototype challenge assignments with the real API.

Trainer assigns existing supported challenges to their classroom.

Do not create a new challenge architecture.

Conceptually:

```text
Existing Challenge
       ↓
Classroom Assignment
       ↓
Students
```

Assigning a challenge must not mutate the master challenge.

---

# 16. Trainer Phase H — Hardware

Weeks 6–8 contain physical/hardware work.

Trainer-recorded outcomes remain the source of truth because physical Arduino activity cannot be automatically detected by the web application.

Replace prototype/localStorage hardware records with the real API.

Conceptually:

```text
Classroom
   ↓
Hardware Session
   ↓
Student Outcomes
```

Do not invent automated hardware verification.

---

# 17. Hardware Evidence

If Supabase Storage/API support is already deployed, replace prototype evidence storage with it.

Conceptually:

```text
Trainer
 ↓
Photo/video
 ↓
Supabase Storage
 ↓
Evidence metadata
 ↓
Hardware session
```

Do not store large binary files directly in PostgreSQL.

If Storage policies are missing:

- identify the required policies
- stop that portion
- report what must be configured manually
- do not create policies from the CLI

---

# 18. Trainer Metrics

After the underlying data sources are real, replace prototype metrics such as:

```text
At-risk students
Weekly progress
Cohort comparison
WPM
Homework completion
Hardware reporting
```

Only migrate metrics that can be calculated from actual deployed data.

Never fabricate backend values.

If a metric depends on data that does not exist yet, report the dependency instead of faking it.

---

# 19. Badge/Gamification Boundary

Do not implement the full badge/gamification system during this migration.

Leave room for:

```text
badges
badge awards
points
XP
leaderboards
```

If the existing UI has a badge placeholder, preserve it.

Do not create a parallel badge persistence system.

---

# 20. Trainer Completion Criteria

Trainer migration is complete when:

- Trainer identity is real.
- Classroom context is real.
- Students are real.
- Curriculum customization is real.
- Attendance is real.
- Weekly comments are real.
- Challenges are real.
- Hardware records are real where backend support exists.
- Migrated features no longer use localStorage.
- No migrated feature falls back to mock data.
- RLS prevents cross-classroom access.
- Master curriculum remains protected.
- Classroom customization remains isolated.

---

# 21. Student Phase A — Identity

After Trainer migration, migrate Student identity.

Use:

```text
Supabase Auth
      ↓
profiles
      ↓
role = student
```

Remove demo Student identity.

Do not create another authentication system.

---

# 22. Student Phase B — Enrollment

Replace the prototype classroom with real enrollment.

Expected:

```text
Student
   ↓
student_enrollments
   ↓
Classroom
   ↓
Cohort
   ↓
Centre
```

The Student Dashboard should derive its classroom from the authenticated user's active enrollment.

Do not allow the browser to select arbitrary classroom IDs.

---

# 23. Student Join Code

Use the deployed classroom join-code mechanism.

Conceptually:

```text
Trainer creates classroom
       ↓
Join code
       ↓
Student enters code
       ↓
join_classroom_by_code
       ↓
student_enrollment
```

If `join_classroom_by_code` already exists, use it.

Do not recreate it.

---

# 24. Student Phase C — Curriculum

Replace mock curriculum with classroom-specific curriculum.

The Student should not simply load the master curriculum.

Use:

```text
Master Curriculum
       ↓
Classroom Curriculum
       ↓
Student Enrollment
       ↓
Student Dashboard
```

This is essential because Trainer customization is classroom-scoped.

---

# 25. Student Curriculum Visibility

Respect the deployed classroom curriculum state.

Conceptually:

```text
draft
   → normally not student-visible

live
   → student-visible

completed
   → historical/completed content

hidden
   → not student-visible
```

Use actual deployed state values.

Do not implement future publishing features unless explicitly requested.

---

# 26. Student Phase D — Progress

Replace prototype progress with real API/data functions.

The old prototype may contain fields such as:

```text
track_slug
lesson_slug
completed
score
```

Do not force these fields into the new database.

Map the existing behavior to the actual curriculum/activity/progress schema.

Prefer stable database relationships such as:

```text
student_id
classroom_id
curriculum_activity_id
```

where supported by the deployed schema.

---

# 27. Student Progress Isolation

A Student must only be able to:

- read their own private progress
- update/submit their own learning records where permitted
- access curriculum belonging to their active classroom

They must not:

- read another student's progress
- modify another student's progress
- access another classroom

RLS is the security boundary.

---

# 28. Student Challenges / Projects

Replace mock challenge/project persistence with the real API.

Reuse existing challenge/project architecture.

Do not create a new submission system unless the deployed schema requires it.

Use real Storage/API paths where project evidence is already supported.

---

# 29. Student Metrics

Replace prototype metrics only when underlying data exists.

Do not fabricate:

- completion percentage
- scores
- streaks
- leaderboard positions
- XP
- badges

If a metric depends on a deferred feature, retain a placeholder or disable it gracefully.

---

# 30. Do Not Change Product Behavior During Migration

Avoid unrelated changes such as:

- redesigning navigation
- changing curriculum wording
- changing activity types
- adding gamification
- changing Trainer permissions
- changing Student permissions
- adding curriculum content
- redesigning dashboards

The migration goal is:

> **Same product behavior, real persistence.**

Product changes should be separate implementation tasks.

---

# 31. Prototype Removal Strategy

For every migrated feature:

```text
Prototype
   ↓
Identify state owner
   ↓
Implement/use real API
   ↓
Connect UI
   ↓
Test
   ↓
Remove localStorage/mock dependency
```

Do not remove prototype code before the real API path works.

After verification, remove obsolete code instead of maintaining two competing systems.

---

# 32. Migration Checklist Per Feature

For every migrated feature, document:

### Current source

Example:

```text
localStorage key:
trainer_curriculum_overrides
```

### Target source

Example:

```text
classroom_curriculum_items
classroom_curriculum_overrides
```

### API

Example:

```text
getClassroomCurriculum()
updateClassroomCurriculum()
```

### UI changes

List the minimal changes needed to connect the existing UI.

### Authorization

Who can read/write?

### RLS

Which deployed policy protects it?

### Prototype removal

Which localStorage/mock code can be removed?

### Verification

What exact test proves the migration succeeded?

Use this format consistently.

---

# 33. API Consistency With Admin

The Admin API established the reusable pattern.

Trainer/Student APIs should follow the same conventions for:

- naming
- inputs
- outputs
- errors
- TypeScript types
- Supabase access
- authorization

Do not create three unrelated API systems.

There should be one application-wide data-access philosophy.

---

# 34. RLS Is the Security Boundary

Frontend checks are not sufficient.

Never consider this a security mechanism by itself:

```text
if (user.classroomId === classroomId)
```

The database must enforce access.

Explicitly test:

```text
Trainer A → Classroom A → allowed
Trainer A → Classroom B → denied

Student A → own progress → allowed
Student A → Student B progress → denied

Student A → own classroom → allowed
Student A → Classroom B → denied
```

---

# 35. Database Changes

If migration discovers a missing:

- column
- table
- foreign key
- index
- RPC
- trigger
- RLS policy
- Storage policy

do not create it automatically.

Report:

```text
Requirement
Why it is needed
Affected feature
Suggested SQL/configuration
```

The developer will make the change manually.

---

# 36. Testing Strategy

Do not test only the happy path.

### Trainer isolation

```text
Trainer A → Classroom A → allowed
Trainer A → Classroom B → denied
```

### Student isolation

```text
Student A → own classroom → allowed
Student A → Classroom B → denied
Student A → Student B progress → denied
```

### Curriculum isolation

```text
Trainer changes Classroom A
        ↓
Classroom A changes
Classroom B unchanged
Master unchanged
```

### Prototype removal

```text
Clear localStorage
Refresh application
        ↓
Migrated data still exists
```

This last test is critical.

---

# 37. Migration Status

Maintain a checklist:

```text
[ ] Trainer authentication
[ ] Trainer classroom context
[ ] Trainer students
[ ] Trainer curriculum
[ ] Trainer attendance
[ ] Trainer comments
[ ] Trainer challenges
[ ] Trainer hardware
[ ] Trainer metrics

[ ] Student authentication
[ ] Student enrollment
[ ] Student curriculum
[ ] Student progress
[ ] Student challenges/projects
[ ] Student metrics

[ ] Remove migrated localStorage
[ ] Remove obsolete mock data
[ ] RLS verification
[ ] Cross-classroom tests
```

A feature is complete only when it uses the real backend and passes its authorization/data tests.

---

# 38. Final Architecture

The application should converge toward:

```text
                         SUPABASE
                            │
              ┌─────────────┴─────────────┐
              │                           │
             Auth                     PostgreSQL
              │                           │
              └─────────────┬─────────────┘
                            │
                     Reusable API Layer
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        ADMIN             TRAINER           STUDENT
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                           RLS
```

The dashboards are different consumers of the same platform, not three separate applications.

---

# 39. Final Instruction to Codex

This is a **migration task, not a rewrite**.

Preserve existing dashboard interfaces wherever possible.

Replace prototype persistence progressively.

Use the Admin API implementation as the model for reusable API/data access.

Do not:

- create tables
- seed data
- create users
- apply migrations
- reset the database
- create mock backend records
- use localStorage as fallback for migrated features
- invent database fields
- recreate existing RPCs
- bypass RLS
- redesign dashboards unnecessarily

If a backend dependency is missing, stop and report it for manual database configuration.

The desired final state is:

```text
Existing UI
     ↓
Real Authentication
     ↓
Reusable API/Data Layer
     ↓
Supabase PostgreSQL
     ↓
RLS
     ↓
Real application
```

Migrate the **Trainer Dashboard first**, because it establishes the classroom context and curriculum configuration consumed by the Student Dashboard.

Then migrate the **Student Dashboard** to consume the real classroom, enrollment, curriculum, and progress relationships.

Only after both dashboards are backed by real data should remaining prototype persistence be removed completely.
