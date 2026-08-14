# ePawatech — Trainer Assignment, Classroom Creation & Onboarding Flow

## Purpose

This guide clarifies the Trainer onboarding and classroom lifecycle before further Trainer API migration.

The existing checkpoint already has a real Trainer context API using authenticated Supabase data, including `trainer_assignments`, active `classrooms`, `cohorts`, and `centres`, with RLS-based authorization.

**Preserve that work.**

The important correction is:

> **Admin assigns a Trainer to a Centre + Cohort. The Trainer then creates a Classroom within that assigned Cohort.**

A Trainer is therefore **not directly assigned to a Classroom during onboarding**.

---

# 1. Intended Lifecycle

```text
TRAINER SIGN-UP
      ↓
Admin reviews Trainer
      ↓
Admin APPROVES Trainer
      ↓
Admin assigns Trainer to:
    Centre + Cohort
      ↓
Trainer logs in
      ↓
Trainer sees assigned Centre + Cohort
      ↓
Trainer creates Classroom
      ↓
Admin approves Classroom
      ↓
Classroom becomes ACTIVE
      ↓
Trainer manages classroom
      ↓
Students join using classroom code
      ↓
Trainer manages students/curriculum/attendance/etc.
      ↓
Cohort completes
      ↓
Assignment becomes historical
      ↓
Trainer can later receive another Centre + Cohort assignment
```

This is the intended product workflow.

---

# 2. Three Different Concepts

## 2.1 Trainer Assignment

A `trainer_assignment` represents:

```text
Trainer → Centre + Cohort
```

It answers:

> Which Centre and Cohort is this Trainer currently responsible for?

It does **not** necessarily mean:

```text
Trainer → Classroom
```

## 2.2 Classroom

The classroom is the operational teaching environment created within the Trainer's assigned Cohort.

Conceptually:

```text
Centre
  ↓
Cohort
  ↓
Classroom
  ↓
Trainer
  ↓
Students
```

## 2.3 Classroom Approval

Creating a classroom and activating a classroom are separate states:

```text
Trainer creates classroom
        ↓
Classroom request
        ↓
Admin approval
        ↓
Active classroom
```

Use the actual deployed status fields and API behavior. Do not invent a second approval model.

---

# 3. Correct the Current "No Active Classroom Assignment" Interpretation

The existing screen says:

> "Your trainer account is active, but it is not currently assigned to an active classroom. Please contact an administrator."

This is too broad.

A Trainer can legitimately be:

```text
Approved
   ↓
Assigned to Centre + Cohort
   ↓
No classroom created yet
```

That is **not an error** and should not send them to Admin.

The application must distinguish:

```text
No Centre/Cohort assignment
```

from:

```text
Centre/Cohort assignment exists,
but no active classroom exists
```

---

# 4. Required Trainer States

## State A — Pending/Not Approved

```text
Trainer signed up
      ↓
Pending Admin approval
```

Suggested message:

```text
Your trainer account is awaiting administrator approval.
```

Do not describe this as a classroom problem.

Use the actual deployed account/status values.

---

## State B — Approved but Not Assigned

```text
Approved Trainer
      ↓
No active trainer_assignment
```

Suggested message:

```text
Your trainer account has been approved,
but you have not yet been assigned to a Centre and Cohort.

Please contact an administrator.
```

This is the state where contacting Admin is appropriate.

---

## State C — Assigned to Centre + Cohort, No Classroom

This is the key state.

```text
Approved Trainer
      ↓
Active trainer_assignment
      ↓
Centre + Cohort
      ↓
No classroom yet
```

Suggested UI:

```text
Your Teaching Assignment

Centre: [Centre Name]
Cohort: [Cohort Name]

You have not created a classroom for this assignment yet.

[ Create Classroom ]
```

The Trainer should be able to start classroom creation.

---

## State D — Classroom Created, Awaiting Approval

```text
Centre + Cohort
      ↓
Trainer creates Classroom
      ↓
Pending classroom approval
```

Suggested message:

```text
Classroom created.

Your classroom is awaiting administrator approval.
You will be able to manage students and classroom activities
once the classroom is approved.
```

Do not treat it as active until the backend says it is active.

---

## State E — Active Classroom

```text
Centre
  ↓
Cohort
  ↓
Active Classroom
  ↓
Trainer
```

Load the normal Trainer Dashboard.

This eventually includes:

- student management
- classroom curriculum customization
- attendance
- weekly comments
- challenge assignments
- hardware sessions/evidence
- dashboard metrics
- future badges/gamification

Only connect features whose real APIs have already been migrated.

---

## State F — Historical Classroom

When a cohort/assignment ends, preserve the relationship as historical rather than deleting it.

Conceptually:

```text
Trainer
│
├── Centre A
│   └── Cohort 1
│       └── Classroom A  ← historical
│
├── Centre B
│   └── Cohort 4
│       └── Classroom B  ← historical
│
└── Centre C
    └── Cohort 7
        └── Classroom C  ← current
```

A future Trainer dashboard can allow browsing previous classrooms.

Do not implement a major history UI unless separately requested, but do not design the API/database integration in a way that destroys historical relationships.

