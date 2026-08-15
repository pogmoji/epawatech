# ePawatech — Trainer Dashboard Implementation Guide

## Purpose

Build the **Trainer Dashboard** for ePawatech.

The Trainer Dashboard is the operational workspace for a trainer managing their own classroom(s), students, classroom activities, attendance, homework, hardware-session evidence, student feedback, and — most importantly — the **classroom-specific curriculum**.

The Trainer is the **master of the curriculum for their classroom**, but not the master of the platform's global curriculum.

The implementation must allow a Trainer to adapt the curriculum from the frontend using the curriculum building blocks that ePawatech already supports, without requiring a developer to hardcode every classroom variation.

At the same time, Trainers must not be able to invent new curriculum/activity types that the platform does not support.

---

## 1. Core Role

The Trainer's role is:

> **Operational input and curriculum control for their own classroom(s).**

A Trainer should be able to manage the learning experience of their assigned classroom while remaining strictly scoped to the appropriate classroom, cohort, and centre.

The dashboard should make the Trainer feel like the person running the classroom rather than an administrator of the entire platform.

---

## 2. Critical Concept — Classroom Curriculum Customization

This is the most important part of this dashboard.

The platform has a **master curriculum**.

The Trainer does NOT edit that master curriculum.

Instead, the Trainer gets a **classroom-specific curriculum configuration** derived from the available curriculum.

Conceptually:

```text
MASTER CURRICULUM
       |
       v
CLASSROOM CURRICULUM
       |
       v
STUDENTS IN THAT CLASSROOM
```

Example:

```text
Master Week 6
├── Boolean Logic
├── Sequences
├── Arduino Concepts
└── Blink Logic
```

Trainer's Classroom A:

```text
Week 6
├── Boolean Logic
├── Extra Practice
├── Sequences
└── Blink Logic
```

Trainer's Classroom B can remain:

```text
Week 6
├── Boolean Logic
├── Sequences
├── Arduino Concepts
└── Blink Logic
```

The change made by Trainer A must NOT affect:

- the master curriculum
- Classroom B
- another classroom
- another cohort
- students outside Classroom A

---

## 3. Curriculum Customization Rules

The Trainer can compose the classroom curriculum using **existing platform capabilities**.

The Trainer may:

- Add a lesson
- Remove a lesson
- Reorder lessons
- Reorder modules
- Add supported content blocks
- Add supported quizzes
- Add supported coding activities
- Add supported Python activities/challenges
- Add supported projects
- Add supported videos/resources
- Adjust supported lesson content
- Add supplementary learning material
- Change the sequence in which classroom students encounter content

The Trainer cannot:

- Edit the master curriculum
- Affect another classroom
- Affect another cohort
- Affect students outside their classroom
- Create a new activity type that the platform does not support
- Create new underlying curriculum functionality
- Modify application architecture
- Modify platform-wide curriculum rules

The key principle is:

> **Trainers can compose and configure what the platform already knows how to do. They cannot create new types of things the platform does not know how to do.**

---

## 4. Frontend Curriculum Builder

Do not make Trainers edit JSON, database records, code, or configuration files.

The customization must happen through the Trainer Dashboard UI.

Use an expandable/dropdown hierarchical interface.

Conceptually:

```text
Week 6 — Coding & Arduino Basics                         [Edit]
│
├── ▼ Module: Programming Logic                         [⋮]
│   │
│   ├── ▼ Lesson: Boolean Logic                         [⋮]
│   │    ├── Content
│   │    ├── Quiz
│   │    └── Coding Challenge
│   │
│   ├── ▶ Lesson: Sequences                             [⋮]
│   │
│   └── [+ Add Lesson]
│
├── ▼ Module: Arduino Basics                            [⋮]
│   │
│   ├── ▶ Lesson: Arduino Concepts                      [⋮]
│   └── ▶ Lesson: Blink Logic                           [⋮]
│
└── [+ Add Module]
```

The exact visual implementation is up to Codex, but the interaction should be intuitive and hierarchical.

---

## 5. Add Lesson / Add Activity

When a Trainer clicks:

```text
+ Add Lesson
```

do NOT provide a completely blank custom-content system.

Instead, present the activity/content types already supported by the application.

For example:

```text
Add to Classroom
-----------------------------
Lesson
Reading
Video
Quiz
Coding Activity
Python Challenge
Project
Resource
-----------------------------
```

The exact list must be generated from the application's actual supported curriculum component types.

Do not invent component types just for the dashboard.

This allows the platform to remain extensible without giving Trainers unrestricted CMS functionality.

---

## 6. Removing Curriculum Items

Trainers should be able to remove a lesson/activity from their classroom's curriculum.

