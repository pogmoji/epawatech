# ePawaTech Phase 2 — Trainer Operations, Assignments, Weekly Reporting & Multi-Trainer Classrooms

## 1. Purpose

This phase expands the Trainer and Admin dashboards into a complete operational workflow.

It adds:

- Trainer → Admin concerns/issues communication.
- Admin-posted Weekly Inputs with individual trainer submissions.
- Weekly Classroom Reports submitted by the Lead Trainer.
- A dependable Homework/Assignments system with quizzes, document/file submissions, manual marking, and offline assessment.
- Proper support for multiple trainers in one classroom.
- Admin control over classroom trainers and Lead Trainer designation.

Codex must inspect and extend the existing implementation rather than create duplicate systems.

---

## 2. Mandatory First Step — Inspect Existing Code and Schema

Before changing code, inspect:

- Prisma schema and migrations.
- `classrooms` model/table.
- Existing trainer ↔ classroom relationships.
- Existing lead/co-trainer representation.
- Admin trainer-assignment APIs and UI.
- Trainer approval/assignment flow.
- Trainer dashboard shell and navigation.
- Existing homework/assignment schema and APIs.
- Existing Student Assignments UI.
- Current file upload/storage implementation.
- Existing trainer weekly comments.
- Existing authorization helpers.
- Any email/contact/report models or utilities already present.

Codex must explicitly determine:

1. Can one classroom currently have more than two trainers?
2. Is a trainer stored directly on `classrooms`?
3. Is there a many-to-many join table?
4. How is Lead Trainer represented?
5. Is there a database or application constraint limiting trainer count?
6. Can admin currently change a trainer's classroom role?
7. Can current homework models be extended instead of replaced?

Do not assume the current schema supports only one Lead + one Co-Trainer.

---

# PART A — MULTI-TRAINER CLASSROOMS

## 3. Classroom Trainer Rules

A classroom can have **multiple trainers**.

All classroom trainers are assigned by Admin.

All assigned trainers should have access to the same classroom operational dashboard and data, including where authorized:

- students;
- attendance;
- assignments/homework;
- student submissions;
- curriculum customization;
- hardware/evidence;
- WPM/progress;
- classroom records.

One assigned trainer is designated:

**Lead Trainer**

All other assigned trainers are regular classroom trainers/co-trainers.

Do not hardcode a single co-trainer slot.

---

## 4. Recommended Relationship

If the existing schema already supports many trainers cleanly, reuse it.

If not, use a many-to-many relationship such as:

```text
classroom_trainers
- id
- classroom_id
- trainer_id
- role
- assigned_by_admin_id
- assigned_at
- created_at
- updated_at
```

Suggested role values:

```text
lead
trainer
```

Recommended constraint:

```text
UNIQUE(classroom_id, trainer_id)
```

There should be only one active Lead Trainer per classroom.

Use a transaction and/or appropriate database constraint so changing leads cannot leave two active leads.

---

## 5. Admin Classroom Trainer Management

Admin must be able to:

- add a trainer to a classroom;
- remove a trainer from a classroom;
- view all assigned trainers;
- promote an assigned trainer to Lead Trainer;
- change the current Lead Trainer.

When Admin selects **Make Lead Trainer**:

- selected trainer becomes Lead;
- previous Lead becomes a normal classroom trainer;
- previous Lead stays assigned unless Admin separately removes them.

Changing Lead Trainer must not:

- create a new classroom;
- remove students;
- reset join codes;
- reset curriculum overrides;
- delete assignments;
- delete reports;
- delete attendance/history.

---

## 6. Shared vs Individual Trainer Data

### Shared classroom data

Shared among all authorized classroom trainers:

- students;
- attendance;
- assignments;
- submissions;
- curriculum overrides;
- classroom progress;
- classroom weekly report;
- evidence/hardware records.

### Individual trainer data

Belongs to one trainer:

- Weekly Topic submission.
- Trainer → Admin concern/report.
- Other individual accountability records.

This distinction is important throughout schema, APIs, UI, and authorization.

---

# PART B — TRAINER → ADMIN COMMUNICATION

## 7. New Trainer Tab

Add a Trainer Dashboard tab:

