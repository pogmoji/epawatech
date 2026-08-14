# ePawatech — Stage 2 Supabase/PostgreSQL Database Schema & Migration Guide

## Purpose

This document guides Codex in establishing the first concrete Supabase/PostgreSQL database architecture for ePawatech.

Current repository state:

- No connected Supabase project
- No database migrations
- No real authentication integration
- No database tables
- Strong curriculum model in `lib/curriculum.ts`
- Trainer Dashboard prototype using localStorage
- Classroom curriculum customization already implemented in `trainer-dashboard.tsx`

Do not destroy or rewrite the existing prototype. Progressively replace localStorage/mock persistence with Supabase-backed persistence.

---

## 1. Technology Stack

Use:

- **Supabase** — backend platform
- **PostgreSQL** — relational database
- **Supabase Auth** — authentication
- **Supabase RLS** — authorization/data isolation
- **Supabase Storage** — hardware photos/videos
- PostgreSQL constraints/functions/triggers where required for integrity

Supabase is the platform; PostgreSQL is the database underneath it.

---

## 2. Agreed Product Decisions

### Admin

Admin:

- creates Centres
- creates/opens Cohorts
- controls Centre/Cohort lifecycle
- approves Trainers
- handles platform-level administration

Constraint:

> Only one active Cohort may exist for a Centre at a time.

### Trainer

Trainer:

- signs up
- waits for Admin approval
- works within an Admin-created Centre/Cohort
- creates their classroom
- becomes the classroom's lead Trainer
- generates a classroom join code
- enrolls students through that classroom
- manages classroom attendance
- manages classroom curriculum
- assigns challenges
- records hardware sessions
- uploads hardware evidence
- writes weekly student comments

### Student

Student:

- creates/signs into their account
- joins a classroom using the Trainer-generated classroom code
- becomes enrolled in that classroom
- accesses their classroom learning experience
- completes available learning activities

### Curriculum

Admin/platform owns the master curriculum.

Trainer owns the learning configuration of their own classroom.

Trainer customization must never modify the master curriculum or another classroom.

---

## 3. Core Relationship Model

```text
Admin
  │
  ├── Centre
  │      └── Cohort
  │             └── Classroom
  │                    ├── Lead Trainer
  │                    ├── Co-Trainers
  │                    ├── Students
  │                    └── Classroom Curriculum
  │
  └── Master Curriculum
```

Historical relationships are retained:

```text
Trainer
   └── Teaching Assignments
          ├── Current
          └── Historical

Student
   └── Learning Enrollments
          ├── Current
          └── Historical
```

---

## 4. Identity and Profiles

Use Supabase Auth for authentication. Never store passwords in application tables.

Recommended conceptual profile:

```text
profiles
---------
id                  uuid PK
full_name           text
role                app_role
status              profile_status
created_at          timestamptz
updated_at          timestamptz
```

`id` corresponds to the Supabase Auth user ID.

Roles:

```text
admin
trainer
student
```

Possible profile states:

```text
pending
active
suspended
rejected
```

Choose the safest PostgreSQL representation after inspecting the existing application.

---

## 5. Trainer Approval

Trainer self-signup is allowed.

```text
Trainer signs up
      ↓
pending
      ↓
Admin reviews
      ↓
approved
      ↓
active
```

Rejected/pending Trainers must not receive Trainer-level access.

Enforce this through RLS/server-side authorization, not just frontend routing.

---

## 6. Centre

Conceptual table:

```text
centres
---------
id                  uuid PK
name                text
description         text nullable
status              centre_status
created_at          timestamptz
updated_at          timestamptz
```

Do not invent extra Centre fields unless supported by current requirements.

---

## 7. Cohort

Conceptual table:

```text
cohorts
---------
id                  uuid PK
centre_id           uuid FK → centres.id
name                text
status              cohort_status
start_date          date nullable
end_date            date nullable
created_at          timestamptz
updated_at          timestamptz
```

Suggested lifecycle:

```text
planned
active
completed
cancelled
```

### Critical constraint

A Centre may have only one active Cohort.

Enforce this at PostgreSQL level, e.g. through an appropriate partial unique index.

---

## 8. Classroom

Conceptual table:

```text
classrooms
----------
id                  uuid PK
cohort_id           uuid FK → cohorts.id
name                text
status              classroom_status
join_code_hash      text
created_by          uuid FK → profiles.id
created_at          timestamptz
updated_at          timestamptz
```

Possible status:

```text
active
completed
archived
```

The classroom belongs to a Cohort, so Centre is normally derived:

```text
classroom → cohort → centre
```

