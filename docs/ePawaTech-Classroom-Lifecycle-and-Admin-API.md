# ePawatech — Classroom Lifecycle, Admin Control & API Implementation Guide

## Purpose

This guide establishes the next implementation step before continuing the remaining Trainer Dashboard prototype migration.

The previous implementation confirmed that the current database supports active Trainer-to-Classroom operations, but it does **not yet fully represent the intended classroom lifecycle**.

The implementation report identified these gaps:

- `trainer_assignments` currently requires `classroom_id`, so it cannot represent a Trainer assigned to a Centre + Cohort before a classroom exists.
- A Trainer-created classroom currently becomes `active` immediately.
- Classroom creation currently creates an active lead Trainer assignment automatically.
- There is no `pending` / `awaiting_approval` classroom status.
- There is no dedicated controlled classroom creation API/RPC that safely handles the join-code hash.
- Classroom creation authorization does not currently verify the Trainer's assignment to the specific Centre/Cohort.
- The Admin Dashboard does not yet provide the complete classroom lifecycle controls.

This guide tells Codex to address the **database/API contract and Admin Dashboard** before continuing the remaining Trainer migration.

---

# 1. Product Decision

The platform should support **both Trainer-led and Admin-led classroom creation**.

## Normal Trainer-led flow

```text
Admin
  ↓
Creates Centre
  ↓
Creates Cohort
  ↓
Approves Trainer
  ↓
Assigns Trainer to Centre + Cohort
  ↓
Trainer creates Classroom
  ↓
Classroom is pending approval
  ↓
Admin activates Classroom
  ↓
Trainer operates Classroom
```

## Admin-led flow

Admin may also create the classroom directly:

```text
Admin
  ↓
Creates Classroom
  ↓
Activates Classroom
  ↓
Assigns Trainer
  ↓
Trainer operates Classroom
```

The Admin-led path is an operational override/flexibility mechanism. It must not remove the normal Trainer workflow.

---

# 2. Core Responsibility Model

## Admin

Admin controls:

- Centre creation
- Cohort creation
- Trainer approval
- Trainer Centre/Cohort assignment
- Classroom creation
- Classroom approval/activation
- Classroom assignment/reassignment
- Classroom completion/archiving
- Administrative overrides
- Audit trail

## Trainer

Trainer controls:

- Creating a classroom within an authorized assignment
- Managing their active classroom
- Students
- Classroom curriculum customization
- Attendance
- Comments
- Challenges
- Hardware sessions/evidence

Trainer does **not**:

- approve their own classroom
- activate their own classroom
- assign themselves to arbitrary classrooms
- access another Centre/Cohort/classroom
- modify audit records

---

# 3. Important Architecture Distinction

Keep these concepts separate.

### Trainer assignment

```text
Trainer → Centre + Cohort
```

This represents the Trainer's organizational teaching assignment.

### Classroom

```text
Centre → Cohort → Classroom
```

This represents the operational teaching environment.

### Classroom assignment

```text
Trainer → Classroom
```

This represents which Trainer is responsible for an actual classroom.

These relationships should not be conflated.

---

# 4. Historical Relationships Must Be Preserved

The platform must support a Trainer moving between assignments over time.

Example:

```text
Trainer
│
├── Centre A
│   └── Cohort 1
│       └── Classroom A
│           └── completed
│
├── Centre B
│   └── Cohort 4
│       └── Classroom B
│           └── completed
│
└── Centre C
    └── Cohort 7
        └── Classroom C
            └── active
```

Do not delete previous assignments when a Trainer receives a new one.

Use existing historical concepts such as `status`, `start_date`, and `end_date` where already supported.

---

# 5. Classroom Lifecycle

The intended lifecycle is:

```text
created
   ↓
pending approval
   ↓
active
   ↓
completed
   ↓
archived
```

The current schema supports `active`, `completed`, and `archived`.

If a true pending state is required, the database design must be updated manually.

**Do not silently simulate `pending` using `active`.**

---

# 6. Trainer-Created Classroom Flow

When an authorized Trainer creates a classroom:

```text
Authenticated Trainer
        ↓
Active Trainer assignment
        ↓
Assigned Centre + Cohort
        ↓
Create Classroom
        ↓
Pending approval
        ↓
Admin approval
        ↓
Active classroom
```

The classroom must not automatically become active.