**Contact Admin**

or:

**Report an Issue**

Purpose:

A direct operational channel for trainers to communicate concerns, requests, or problems to Admin.

Examples:

- student concern;
- classroom issue;
- equipment issue;
- centre issue;
- scheduling;
- platform/technical issue;
- administrative request;
- other concern.

---

## 8. Concern Form

Recommended fields:

```text
Subject
Category
Priority
Classroom (optional / defaults to current classroom)
Message
Attachment (optional)
```

Suggested categories:

```text
Classroom
Student
Equipment
Schedule
Platform / Technical
Centre
Administrative
Other
```

Suggested priority:

```text
Normal
Important
Urgent
```

Keep the form simple.

---

## 9. Persist Concern in Database

Email must not be the only record.

Recommended model:

```text
trainer_admin_reports
- id
- trainer_id
- classroom_id nullable
- category
- priority
- subject
- message
- attachment_url nullable
- status
- email_notification_status nullable
- email_sent_at nullable
- created_at
- updated_at
```

Suggested statuses:

```text
submitted
reviewed
resolved
```

Trainer should be able to see their own report history and status.

Admin should have a database-backed inbox/list of trainer reports.

---

## 10. Truehost Email Design

When trainer submits:

```text
Trainer form
→ authenticated server endpoint/action
→ save report to PostgreSQL
→ attempt SMTP email
→ return response
```

Do **not** introduce:

- a permanent mail worker;
- Node queue consumer;
- daemon;
- polling service;
- background SMTP process;
- PM2 worker fleet.

Use request-scoped SMTP.

A normal Nodemailer-style SMTP send is acceptable if compatible with the current stack.

This will use the existing web request/process while sending and should not require an additional permanent process.

Configure through environment variables:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ADMIN_REPORT_EMAIL=
```

Do not hardcode credentials.

Do not guess Truehost SMTP port/security settings. Use the exact Truehost mail-account configuration.

---

## 11. Email Failure Safety

Required behavior:

```text
DB save succeeds
→ try SMTP send
→ if email succeeds, optionally record sent status
→ if email fails, retain DB report and log the failure safely
```

The trainer must not lose their report because SMTP temporarily failed.

Do not expose SMTP passwords or raw SMTP errors to the UI.

---

## 12. Admin Email Content

Admin inbox email should contain:

- trainer name;
- trainer email;
- centre;
- classroom if applicable;
- category;
- priority;
- subject;
- message;
- submitted time;
- report/reference ID.

For attachments, prefer storing the file using existing app storage and showing it inside the authenticated Admin report view.

Avoid complex email attachment handling unless it is already easy and reliable.

---

## 13. Admin Trainer Reports Page

Add Admin page/tab:

**Trainer Reports**

Admin can:

- list reports;
- open details;
- filter by trainer;
- filter by centre;
- filter by classroom;
- filter by category;
- filter by status;
- see priority;
- mark reviewed;
- mark resolved.

The dashboard record is the canonical record.

Email is a notification.

---

# PART C — Weekly Inputs

## 14. Concept

Admin posts a weekly topic/task for trainers.

Every trainer is individually required to submit their response.

This is **not** the Weekly Classroom Report.

Rule:

> Weekly Topic submission belongs to the individual trainer.

If a classroom has three trainers, all three submit separately.

---

## 15. Admin Weekly Topic Workflow

Admin can:

- create topic;
- set title;
- write instructions;
- select/set week;
- set due date;
- attach an optional reference file;
- publish/unpublish;
- edit where safe;
- see submissions;
- see missing trainers;
- mark submission reviewed if desired.

---

## 16. Trainer Weekly Inputs Tab

Add Trainer tab:

**Weekly Inputs**

Trainer can:

- see current topic;
- see instructions;
- see due date;
- see previous topics;
- submit response;
- view their own submission history/status.

Submission modes:

- written text;
- PDF upload;
- DOCX upload;
- optionally both text + file.

Allowed initial files:

```text
.pdf
.docx
```

---

## 17. Weekly Topic Schema

Possible model:

```text
weekly_topics
- id
- title
- instructions
- week_key / week_number
- starts_at nullable
- due_at
- published
- created_by_admin_id
- attachment_url nullable
- created_at
- updated_at
```

Submission model:

```text
trainer_weekly_topic_submissions
- id
- weekly_topic_id
- trainer_id
- text_response nullable
- file_url nullable
- file_name nullable
- file_type nullable
- status
- submitted_at
- updated_at
```

Recommended constraint:

```text
UNIQUE(weekly_topic_id, trainer_id)
```

Suggested statuses:

```text
submitted
reviewed
```

`Overdue` can be calculated.

---

## 18. Admin Weekly Topic Compliance

Admin must be able to see trainer-level compliance.

Example:

```text
Week 5 Topic

