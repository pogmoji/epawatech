# Phase 2 Trainer Operations Progress

This file tracks implementation against `EPAWATECH_PHASE_2_TRAINER_OPERATIONS_CODEX.md`.

## Step 1 — Existing Schema Inspection

1. **Can one classroom currently have more than two trainers?**  
   Yes. `trainer_assignments` is a relationship table and has no two-trainer limit.

2. **Is a trainer stored directly on `classrooms`?**  
   No. `classrooms` stores `created_by`, but trainer placement lives in `trainer_assignments`.

3. **Is there a many-to-many join table?**  
   Yes. `trainer_assignments` is the existing Trainer ↔ Classroom/Cohort/Centre relationship table.

4. **How is Lead Trainer represented?**  
   `trainer_assignments.role = 'lead'`. Other classroom trainers use `role = 'co_teacher'`.

5. **Is there a database or application constraint limiting trainer count?**  
   There is a partial unique index allowing only one active lead per classroom. Migration 021 adds one active assignment per trainer/classroom, but still allows multiple active trainers in the classroom.

6. **Can admin currently change a trainer's classroom role?**  
   Before migration 021, admin could reassign a lead, but the old lead was completed. Migration 021 adds lead promotion while keeping the previous lead active as a co-teacher.

7. **Can current homework models be extended instead of replaced?**  
   Likely yes. Existing `challenge_assignments` and related learning operation tables should be inspected before Part E so Assignments remain separate from Universal Challenges.

## Completed

### Part A — Multi-Trainer Classrooms

- Added `supabase/migrations/021_multi_trainer_classroom_management.sql`.
- Kept the existing `trainer_assignments` model instead of creating a duplicate classroom-trainer table.
- Added admin RPCs for:
  - assigning additional classroom trainers;
  - changing the Lead Trainer;
  - removing classroom trainers without deleting history.
- Updated Admin → Classrooms UI to show assigned trainers and expose Add trainer, Make Lead, and Remove actions.

### Part B — Trainer → Admin Communication

- Added `supabase/migrations/022_trainer_admin_reports.sql`.
- Added persistent `trainer_admin_reports` records with RLS:
  - trainers create/read their own reports;
  - admins read and update report status.
- Added private `trainer-report-attachments` storage bucket and policies.
- Added Trainer → Contact Admin tab with:
  - subject;
  - category;
  - priority;
  - optional classroom;
  - message;
  - optional PDF/Word/image attachment;
  - trainer report history.
- Added Admin → Trainer Reports inbox with reviewed/resolved status actions.
- Added SMTP placeholders to `.env.example`.

Email sending note: the database records `email_notification_status` and `email_sent_at`, and `.env.example` now documents the SMTP variables. Request-scoped SMTP sending still needs a compatible mailer dependency or server mail utility before it can send Truehost mail.

## Next Step

Continue with Part C: Weekly Topics.