The Trainer must not automatically become the active lead assignment merely because they created the classroom.

The assignment should become active only when the classroom lifecycle permits it.

---

# 7. Admin-Created Classroom Flow

Admin can create a classroom directly:

```text
Admin
  ↓
Select Centre
  ↓
Select Cohort
  ↓
Create Classroom
  ↓
Choose permitted initial status
  ↓
Optionally assign Trainer
```

Admin should be able to create a classroom without pretending that a Trainer created it.

The API should record the authenticated Admin as the creator/auditable actor.

---

# 8. Admin Classroom Activation

Admin must have an explicit classroom activation action:

```text
Pending Classroom
       ↓
Admin reviews
       ↓
Activate
       ↓
Active Classroom
```

The API must verify:

- authenticated user is Admin
- classroom exists
- classroom belongs to a valid Cohort
- Cohort belongs to a valid Centre
- classroom is in an activatable state

Do not allow arbitrary status updates from the client.

---

# 9. Admin Classroom Rejection

If the database does not currently support a rejected state, do not invent one in application code.

Instead:

1. Report the schema limitation.
2. Propose the required database status.
3. Let the developer manually approve the SQL/schema change.

If a rejected state is approved later, use:

```text
pending → rejected
```

and preserve the reason/audit trail.

---

# 10. Admin Trainer Assignment

Admin should be able to assign an approved Trainer to an appropriate classroom:

```text
Centre
  ↓
Cohort
  ↓
Classroom
  ↓
Assign Trainer
```

The API must validate:

- Trainer is approved/active.
- Classroom is valid.
- Trainer/classroom Centre/Cohort relationship is valid according to the final assignment model.
- Existing active conflicting assignments are handled according to business rules.
- Historical assignments are preserved.

Do not rely on frontend checks.

---

# 11. Admin Reassignment

Admin should be able to reassign a classroom's Trainer.

Example:

```text
Trainer A
   ↓
Classroom X
   ↓
Assignment ends

Trainer B
   ↓
Classroom X
   ↓
New assignment
```

Do not overwrite the old assignment destructively.

Conceptually:

```text
Old assignment
status → ended/completed
end_date → timestamp/date

New assignment
status → active
start_date → timestamp/date
```

Use actual deployed schema conventions.

Every administrative reassignment must be auditable.

---

# 12. Admin Dashboard Changes

The Admin Dashboard must be updated as part of this task.

Do not build only backend APIs and leave the Admin Dashboard without controls.

Add a **Classrooms** management area following the existing Admin Dashboard design.

Admin should be able to:

### View classrooms

Show useful real data such as:

```text
Centre
Cohort
Classroom
Status
Lead Trainer
Created By
Created Date
```

Use only fields actually backed by the database.

### Create classroom

```text
Select Centre
Select Cohort
Enter classroom details
Create
```

### Activate classroom

For eligible/pending classrooms:

```text
[ Activate ]
```

### Assign Trainer

```text
[ Assign Trainer ]
```

### Reassign Trainer

```text
[ Reassign Trainer ]
```

### Complete/archive classroom

Use the existing lifecycle semantics.

All actions must call the real Admin API. No localStorage or mock persistence.

---

# 13. Admin Classroom Details

A classroom details page/panel should expose real information where supported:

```text
Classroom
Centre
Cohort
Status

Trainer
Trainer assignment status
Assignment start date
Assignment end date

Students
Student count

Join code state

Created by
Created at
```

Do not create mock values to fill missing fields.

---

# 14. Classroom Join Code

Classroom creation must safely handle:

```text
join_code
join_code_hash
```

Preferred behavior:

```text
Generate random join code
       ↓
Hash join code
       ↓
Store hash
       ↓
Return plain code once
```

Do not expose the stored hash.

Do not permanently store the plain join code unless the existing architecture explicitly requires it.

The UI may display the generated code when appropriate.

---

# 15. Controlled Classroom Creation API

Create a reusable API following the same conventions already established by the working Admin APIs.

Conceptual action:

```text
createClassroom
```

For Admin, the request may contain authorized context such as:

```text
centreId
cohortId
classroom details
```

For Trainer, use only the context they are authorized to act within.

**Never trust a client-supplied Trainer ID as proof of authorization.**

The authenticated Supabase session must determine the acting user.

---

# 16. Classroom Activation API

