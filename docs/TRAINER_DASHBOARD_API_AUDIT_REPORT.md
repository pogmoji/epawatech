# Trainer Dashboard API Audit Report

Date: 2026-08-12

Scope: `components/trainer/trainer-dashboard.tsx` and current `lib/api/trainer/*` APIs. This is an audit only. No implementation changes are proposed here as code.

## Summary

The Trainer Dashboard is partially Supabase-backed. Core classroom context, student roster, attendance, curriculum customization, join-code rotation, weekly comments, and basic student summaries are wired to live data. Several dashboard areas still display prototype/static content or honest blocked states. The biggest remaining product gaps are homework/challenge submissions, hardware session workflows, badge awards, WPM reporting, and activity/reporting feeds.

No active `localStorage` persistence was found in the Trainer Dashboard code. The remaining non-live pieces are hardcoded UI text, blocked placeholders, or in-memory React state.

## Current Live API Surface

- `getTrainerClassroomContext()` reads trainer assignments, classrooms, cohorts, and centres.
- `rotateClassroomJoinCode()` calls the join-code rotation RPC.
- `getClassroomCurriculum()` reads classroom curriculum items, overrides, and master activity routes.
- `saveClassroomCurriculum()` writes classroom overrides and trainer-added custom items.
- `getTrainerClassroomStudents()` reads active enrollments, joined profiles, attendance summary, lesson progress summary, challenge assignment count, and classroom curriculum counts.
- `getAttendance()` and `recordAttendance()` read/write attendance sessions and attendance records.
- `createWeeklyComment()` inserts weekly student comments.

## Local Storage / Browser Storage Check

### Trainer Dashboard

- No `localStorage`, `sessionStorage`, or `window.localStorage` usage found in `components/trainer/trainer-dashboard.tsx`.
- Badge awards are not persisted to localStorage; they are only in React state during the current page session.

### Elsewhere In App

- `components/auth-pages.tsx` and `components/pugolfers-app.tsx` use `sessionStorage` for a student welcome flow. This is not Trainer Dashboard persistence.
- Historical docs still mention old localStorage prototype behavior, but current migrated trainer paths do not appear to use localStorage.

## Tab-by-Tab Audit

### Shared Header / Classroom Access

Status: mostly live.

Live:

- Active classroom context comes from Supabase.
- Classroom switcher is restricted to classrooms returned by trainer context.
- Join-code rotation uses `rotate_classroom_join_code`.
- Plain code is shown only immediately after rotation.

Prototype/unconnected:

- None obvious in the shared classroom access area.

Likely work type:

- Already API/UI wired.
- No schema change expected unless adding join-code history, expiry, or audit display.

### Overview

Status: mixed live metrics and prototype content.

Live:

- Class student count comes from `studentsList`.
- Attendance today uses the current in-memory attendance map loaded from `attendance_records` for today.
- Curriculum progress average uses `lesson_progress` summary data.
- Active lesson count comes from the current classroom curriculum configuration.

Prototype/static:

- “This module’s classroom pulse” is hardcoded to `Module 6 · Coding & Arduino Basics`.
- Homework metric says `No data` with `Challenge submission API pending`.
- Hardware log says `Due Fri`, not derived from `hardware_sessions`.
- “Needs your attention” list uses hardcoded names: Brian Otieno, David Kiptoo, Hardware session.
- “Recent classroom activity” uses hardcoded activity feed entries: Chloe, Amina, Boolean Logic practice.

Likely work type:

- Module pulse: API/UI wiring if using active curriculum/module selection; schema may be needed if classrooms need a formal current module/week state.
- Homework metric: likely schema/API addition for challenge submissions/review, because existing schema only has `challenge_assignments`.
- Hardware log: mostly API/UI wiring because hardware tables exist, but Storage bucket/config/API may still need setup.
- Needs attention: API/UI wiring if derived from existing progress/attendance; schema addition only if you want persistent alerts/interventions.
- Recent activity feed: likely schema addition or audit/event query design unless it can reuse existing `audit_logs` plus learning tables.