---

# 5. Trainer Assignment Is Continuous

Do not model the Trainer as permanently belonging to one classroom.

Instead:

```text
Trainer
   ↓
Assignment 1
Centre A + Cohort 1
   ↓
Classroom
   ↓
Assignment ends
   ↓
Assignment 2
Centre B + Cohort 4
   ↓
New Classroom
```

Avoid treating a single permanent:

```text
trainer.classroom_id
```

as the Trainer's identity relationship.

Historical assignments and classrooms matter.

---

# 6. Classroom Creation Rules

A Trainer may create a classroom only within an authorized active Centre + Cohort assignment.

The secure flow is:

```text
Authenticated Trainer
        ↓
Verified trainer_assignment
        ↓
Assigned Cohort
        ↓
Create Classroom
```

Do not rely only on frontend checks.

The database/RLS/API must prevent:

```text
Trainer A
   ↓
Classroom
   ↓
Cohort belonging to Centre B
```

unless the deployed authorization explicitly permits it.

---

# 7. Do Not Create a New Database Model

The existing architecture already references:

```text
trainer_assignments
classrooms
cohorts
centres
```

Use those existing resources.

Before changing anything, inspect the deployed schema and existing API.

If the database cannot represent the intended lifecycle, report the exact limitation.

**Do not create or modify tables, migrations, seed data, or policies from the CLI.**

---

# 8. Correct Trainer Dashboard Decision Tree

The dashboard should conceptually follow:

```text
Is user authenticated?
        │
        ├── NO → Authentication flow
        │
        └── YES
             ↓
        Is role Trainer?
             │
             ├── NO → Access denied
             │
             └── YES
                  ↓
           Is Trainer approved?
                  │
                  ├── NO → Pending/rejected state
                  │
                  └── YES
                       ↓
                Active assignment?
                       │
             ┌─────────┴─────────┐
             │                   │
            NO                  YES
             │                   │
             ▼                   ▼
       Contact Admin       Centre + Cohort
                                 ↓
                         Active Classroom?
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                      NO                  YES
                       │                   │
                       ▼                   ▼
               Create Classroom      Load Dashboard
                       │
                       ▼
              Classroom Approval
                       │
                       ▼
                Active Classroom
                       │
                       ▼
                Load Dashboard
```

---

# 9. Preserve Checkpoint 4

The previous implementation added valuable functionality:

- real Trainer classroom-context API
- active `trainer_assignments`
- active `classrooms`
- cohorts
- centres
- authenticated Supabase client
- RLS-scoped results
- no client-supplied Trainer ID as proof of access
- no arbitrary classroom access
- real Centre/Cohort/Classroom identity in the dashboard

**Do not throw this work away.**

The task is to correct how the dashboard interprets the returned context.

---

# 10. Separate Assignment From Classroom State

The current API may return assignments and classrooms together.

That is acceptable.

The UI must not interpret:

```text
classrooms.length === 0
```

as:

```text
trainer has no assignment
```

Instead distinguish:

```text
assignment exists?
```

from:

```text
active classroom exists?
```

Conceptually:

```text
hasActiveTrainerAssignment
hasActiveClassroom
```

Use the actual repository/API naming conventions rather than blindly introducing these exact variable names.

---

# 11. Recommended Context

The Trainer context should conceptually contain:

```text
Trainer
Centre
Cohort
Assignment
Classroom(s)
```

For example:

```text
Trainer Context
├── trainer
├── activeAssignments
│   ├── centre
│   ├── cohort
│   └── assignment status
│
└── classrooms
    ├── classroom
    ├── status
    └── assignment relationship
```

Follow the existing TypeScript/API conventions.

---

# 12. Create Classroom UX

For an assigned Trainer without a classroom, do not show an empty/error dashboard.

Show the assignment:

```text
Welcome, [Trainer Name]

Current Assignment

Centre
[Centre Name]

Cohort
[Cohort Name]

You haven't created a classroom for this assignment yet.

[ Create Classroom ]
```

The classroom form should derive the authorized Centre/Cohort from the Trainer context.

Do not ask the Trainer to choose arbitrary Centres or Cohorts.

---

# 13. Classroom Creation Form

Use the existing deployed API/schema.

Conceptually:

```text
Authenticated Trainer
       ↓
Current authorized assignment
       ↓
Create Classroom
```

Avoid generic selectors such as:

```text
Centre: [every Centre]
Cohort: [every Cohort]
```

when the Trainer already has an active assignment.

The application should derive the permitted Centre/Cohort from the authenticated context.

---

# 14. Classroom Approval

The expected sequence is:

```text
Create Classroom
      ↓
Pending approval
      ↓
Admin reviews
      ↓
Approve
      ↓
Active
```

The Trainer must not be able to locally change the classroom status.

The backend/database determines whether the classroom is active.

---

# 15. Student Enrollment

Once the classroom is active:

```text
Trainer
   ↓
Classroom
   ↓
Join Code
   ↓
Student
```

Students join using the classroom code.

The classroom becomes the operational boundary for:

- students
- attendance
- classroom curriculum customization
- challenges
- hardware sessions
- weekly comments

