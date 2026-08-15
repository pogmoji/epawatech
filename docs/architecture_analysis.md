# ePawatech — Database Architecture Analysis
_Section 34 compliance: pre-migration inspection report_

---

## 1. Existing Database / Schema Discovered in the Repository

### No SQL migrations found

A full search of the project found **zero `.sql` files, zero migration directories, and zero Supabase migration scaffolding** (`supabase/migrations/`, `supabase/config.toml`, etc.).

The project has **never been linked to a live Supabase project** in its codebase. The `.env.local` contains only sandbox/Piston environment variables — no `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.

### Supabase client (lib/supabase.ts)

```ts
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
```

The client **gracefully returns `null`** when env vars are absent. Every call in `dbFallback` checks `if (supabase)` and falls back to `localStorage`.

### Tables referenced in existing code (all unconfirmed — only referenced, never created)

| Table name | Where referenced | Purpose |
|---|---|---|
| `lesson_progress` | `lib/supabase.ts` | Student lesson completions |
| `challenge_attempts` | `lib/supabase.ts` | Student challenge scores |
| `wpm_results` | `lib/supabase.ts` | Typing test results |
| `projects` | `lib/supabase.ts` | Student projects gallery |

> [!CAUTION]
> **None of these tables have been created yet.** They exist only as string literals in the fallback client. There is no schema, no RLS, and no confirmed connection to a Supabase project.

---

## 2. Existing Authentication Model

### Current state: UI prototype only, no real auth

- `lib/supabase.ts` imports `createClient` but does not call `supabase.auth.*` anywhere in the codebase.
- `components/auth-pages.tsx` contains `LoginPage`, `StudentSignupPage`, `TeacherSignupPage` — all are **frontend form prototypes** that call `event.preventDefault()` and set a success message string. No real sign-in/sign-up requests are made.
- No session management, no JWT, no redirect on auth state change.
- The Trainer Dashboard at `/trainer` is **unprotected** — it is accessible to anyone.

### Role model: partially implied in UI copy only

- `SignupLandingPage` offers "I'm a Student" and "I'm a Teacher" role selection.
- `TeacherSignupPage` says "An admin will review your request" — the pending-approval flow is implied but unimplemented.
- No `ADMIN`, `TRAINER`, or `STUDENT` role is stored anywhere in the application.

---

## 3. Existing Curriculum / Activity Model

### Source of truth: `lib/curriculum.ts`

This is the most developed and stable part of the codebase. It defines a **rich TypeScript type system** that must be preserved and extended, not replaced.

#### Core types

```text
Track
  slug, title, description, weekNumber, icon
  lessons: Lesson[]
  challenge?: Challenge

Lesson
  slug, title, topics: string[]
  activity: LessonActivity

Challenge
  slug, title, description, timeLimitSeconds?
  activity: LessonActivity

LessonActivity (union type — 14 variants)
  quiz | drag-label | drag-classify | keyboard | typing-test
  rich-text-editor | slide-editor | python-runner | ai-chat
  wokwi-embed | youtube-embed | html-preview | scenario-question | external-link
```

#### Weeks implemented (7 of ~8)

| Week | Slug | Title | Lessons | Challenge |
|---|---|---|---|---|
| 1 | `computer-fundamentals` | Computer Fundamentals | 5 | Yes |
| 2 | `digital-productivity` | Microsoft Word & PowerPoint | 5 | Yes |
| 3 | `data-skills` | Data Skills | 2 | Yes |
| 4 | `digital-citizenship` | Digital Citizenship & Graphic Design | 3 | No |
| 5 | `ai-and-prompting` | AI & Prompt Engineering | 3 | Yes |
| 6 | `coding-and-arduino` | Coding & Arduino Basics | 4 | Yes |
| 7 | `traffic-and-sensors` | Traffic Light & Sensors | 3 | Yes |
| 8 | _(missing)_ | _(not yet implemented)_ | — | — |

#### Classroom curriculum model (Trainer Dashboard)

`components/trainer/trainer-dashboard.tsx` implements a fully working **in-memory + localStorage classroom curriculum customization system**:

```ts
type CurriculumItem = {
  id: string;
  title: string;
  kind: string;
  origin: "core" | "trainer";   // master vs. classroom addition
  removed?: boolean;             // soft removal (never deletes master)
  masterTitle?: string;          // tracks overrides
  masterKind?: string;
  instruction?: string;
  masterInstruction?: string;
  resourceNote?: string;
  activity?: LessonActivity;
  isChallenge?: boolean;
};

