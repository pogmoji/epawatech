# ePawatech — Database Architecture & Migration Planning Guide

## Purpose

This document guides Claude in designing the database architecture for ePawatech before major persistence work is implemented.

The current Trainer Dashboard is already prototyped. The next step is to establish a database model that can support the existing Trainer experience, the future Admin Dashboard, Student Dashboard, curriculum customization, classroom history, attendance, challenges, hardware sessions, and reporting.

**Important:** This is an architecture/planning guide, not permission to immediately create a large irreversible migration.

The current database architecture has not been finalized.

Claude must inspect the existing project before proposing migrations and distinguish:

- what already exists
- what is only frontend/mock data
- what is proposed here
- what still requires a product decision

---

## 1. Recommended Database Stack

Use the existing Supabase ecosystem where possible:

- **Supabase PostgreSQL** — primary relational database
- **Supabase Auth** — authentication and account identity
- **Supabase Row Level Security (RLS)** — authorization/data isolation
- **Supabase Storage** — photos/videos and hardware-project evidence
- **Postgres functions/triggers** — only where useful for integrity/security
- **Supabase Realtime** — optional/future; do not introduce it without a real requirement

Supabase/PostgreSQL should be capable of supporting the relationships, historical assignments, classroom curriculum overrides, attendance, progress, evidence, and future publication state described below.

---

## 2. Do Not Finalize the Schema Blindly

Before writing migrations:

1. Inspect the repository.
2. Inspect the existing Supabase configuration.
3. Inspect existing migrations, if any.
4. Inspect existing TypeScript types/interfaces.
5. Inspect the existing curriculum/activity model.
6. Inspect authentication and role handling.
7. Identify existing tables and columns.
8. Identify mock/localStorage-only state.
9. Identify which proposed entities already exist.
10. Identify conflicts between existing code and this architecture.
11. Propose the final schema.
12. Only then create migrations.

Do not duplicate existing tables because they are not immediately visible in the Trainer UI.

Do not delete or rename existing structures without understanding their usage.

---

## 3. Core Roles

The platform has three primary user roles:

```text
ADMIN
TRAINER
STUDENT
```

### Admin

Platform authority.

Can manage:

- centres
- cohorts
- trainers
- classrooms
- students
- master curriculum
- approvals
- reporting
- sensitive corrections
- immutable audit logging

### Trainer

Operational and curriculum authority for their own classroom.

Can manage:

- their classroom
- classroom students
- classroom curriculum
- attendance
- challenges/homework
- hardware sessions
- evidence
- weekly comments
- classroom progress

### Student

Learner.

Can:

- access their current classroom
- view available curriculum
- complete lessons/activities
- complete challenges
- submit work where supported
- view their own progress/history

---

## 4. Trainer Lifecycle

The intended flow is:

```text
Trainer signs up
      ↓
Pending approval
      ↓
Admin reviews
      ↓
Approved / Rejected
      ↓
Admin assigns Centre + Cohort + Classroom
      ↓
Trainer becomes active
      ↓
Trainer manages classroom
      ↓
Cohort/classroom period ends
      ↓
Teaching assignment becomes historical
      ↓
Trainer can request another assignment
      ↓
Admin assigns another Centre + Cohort + Classroom
```

Do **not** permanently attach a Trainer to a single centre/classroom through immutable fields such as:

```text
trainer.centre_id
trainer.cohort_id
trainer.classroom_id
```

Instead, model placement as a historical relationship.

Conceptually:

```text
Trainer
   ↓
Teaching Assignment
   ├── Centre
   ├── Cohort
   ├── Classroom
   ├── Role
   ├── Start Date
   └── End Date
```

This preserves the Trainer's complete teaching history.

---

## 5. Trainer Teaching History

A Trainer should eventually be able to browse previous classrooms they taught.

Example:

```text
Current Classroom
─────────────────
Kisumu Centre
Cohort 2026-B
Classroom C
Status: Active

Previous Classrooms
───────────────────
Nairobi Centre
Cohort 2026-A
Classroom A
Status: Completed
```

Historical assignments must remain available.

Do not delete a teaching assignment when a cohort ends.

---

## 6. Student Learning History

Use a similar historical relationship for students.

A Student should not permanently belong to one classroom.

Conceptually:

```text
Student
   ↓
Learning Enrollment
   ├── Centre
   ├── Cohort
   ├── Classroom
   ├── Start Date
   └── End Date
```

This allows:

```text
Current Learning
+
Previous Learning
```

without losing historical progress.

The Student Dashboard can later show current and previous learning experiences.

Historical classrooms should be treated as historical learning records, not active classrooms.

---

## 7. Centre, Cohort and Classroom

Conceptual hierarchy:

```text
Centre
  ↓
Cohort
  ↓
Classroom
```

### Centre

A real platform entity.

Possible attributes:

```text
id
name
location/details
status
created_at
updated_at
```

Do not assume these are final.

### Cohort

A Cohort belongs to a Centre.

Business rule:

> **Only one active cohort per Centre at a time.**

Historical cohorts remain accessible.

### Classroom

A Classroom belongs to a Cohort.

A classroom can have:

- lead Trainer
- co-teachers
- students
- classroom-specific curriculum
- attendance
- homework
- hardware sessions
- evidence

---

## 8. Trainer Assignment

Model Trainer placement separately from identity.

Conceptually:

```text
Trainer
   ↓
Teaching Assignment
   ↓
Classroom
   ↓
Cohort
   ↓
Centre
```

The assignment should support the concepts:

- trainer
- classroom
- role (`lead`, `co_teacher`)
- status
- start date
- end date
- created timestamp

Centre and cohort can be derived through the classroom relationship where appropriate.

The exact approval/request model should be finalized during schema review.

---

## 9. Co-Teacher

A Trainer can invite another Trainer to join a classroom as:

```text
co_teacher
```

The invited Trainer submits a reason.

Admin approval is required.

```text
Trainer A
   ↓
Invite
   ↓
Trainer B
   ↓
Reason
   ↓
Admin review
   ↓
Approved / Rejected
```

Trainers cannot approve co-teacher requests.

---

## 10. Master Curriculum

The platform has a global/master curriculum.

The current curriculum/activity architecture must be inspected and reused.

The existing application already models lesson/activity concepts through the `LessonActivity` architecture.

Do not replace that architecture merely to create database tables.

Conceptually:

```text
Master Curriculum
├── Weeks
├── Modules
├── Lessons
└── Activities
```

The exact relationship between Week, Module, Lesson and Activity must be determined from the existing project.

---

## 11. Classroom Curriculum Customization

This is one of the most important requirements.

The Trainer is the **master of their classroom's learning experience**.

The Trainer does **not** modify the master curriculum.

Instead:

```text
Master Curriculum
       ↓
Classroom Curriculum Configuration
       ↓
Students
```

A Trainer can:

- add supported lessons/activities
- remove lessons/activities from their classroom
- reorder modules/lessons
- customize supported lesson fields
- add classroom-specific supplementary content
- restore master/default configuration

A Trainer cannot:

- modify the master curriculum
- modify another classroom
- create a new activity type
- invent unsupported curriculum functionality

---

## 12. Classroom Curriculum Override Model

The final design should support a concept similar to:

```text
MASTER ITEM
    +
CLASSROOM CONFIGURATION / OVERRIDE
```

A classroom configuration may represent:

- inherited master item
- classroom-specific ordering
- classroom-specific content override
- classroom-specific removal
- classroom-specific addition
- future publication state

Avoid copying the entire master curriculum into every classroom unless there is a strong architectural reason.

Prefer references/overrides where practical.

---

## 13. Classroom-Specific Additions

A Trainer may add content using existing supported platform components.

Example:

```text
Master Week 6
├── Boolean Logic
├── Sequences
└── Blink Logic

Classroom A
├── Boolean Logic
├── Trainer Added: Extra Practice
├── Sequences
└── Blink Logic
```

The added item belongs only to Classroom A.

It must not automatically become part of the global curriculum.

---

## 14. Curriculum Removal

When a Trainer removes a lesson/activity:

> "Remove from classroom" means the item is not part of this classroom's active learning configuration.

It must NOT mean:

> "Delete the master curriculum item."

Never physically delete a master curriculum item because of a classroom customization.

---

## 15. Curriculum Reordering

The classroom has its own ordering.

Example:

```text
Master:
A → B → C

Classroom:
B → A → C
```

The classroom order must not alter the master order.

---

## 16. Future "Make Module Live" Capability

**Do NOT implement this now.**

However, the database architecture must leave room for it.

Future requirement:

```text
Trainer
   ↓
Makes classroom module live
   ↓
Student Dashboard
   ↓
Module becomes available
```

A future classroom curriculum item may eventually have a state such as:

```text
draft
live
completed
hidden
```

or another state machine decided later.

Do not prematurely implement the UX or business rules.

The important architecture requirement is:

> A classroom curriculum item must not be architecturally forced to be permanently visible to students.

This feature should be appendable after migration.

---

## 17. Future Module Duration

Do not implement advanced pacing analytics now.

Leave room for a Trainer to eventually define how many days a module is expected to take for their classroom.

Possible future model:

```text
Master Module
Default duration: 5 days

Classroom configuration
Planned duration: 7 days
```

This can later support:

```text
Expected duration
vs.
Actual duration
```

Do not build this analytics layer now unless already required elsewhere.

---

## 18. Attendance — Keep It Simple

Attendance should intentionally remain simple.

**Do NOT implement check-in/check-out.**

For each classroom session/date, the Trainer simply marks each student:

```text
Present
Absent
```

Conceptually:

```text
Classroom
   ↓
Session
   ↓
Student Attendance
   ├── Present
   └── Absent
```

Historical attendance remains available.

This is enough to later calculate:

- attendance percentage
- sessions attended
- sessions missed
- module-level attendance

Do not over-engineer attendance.

---

## 19. Hardware / Arduino Sessions

For Weeks 6–8, physical hardware work cannot be automatically detected.

Trainer-recorded hardware session outcomes are therefore the source of truth for physical activity completion.

Conceptually:

```text
Classroom
   ↓
Hardware Session
   ├── Date
   ├── Module/Lesson/Activity
   └── Student outcomes
```

---

## 20. Hardware Evidence

Hardware projects may require:

- photos
- videos

Use **Supabase Storage** for files.

Store metadata/reference information in PostgreSQL, not large binary files.

Conceptually:

```text
Hardware Evidence
├── classroom/session reference
├── student/project reference
├── storage path
├── file type
├── uploaded_by
└── timestamps
```

---

## 21. Weekly Student Comments

A Trainer can write one weekly free-text comment per student.

Rule:

> Do not overwrite historical comments.

Conceptually:

```text
Student
   ↓
Weekly Comment
   ├── Week
   ├── Trainer
   ├── Classroom
   ├── Comment
   └── created_at
```

These can later feed the Parent/Student progress card.

---

## 22. Challenges / Homework

Trainers can assign existing challenges to their classroom.

Conceptually:

```text
Challenge
    ↓
Classroom Assignment
    ↓
Students
    ↓
Attempts / Completion
```

Do not duplicate the Challenge definition for each classroom.

---

## 23. Progress

Support student progress at the appropriate curriculum/activity level.

Reuse the existing curriculum/progress architecture where possible.

Potential relationship:

```text
Student
   ↓
Classroom Enrollment
   ↓
Curriculum Item
   ↓
Progress / Completion
```

Do not create a duplicate progress system if one already exists.

---

## 24. Badges / Gamification — Leave Room, Do Not Implement

The badge/gamification system is intentionally **not finalized**.

Do not make it a core dependency of this migration.

Leave room for future:

- badges
- points
- XP
- leaderboards
- trainer awards
- automated awards

But do not build the complete gamification engine now.

Do not make curriculum, attendance, or student progression dependent on badges.

---

## 25. Audit Log

Admin actions will eventually require an immutable audit trail.

Conceptually:

```text
AuditLog
├── actor
├── action
├── entity
├── entity_id
├── before/after or relevant metadata
├── reason where required
└── timestamp
```

Critical rule:

> No role, including Admin, should have permission to update or delete audit records.

Use PostgreSQL/Supabase security mechanisms for this.

Do not rely solely on frontend restrictions.

---

## 26. Row Level Security

Supabase RLS should be a core part of the architecture.

Intended authorization hierarchy:

```text
Admin
  ↓
Platform-wide authorized access

Trainer
  ↓
Assigned Centre
  ↓
Assigned Cohort
  ↓
Assigned Classroom
  ↓
Classroom Students / Curriculum / Operations

Student
  ↓
Own active enrollment/classroom
  ↓
Own learning data
```

Do not depend on frontend filtering.

A Trainer must not gain access to another classroom by changing an ID in a request.

A Student must not gain access to another student's records by changing a URL.

---

## 27. Authentication

Use **Supabase Auth** for authentication unless the existing project has a compelling established alternative.

Keep authentication identity separate from application profile data.

Conceptually:

```text
Supabase Auth User
       ↓
Application Profile
       ↓
Role / role-specific relationships
```

Never store passwords in application tables.

---

## 28. Important Data Integrity Rules

The final schema should enforce important business rules where practical.

Examples:

### One active cohort per centre

A Centre may have at most one active Cohort.

### Trainer assignment

A Trainer can only be assigned to valid classrooms/cohorts.

### Student enrollment

A student should normally have one active classroom enrollment at a time unless a later product decision says otherwise.

### Historical records

Completed assignments/enrollments should not be overwritten to represent new placements.

### Curriculum isolation

Classroom changes must never mutate master curriculum records.

### Audit immutability

Audit records must not be updateable/deletable.

---

## 29. Conceptual Entity Map

This is not a final schema.