Create a reusable Admin API/action:

```text
activateClassroom
```

The API must:

1. Authenticate the user.
2. Verify Admin role.
3. Validate classroom state.
4. Validate related Centre/Cohort.
5. Change the classroom to the permitted active state.
6. Create/activate the appropriate Trainer assignment if required by the final schema.
7. Record the required audit information.
8. Return the resulting classroom state.

Do not permit arbitrary client-side status updates.

---

# 17. Trainer Assignment API

Create a reusable Admin API/action:

```text
assignTrainerToClassroom
```

It should:

1. Authenticate the Admin.
2. Verify the Trainer is active/approved.
3. Verify the classroom.
4. Verify Centre/Cohort compatibility.
5. Create the appropriate assignment.
6. Preserve historical assignments.
7. Audit the operation.
8. Return the new assignment.

---

# 18. Trainer Reassignment API

Create:

```text
reassignTrainerToClassroom
```

The operation must preserve history:

```text
Current assignment
      ↓
End assignment
      ↓
Create new assignment
      ↓
Audit changes
```

If only one active lead Trainer is allowed, enforce that rule in the database/API rather than relying on the UI.

---

# 19. Classroom Completion/Archive API

Use existing lifecycle semantics:

```text
completeClassroom
archiveClassroom
```

Do not delete classrooms to achieve lifecycle transitions.

Historical classrooms must remain available to authorized Admins and, where appropriate, Trainers.

---

# 20. RLS and Authorization

Security remains database-led.

### Trainer

May:

- create a classroom only within an authorized assignment
- view authorized classrooms
- operate active classrooms they are assigned to

May not:

- create for another Centre/Cohort
- activate a classroom
- assign another Trainer
- reassign themselves
- access another Centre's classrooms

### Admin

May:

- create classrooms
- activate classrooms
- assign Trainers
- reassign Trainers
- complete/archive classrooms

All sensitive Admin operations must be audited.

---

# 21. Audit Requirements

Audit at minimum:

```text
classroom created by Admin
classroom created by Trainer
classroom activated
classroom rejected, if supported
Trainer assigned
Trainer reassigned
classroom completed
classroom archived
join-code rotation, if implemented
```

Record enough information to reconstruct:

```text
who
what
when
which classroom
which Trainer
previous state
new state
reason where applicable
```

The audit log remains immutable.

---

# 22. Database Changes

The implementation report identified these important limitations.

## A. Pre-classroom Trainer assignment

The current `trainer_assignments` requires `classroom_id`.

If we retain:

```text
Trainer → Centre + Cohort
```

before classroom creation, the database needs a way to represent that relationship.

Do not decide the exact schema automatically.

Prepare the SQL/schema proposal for manual review.

## B. Pending classroom state

The current classroom statuses are:

```text
active
completed
archived
```

If approval is required, propose the appropriate schema/type change.

## C. Controlled classroom creation

The current system lacks a dedicated controlled classroom creation operation that:

- validates authorization
- generates a join code
- hashes it
- inserts the classroom
- returns the plain code once

Implement this only after confirming the final schema.

## D. Assignment authorization

Trainer classroom creation must verify the Trainer's authorized Centre/Cohort relationship.

Do not authorize only with:

```text
created_by = auth.uid()
```

---

# 23. Database Safety — Mandatory

**Codex must NOT:**

- create tables from the CLI
- create migrations from the CLI
- execute migrations
- seed data
- create Supabase users
- reset the database
- modify RLS directly
- alter database types directly
- apply SQL changes automatically

The developer will make database changes manually.

If a schema change is required, report:

```text
Required schema change:
...

Why it is required:
...

Affected tables:
...

Affected RLS:
...

Affected APIs:
...

Suggested SQL/migration:
...
```

Do not execute it.

---

# 24. Preserve Existing Admin API Conventions

The existing Admin APIs are already working.

Follow their established conventions for:

- authentication
- role verification
- error handling
- response shapes
- server/client separation
- Supabase access
- audit behavior

Do not create a second API style.

The classroom APIs should look and behave like part of the existing Admin API system.

---

# 25. Preserve Existing Trainer Context

The Trainer context API already works and is RLS-scoped.

Preserve:

- authenticated Supabase access
- RLS filtering
- Centre/Cohort/Classroom context
- active classroom selection
- no client-supplied Trainer ID as proof of access