type Module = {
  id: string;
  title: string;
  week: number;
  items: CurriculumItem[];
};
```

This perfectly models the override pattern described in Sections 11–15 of the planning guide:
- `origin: "core"` = inherited master item
- `origin: "trainer"` = classroom addition
- `removed: true` = classroom-level soft removal
- `masterTitle / masterInstruction` = original values preserved for restore

The `hydrateModules()` function correctly merges saved state with the master and pulls in any new master items the saved state did not know about — this is the **classroom curriculum override pattern already partially working in localStorage**.

**The database schema must preserve and extend this pattern, not replace it.**

---

## 4. Proposed Entities

### 4.1 Identity and Organization

```text
profiles            — application-level user profile (extends Supabase auth.users)
centres             — physical learning centres
cohorts             — time-bounded cohort within a centre
classrooms          — classroom within a cohort
trainer_assignments — historical Trainer to Classroom placements
student_enrollments — historical Student to Classroom placements
```

### 4.2 Curriculum (Master)

```text
curriculum_tracks     — maps to existing Track type (slug, title, weekNumber, ...)
curriculum_lessons    — maps to existing Lesson type (slug, title, topics, trackId)
lesson_activities     — serialized LessonActivity JSON payload per lesson
curriculum_challenges — maps to existing Challenge type
```

> [!IMPORTANT]
> The curriculum content today lives entirely in `lib/curriculum.ts` as TypeScript constants. The database schema must be **additive** — it should not replace the TypeScript-driven curriculum, but provide a persistence layer for classroom-specific overrides and future admin-managed curriculum.

### 4.3 Classroom Curriculum

```text
classroom_curriculum_items     — ordered items for a classroom (references master OR is trainer-added)
classroom_curriculum_overrides — field-level overrides (title, instruction, etc.) for a classroom item
```

### 4.4 Learning Operations

```text
attendance_sessions       — a dated session record for a classroom
attendance_records        — per-student present/absent for a session
challenge_assignments     — challenge assigned to a classroom
challenge_attempts        — student attempt record
hardware_sessions         — physical hardware session (week 6–8)
hardware_session_outcomes — per-student outcome of a hardware session
hardware_evidence         — Supabase Storage references for photos/videos
weekly_student_comments   — one comment per trainer per student per week
lesson_progress           — student lesson completion record
```

### 4.5 Security / Governance

```text
audit_logs — immutable admin action log
```

---

## 5. Relationships

```text
auth.users (Supabase managed)
  └── profiles (1:1, profiles.id = auth.users.id)
        ├── role: enum('admin','trainer','student')
        └── [role-specific data or separate tables]

centres
  └── cohorts (many, centre_id FK)
        └── classrooms (many, cohort_id FK)
              ├── trainer_assignments (many, classroom_id FK + trainer profile_id FK)
              ├── student_enrollments (many, classroom_id FK + student profile_id FK)
              ├── attendance_sessions (many)
              │     └── attendance_records (one per student per session)
              ├── classroom_curriculum_items (ordered list, classroom_id FK)
              │     └── classroom_curriculum_overrides (field overrides per item)
              ├── challenge_assignments (many, classroom_id + challenge_id)
              │     └── challenge_attempts (per student)
              ├── hardware_sessions (many)
              │     ├── hardware_session_outcomes (per student)
              │     └── hardware_evidence (Supabase Storage paths)
              └── weekly_student_comments (per trainer + student + week)