Trainer A — Submitted
Trainer B — Reviewed
Trainer C — Missing
```

Do not report completion only at classroom level because this submission is individual.

---

# PART D — WEEKLY CLASSROOM REPORT

## 19. Concept

Add Trainer tab:

**Weekly Report**

This report describes how that classroom's week/session actually went.

It is a classroom-level accountability report.

Rule:

> One official Weekly Report per classroom per week, submitted by the Lead Trainer.

---

## 20. Permissions

### Lead Trainer

Can:

- create report;
- submit report;
- view report history;
- edit where allowed before Admin review/lock.

### Other assigned classroom trainers

Can:

- view the classroom Weekly Report;
- view history.

Cannot submit a competing official report.

### Admin

Can:

- view;
- filter;
- review;
- see missing reports.

### Student

No access.

---

## 21. Weekly Report Input

Support:

- written report;
- PDF upload;
- DOCX upload;
- optionally text + file.

A simple first UI may contain:

```text
Week
Written Report
Attachment
```

Use helpful prompts such as:

- What went well?
- What challenges were experienced?
- How was student engagement?
- What was covered?
- Is follow-up needed?

Do not force an excessively long form.

---

## 22. Weekly Report Schema

Possible model:

```text
classroom_weekly_reports
- id
- classroom_id
- week_key / week_number
- submitted_by_trainer_id
- report_text nullable
- file_url nullable
- file_name nullable
- file_type nullable
- status
- submitted_at
- updated_at
```

Recommended constraint:

```text
UNIQUE(classroom_id, week_key)
```

Suggested statuses:

```text
submitted
reviewed
```

`Pending` / `Overdue` can be calculated.

---

## 23. Weekly Topic vs Weekly Report

Do not merge these.

### Weekly Topic

```text
Admin → Trainer
One submission per individual trainer.
```

Example:

`Describe how you will introduce loops this week.`

### Weekly Classroom Report

```text
Classroom → Admin
One official report per classroom/week.
Submitted by Lead Trainer.
```

Example:

`18 students attended. Loops were introduced successfully, but...`

These require separate models, routes, permissions, and UI.

---

# PART E — ASSIGNMENTS / HOMEWORK

## 24. Goal

Fix and extend the existing homework/assignment API so it becomes a dependable end-to-end system.

Do not build a duplicate homework subsystem if existing models can be extended.

Student-facing label:

**Assignments**

Trainer homework remains separate from:

**Universal Challenges**

Universal Challenges are Admin-created platform-wide content.

Assignments are Trainer-created classroom work.

---

## 25. Required Assignment Types

Support four simple types initially:

1. Quiz
2. Written / Document
3. File Upload
4. External / Offline Review

Avoid building a complex LMS/exam engine in this phase.

---

# QUIZ ASSIGNMENT

## 26. Quiz Creation

Trainer can set:

- title;
- instructions;
- due date if supported;
- total marks;
- questions;
- answer options;
- correct answer;
- marks per question.

Initial required question type:

```text
multiple_choice
```

Optional if easy:

```text
true_false
```

---

## 27. Quiz Student Flow

Student:

1. opens assignment;
2. answers questions;
3. submits;
4. server calculates marks;
5. result persists;
6. student sees result;
7. trainer sees result.

Quiz marking is automatic.

No manual trainer marking is required for normal quiz submissions.

Correct answers must not be exposed to the student before submission.

Scoring must happen server-side.

---

# WRITTEN ASSIGNMENT

## 28. Written Work

Trainer creates a task where student writes a response.

Student may:

- type directly in app;
- upload a document if assignment configuration allows it.

Trainer manually:

- reviews response;
- awards marks;
- adds optional feedback.

---

# FILE UPLOAD ASSIGNMENT

## 29. File Submission

Trainer can require a document/project upload.

Initial supported formats:

```text
.pdf
.doc
.docx
.ppt
.pptx
```

Examples:

- Word document;
- PDF;
- PowerPoint presentation;
- project report.

Trainer reviews the uploaded file and manually awards marks.

Use existing storage infrastructure.

Do not add another storage vendor only for assignments.

---

# EXTERNAL / OFFLINE ASSIGNMENT

## 30. External Review

Some work happens outside the app.

Examples:

- practical robotics task;
- classroom presentation;
- handwritten work;
- physical project;
- demonstration;
- external project.

Trainer can create assignment type:

```text
external_review
```

Student sees the instructions.

No file submission is required unless trainer chooses one.

Trainer manually records:

- completion;
- marks;
- feedback.

---

## 31. Assignment Schema

Inspect current homework models first.

Potential extended structure:

```text
assignments
- id
- classroom_id
- created_by_trainer_id
- title
- instructions
- assignment_type
- total_marks
- due_at nullable
- published
- created_at
- updated_at
```

Suggested types:

```text
quiz
written
file_upload
external_review
```

---

## 32. Quiz Models

Possible:

```text
assignment_questions
- id
- assignment_id
- question_text
- question_type
- marks
- sort_order
```

```text
assignment_question_options
- id
- question_id
- option_text
- is_correct
- sort_order
```

Do not expose `is_correct` through student read APIs before submission.

---

## 33. Student Submission Model

Possible:

```text
assignment_submissions
- id
- assignment_id
- student_id
- text_response nullable
- file_url nullable
- file_name nullable
- status
- auto_score nullable
- manual_score nullable
- final_score nullable
- trainer_feedback nullable
- reviewed_by_trainer_id nullable
- reviewed_at nullable
- submitted_at nullable
- created_at
- updated_at
```

Possible statuses:

```text
not_started
submitted
reviewed
completed
```

Keep states minimal.

---

## 34. Quiz Answer Persistence

If needed:

```text
assignment_quiz_answers
- id
- submission_id
- question_id
- selected_option_id
- is_correct
- marks_awarded
```

Quiz scoring algorithm:

1. Load questions securely.
2. Load correct answers server-side.
3. Validate student's selected options.
4. Calculate marks.
5. Save answers/results.
6. Save final score.
7. Mark submission complete/reviewed as appropriate.

Never accept the student's calculated score from the browser.

---

## 35. Marking Rules

### Quiz

```text
final_score = auto_score
```

### Written

```text
final_score = manual_score
```

### File Upload

```text
final_score = manual_score
```

### External Review

```text
final_score = manual_score
```

Server validation:

```text
0 <= marks <= total_marks
```

Trainer cannot mark work from another classroom.

---

## 36. Trainer Feedback on Assignments

For manually reviewed assignments, trainer can add feedback.

Student sees:

- awarded marks;
- total marks;
- trainer feedback;
- reviewed date.

Assignment feedback is separate from:

- trainer weekly student comments;
- student reflections;
- Weekly Classroom Reports.

---

## 37. Trainer Assignment UI

Assignments tab should provide:

### List

- title;
- type;
- due date;
- status;
- submission count;
- awaiting-review count.

### Create

Trainer selects:

```text
Quiz
Written
File Upload
External / Offline
```

Form adapts to type.

### Detail

Trainer sees:

- instructions;
- classroom students;
- submission status;
- score;
- review action.

---

## 38. Assignment Review Queue

Trainer Overview or Assignments page should show:

```text
5 submissions awaiting review
```

Auto-marked quizzes should not normally count as awaiting manual review.

---

## 39. Student Assignment UI

Student Assignments should clearly group:

```text
To Do
Submitted
Completed
```

Each assignment displays its type.

Examples:

```text
Quiz
Written
File Upload
Practical / Offline
```

For manually reviewed work:

```text
Submitted — Awaiting trainer review
```

For graded work:

```text
Score: 8 / 10
```

---

## 40. Multi-Trainer Assignment Permissions

All trainers assigned to the classroom may:

- create assignments;
- view assignments;
- review submissions;
- award manual marks;
- provide assignment feedback.

Record:

```text
created_by_trainer_id
reviewed_by_trainer_id
```

Assignments are shared classroom operational data.

They are not Lead-Trainer-only.

---

# PART F — FILE UPLOAD RULES

## 41. Upload Security

Validate server-side:

- MIME type;
- extension;
- file size;
- authenticated ownership;
- classroom relationship;
- assignment/topic/report relationship.

Use generated safe storage names.

Store original filename separately for UI display.

Do not accept executable file types.

Do not run Office/PDF conversion processes on the server for this phase.

Allow authenticated download/view where appropriate.

---

# PART G — NAVIGATION

## 42. Trainer Navigation

Adapt the current trainer dashboard rather than replacing it.

Required features should be directly discoverable.

Suggested structure:

```text
Overview
Classroom / Students
Attendance
Assignments
Curriculum
Progress / WPM
Weekly Inputs
Weekly Report
Contact Admin
```

Keep any other existing useful tabs.

---

## 43. Admin Navigation

Integrate with current Admin design.

Required admin access:

- Classroom trainer management.
- Trainer Reports.
- Weekly Inputs.
- Weekly Reports.

Do not redesign unrelated Admin areas.

---

# PART H — DASHBOARD STATUS

## 44. Trainer Overview Indicators

Useful concise indicators:

- assignments awaiting review;
- current Weekly Topic status;
- Weekly Report status;
- current classroom;
- Lead Trainer indicator;
- student count.

Do not overload Overview.

Tabs remain the work areas.

---

## 45. Admin Operational Indicators

Possible concise cards:

- trainer reports requiring review;
- missing Weekly Topic submissions;
- missing Weekly Classroom Reports.

Avoid unnecessary analytics.

---

# PART I — WEEK / COHORT INTEGRATION

## 46. Reuse Existing Week Concept

Inspect whether ePawaTech already has authoritative:

- curriculum week number;
- cohort week;
- session week;
- start date.

Reuse it.

Do not create an unrelated free-text week system if an existing week identity can be used.

Possible stable identifiers:

```text
cohort_id + week_number
```

or:

```text
week_start_date
```

---

# PART J — AUTHORIZATION

## 47. Server-Side Permissions

Do not rely on hidden buttons.

### Contact Admin

Trainer:
- create own report;
- view own history.

Admin:
- view/manage all reports.

### Weekly Topic

Admin:
- create/publish/manage topic.

Trainer:
- submit only as authenticated self;
- view own submission/history.

### Weekly Classroom Report

Lead Trainer:
- create/update official classroom report.

Other assigned trainers:
- read-only.

Admin:
- read/review.

### Assignments

Assigned classroom trainer:
- create/manage/review classroom assignments.

Classroom student:
- see relevant assignment;
- submit only own work;
- see only own submission/marks.

### Trainer Management

Admin only:
- assign trainers;
- remove trainers;
- change Lead Trainer.

---

## 48. Never Trust Browser Identity Fields

Do not trust raw client values such as:

```text
trainer_id
student_id
classroom_id
role
is_lead
score
```

Derive current user from authenticated session.

Verify relationships from database.

---

# PART K — DATABASE / MIGRATIONS

## 49. Prisma/PostgreSQL Rules

Follow existing project conventions.

Codex should:

- update Prisma schema;
- prepare migration/SQL;
- add useful indexes;
- add uniqueness constraints;
- preserve existing data;
- avoid destructive replacement.

Important project rule:

**Do not automatically run production SQL.**

Prepare schema/migration changes for review/manual application unless explicitly instructed otherwise.

Before creating a new table, verify an equivalent one does not already exist.

---

## 50. Useful Constraints

Potential:

```text
UNIQUE(classroom_id, trainer_id)
UNIQUE(weekly_topic_id, trainer_id)
UNIQUE(classroom_id, week_key)
UNIQUE(assignment_id, student_id)
```

The last rule must be adapted if quiz multiple attempts are intentionally supported.

---

# PART L — EDITING SAFETY

## 51. Quiz Editing

Once students have submitted a quiz:

- do not freely change correct answers;
- do not change question marks in a way that invalidates results;
- do not delete scored questions.

Simple safe v1 behavior:

> Lock quiz questions/scoring after the first student submission.

---

## 52. Reports and Topic Editing

Weekly Topic submission:
- trainer may edit before review/due-date according to chosen policy.

Weekly Classroom Report:
- Lead may edit before Admin review/lock according to chosen policy.

Trainer Concern:
- prefer preserving submitted content as an audit record.
- Admin can update status without rewriting the trainer's original message.

---

# PART M — EMPTY STATES

## 53. Trainer UI Examples

Weekly Inputs:

`No weekly topic has been posted yet.`

Missing submission:

`Your Weekly Topic response is due [date].`

Weekly Report, Lead Trainer:

`This week's classroom report has not been submitted.`