Once the classroom lifecycle APIs are complete, update Trainer context only where necessary to consume the corrected lifecycle.

---

# 26. Admin Dashboard UX

The Admin Dashboard should support:

```text
Admin Dashboard
      ↓
Classrooms
      ↓
View / Create Classroom
      ↓
Centre
      ↓
Cohort
      ↓
Classroom
      ↓
Status
      ↓
Assign / Reassign Trainer
      ↓
Activate / Complete / Archive
```

The hierarchy should be clear:

```text
Centre
  └── Cohort
       └── Classroom
            └── Trainer
                 └── Students
```

---

# 27. Implementation Order

## Phase 1 — Inspect

Inspect:

- classroom tables/types
- `trainer_assignments`
- RLS
- existing Admin API patterns
- Admin Dashboard
- Trainer context API
- classroom creation code
- classroom triggers
- join-code implementation

Do not modify anything yet.

## Phase 2 — Identify schema gaps

Compare the deployed schema against:

```text
Trainer → Centre + Cohort
Trainer → Classroom
Classroom → approval
Classroom → activation
Classroom → Trainer assignment
```

Report missing relationships/states.

## Phase 3 — Manual database proposal

Prepare required SQL/schema changes.

Do not execute them.

The developer will manually apply approved changes.

## Phase 4 — Implement APIs

Implement reusable operations supported by the final schema:

```text
createClassroom
activateClassroom
assignTrainerToClassroom
reassignTrainerToClassroom
completeClassroom
archiveClassroom
```

## Phase 5 — Update Admin Dashboard

Add real working controls for:

- Classroom management
- Create classroom
- Activate classroom
- Assign Trainer
- Reassign Trainer
- Lifecycle/status
- Classroom details

No localStorage.

No mock classroom persistence.

## Phase 6 — Authorization tests

Test:

- Admin success
- Trainer denial of Admin operations
- Trainer cannot create outside assignment
- Trainer cannot access another classroom
- Cross-Centre denial
- Reassignment history
- Classroom lifecycle
- Join-code behavior

## Phase 7 — Reconnect Trainer

Only after the Admin/classroom lifecycle is stable, continue the Trainer Dashboard migration.

---

# 28. Definition of Done

This task is complete when:

- Admin can view real classrooms.
- Admin can create a classroom through the real API.
- Classroom creation uses the real database.
- Classroom status follows the approved lifecycle.
- Admin can activate a classroom.
- Admin can assign a Trainer.
- Admin can reassign a Trainer.
- Historical assignments are preserved.
- Join codes are securely handled.
- RLS prevents unauthorized access.
- Sensitive Admin actions are audited.
- Admin Dashboard contains working controls for these operations.
- Trainer Dashboard can consume the resulting classroom state.
- No classroom data depends on localStorage in the migrated flow.
- No mock classroom API remains in the migrated Admin workflow.
- No database changes were executed by Codex.

---

# 29. Final Instruction to Codex

This is a **real API + Admin Dashboard implementation**, not a prototype.

The goal is to establish a reliable classroom lifecycle that both Admin and Trainer dashboards can consume.

The intended model is:

```text
                         ADMIN
                           │
             ┌─────────────┴─────────────┐
             │                           │
      Creates Centre/Cohort       Approves Trainer
             │                           │
             └─────────────┬─────────────┘
                           ↓
                  Trainer Assignment
                           ↓
             ┌─────────────┴─────────────┐
             │                           │
       Trainer creates              Admin creates
         classroom                   classroom
             │                           │
             └─────────────┬─────────────┘
                           ↓
                  Classroom Lifecycle
                           ↓
                    Admin Activation
                           ↓
                  ACTIVE CLASSROOM
                           ↓
                       TRAINER
                           ↓
                      STUDENTS
```

Admin must be able to intervene operationally:

```text
Create
Activate
Assign
Reassign
Complete
Archive
```

The normal Trainer workflow must remain supported.

Do not bypass RLS.

Do not trust client-supplied identity.

Do not use localStorage.

Do not use mock persistence.

Do not create or execute database changes from the CLI.

If the schema cannot support the intended lifecycle, stop at the schema boundary, document the exact limitation, and provide the proposed manual database change for the developer to review and execute.

After this work is complete, continue the remaining Trainer Dashboard migration using the established real API architecture.