Removing an item should mean:

> "Do not assign/show this curriculum item to students in this classroom."

It must NOT mean:

> "Delete the master lesson."

Never allow a Trainer's classroom customization to physically delete a master curriculum object.

The UI should make this distinction clear.

For example:

```text
Remove from classroom
```

rather than:

```text
Delete lesson
```

This is a critical safety rule.

---

## 7. Reordering

Trainers should be able to reorder:

- modules
- lessons
- activities/content blocks

Use drag-and-drop where appropriate, or another clear ordering interface.

The order should only affect the Trainer's classroom.

Example:

```text
Master:
Lesson A → Lesson B → Lesson C

Classroom:
Lesson B → Lesson A → Lesson C
```

The master remains:

```text
Lesson A → Lesson B → Lesson C
```

---

## 8. Classroom-Specific Additions

Trainers should be able to add supplementary content to their classroom using existing platform components.

For example:

```text
Week 6
├── Boolean Logic
├── Trainer Added: Extra Boolean Practice
├── Sequences
└── Blink Logic
```

The Trainer-added item belongs to that classroom.

It must not automatically become part of the global master curriculum.

The UI should clearly distinguish:

```text
Core Curriculum
```

from:

```text
Trainer Added
```

where appropriate.

---

## 9. Classroom Scope

All Trainer operations must be scoped to the Trainer's authorized classroom(s).

A Trainer must not be able to access or modify another Trainer's classroom simply by manipulating URLs, IDs, request bodies, or frontend state.

Authorization must be enforced server-side.

Do not rely on hidden buttons or frontend filtering as the security mechanism.

The eventual database architecture must support this through appropriate authorization/RLS policies.

---

## 10. Important Database Constraint

**The database architecture has NOT been finalized yet.**

Do not assume a final schema.

Do not create a large irreversible schema based purely on this document.

Before implementing persistence, Codex should:

1. Inspect the existing database/schema.
2. Identify existing entities and relationships.
3. Reuse existing models where appropriate.
4. Identify what is missing for classroom-specific curriculum customization.
5. Propose the minimum required data model.
6. Keep the design compatible with future master-curriculum inheritance/override behavior.

The implementation should not treat a guessed database design as the final architecture.

If schema changes are required, keep them isolated and explain the proposed model before making large migrations.

---

## 11. Recommended Curriculum Data Concept

The implementation should conceptually support:

```text
Master Curriculum
        |
        v
Classroom Curriculum Configuration
        |
        v
Student Experience
```

A classroom configuration may contain:

- inherited master curriculum items
- classroom-specific ordering
- classroom-specific removals
- classroom-specific additions
- classroom-specific content adjustments

The exact database representation is intentionally left open until the schema is designed.

Avoid duplicating the entire master curriculum for every classroom unless there is a strong architectural reason.

Prefer a model that can represent:

```text
Master item
    +
Classroom override
```

where practical.

---

## 12. Dashboard Overview

The Trainer's dashboard home should provide a quick operational view.

Include where supported:

- Assigned centre
- Active cohort
- Classroom(s)
- Number of students
- Attendance status
- Weekly progress
- At-risk flags
- Assigned homework completion
- Hardware-session logging status
- WPM tracking
- Trainer-awarded badges
- Recent classroom activity

Keep the dashboard focused on information the Trainer can act upon.

---

## 13. Classroom Management

The Trainer can:

- Create a classroom under the centre's active cohort, subject to the existing approval workflow.
- View their classroom(s).
- View students in their classroom.
- Manage classroom-level curriculum.
- Assign challenges/homework.
- Record attendance.
- Record hardware-session outcomes.
- Upload hardware-project evidence.
- Write weekly student comments.

The Trainer cannot approve their own classroom creation request.

---

## 14. Classroom Creation

A Trainer can request/create a classroom under the centre's one active cohort.

The existing workflow is:

```text
Trainer
   |
   v
Create classroom request
   |
   v
Admin review
   |
   v
Approved / Rejected
```

A Trainer cannot approve their own request.

Use the existing centre/cohort/classroom concepts once the database architecture is established.

---

## 15. Student Joining

Students join the appropriate classroom using the trainer/centre/cohort/classroom code mechanism defined by the platform.

The approved student should become associated with the correct classroom.

Where the existing workflow requires:

```text
lead
```

and admin approval, preserve that behavior.

Do not invent a new student-joining workflow.

---

## 16. Co-Teacher

A Trainer can generate an invite code for another teacher to join their classroom as:

```text
co_teacher
```

The invited teacher submits a reason.

The request still requires separate Admin approval.

Trainer cannot approve the co-teacher request.

---

## 17. Attendance

Provide a simple attendance workflow.

