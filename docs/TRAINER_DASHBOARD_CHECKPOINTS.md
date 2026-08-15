# Trainer Dashboard Checkpoints

## Checkpoint 1 — completed

- Added `/trainer`, a responsive dashboard workspace covering overview, classroom curriculum, attendance, homework, hardware sessions, students/comments, badge awards, and reports.
- The curriculum builder is based on the application’s actual `LessonActivity` union. It supports expansion, classroom-only additions, safe removal/restoration, reordering, and reset to master default.
- Trainers can also edit a classroom-only lesson override (title, supported activity type, learner instructions, and supplementary resource note), review a read-only master-curriculum reference, review all current overrides, and use a non-persistent learner playground to test an item. Playground input is never stored or submitted.
- The lesson editor is activity-aware: it exposes quiz questions/options/correct answers; scenario responses; Python/HTML/CSS starter code; embeds and resources; drag activity labels/zones; rich-text missions; and the supported textual activity settings. Trainers author only existing `LessonActivity` shapes.
- Every module now includes its end-of-module challenge in the builder, visibly labelled as such. The Try area renders the supported student-facing activity surface (quiz, code runner, drag interaction, editor, embed, and so on) instead of a generic response box; its completion callback is local only.
- Grading is intentionally capability-specific: quiz/scenario/drag and other answer-key activities evaluate the classroom configuration in the playground. A customized Python module challenge runs in the same Python runtime, but production grading does **not** automatically adjust: it requires an approved platform test contract and server-side integration. The trainer UI does not invent or silently alter that checker.
- Operational UI changes are persisted in browser local storage under `ePawatech_trainer_demo_state` so the prototype can be reviewed across refreshes without guessing a database schema.

## Checkpoint 2 — required before production persistence

The repository currently contains no role/authentication model, classroom/cohort entities, or finalized Supabase schema. Do not treat the browser persistence as authorization or production storage.

Minimum proposed server model to review before migration:

1. `classrooms` scoped to centre/cohort; `classroom_trainers` assigns `trainer`/`co_teacher` roles.
2. `classroom_curriculum_overrides` references a master item and stores scope, order, removed state, and adjustments; `classroom_curriculum_additions` stores only a supported activity type plus data.
3. Insert-only records for `attendance_sessions`, `student_weekly_comments`, `hardware_sessions`, `hardware_evidence`, `classroom_assignments`, and `trainer_badge_awards`.
4. Server/RLS policies must verify trainer → centre → cohort → classroom before every select or mutation. Client-side filtering must not be used as authorization.

## Checkpoint 3 — integration work

- Replace the demo classroom/students with authenticated, server-scoped data.
- Add server actions or route handlers that validate supported activity types against the shared curriculum contract.
- Connect existing Supabase Storage for evidence uploads and enforce immutable/auditable records where required.
- Add integration and authorization tests, including cross-classroom and cross-centre denial cases.

## Checkpoint 4 — Trainer Phase B classroom context

- Added a real trainer teaching-context API that reads active `trainer_assignments`, `classrooms`, `cohorts`, and `centres` through the authenticated Supabase client.
- Authorization remains database-led: the client never supplies a trainer id or arbitrary classroom id as proof of access, and RLS limits the result set to the signed-in trainer.
- Corrected the dashboard decision tree so an active trainer assignment is evaluated separately from an active classroom.
- The trainer dashboard shell now blocks access until context loads, shows a clear unavailable/no-teaching-assignment state, shows a non-active-classroom state when an assignment exists but no active classroom is returned, and lets trainers switch only between active classrooms returned by RLS.
- Removed the hardcoded trainer name from the visible dashboard greeting and replaced the header/sidebar classroom identity with real centre/cohort/classroom data.
- Prototype student, attendance, awards, and curriculum override persistence intentionally remain browser-local for later Trainer migration phases.

### Migration audit report

Reviewed migration files:

- `001_extensions_types.sql`
- `002_profiles_organization.sql`
- `003_assignments_enrollment.sql`
- `008_rls.sql`
- `009_seed_compatibility.sql`
- `010_student_usernames.sql`
- `011_trainer_contact_details.sql`

Handled by the current migrations:

- Trainer account approval is represented by `profiles.status`. Trainer sign-up creates `pending` trainer profiles, and admin approval can move them to `active`.
- Centres and cohorts exist. `cohorts` belongs to `centres`, and the schema enforces one active cohort per centre.
- Classrooms belong to cohorts through `classrooms.cohort_id`, so Centre is derivable through `classroom -> cohort -> centre`.
- Historical trainer/classroom placement is represented by `trainer_assignments.status`, `start_date`, and `end_date`.
- Active classroom authorization is represented through `trainer_assignments.classroom_id`; RLS helpers such as `is_active_trainer_for_classroom` and `is_active_trainer_for_centre` derive access through existing classroom assignments.
- When an active trainer creates a classroom, `009_seed_compatibility.sql` automatically inserts an active lead `trainer_assignments` row for that new classroom.

Not handled by the current migrations:

- There is no pre-classroom assignment model for `Trainer -> Centre + Cohort`. `trainer_assignments` requires `classroom_id`, so it can only represent `Trainer -> Classroom` after a classroom exists.
- The state "approved trainer assigned to Centre + Cohort but no classroom yet" cannot be stored or queried from the checked-in schema.
- The dashboard cannot reliably distinguish "approved but not assigned" from "assigned to Centre + Cohort but no classroom" using only the current `trainer_assignments` table.
- `classrooms.status` supports `active`, `completed`, and `archived`; there is no `pending` or `awaiting_approval` classroom status.
- Classroom creation currently defaults to `active`, and the trigger creates an active lead assignment immediately. That bypasses the intended "created -> pending approval -> active" classroom lifecycle.
- The classroom insert RLS policy checks `created_by = auth.uid()`, active trainer status, and active cohort status. It does not verify that the trainer is assigned to that specific Centre/Cohort before allowing classroom creation.
- `classrooms.join_code_hash` is `NOT NULL`, but there is no dedicated classroom creation RPC in the migrations that derives the authorized assignment, generates the join-code hash, inserts a pending classroom, and returns the plain join code.

Required lifecycle from `ePawatech-Trainer-Assignment-and-Classroom-Lifecycle-Codex.md`:

1. Admin approves Trainer.
2. Admin assigns Trainer to Centre + Cohort.
3. Trainer creates Classroom within that assigned Cohort.
4. Admin approves Classroom.
5. Active Classroom loads the full Trainer Dashboard.

Conclusion:

The limitations are not handled by the current migration files. The schema supports active trainer-to-classroom operations after a classroom exists, but it does not yet support the intended Centre/Cohort assignment stage or classroom approval stage.

Suggested database review:

- Add or expose an assignment model that can represent `Trainer -> Centre + Cohort` before any classroom exists.
- Add or expose a classroom approval status/API if pending classroom approval is required.
- Update RLS/API so classroom creation is authorized by the authenticated trainer's Centre + Cohort assignment, not by arbitrary client-selected Centre/Cohort values.
- Add a controlled classroom creation RPC or route-backed API that generates `join_code_hash`, creates the classroom in the correct initial status, and returns the plain join code only once.