```text
                         USERS / AUTH
                              │
             ┌────────────────┼────────────────┐
             │                │                │
           Admin           Trainer          Student
                              │                │
                              │                │
                     Teaching Assignment   Enrollment
                              │                │
                              ▼                ▼
                           Classroom ◄────── Student
                              │
                    ┌─────────┼──────────┐
                    │         │          │
                 Cohort    Curriculum  Operations
                    │         │          │
                  Centre      │     ┌────┼─────┐
                              │     │    │     │
                           Lessons  Attendance
                           Modules  Homework
                           Activities Hardware
                                     Evidence
                                     Comments
```

---

## 30. Potential Tables — Validate Before Creating

These names are illustrative, not mandatory.

### Identity / organization

- `profiles`
- `centres`
- `cohorts`
- `classrooms`
- `trainer_assignments`
- `student_enrollments`

### Curriculum

- `curriculum_weeks`
- `curriculum_modules`
- `lessons`
- `lesson_activities`
- `classroom_curriculum_items`
- `classroom_curriculum_overrides`
- `classroom_curriculum_additions`

### Learning operations

- `attendance_sessions`
- `attendance_records`
- `challenge_assignments`
- `challenge_attempts`
- `hardware_sessions`
- `hardware_session_outcomes`
- `hardware_evidence`
- `weekly_student_comments`
- `lesson_progress`

### Future/optional

- `curriculum_publication_state`
- `module_pacing`
- `badges`
- `badge_awards`
- `points_ledger`

### Security/governance

- `audit_logs`

These are suggestions for architectural exploration, not a command to create all of them.

---

## 31. Module 1–8 Curriculum Attributes

The final database attributes for every module/lesson/activity are **not yet finalized**.

Claude must inspect the actual curriculum/activity types in the repository before creating curriculum tables.

The existing frontend `LessonActivity` architecture should be treated as an important source of truth for supported activity types.

Do not create a second incompatible activity taxonomy.

---

## 32. Migration Strategy

Do not attempt one giant migration.

### Stage 1 — Architecture

- inspect current code
- inspect current Supabase state
- map entities
- identify conflicts
- propose schema

### Stage 2 — Core identity/organization

Potentially:

```text
profiles
centres
cohorts
classrooms
trainer_assignments
student_enrollments
```

### Stage 3 — Curriculum

Potentially:

```text
master curriculum
classroom curriculum configuration
overrides
additions
```

### Stage 4 — Operations

Potentially:

```text
attendance
homework
hardware sessions
evidence
comments
progress
```

### Stage 5 — Security

- RLS
- role policies
- protected functions
- audit mechanisms

### Stage 6 — Application integration

Replace appropriate:

- mock data
- localStorage persistence
- frontend-only state

with database-backed data.

Do not remove working prototype behavior until the replacement is verified.

---

## 33. Defer These Features

Design for them where appropriate, but do not implement them as part of this migration unless separately approved:

- Trainer-controlled "Make Module Live"
- scheduled module release
- advanced module pacing analytics
- check-in/check-out attendance
- advanced gamification
- full badge system
- XP
- leaderboards
- advanced learning-history UI
- parent-specific features not yet defined

---

## 34. Definition of Done for Architecture Phase

Before creating major migrations, Claude should produce a clear proposal showing:

1. Existing database/schema discovered in the repository.
2. Existing authentication model.
3. Existing curriculum/activity model.
4. Proposed entities.
5. Relationships.
6. Primary keys and foreign keys.
7. Important unique constraints.
8. Status fields and lifecycle states.
9. Trainer assignment/history model.
10. Student enrollment/history model.
11. Classroom curriculum customization model.
12. Attendance model using simple Present/Absent.
13. Hardware/evidence model.
14. Weekly comments model.
15. Challenge assignment relationship.
16. Future curriculum-live capability accommodation.
17. Future module-duration accommodation.
18. RLS strategy.
19. Storage strategy.
20. Audit strategy.
21. Migration sequence.
22. Unresolved product decisions requiring human approval.

Do not proceed with a large migration if critical architectural decisions remain ambiguous.

---

## 35. Final Principle

The architecture should preserve:

```text
PLATFORM
   │
   └── Master Curriculum
           │
           ▼
       CLASSROOM
           │
           └── Trainer controls the classroom learning experience
                   │
                   ▼
                STUDENTS
```

And historical relationships:

```text
TRAINER
   │
   └── Teaching Assignments
          ├── Current
          └── Historical

STUDENT
   │
   └── Learning Enrollments
          ├── Current
          └── Historical
```

The system should preserve history rather than overwrite relationships.

The Trainer owns the learning experience of their classroom.

The platform owns the curriculum capabilities.

The Admin owns the platform-level structure and master curriculum.

The database should make these boundaries enforceable rather than relying only on the frontend.