curriculum_tracks
  └── curriculum_lessons (ordered, track_id FK)
        ├── lesson_activities (1:1 or 1:many for variants)
        └── lesson_progress (per student enrollment, lesson_id + enrollment_id)

curriculum_challenges (track_id FK)
  └── challenge_assignments (classroom_id FK, challenge_id FK)
```

---

## 6. Primary Keys and Foreign Keys

All tables use `UUID` primary keys generated by Postgres (`gen_random_uuid()`).

| Table | PK | Important FKs |
|---|---|---|
| profiles | id (= auth.users.id) | — |
| centres | id | — |
| cohorts | id | centre_id → centres.id |
| classrooms | id | cohort_id → cohorts.id |
| trainer_assignments | id | trainer_id → profiles.id, classroom_id → classrooms.id |
| student_enrollments | id | student_id → profiles.id, classroom_id → classrooms.id |
| attendance_sessions | id | classroom_id → classrooms.id |
| attendance_records | id | session_id → attendance_sessions.id, student_id → profiles.id |
| classroom_curriculum_items | id | classroom_id → classrooms.id, master_lesson_id → curriculum_lessons.id (nullable for trainer additions) |
| classroom_curriculum_overrides | id | item_id → classroom_curriculum_items.id |
| weekly_student_comments | id | trainer_id → profiles.id, student_id → profiles.id, classroom_id → classrooms.id |
| lesson_progress | id | student_id → profiles.id, lesson_id → curriculum_lessons.id, enrollment_id → student_enrollments.id |
| challenge_assignments | id | classroom_id → classrooms.id, challenge_id → curriculum_challenges.id |
| challenge_attempts | id | student_id → profiles.id, assignment_id → challenge_assignments.id |
| hardware_sessions | id | classroom_id → classrooms.id |
| hardware_session_outcomes | id | session_id → hardware_sessions.id, student_id → profiles.id |
| hardware_evidence | id | session_id → hardware_sessions.id (or outcome_id), uploaded_by → profiles.id |
| audit_logs | id | actor_id → profiles.id |

---

## 7. Important Unique Constraints

| Table | Unique constraint | Reason |
|---|---|---|
| cohorts | `(centre_id)` WHERE `status = 'active'` — partial unique index | One active cohort per centre |
| trainer_assignments | `(trainer_id, classroom_id)` WHERE `status = 'active'` | Prevents duplicate active assignment |
| student_enrollments | `(student_id)` WHERE `status = 'active'` — partial index | One active enrollment per student |
| attendance_records | `(session_id, student_id)` | One record per student per session |
| lesson_progress | `(enrollment_id, lesson_id)` | One progress record per enrollment per lesson |
| weekly_student_comments | `(trainer_id, student_id, classroom_id, week_number)` | One comment per trainer per student per week |

---

## 8. Status Fields and Lifecycle States

### profiles.role
```text
admin | trainer | student
```

### trainer_assignments.status
```text
pending_approval → approved → active → completed | rejected
```

### student_enrollments.status
```text
active → completed
```

### cohorts.status
```text
active → completed
```

### classrooms.status
```text
active → completed
```

### classroom_curriculum_items.state (future-ready, do not implement business rules now)
```text
draft | live | completed | hidden
```

> [!NOTE]
> Per Section 16 of the planning guide, the `state` field must exist but the "Make Module Live" business logic should NOT be wired up in this migration. Default is `draft`.

---

## 9. Trainer Assignment / History Model

```sql
CREATE TABLE trainer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  role TEXT NOT NULL CHECK (role IN ('lead', 'co_teacher')),
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'active', 'completed', 'rejected')),
  reason TEXT,
  invited_by UUID REFERENCES profiles(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Co-teacher flow (Section 9): `invited_by` is set when a lead trainer invites a co-teacher. Status starts at `pending_approval`. Admin approves or rejects. Trainers cannot approve.

---

## 10. Student Enrollment / History Model

```sql
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: only one active enrollment per student at a time
CREATE UNIQUE INDEX student_one_active_enrollment
  ON student_enrollments (student_id)
  WHERE status = 'active';
```

---

## 11. Classroom Curriculum Customization Model

This models the existing `CurriculumItem` / `Module` pattern from `trainer-dashboard.tsx` into the database:

```sql
CREATE TABLE classroom_curriculum_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  master_lesson_id UUID REFERENCES curriculum_lessons(id),
  master_challenge_id UUID REFERENCES curriculum_challenges(id),
  origin TEXT NOT NULL CHECK (origin IN ('core', 'trainer')),
  removed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'live', 'completed', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classroom_curriculum_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES classroom_curriculum_items(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  overridden_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Rules:
- `master_lesson_id IS NULL` when `origin = 'trainer'` (classroom-only addition)
- `removed = true` is a soft delete — never physically deletes a master record
- `sort_order` gives the classroom its own ordering independent of the master

---

## 12. Attendance Model — Simple Present / Absent

```sql
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);
```

No check-in/check-out (Section 18 compliance). Supports attendance %, sessions attended/missed, module-level attendance calculations.

---

## 13. Hardware / Evidence Model

```sql
CREATE TABLE hardware_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  curriculum_item_id UUID REFERENCES classroom_curriculum_items(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hardware_session_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hardware_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'partial', 'not_attempted')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE TABLE hardware_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES hardware_sessions(id),
  outcome_id UUID REFERENCES hardware_session_outcomes(id),
  student_id UUID REFERENCES profiles(id),
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 14. Weekly Comments Model