### Curriculum

Status: live for the supported classroom curriculum model.

Live:

- Reads classroom curriculum from `classroom_curriculum_overrides` and `classroom_curriculum_items`.
- Saves edits, removals/restores, reordering, trainer-added content, and restore-master through `saveClassroomCurriculum()`.
- Review changes compares current classroom config against master curriculum, including content edits.
- No localStorage dependency found.

Prototype/unconnected:

- Master reference is static from `lib/curriculum.ts`.
- The UI supports only activity types already represented by the shared frontend activity union.
- Custom trainer-added item persistence is implemented by replacing all custom items for the classroom on each save. This is simple but not granular.

Likely work type:

- Mostly API/UI refinement.
- No immediate schema change for current supported actions.
- Schema/API improvement may be useful later for granular item updates, audit trail of curriculum edits, draft/live workflow, or preserving stable custom item IDs across reorder/save cycles.

### Attendance

Status: live, simple model.

Live:

- Student roster comes from active `student_enrollments` and profiles.
- Attendance for today is loaded through `getAttendance()`.
- Save writes `attendance_sessions` and `attendance_records`.
- Present/absent model matches current schema.

Prototype/static:

- Page still displays hardcoded module text: `Module 6 · Coding & Arduino Basics`.
- Date is always “today”; no UI for viewing/editing previous sessions.
- Disabled classroom select is display-only.

Likely work type:

- Previous sessions and module association: API/UI wiring if using existing `attendance_sessions.curriculum_item_id`; may need UI design for picking curriculum item/session date.
- More detailed attendance states would require enum/schema changes.

### Homework

Status: blocked placeholder.

Live:

- None in the Homework tab itself.
- Student summary counts existing `challenge_assignments` for the classroom.

Prototype/static:

- The tab only displays: `Challenge API not connected yet`.
- No assign form, due-date UI, submission review, grading, or status table.

Existing schema:

- `challenge_assignments` exists and can represent assigning master challenge lessons to classrooms.
- No dedicated challenge submission/review table was found.

Likely work type:

- Assignment UI/API for existing `challenge_assignments`: API/UI wiring.
- Student submission, review, attempts, grading, evidence, and feedback: schema addition likely required.

### Hardware Sessions

Status: blocked placeholder.

Live:

- No live dashboard workflow yet.

Prototype/static:

- The tab only displays `Hardware API not connected yet`.
- Overview and Reports also contain static hardware messaging.

Existing schema:

- `hardware_sessions`
- `hardware_session_outcomes`
- `hardware_evidence`

Likely work type:

- Basic create/list/update outcome API: mostly API/UI wiring because tables exist.
- Evidence upload flow: API/UI plus Supabase Storage bucket/policy setup may be required.
- If requiring richer rubrics or hardware-specific scoring, schema addition may be needed.

### Students

Status: mixed live data and placeholders.

Live:

- Student roster loads from active classroom enrollments and profile data.
- Curriculum progress summary is based on `lesson_progress` and active classroom curriculum count.
- Homework summary shows assigned challenge count.
- Weekly comments are saved through `weekly_student_comments`.
- Attendance/progress drive a simple “Review” vs “On track” status.

Prototype/static/unconnected:

- WPM column is always `- WPM`.
- Homework column only says assigned count, not submission/completion status.
- Status is a simple derived UI signal, not a persisted intervention/alert.
- Weekly comments are create-only; no trainer history list in this tab.

Likely work type:

- WPM: maybe API/UI wiring if using `lesson_progress.progress_data` for typing-test rows; schema change only if you want a first-class WPM table/model.
- Homework status: likely schema addition for challenge submissions/review.
- Status/interventions: API/UI only if derived live; schema addition if statuses/flags need persistence.
- Comment history: API/UI wiring using existing `weekly_student_comments`.

### Badge Awards

Status: in-memory prototype state.

Live:

- Student dropdown uses live `studentsList`.

Prototype/static:

- Awarded badges are stored only in React state `awards`.
- Badge list is hardcoded: Circuit Starter, Traffic Controller, Prompt Engineer, Team Player, Most Creative.
- Notice says record cannot be edited/revoked, but no database record is created.
- Refreshing the dashboard loses awards.

Existing schema:

- No badge award table found in current migrations.

Likely work type:

- Schema addition required for real badge definitions and award records.
- API/UI wiring needed after schema exists.
- Optional audit/revocation policy should be decided before implementation.

### Reports

Status: partial live aggregate plus placeholders.

Live:

- Curriculum progress average comes from `studentsList`.
- Attendance average comes from `studentsList`.
- Student “needing attention” list uses live students and summary fields.

Prototype/static/unconnected:

- Average typing speed always says `No data`.
- Hardware-session reporting is hardcoded: `Module 6 log required`, `0 / 3`.
- Homework in the student list uses assigned challenge count only, not completion/submission state.
- No date range, module filter, export, trend, or historical report model.

Likely work type:

- WPM report: API/UI wiring if derived from `lesson_progress.progress_data`; schema addition if first-class WPM persistence is desired.
- Hardware report: API/UI wiring against existing hardware tables.
- Homework report: schema addition likely needed for submissions/review.
- Date/module filters: API/UI wiring if based on existing timestamps and curriculum item IDs; schema additions only for saved report snapshots or formal reporting periods.

## Cross-Cutting Findings

### Prototype / Static Data Still Present

- Overview “Needs your attention” list uses hardcoded student names and details.
- Overview “Recent classroom activity” uses hardcoded activity feed entries.
- Overview module pulse is fixed to Module 6.
- Overview homework and hardware metrics are static/blocked.
- Attendance module label is fixed to Module 6.
- Hardware tab is placeholder text.
- Homework tab is placeholder text.
- Badge award persistence is in-memory only.
- Reports WPM and hardware sections are static/blocked.

### Unconnected APIs / Missing API Domains

- Challenge assignment management UI/API is not present, though `challenge_assignments` exists.
- Challenge submission/review API is missing.
- Hardware create/list/outcome/evidence API is missing from frontend.
- Badge award API is missing.
- WPM reporting API is missing.
- Activity feed/recent activity API is missing.
- Historical attendance browsing/editing API/UI is missing.
- Comment history read API for trainers is not surfaced in the Students tab.

### Likely Schema-Alter / Schema-Add Areas

- Challenge submissions/review: schema addition likely.
- Badges/awards: schema addition required.
- Formal WPM model: schema addition only if `lesson_progress.progress_data` is not enough.
- Activity feed: schema addition likely unless reusing existing audit logs/timestamps.
- Persistent interventions/status flags: schema addition if statuses should be saved.
- Hardware evidence Storage bucket/policies may need configuration even though metadata tables exist.

### Likely Easy API/UI Wiring Areas

- Hardware sessions basic CRUD against existing tables.
- Hardware outcome recording against existing tables.
- Hardware reports based on existing tables.
- Challenge assignment UI against existing `challenge_assignments`.
- Comment history display from existing `weekly_student_comments`.
- WPM display from existing `lesson_progress.progress_data` if typing-test data is stored there.
- Attendance session history using existing `attendance_sessions` and `attendance_records`.
- Dynamic active module display if derived from curriculum ordering/progress rather than a formal classroom-week state.

## Recommended Priority Order

1. Replace Overview hardcoded attention/activity/module cards with live derived states or honest empty states.
2. Build Challenge assignment UI using existing `challenge_assignments`.
3. Decide and add Challenge submission/review schema before claiming homework completion/review.
4. Wire Hardware session APIs to existing hardware tables.
5. Decide badge schema and write policy before enabling real badge awards.
6. Decide whether WPM should remain in `lesson_progress.progress_data` or get a first-class table.
7. Add trainer comment history and attendance history views using existing tables.