The Centre/Cohort remains the higher-level organizational context.

---

# 16. Classroom Customization Remains Classroom-Scoped

This correction does not change the previous curriculum requirement.

Trainer customization remains:

```text
Master Curriculum
       ↓
Classroom A customization
```

Never:

```text
Trainer customization
       ↓
Master Curriculum
```

and never:

```text
Classroom A customization
       ↓
Classroom B
```

Both API behavior and RLS must preserve this boundary.

---

# 17. Historical Relationships

Do not delete relationships simply because:

- a cohort ended
- a Trainer moved Centres
- a classroom is no longer active
- a Trainer received a new assignment

Historical data supports:

- Trainer history
- Centre reporting
- Cohort reporting
- donor reporting
- student history
- future analytics

Use existing status/end-date mechanisms in the deployed database.

Do not invent fields unless a genuine schema gap is identified and manually approved.

---

# 18. Database Safety Rule

This guide does **not** authorize database modification.

If implementation reveals that the schema cannot distinguish:

```text
Trainer assignment
```

from:

```text
Classroom
```

or cannot represent the intended approval lifecycle, stop and report:

```text
Observed schema limitation:
...

Required behavior:
...

Suggested database change:
...

Affected API:
...

Affected RLS:
...
```

The developer will make the database change manually in Supabase.

---

# 19. Required Tests

## Test 1 — Approved Trainer, no assignment

```text
Approved
No active trainer_assignment
        ↓
Contact Admin
```

## Test 2 — Approved Trainer, assignment but no classroom

```text
Approved
Active Centre + Cohort assignment
No classroom
        ↓
Create Classroom
```

This is the most important new test.

## Test 3 — Classroom creation

```text
Trainer
 ↓
Authorized assignment
 ↓
Create Classroom
 ↓
Pending approval
```

Trainer cannot choose an unauthorized Centre/Cohort.

## Test 4 — Classroom approval

```text
Approved classroom
      ↓
Active Trainer Dashboard
```

## Test 5 — Cross-Centre denial

```text
Trainer A
 ↓
Centre B / Cohort B
 ↓
DENIED
```

## Test 6 — Historical assignment

```text
Old assignment/classroom
      ↓
Historical
      ↓
Not deleted
```

## Test 7 — New assignment

```text
Trainer
 ↓
Old assignment remains historical
 ↓
New Centre + Cohort assignment
 ↓
Trainer creates new classroom
```

---

# 20. Out of Scope

Do not use this task to implement:

- full historical classroom browsing UI
- badges
- gamification
- new curriculum content
- Student Dashboard migration
- new database tables
- new seed data
- unrelated dashboard redesign
- automatic hardware verification

This task is specifically about:

> **Trainer assignment → classroom creation → classroom approval → active classroom**

---

# 21. Implementation Sequence

Implement in this order:

```text
1. Inspect existing Trainer context API
        ↓
2. Confirm trainer_assignment semantics
        ↓
3. Confirm classroom relationship
        ↓
4. Separate "assignment exists"
   from "active classroom exists"
        ↓
5. Update Trainer dashboard states
        ↓
6. Add/use Create Classroom flow
        ↓
7. Connect classroom approval state
        ↓
8. Load normal dashboard only for active classrooms
        ↓
9. Test RLS/isolation
        ↓
10. Report any database limitation
```

Do not move into unrelated Trainer feature migration until this lifecycle is correct.

---

# 22. Final Product Model

```text
                         ADMIN
                           │
                           │ approves
                           ▼
                       TRAINER
                           │
                           │ assigned to
                           ▼
                    CENTRE + COHORT
                           │
                           │ creates
                           ▼
                       CLASSROOM
                           │
                           │ admin approves
                           ▼
                  ACTIVE CLASSROOM
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          STUDENTS     CURRICULUM    ACTIVITIES
                       CUSTOMIZATION
             │
             ▼
        TRAINER MANAGEMENT
```

The key rule is:

> **Admin controls Centre + Cohort assignment. Trainer creates and manages the classroom within that assignment. Admin controls classroom approval.**

---

# 23. Final Instruction to Codex

This is a **workflow correction and implementation task**, not a database rewrite.

Preserve the working Trainer context API.

Do not unnecessarily replace working Supabase/RLS code.

The dashboard must distinguish:

```text
No Centre/Cohort assignment
```

from:

```text
Centre/Cohort assignment exists but no classroom exists
```

The first state leads to:

```text
Contact Admin
```

The second leads to:

```text
Create Classroom
```

After classroom creation:

```text
Pending approval
```

After Admin approval:

```text
Active classroom → full Trainer Dashboard
```

Do not create tables, seed data, create users, apply migrations, or alter Supabase from the CLI.

If the current schema/API cannot support this lifecycle, stop and report the exact limitation for manual database review.

The intended organizational hierarchy is:

```text
Centre
   ↓
Cohort
   ↓
Trainer Assignment
   ↓
Classroom
   ↓
Students
```

Trainer classroom customization and operations remain scoped to the classroom they are authorized to manage, while Centre/Cohort assignments and classroom approval remain under Admin control.