```sql
CREATE TABLE weekly_student_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  week_number INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainer_id, student_id, classroom_id, week_number)
);
```

Historical comments are never overwritten. A new week produces a new row.

---

## 15. Challenge Assignment Relationship

```sql
CREATE TABLE challenge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES curriculum_challenges(id),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (classroom_id, challenge_id)
);

CREATE TABLE challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  assignment_id UUID NOT NULL REFERENCES challenge_assignments(id),
  score INTEGER,
  completion_time_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 16. Future Curriculum-Live Capability Accommodation

The `state` column on `classroom_curriculum_items` accommodates this:

```text
draft (default) → live → completed | hidden
```

The column exists. No business logic, RLS policies, or Student Dashboard visibility filtering is wired to it in Stage 1–4 migrations. Safely appendable later.

---

## 17. Future Module Duration Accommodation

The `classroom_curriculum_items` table can later be extended with:

```sql
ALTER TABLE classroom_curriculum_items
  ADD COLUMN planned_duration_days INTEGER;
```

And `curriculum_lessons` can have:

```sql
ADD COLUMN default_duration_days INTEGER;
```

No analytics layer will be built now.

---

## 18. RLS Strategy

All tables will use Supabase Row Level Security.

| Role | Access |
|---|---|
| **admin** | Full read/write on all tables except `audit_logs` (insert only) |
| **trainer** | Read/write only on resources belonging to their active classroom(s) |
| **student** | Read only on own active enrollment, own progress, own attendance |
| **any** | Cannot read or modify `audit_logs` |

Policy helper functions needed:
- `is_trainer_of_classroom(classroom_id UUID) → BOOLEAN`
- `is_enrolled_in_classroom(classroom_id UUID) → BOOLEAN`
- `is_admin() → BOOLEAN`

These must be Postgres functions, not frontend guards.

> [!WARNING]
> The existing Trainer Dashboard at `/trainer` is currently unprotected. Any visitor can access it. This must be addressed before production.

---

## 19. Storage Strategy

Use Supabase Storage for:
- Hardware evidence photos/videos (bucket: `hardware-evidence`)
- Future profile photos (bucket: `avatars`)

Rules:
- Store only the storage `path` in `hardware_evidence.storage_path`.
- Never store binary blobs in PostgreSQL.
- RLS on Storage buckets should mirror table RLS.

---

## 20. Audit Strategy

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Revoke UPDATE and DELETE from all roles including admin
-- Only INSERT is allowed, enforced via Postgres policy
```