The Trainer should be able to:

- Select classroom
- Select session/date
- View students
- Mark attendance
- Save the session

The interface should make repeated weekly attendance entry quick.

Do not overcomplicate this into a full school-management system.

---

## 18. Hardware / Arduino Session Logging

Hardware session outcomes are important because physical robotics work cannot necessarily be detected automatically.

For Weeks 6–8, the Trainer's hardware-session records are the authoritative source of truth for physical activity completion.

Provide a clear workflow for:

```text
Hardware Session
       |
       v
Select classroom
       |
       v
Select curriculum/project activity
       |
       v
Record outcome
       |
       v
Optional evidence
       |
       v
Save
```

The Trainer should be able to upload photo/video evidence for hardware projects.

Do not attempt to automatically infer physical hardware completion from the software platform.

---

## 19. Weekly Student Comments

Allow a Trainer to write a weekly free-text comment for each student.

Rule:

> One new comment record per student per week.

The comment should feed the student's/parent's progress card where that feature exists.

Do not overwrite historical comments.

The history should remain available.

---

## 20. Homework / Challenge Assignment

The Trainer can assign existing challenges as homework to their classroom.

The workflow should be:

```text
Select Challenge
       ↓
Select Classroom
       ↓
Set assignment details
       ↓
Assign
```

Students in that classroom should see the assignment.

The assignment should not automatically affect another classroom.

Use the existing Challenge/ChallengeAttempt architecture where possible.

---

## 21. Trainer-Awarded Badges

Trainers can manually award the supported trainer-level badges:

- Circuit Starter
- Traffic Controller
- Prompt Engineer
- Team Player
- Most Creative

The award operation is insert-only for the Trainer.

A Trainer cannot later edit or revoke their own award.

Do not implement deletion as the mechanism for corrections.

If an administrative correction is required, it should follow the Admin correction/audit rules.

Do not expand this into the full gamification system.

---

## 22. Progress & Analytics

The Trainer dashboard should provide useful classroom-level analytics.

Include where supported:

### At-Risk Flags

Surface students who require attention based on the platform's available signals.

Do not invent an unexplained scoring algorithm.

If an at-risk algorithm already exists, reuse it.

If one does not exist, provide the UI structure without silently inventing a production rule.

### Weekly Progress

Show weekly progress for students and the classroom.

### Cohort Comparison

Provide the relevant comparison view available to the Trainer without exposing data outside their authorized scope.

### WPM Tracking

Display WPM progression where WPM data exists.

### Homework Completion

Show assigned challenge completion:

```text
Assigned
Completed
Incomplete
```

### Hardware Session Reporting

Show whether the Trainer is consistently logging required hardware sessions.

This is particularly important because hardware completion cannot be automatically detected.

### Trainer Badges

Provide a panel showing badges awarded by the Trainer.

---

## 23. Evidence

Provide an evidence area for hardware projects.

Supported evidence may include:

- Photo
- Video

Use the existing storage architecture where available.

Do not create a new storage system if Supabase Storage is already being used.

Evidence must remain associated with the appropriate classroom/student/project/session.

---

## 24. Trainer Permissions

The Trainer may:

- Manage their classroom curriculum
- Manage classroom students within authorized scope
- Log attendance
- Log hardware sessions
- Upload evidence
- Write weekly comments
- Assign challenges
- Award supported trainer badges
- View classroom analytics
- Create/request classroom
- Invite co-teachers

The Trainer may NOT:

- Approve their own classroom
- Approve/reject co-teacher requests
- Approve/reject students where approval belongs to Admin
- Modify another centre's data
- Modify another cohort's data
- Modify another classroom's data
- Modify the master curriculum
- Create unsupported curriculum component types
- Reset a student's password through the Admin bypass
- Modify platform-wide settings
- Modify audit records
- Delete historical attendance/comments/evidence records merely to hide history

---

## 25. Security

Security must be enforced server-side.

Do not rely on frontend visibility as the actual authorization mechanism.

The server/database must enforce:

```text
Trainer
   ↓
Authorized Centre
   ↓
Authorized Cohort
   ↓
Authorized Classroom
   ↓
Authorized Students
```

The eventual implementation should use appropriate Supabase Row Level Security policies once the database architecture is finalized.

---

## 26. Audit Considerations

The Trainer dashboard does not require the same unrestricted audit authority as Admin.

However, important Trainer actions should be designed so they can be tracked later, particularly:

- curriculum changes
- attendance submissions
- hardware-session logs
- badge awards
- homework assignments
- weekly student comments
- evidence uploads
- classroom/co-teacher actions

Do not build an irreversible audit architecture without first reviewing the final database design.

---

## 27. UI Structure