Weekly Report, other trainer:

`The Lead Trainer submits the official Weekly Report. You can view it here after submission.`

Contact Admin:

`You haven't submitted any reports or concerns.`

Assignments:

`No assignments have been created for this classroom yet.`

---

# PART N — TRUEHOST PROCESS SAFETY

## 54. Runtime Requirements

Given prior Truehost/cPanel process exhaustion, avoid architecture requiring:

- background Node mail workers;
- persistent queues;
- worker daemons;
- long-lived polling;
- document-conversion services;
- unnecessary child processes.

Prefer:

- normal Next.js request lifecycle;
- PostgreSQL persistence;
- direct SMTP;
- direct file storage/upload;
- stateless API/server actions.

This phase should not need an additional permanent process for email.

---

# PART O — IMPLEMENTATION ORDER

## 55. Phase 2A — Multi-Trainer Foundation

1. Audit schema.
2. Confirm/remove trainer-count limitation.
3. Normalize many-to-many classroom trainers if needed.
4. Implement one Lead Trainer per classroom.
5. Admin add/remove trainers.
6. Admin Make Lead Trainer.
7. Update classroom authorization.

Do this first because Weekly Report permissions depend on Lead Trainer.

---

## 56. Phase 2B — Contact Admin

1. Add persistent Trainer Report model.
2. Add Trainer form.
3. Add Trainer report history.
4. Add Admin Trainer Reports page.
5. Add request-scoped Truehost SMTP.
6. Add email failure handling.
7. Test without background workers.