Do not duplicate `centre_id` without a demonstrated reason.

---

## 9. Classroom Join Code

Trainer generates a code for their classroom.

Student enters it to join.

```text
Trainer
   ↓
Classroom
   ↓
Generate join code
   ↓
Student enters code
   ↓
Database resolves code → Classroom
   ↓
Student Enrollment created
```

Prefer a random, high-entropy code. Store it securely/hashed where appropriate.

The code must not be trusted to determine:

- Centre
- Cohort
- Trainer
- Student role

Those relationships come from the database.

---

## 10. Trainer Teaching Assignments

Do not permanently attach a Trainer to one classroom.

Conceptual table:

```text
trainer_assignments
-------------------
id
trainer_id          uuid FK → profiles.id
classroom_id        uuid FK → classrooms.id
role                trainer_classroom_role
status              assignment_status
start_date          date
end_date            date nullable
created_at          timestamptz
updated_at          timestamptz
```

Roles:

```text
lead
co_teacher
```

Possible statuses:

```text
pending
active
completed
rejected
```

The Trainer who creates a classroom becomes its intended lead Trainer.

Ensure a classroom cannot accidentally have multiple active leads.

---

## 11. Classroom Creation

Trainer creates a classroom under an Admin-created active Cohort.

Trainer cannot create arbitrary:

- Centres
- Cohorts
- Centre/Cohort relationships

Conceptually:

```text
Approved Trainer
      ↓
Eligible active Cohort
      ↓
Create Classroom
      ↓
Trainer Assignment = lead
```

If the existing product still requires Admin approval for classroom creation, preserve that workflow. Do not silently remove an existing approval requirement.

---

## 12. Student Enrollments

Conceptual table:

```text
student_enrollments
-------------------
id
student_id          uuid FK → profiles.id
classroom_id        uuid FK → classrooms.id
status              enrollment_status
start_date          date
end_date            date nullable
joined_via_code     boolean
created_at          timestamptz
updated_at          timestamptz
```

Possible status:

```text
active
completed
withdrawn
removed
```

Normally, a Student has one active classroom enrollment at a time. Historical enrollments remain available.

---

## 13. Student Join Flow

```text
Student signs in
      ↓
Enters classroom join code
      ↓
Server validates code
      ↓
Server resolves Classroom
      ↓
Server verifies Classroom is joinable
      ↓
Student Enrollment created
      ↓
Student accesses classroom
```

Do not let the browser arbitrarily create an enrollment by submitting `student_id` + `classroom_id`.

Authorization must validate the relationship.

---

## 14. Curriculum Source

`lib/curriculum.ts` is currently the strongest curriculum definition in the repository.

Codex found:

- 7 weeks
- 14 activity types

The initial database seed should be generated from this existing structure.

### Week 8

Week 8 already exists under **Projects**.

Therefore:

> Do not treat Week 8 as missing content and do not invent another Week 8.

Map the existing Projects content into the database curriculum representation.

---

## 15. Master Curriculum

Inspect the existing `LessonActivity` structure before finalizing tables.

A conceptual model is:

```text
curriculum_weeks
----------------
id
week_number
title
description
sort_order

curriculum_modules
------------------
id
week_id
title
description
sort_order

lessons
--------
id
module_id
title
description
sort_order

lesson_activities
-----------------
id
lesson_id
activity_type
title
content/configuration
sort_order
```

The final breakdown may differ if the existing repository requires it.

All 14 activity types must remain representable, including activity-specific configuration.

Do not create a second incompatible activity taxonomy.

---

## 16. Curriculum IDs

Use stable IDs for master curriculum records.

Do not use titles as identifiers.

Titles can change; IDs should remain stable.

---

## 17. Classroom Curriculum

The Trainer's classroom curriculum is a customized view of the master curriculum.

Conceptual table:

```text
classroom_curriculum_items
--------------------------
id
classroom_id
master_activity_id nullable
origin
title
configuration
sort_order
state
removed
created_by
created_at
updated_at
```

Possible `origin`:

```text
master
custom
```

Possible `state`:

```text
draft
live
completed
hidden
```

The `state` is included primarily to keep the architecture ready for the future "Make Module Live" feature.

---

## 18. Classroom Curriculum Overrides

When a Trainer changes a master item, preserve the master relationship.

Conceptual table:

```text
classroom_curriculum_overrides
------------------------------
id
classroom_id
master_activity_id
title_override nullable
configuration_override nullable
sort_order_override nullable
removed boolean
created_by
created_at
updated_at
```

Conceptually:

```text
Master Activity
      +
Classroom Override
      =
Classroom Version
```

Never mutate the master curriculum because of a classroom override.

---

## 19. Classroom-Specific Additions

Trainer can add content using supported platform activity types.

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

The added item belongs only to that classroom.

It must never automatically become a master curriculum item.

---

## 20. Curriculum Removal

Removing an item means:

> The item is not part of this classroom's active configuration.

It does not mean:

> Delete the master curriculum item.

Use an override/removal state rather than deleting the master record.

---

## 21. Curriculum Reordering

Classrooms have independent ordering.

```text
Master:
A → B → C

Classroom:
B → A → C
```

Never update the master order when a Trainer reorders their classroom.

---

## 22. Future "Make Module Live"

Do **not** implement the live workflow now.

The architecture should support a future flow:

```text
Trainer
   ↓
Make Module Live
   ↓
classroom_curriculum_item.state = live
   ↓
Student Dashboard displays module
```

Do not implement now:

- scheduled publishing
- release notifications
- student locking UI
- publication history

The important requirement is that classroom curriculum must not be architecturally forced to be permanently visible.

---

## 23. Future Module Duration

Do not implement advanced pacing analytics now.

Leave room for:

```text
Master Module
Expected: 5 days

Classroom A
Planned: 7 days
```

Do not build the analytics layer during this migration.

---

## 24. Attendance — Simple Present/Absent

Do **not** implement check-in/check-out.

Conceptual tables:

```text
attendance_sessions
-------------------
id
classroom_id
curriculum_item_id nullable
session_date
created_by
created_at

attendance_records
------------------
id
attendance_session_id
student_id
status
created_at
updated_at
```

Status:

```text
present
absent
```

Enforce one attendance record per student per session.

This is intentionally simple.

---

## 25. Hardware / Arduino Sessions

For Weeks 6–8, physical work cannot be automatically detected.

Trainer-recorded outcomes are the source of truth.

Conceptual tables:

```text
hardware_sessions
-----------------
id
classroom_id
curriculum_item_id nullable
session_date
notes
created_by
created_at
updated_at

hardware_session_outcomes
-------------------------
id
hardware_session_id
student_id
outcome
notes
created_at
updated_at
```

Do not invent a complex grading system unless required by the existing curriculum.

---

## 26. Hardware Evidence

Use Supabase Storage for photos/videos.

Database metadata:

```text
hardware_evidence
-----------------
id
hardware_session_id nullable
student_id nullable
uploaded_by
storage_path
file_name
mime_type
file_size nullable
created_at
```

Do not store large binary files directly in PostgreSQL.

Storage access must follow classroom/student authorization.

---

## 27. Weekly Student Comments

Conceptual table:

```text
weekly_student_comments
-----------------------
id
student_id
classroom_id
trainer_id
week_number
comment
created_at
updated_at
```

Rule:

> One new comment per student per week per classroom/trainer context.

Do not overwrite historical weeks.

---

## 28. Challenges / Homework

Do not duplicate master Challenge definitions.

Conceptual table:

```text
challenge_assignments
---------------------
id
challenge_id
classroom_id
assigned_by
due_date nullable
created_at
updated_at
```

Reuse the existing challenge architecture found in the repository.

---

## 29. Student Progress

Reuse existing curriculum/progress concepts where possible.

Conceptual model:

```text
lesson_progress
---------------
id
student_id
classroom_id
curriculum_activity_id
status
progress_data
started_at
completed_at
updated_at
```

Possible status:

```text
not_started
in_progress
completed
```

Do not create duplicate progress systems if one already exists.

---

## 30. Badges / Gamification

Do not implement the full badge/gamification system.

Leave room for future:

- badges
- badge awards
- points
- XP
- leaderboards

Do not make current curriculum, attendance, or progress dependent on badges.

---

## 31. Audit Logs

Conceptual table:

```text
audit_logs
----------
id
actor_id
action
entity_type
entity_id
reason nullable
before_data jsonb nullable
after_data jsonb nullable
metadata jsonb nullable
created_at
```

Audit records are append-only.

Critical rule:

> No role, including Admin, may update or delete audit records.

Enforce this at PostgreSQL/Supabase security level, not just through the UI.

---

## 32. RLS Strategy

RLS is mandatory.

### Admin

Platform-wide authorized access.

### Trainer

Access only through their active teaching assignments.

Trainer can access:

- their classrooms
- classroom students
- classroom curriculum
- attendance
- homework
- hardware sessions
- evidence
- comments
- relevant classroom progress

Trainer cannot access another classroom simply by changing an ID.