---

## 21. Migration Sequence

### Stage 1 — Architecture (now)
- Inspect codebase — complete
- Produce schema proposal — complete
- No migrations written yet

### Stage 2 — Core Identity / Organization
```text
profiles
centres
cohorts
classrooms
trainer_assignments
student_enrollments
```
Prerequisite: Supabase project created, env vars set, auth.users verified.

### Stage 3 — Curriculum
```text
curriculum_tracks
curriculum_lessons
lesson_activities
curriculum_challenges
classroom_curriculum_items
classroom_curriculum_overrides
```
Prerequisite: Stage 2 complete. Seed with existing lib/curriculum.ts data.

### Stage 4 — Operations
```text
attendance_sessions
attendance_records
challenge_assignments
challenge_attempts
hardware_sessions
hardware_session_outcomes
hardware_evidence
weekly_student_comments
lesson_progress
```

### Stage 5 — Security
```text
Enable RLS on all tables
Write all policies
Write helper functions
Protect Storage buckets
Write audit_logs + revoke update/delete
```

### Stage 6 — Application Integration
```text
Replace localStorage in lib/supabase.ts dbFallback with real queries
Wire authentication (supabase.auth.signIn/signUp)
Add session guards to /trainer route
Replace mock student data in trainer-dashboard.tsx
```

---

## 22. Unresolved Product Decisions Requiring Human Approval

> [!IMPORTANT]
> The following decisions must be made by the product owner before the relevant migration stage proceeds. Do not write migrations for any stage that depends on an unanswered question below.

1. **Supabase project**: Has a Supabase project been created? What are the project URL and anon key? Required before any migration can be written or run.

2. **Trainer approval flow**: Who initiates a Trainer account — does a Trainer sign up themselves (as `TeacherSignupPage` implies), or does an Admin create the account? Affects `trainer_assignments.status` initial state.

3. **Student enrollment**: Who creates a Student account and enrolls them in a classroom — the student themselves, the trainer, or an admin?

4. **Curriculum seeding**: Should the existing `lib/curriculum.ts` TypeScript content be seeded into the database as master curriculum records? Or should the TypeScript file remain the source of truth indefinitely?

5. **Co-teacher invitation UX**: Is the co-teacher invitation feature needed in Stage 2, or can it be deferred? The table supports it but the UI is not implemented.

6. **One active enrollment per student**: Is it a hard rule that a student can only be in one classroom at a time, or could a student attend multiple classrooms in the same cohort?

7. **Week 8 curriculum**: Week 8 content is missing from `lib/curriculum.ts`. Should it be added before curriculum is seeded into the database?

8. **projects table**: `lib/supabase.ts` references a `projects` table with a Student project gallery. Is this feature in scope for this migration, or should it remain localStorage-only?

9. **Module pacing**: Does the planned duration feature need to be a real column now, or is a comment sufficient?

10. **Badge / gamification scope**: `lib/gamification.ts` is a placeholder stub. The Trainer Dashboard has a "Badge awards" view. Is trainer-manual badge awarding in scope for Stage 4, or fully deferred?

---

## Summary Table

| Category | Current State |
|---|---|
| Supabase project | Not created / not connected |
| Database migrations | None exist |
| Authentication | UI prototype only |
| Curriculum model (TypeScript) | Rich — 7 weeks, 14 activity types |
| Classroom curriculum overrides | Working in localStorage |
| Trainer Dashboard | Fully functional prototype (localStorage) |
| Student progress | Partially in localStorage via dbFallback |
| RLS | None |
| Audit logging | None |
| Storage | Not configured |

The codebase is well-structured for migration. The curriculum and classroom override patterns are solid and must be **extended** into the database, not replaced. The priority first step is creating and connecting a real Supabase project, and answering the 10 open product decisions above.