---

## 57. Phase 2C — Weekly Inputs

1. Admin topic model/UI.
2. Publish/due date.
3. Trainer individual submission model.
4. Text/PDF/DOCX submission.
5. Trainer history/status.
6. Admin submitted/missing/reviewed view.

---

## 58. Phase 2D — Weekly Classroom Reports

1. Report model.
2. One classroom/week constraint.
3. Lead-Trainer submission.
4. Other trainer read-only view.
5. Text/PDF/DOCX.
6. Admin review/compliance list.

---

## 59. Phase 2E — Assignments

1. Audit current homework API/schema.
2. Extend, don't duplicate.
3. Add four assignment types.
4. Add submissions.
5. Add upload handling.
6. Add basic quiz builder.
7. Add secure server-side auto-marking.
8. Add manual marking.
9. Add trainer feedback.
10. Add external/offline assessment.
11. Connect existing Student Assignments UI.
12. Add review queue/status.

---

## 60. Phase 2F — Polish

- responsive UI;
- loading/success/error states;
- empty states;
- upload validation;
- authorization tests;
- SMTP failure test;
- multi-trainer regression;
- student/trainer/admin regression.

---

# PART P — TESTING MATRIX

## 61. Multi-Trainer Tests

Verify:

- Admin assigns trainer A.
- Admin assigns trainer B.
- Admin assigns trainer C.
- All access same classroom.
- No duplicate classroom is created.
- Admin promotes B to Lead.
- A remains assigned as normal trainer.
- Exactly one Lead exists.
- Removed trainer loses access.