### Student

Access through active enrollment.

Student can access:

- their classroom
- available curriculum
- own progress
- own challenge attempts
- own learning records

Student cannot access another student's private records.

---

## 33. RLS Implementation Principle

Centralize relationship checks where practical.

Useful conceptual checks include:

```text
is_active_trainer_for_classroom(user_id, classroom_id)
```

and:

```text
is_active_student_in_classroom(user_id, classroom_id)
```

Do not over-engineer database functions before inspecting actual Supabase policy requirements.

---

## 34. Storage

A logical Storage structure could be:

```text
hardware-evidence/
    {classroom_id}/
        {student_id}/
            {session_id}/
                file
```

Do not make the bucket unrestricted public storage.

---

## 35. Indexing

Evaluate indexes for:

```text
profiles.role
profiles.status

cohorts.centre_id
cohorts.status

classrooms.cohort_id
classrooms.status

trainer_assignments.trainer_id
trainer_assignments.classroom_id
trainer_assignments.status

student_enrollments.student_id
student_enrollments.classroom_id
student_enrollments.status

classroom_curriculum_items.classroom_id
classroom_curriculum_items.master_activity_id
classroom_curriculum_items.state

attendance_sessions.classroom_id
attendance_sessions.session_date

attendance_records.attendance_session_id
attendance_records.student_id

hardware_sessions.classroom_id
hardware_session_outcomes.student_id

weekly_student_comments.student_id
weekly_student_comments.classroom_id
weekly_student_comments.week_number

challenge_assignments.classroom_id
lesson_progress.student_id
lesson_progress.classroom_id
```

Validate query patterns before creating unnecessary indexes.

---

## 36. Important Constraints

Enforce where practical:

### Cohort

- valid Centre
- one active Cohort per Centre

### Classroom

- valid Cohort
- valid status

### Trainer Assignment

- valid Trainer
- valid Classroom
- valid role/status
- one active lead per classroom

### Student Enrollment

- valid Student
- valid Classroom
- valid status
- normally one active classroom enrollment per Student

### Attendance

- one record per student per session

### Classroom Curriculum

- valid classroom
- valid master activity for inherited items
- classroom-specific ordering
- no mutation of master records

### Weekly Comments

- appropriate uniqueness per student/classroom/week

### Audit

- append-only

---

## 37. Migration Sequence

Do not create everything in one migration.

### Migration 001 — Extensions / Types

Create only required PostgreSQL types/extensions.

### Migration 002 — Profiles and Organization

Create:

```text
profiles
centres
cohorts
classrooms
```

### Migration 003 — Assignments and Enrollment

Create:

```text
trainer_assignments
student_enrollments
```

### Migration 004 — Master Curriculum

Create the final curriculum tables after inspecting `lib/curriculum.ts`.

Seed the current curriculum, including existing Week 8 Projects content.

### Migration 005 — Classroom Curriculum

Create:

```text
classroom_curriculum_items
classroom_curriculum_overrides
```

Map the current localStorage customization behavior into this model.

### Migration 006 — Learning Operations

Create:

```text
attendance_sessions
attendance_records
challenge_assignments
hardware_sessions
hardware_session_outcomes
hardware_evidence
weekly_student_comments
lesson_progress
```

### Migration 007 — Audit

Create append-only audit architecture.

### Migration 008 — RLS / Security

Apply policies after relationships exist.

### Migration 009 — Seed / Compatibility

Seed required initial data and compatibility helpers.

Do not put all schema, seed, RLS, and application migration logic into one enormous SQL file.

---

## 38. Curriculum Seed Strategy

Generate the initial master curriculum from:

```text
lib/curriculum.ts
```

Preserve:

- week
- module
- lesson
- activity
- activity type
- title
- content/configuration
- ordering

Week 8 must use its existing Projects content.

Avoid manually typing every activity into SQL if a reliable seed process can be generated.

---

## 39. LocalStorage Migration

Current Trainer Dashboard customization is stored in localStorage.

Do not delete it immediately.

Use:

```text
Current localStorage
        ↓
Database-backed implementation
        ↓
Verify parity
        ↓
Reduce/remove localStorage dependency
```

Existing concepts such as:

```text
origin
removed
masterTitle
```

should be mapped to the database representation where appropriate.

---

## 40. Supabase Project Setup

There is currently no connected Supabase project.

Before real migrations:

1. Create/select the Supabase project.
2. Configure project URL.
3. Configure public client key.
4. Configure local environment variables.
5. Configure Supabase client.
6. Initialize migration tooling.
7. Verify local connection.
8. Apply a harmless test migration.
9. Confirm migration history.
10. Begin real migrations.

