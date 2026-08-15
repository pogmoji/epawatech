# ePawaTech Trainer & Student API Migration Report

Date: 2026-08-12

This report tracks what has been moved from prototype/static/local persistence to the live Supabase-backed API flow described in `ePawaTech-Trainer-Student-API-Migration-Guide.md`.

## Implemented and wired

### Authentication and identity

- Supabase auth is the source of identity.
- Student login/signup supports usernames.
- Trainer/admin login remains email-based.
- Student signup checks username availability and stores the generated auth email behind the scenes.
- Admin profile corrections support student username/name and trainer contact-number updates.
- Admin trainer password reset endpoint is implemented.

### Environment/API client

- `lib/supabase.ts` now exposes the configured Supabase client only.
- Removed the previous localStorage/mock fallback helper pattern.
- Migrated features do not silently fall back to prototype persistence after API errors.

### Admin dashboard/API

- Admin dashboard uses live Supabase data for centres, cohorts, profiles, classrooms, enrollments, and trainer assignments.
- Classroom lifecycle UI is wired to the reviewed RPC model:
  - create classroom
  - activate classroom
  - assign/reassign trainer
  - complete classroom
  - archive classroom
- Trainer contact details are supported at the schema/API layer.

### Trainer classroom context

- Trainer dashboard loads authorized classroom context from Supabase.
- Trainer can switch only among classrooms returned by the live context API.
- No hardcoded/demo classroom context is used for active trainer operations.

### Trainer students and metrics

- Trainer student list loads from `student_enrollments` and joined profiles.
- Attendance summary uses real `attendance_records`.
- Progress summary uses real `lesson_progress`.
- Homework summary shows real assigned challenge count where available.
- Missing metrics now show honest empty states rather than fake percentages.

### Attendance

- Trainer attendance save is wired to:
  - `attendance_sessions`
  - `attendance_records`
- Attendance remains the approved simple present/absent model.
- Student learning page now reads and displays the student’s own attendance summary for the active classroom.

### Student classroom joining and no-enrollment learning

- Authenticated students without an active enrollment can browse the master curriculum on `/learn`.
- No-enrollment students see a clear join-classroom prompt and progress-saving explanation.
- Lesson completion attempts while unenrolled do not write `lesson_progress` and show an honest notice.
- Student classroom joining is wired to the existing `join_classroom_by_code` RPC.
- After a successful join, `/learn` refreshes into the enrolled classroom curriculum context.

### Curriculum customization

- Trainer curriculum customization no longer uses localStorage.
- Trainer dashboard reads classroom overrides/additions from:
  - `classroom_curriculum_overrides`
  - `classroom_curriculum_items`
- Trainer saves classroom-scoped overrides/additions only.
- Master curriculum records remain read-only from the trainer UI.
- Student `/learn` now loads the effective classroom curriculum:
  - master curriculum
  - classroom title/content overrides
  - removed master lessons excluded
  - live trainer-added custom items shown
- Student lesson pages render the effective classroom lesson content.
- Enrolled students can complete trainer-added classroom lessons once migration `013_student_learn_join_code_progress_completion.sql` is applied.

### Student progress

- Student progress reads/writes `lesson_progress`.
- Progress uses real `lesson_activities.id` values.
- Obsolete prototype identifiers like `track_slug` / `lesson_slug` are not used for persistence.
- Lesson completion is no longer optimistic: the UI only marks a master-backed lesson complete after the database save succeeds.
- Progress API now supports either a master `lesson_activities.id` source or a classroom-specific `classroom_curriculum_items.id` source.
- Custom classroom item progress requires the manual SQL migration listed below before it can save in Supabase.

### Classroom join codes

- Trainer dashboard now includes a classroom-access panel for the active classroom.
- The current plaintext code is not recovered from `join_code_hash`.
- Trainers generate a new plaintext code through secure rotation and can copy it immediately.
- Admin API has a matching join-code rotation helper for reconnecting Admin UI management.

### Weekly trainer comments

- Trainer dashboard can create one weekly comment per student using `weekly_student_comments`.
- Student learning page now reads and displays the latest trainer comment for the active classroom.
- Historical comments are not overwritten by the UI.

### Projects/showcase

- Project showcase reads approved projects from the live `projects` table.
- Student project submission writes to `projects`.
- Project image upload uses Supabase Storage when configured.
- No localStorage project fallback is used.

### Challenges

- Student `/challenges` now reads assigned classroom challenges from `challenge_assignments`.
- Public/static sample challenges were removed from the challenge listing.
- Students without a session see a sign-in prompt instead of prototype challenge data.
- Challenge cards link to the real curriculum challenge lesson route.

## Implemented as honest blocked states

These UI areas no longer fake persistence, but are waiting for a complete approved API/schema flow:

### Challenge submissions/review

- Current schema supports assigning challenge lessons to classrooms.
- Current schema does not include a dedicated challenge submission/review table.
- The UI therefore does not claim challenge submission has been saved.

### Hardware sessions and evidence

- Schema tables exist for:
  - `hardware_sessions`
  - `hardware_session_outcomes`
  - `hardware_evidence`
- Trainer dashboard no longer stores prototype hardware sessions.
- The create/upload/review frontend flow is intentionally blocked until the live API path is implemented.

### WPM persistence

- Typing-test completion contributes to existing client gamification behavior.
- There is no approved standalone WPM persistence/query model yet.
- Dashboard WPM metrics show no-data/blocked states rather than fake values.

### Badges

- Badge UI is preserved as an extensible placeholder.
- No irreversible badge award/revocation API has been introduced.

## Manual database migration required

New SQL has been added for manual Supabase SQL Editor execution:

```text
supabase/migrations/013_student_learn_join_code_progress_completion.sql
```

It does not run automatically. It:

- allows enrolled students to read classroom curriculum overrides needed for effective curriculum;
- adds `lesson_progress.classroom_curriculum_item_id`;
- changes `lesson_progress.curriculum_activity_id` to nullable;
- enforces exactly one progress source per row;
- adds a unique constraint for custom classroom item progress upserts;
- tightens `lesson_progress` RLS for classroom-item ownership and visibility;
- recreates `rotate_classroom_join_code` for Admins and authorized active Trainers.

Before this SQL is applied, trainer-added custom curriculum items can be displayed to students, but completion for those custom items cannot be persisted with the deployed `lesson_progress` schema because:

```sql
lesson_progress.curriculum_activity_id REFERENCES lesson_activities(id)
```

Custom classroom items live in `classroom_curriculum_items`, not `lesson_activities`.

Until the migration is applied, the app avoids pretending custom-item completion was saved and shows the database/API error if Supabase rejects the write.

## Verification commands

Latest local verification completed:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Current result:

- TypeScript passed.
- Production build passed.
- `git diff --check` passed.
- Lint passed with warnings only. Current warnings are existing cleanup items such as unused imports, `<img>` optimization suggestions, and `window.location.assign()` navigation guidance.