---

## 62. Contact Admin Tests

Verify:

- Trainer submits concern.
- DB row persists.
- Admin dashboard shows report.
- SMTP sends to Admin.
- Trainer sees own history.
- SMTP failure keeps DB record.
- Trainer cannot read another trainer's private report history unless intentionally allowed.

---

## 63. Weekly Topic Tests

Verify:

- Admin publishes topic.
- Every trainer sees it.
- Trainer A submission does not satisfy Trainer B.
- Text works.
- PDF works.
- DOCX works.
- Admin sees missing trainers.
- Trainer cannot submit as another trainer.

---

## 64. Weekly Report Tests

Verify:

- Lead Trainer can submit.
- Other trainer cannot submit official report.
- Other trainer can read it.
- Duplicate classroom/week report is blocked or updates existing record.
- Admin can review.
- Missing classrooms are visible.
- New Lead can submit future reports after Admin changes lead.

---

## 65. Quiz Tests

Verify:

- Trainer creates quiz.
- Student sees it.
- Correct answer is not exposed.
- Student submits.
- Server calculates marks.
- Score persists.
- Student sees result.
- Trainer sees result.
- No manual marking required.

---

## 66. Written/File Tests

Verify:

- Student can submit written work.
- Student can upload supported file.
- Unsupported file rejected.
- Trainer can inspect submission.
- Trainer can award valid marks.
- Marks above total are rejected.
- Trainer feedback persists.
- Student sees marks and feedback.