A possible Trainer Dashboard structure:

```text
Trainer Dashboard
│
├── Overview
│
├── My Classrooms
│   ├── Classroom Overview
│   ├── Students
│   ├── Attendance
│   ├── Homework
│   ├── Hardware Sessions
│   └── Evidence
│
├── Curriculum
│   └── Classroom Curriculum Builder
│       ├── Modules
│       ├── Lessons
│       ├── Activities
│       ├── Add
│       ├── Remove
│       └── Reorder
│
├── Students
│   └── Student Progress
│
├── Challenges
│   └── Assign Homework
│
├── Badges
│   └── Trainer Awards
│
└── Reports
    ├── Weekly Progress
    ├── Attendance
    ├── Homework
    ├── Hardware Sessions
    └── WPM
```

The exact navigation can follow the existing application's design system.

---

## 28. Curriculum Builder UX

The curriculum builder is the most important custom feature.

The Trainer should be able to understand at a glance:

```text
What is part of the master curriculum?
What has this classroom removed?
What has this classroom added?
What has this classroom reordered?
```

Consider visual labels such as:

```text
CORE
TRAINER ADDED
CUSTOMIZED
REMOVED FROM CLASSROOM
```

The exact visual treatment is up to the implementation.

The UI should never make a classroom-specific modification look like it changed the global curriculum.

---

## 29. Curriculum Reset / Restore

Because Trainers can customize their classroom curriculum, provide a safe way to restore an item toward the master configuration where appropriate.

For example:

```text
Restore Master Version
```

or:

```text
Restore Default Order
```

This should only affect the current classroom.

Do not destroy the master curriculum.

If restoration would remove classroom-specific content or reorder lessons, provide an appropriate confirmation step.

---

## 30. Mobile Responsiveness

The Trainer dashboard should be usable on:

- Desktop
- Laptop
- Tablet
- Mobile where practical

The curriculum builder may require a richer desktop layout, but core operational tasks such as:

- attendance
- student comments
- hardware logging
- homework

should remain usable on smaller screens.

---

## 31. Implementation Constraints

Before coding:

1. Inspect the existing application.
2. Inspect the existing authentication and role system.
3. Inspect current curriculum/lesson/challenge components.
4. Inspect existing Supabase usage.
5. Inspect existing progress and gamification code.
6. Identify which pieces already exist.
7. Reuse existing components.
8. Do not assume the final database architecture.
9. Do not create large migrations without understanding the current schema.
10. Identify the minimum data structures needed for classroom-specific curriculum customization.
11. Keep the curriculum builder modular so the final database model can evolve.

---

## 32. Do Not Build

Do not implement as part of this dashboard:

- Full Admin Dashboard
- Full gamification engine
- XP engine
- Leaderboards
- New badge types
- Platform-wide curriculum editing by Trainers
- Arbitrary custom activity types
- Student password-reset bypass
- Cross-centre analytics
- Platform settings
- Audit-log administration

Those belong elsewhere.

---

## 33. Definition of Done

The Trainer Dashboard is successful when a Trainer can:

### Classroom

- See their authorized classroom(s).
- See their students.
- Manage operational classroom activities.

### Curriculum

- Open the classroom curriculum.
- Expand/collapse modules and lessons.
- Add supported curriculum components.
- Remove lessons from their classroom without deleting master content.
- Reorder modules/lessons.
- Add classroom-specific supplementary content.
- Clearly distinguish core curriculum from Trainer additions.
- Make changes without affecting another classroom.
- Restore appropriate master/default configuration.

### Classroom Operations

- Record attendance.
- Record hardware/Arduino session outcomes.
- Upload hardware evidence.
- Assign challenges/homework.
- Write weekly student comments.
- Award supported Trainer badges.

### Analytics

- View weekly progress.
- See relevant at-risk indicators.
- View homework completion.
- View WPM tracking where available.
- Monitor hardware-session logging.
- View Trainer-awarded badges.

### Security

- Cannot access another classroom's data.
- Cannot modify the master curriculum.
- Cannot approve their own requests.
- Cannot approve co-teacher requests.
- Cannot modify another centre/cohort.
- Cannot bypass server-side authorization.

---

## 34. Final Architectural Principle

The Trainer Dashboard should implement this model:

```text
                  MASTER CURRICULUM
                         │
                         │
                  ┌──────▼──────┐
                  │  Classroom  │
                  │ Curriculum  │
                  │ Configuration│
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        Core Curriculum       Trainer Changes
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                    STUDENTS
```

The Trainer is the **master of their classroom's learning experience**.

The platform is the **master of what curriculum capabilities exist**.

The Admin is the **master of the platform and global curriculum**.

This separation must remain intact throughout implementation.