Never hardcode secret keys into frontend code.

---

## 41. Auth Integration

After the database foundation:

```text
Supabase Auth
      ↓
profiles
      ↓
role
      ↓
RLS
      ↓
application dashboards
```

Do not assume a user is a Trainer because they navigated to a Trainer route.

The database/auth layer must establish their role.

---

## 42. Deliberately Deferred

Do not implement these in Stage 2 unless separately approved:

- full Admin Dashboard UI
- full Student Dashboard UI
- "Make Module Live" UI/workflow
- scheduled release
- advanced pacing analytics
- check-in/check-out attendance
- full badge/gamification system
- XP
- leaderboards
- parent dashboard
- advanced reporting
- donor reporting
- complex notifications

Leave architectural room for them.

---

## 43. Codex Deliverables Before Applying Major Migrations

Codex must first produce:

### A. Concrete schema

Show:

- tables
- columns
- types
- primary keys
- foreign keys
- indexes
- constraints

### B. Relationship diagram

Include:

```text
profiles
centres
cohorts
classrooms
trainer_assignments
student_enrollments
curriculum
classroom curriculum
operations
```

### C. RLS proposal

For each major table explain:

- Admin access
- Trainer access
- Student access

### D. Curriculum mapping

Show exactly how:

```text
lib/curriculum.ts
```

maps to PostgreSQL.

Explicitly show Week 8 Projects mapping.

### E. LocalStorage mapping

Show how current Trainer Dashboard state maps to:

```text
classroom_curriculum_items
classroom_curriculum_overrides
```

### F. Migration files

Create staged SQL migrations only after the schema proposal is reviewed.

---

## 44. Verification Requirements

### Organization

- Admin can create Centre.
- Admin can create active Cohort.
- PostgreSQL prevents two active Cohorts for one Centre.

### Trainer

- Trainer can self-register.
- Trainer remains pending until approved.
- Approved Trainer can create a classroom under an eligible Cohort.
- Trainer can generate a classroom join code.
- Trainer cannot access another Trainer's classroom.

### Student

- Student can use a valid classroom join code.
- Correct classroom enrollment is created.
- Invalid codes are rejected.
- Student cannot access another student's private records.

### Curriculum

- Master curriculum remains unchanged when Trainer customizes classroom.
- Trainer can add supported classroom-specific content.
- Trainer can remove master content from their classroom.
- Trainer can reorder classroom content.
- Classroom customization does not affect another classroom.
- Week 8 Projects content is present.

### Attendance

- Trainer can create a session.
- Trainer can mark Present/Absent.
- Duplicate attendance for the same student/session is prevented.

### Security

- RLS is active.
- Trainer cross-classroom access is denied.
- Student cross-student access is denied.
- Audit records cannot be updated/deleted.

---

## 45. Final Architectural Principle

Preserve this separation:

```text
                  PLATFORM
                     │
        ┌────────────┴────────────┐
        │                         │
   ORGANIZATION             MASTER CURRICULUM
        │                         │
 Centre → Cohort                 │
        │                         │
        ▼                         ▼
     CLASSROOM ◄──────── Classroom Curriculum
        │
        ├── Trainer
        ├── Students
        ├── Attendance
        ├── Hardware
        ├── Homework
        └── Progress
```

The core rule is:

> **Admin controls platform structure and master curriculum. Trainer controls the learning experience of their classroom. Student controls their own learning activity.**

Classroom customization must be isolated.

Historical relationships must be preserved.

Security must be enforced by PostgreSQL/Supabase RLS, not only React.

Future features must be possible without requiring a destructive redesign.

---

## 46. Final Instruction to Codex

Do not immediately create every table listed here.

First:

1. Inspect the repository.
2. Compare this guide with the actual code.
3. Produce the concrete schema proposal.
4. Identify contradictions.
5. Identify required versus speculative fields.
6. Identify remaining product decisions.
7. Show the final relationship diagram.
8. Show the RLS strategy.
9. Show the curriculum seed mapping.
10. Show the localStorage-to-database mapping.
11. Wait for approval before applying major migrations.

The goal is not simply to "put the app in Supabase."

The goal is to establish a durable data model supporting:

```text
Admin
  ↓
Centre
  ↓
Cohort
  ↓
Trainer
  ↓
Classroom
  ↓
Students
  ↓
Classroom-specific curriculum
  ↓
Learning operations
```

while preserving historical Trainer and Student relationships and leaving room for future curriculum publishing and gamification.