---

## 67. External Assignment Tests

Verify:

- Trainer creates external assignment.
- Student sees instructions.
- No upload required.
- Trainer manually marks student.
- Result appears to student.

---

## 68. Security Tests

Verify:

- unassigned trainer cannot access classroom;
- trainer cannot promote themselves to Lead;
- trainer cannot add trainers;
- student cannot submit for another student;
- student cannot alter marks;
- student cannot submit to another classroom assignment;
- non-lead trainer cannot create Weekly Classroom Report;
- non-admin cannot create Weekly Topic;
- trainer cannot submit Weekly Topic as another trainer;
- quiz answers are not leaked;
- upload endpoints require authentication;
- Admin-only trainer management is protected server-side.

---

# PART Q — DEFINITION OF DONE

## 69. Phase 2 is complete when:

- classrooms support multiple trainers;
- Admin can add/remove assigned trainers;
- Admin can change Lead Trainer;
- former Lead remains a normal trainer unless removed;
- assigned trainers share classroom operations;
- Lead Trainer status is server-enforced;
- Trainer has Contact Admin;
- reports persist in PostgreSQL;
- Admin receives email notification;
- Admin has internal Trainer Reports inbox;
- SMTP uses request-scoped sending without permanent worker processes;
- Admin can publish Weekly Inputs;
- each trainer submits Weekly Topic individually;
- Weekly Inputs support text/PDF/DOCX;
- Admin sees missing trainer submissions;
- Lead Trainer submits one Weekly Classroom Report per classroom/week;
- Weekly Reports support text/PDF/DOCX;
- other classroom trainers can view report read-only;
- Admin can review Weekly Reports;
- existing assignment API is functional;
- quizzes auto-mark securely;
- written assignments support manual marking;
- file assignments support manual marking;
- external/offline assignments support manual marking;
- Trainer can add assignment feedback;
- Student sees submission status, marks, and feedback;
- Assignments remain distinct from universal Challenges;
- every backend feature has a usable UI path;
- Visitor/Student/Trainer/Admin existing experiences remain functional;
- schema changes are prepared safely and not blindly run against production.

---

# 70. Final Instruction to Codex

Do not implement this as isolated tabs with unrelated logic.

The ownership model is the key:

```text
Classroom
→ many trainers
→ one Lead Trainer

Weekly Topic
→ belongs to individual trainer

Weekly Classroom Report
→ belongs to classroom
→ submitted by Lead Trainer

Assignment
→ belongs to classroom
→ managed by any assigned trainer
→ completed by classroom students

Trainer Concern
→ belongs to trainer
→ visible to Admin
→ email is notification, DB is source of truth
```

Inspect the existing schema and APIs first.

Reuse working trainer dashboard components, authorization helpers, file storage, classroom context, and assignment models.

Do not create a backend capability without a usable frontend path.

Do not create a frontend control that is not protected and supported by the backend.
