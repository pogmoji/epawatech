# ePawatech — Admin Dashboard + Real API Implementation Guide for Codex

## Purpose

Build the first **fully database-backed production dashboard** in ePawatech: the Admin Dashboard.

This is the reference implementation for migrating the rest of the application away from prototypes.

Use:

- real Supabase Auth
- real PostgreSQL/Supabase data
- real RLS
- reusable data/API functions
- real loading/error/empty states

Do not use mock users, mock Centres, mock Cohorts, or localStorage as the source of truth.

---

## 1. Critical Database Rule

### DO NOT create tables or seed data from the CLI

Codex must **not**:

- create tables
- alter tables
- create/apply migrations
- seed data
- insert demo Centres
- insert demo Cohorts
- insert demo Trainers
- insert demo Students
- create Admin accounts
- reset the database

The developer will manage database changes manually in Supabase.

If a database change is required:

1. Identify it.
2. Explain why it is required.
3. Provide SQL if useful.
4. Do not execute it.
5. Wait for the developer to apply it manually.

Never create duplicate tables to work around a schema issue.

---

## 2. Actual Database Is the Source of Truth

The database has already been created and seeded.

Before implementing APIs:

1. Inspect the actual deployed schema.
2. Inspect repository migrations if available.
3. Inspect RLS policies.
4. Inspect seed records.
5. Inspect foreign keys and constraints.
6. Compare with the planning architecture.
7. Adapt the application to the actual schema.

Do not assume the planning MD exactly matches the deployed database.

---

## 3. Admin Dashboard Goal

The Admin Dashboard is the real control centre for:

```text
Centres
Cohorts
Trainers
Classrooms
Students
Curriculum oversight
Audit / activity
```

Prioritize the organizational backbone first.

---

## 4. Admin Information Architecture

Follow the existing Admin prototype/design where appropriate.

A sensible structure is:

```text
Admin Dashboard
│
├── Overview
├── Centres
│   ├── List
│   ├── Create
│   └── View
├── Cohorts
│   ├── List
│   ├── Create
│   └── View
├── Trainers
│   ├── Pending approvals
│   ├── Active
│   └── View
├── Classrooms
│   ├── List
│   └── View
├── Students
│   ├── List
│   └── View
└── Audit / Activity
```

---

## 5. Reusable API/Data Architecture

Establish a reusable pattern for all future dashboards.

Do **not** put raw Supabase queries throughout React components.

Prefer:

```text
UI Component
     ↓
Feature API / Data Function
     ↓
Supabase Client
     ↓
PostgreSQL + RLS
```

A possible structure:

```text
lib/
├── supabase.ts
├── auth/
│   └── ...
├── api/
│   ├── admin/
│   │   ├── centres.ts
│   │   ├── cohorts.ts
│   │   ├── trainers.ts
│   │   ├── classrooms.ts
│   │   └── students.ts
│   ├── classrooms/
│   ├── curriculum/
│   └── ...
└── types/
```

Adapt the folder structure to the existing repository.

The important requirement is **consistent reusable data access**.

---

## 6. Reusable API Function Format

Use a predictable resource-oriented format.

Example:

```text
getCentres()
getCentre(id)
createCentre(input)
updateCentre(id, input)

getCohorts()
getCohort(id)
createCohort(input)
updateCohort(id, input)

getPendingTrainers()
getTrainer(id)
approveTrainer(id)
rejectTrainer(id)

getClassrooms()
getClassroom(id)

getStudents()
getStudent(id)
```

The exact names can follow project conventions.

The key principle:

> Every resource should have a consistent query/mutation pattern.

---

## 7. API Result/Error Convention

Establish one reusable convention.

For example:

```text
success:
{
  data,
  error: null
}

failure:
{
  data: null,
  error
}
```

Or use a typed Result pattern.

Pick one convention and use it consistently.

Do not randomly mix:

```text
throw Error
return null
return undefined
return { error }
```

---

## 8. Type Safety

Use TypeScript types aligned with the actual Supabase schema.

If generated Supabase database types are available, use them.

If not, create explicit temporary types that accurately reflect the deployed schema.

Do not use `any` for database records.

Do not invent fields because the old prototype used them.

---

## 9. API Security

Admin API calls must rely on the authenticated Supabase session and RLS.

Do not accept:

```text
admin_id
role = admin
```

from the browser as proof of authorization.

The database must determine whether the authenticated user is an Admin.

---

## 10. Centre Management

Admin must be able to:

### List Centres

Load real records.

### Create Centre

```text
Admin
 ↓
Create form
 ↓
Validation
 ↓
Supabase insert
 ↓
PostgreSQL
 ↓
Refresh/update UI
```

### View Centre

Show relevant information and associated Cohorts.

Do not create mock fallback records when the database is empty.

Use a real empty state.

---

## 11. Cohort Management

Admin creates Cohorts under Centres.

```text
Admin
 ↓
Select Centre
 ↓
Create Cohort
 ↓
PostgreSQL
```

The database relationship and RLS must enforce valid Centre relationships.

### Active Cohort Rule

Only one active Cohort may exist per Centre.

If PostgreSQL rejects an invalid operation, display a meaningful error.

Do not implement this rule only in React.

---

## 12. Trainer Management

Admin can see Trainer accounts and status.

Use actual deployed status values.

Possible states:

```text
pending
active
rejected
suspended
```

### Approve

```text
Pending Trainer
      ↓
Admin reviews
      ↓
Approve
      ↓
Trainer becomes active
```

### Reject

```text
Pending Trainer
      ↓
Admin rejects
      ↓
Trainer becomes rejected
```

Do not delete rejected Trainer accounts unless the actual product/database requires deletion.

---

## 13. Trainer Assignment

Trainer/classroom relationships are historical.

Conceptually:

```text
Trainer
   ↓
trainer_assignments
   ↓
Classroom
   ↓
Cohort
   ↓
Centre
```

The Admin Dashboard should make these relationships visible.

A Trainer can finish one classroom and later teach another without losing historical records.

---

## 14. Classroom Oversight

Admin should be able to understand:

```text
Centre
  ↓
Cohort
  ↓
Classroom
  ↓
Lead Trainer
  ↓
Students
```

This phase is oversight, not a duplicate of all Trainer functionality.

---

## 15. Student Oversight

Admin should be able to view Student enrollment relationships:

```text
Student
  ↓
Enrollment
  ↓
Classroom
  ↓
Cohort
  ↓
Centre
```

Do not invent enrollment records in the UI.

---

## 16. Dashboard Overview

Use real data for metrics such as:

```text
Total Centres
Active Cohorts
Active Trainers
Active Classrooms
Active Students
Pending Trainer Approvals
```

Only show metrics that can be reliably calculated from the actual schema.

Never fabricate metrics.

---

## 17. Loading, Empty and Error States

Every API-backed screen must handle:

### Loading

Skeleton or appropriate loading state.

### Empty

Example:

```text
No centres have been created yet.
```

### Error

Example:

```text
Unable to load centres.
Try again.
```

Do not fall back to mock data when the API fails.

---

## 18. Mutations

After create/update/approval actions:

- show success state
- refresh or update relevant data
- handle database errors
- prevent duplicate submissions
- disable pending actions while requests are running

Avoid stale UI.

---

## 19. API Reuse Beyond Admin

The APIs should be reusable by future dashboards.

For example:

```text
getClassroom(id)
getCohort(id)
getStudent(id)
getTrainer(id)
```

should be resource-oriented rather than created only for one Admin page.

RLS should determine what an authenticated user can see.

---

## 20. Do Not Duplicate API Logic

Avoid:

```text
Admin page → Supabase query
Trainer page → different query
Student page → another query
```

when the underlying operation is the same.

Prefer:

```text
UI
 ↓
Reusable API/Data Function
 ↓
Supabase
```

---

## 21. Admin-Specific Mutations

Some operations are inherently Admin-level:

```text
createCentre()
createCohort()
approveTrainer()
rejectTrainer()
```

These can live under an Admin feature namespace while following the same result/error conventions.

---

## 22. Database Functions / RPC

If an operation needs an atomic multi-step database transaction, prefer a database function/RPC where appropriate.

Examples:

```text
approve trainer + assignment
create classroom + lead assignment
```

However:

> Do not create RPC functions from the CLI.

If an RPC is required and does not exist:

1. Tell the developer.
2. Provide the SQL/function definition.
3. Do not execute it.

If `join_classroom_by_code` already exists, consume it instead of recreating it.

---

## 23. Existing `lib/supabase.ts`

The current file contains prototype assumptions such as:

```text
mock IDs
track_slug
lesson_slug
completed
score
```

Do not force these fields into the new database.

Inspect all callers.

Determine whether each function is:

- obsolete
- reusable
- requiring schema-aligned refactoring
- better replaced with a resource API

The deployed database schema is authoritative.

---

## 24. Removing Prototype Persistence

Admin features must not use localStorage as a backend fallback.

Do not implement:

```text
try Supabase
catch → localStorage
```

Instead:

```text
Supabase success
      ↓
real data

Supabase failure
      ↓
real error
```

The Admin Dashboard establishes the migration pattern for the other dashboards.

---

## 25. Audit

If the deployed audit architecture is ready, sensitive Admin mutations should be auditable.

At minimum consider:

```text
create Centre
create Cohort
approve Trainer
reject Trainer
change sensitive assignment
```

If audit logging requires a missing database trigger/function:

- identify it
- provide the SQL
- do not execute it

---

## 26. RLS Verification

Test:

- Admin can access authorized administrative data.
- Trainer cannot access arbitrary Admin data.
- Student cannot access Admin data.
- Trainer cannot access another classroom by changing IDs.
- Student cannot read another student's private data.

Do not rely only on UI testing.

---

## 27. API Naming and Documentation

Each reusable API/data module should have:

- clear function names
- typed inputs
- typed outputs
- predictable errors
- no hidden localStorage fallback
- no mock data
- comments only where behavior is non-obvious

Example:

```text
centres.ts

getCentres()
getCentre(id)
createCentre(input)
updateCentre(id, input)
```

Avoid generic names such as:

```text
doAdminCentreStuff()
```

---

## 28. Suggested Implementation Order

### Step 1
Inspect actual Supabase schema and current repository.

### Step 2
Confirm real authentication/profile loading from the Authentication MD.

### Step 3
Establish reusable API/data conventions.

### Step 4
Implement Centres.

### Step 5
Implement Cohorts.

### Step 6
Implement Trainer approval.

### Step 7
Implement classroom oversight.

### Step 8
Implement Student oversight.

### Step 9
Implement Admin overview metrics.

### Step 10
Remove Admin prototype/localStorage dependencies.

### Step 11
Test RLS and error states.

### Step 12
Document reusable API patterns for the Trainer migration.

---

## 29. Definition of Done

This phase is complete when:

- Admin signs in through real Supabase Auth.
- Admin role is loaded from the database.
- Admin routes are protected.
- Centres are loaded from PostgreSQL.
- Admin can create Centres.
- Cohorts are loaded from PostgreSQL.
- Admin can create Cohorts.
- Active Cohort constraint is respected.
- Pending Trainers are loaded from PostgreSQL.
- Admin can approve/reject Trainers.
- Classrooms are loaded from real relationships.
- Students are loaded from real relationships.
- No Admin feature depends on localStorage.
- No Admin feature uses demo/mock records.
- APIs follow one reusable format.
- Loading/empty/error states are handled.
- RLS is tested.
- No tables or seed records were created by Codex.

---

## 30. Scope Boundary

Do not expand this phase unnecessarily into:

- advanced reporting
- donor reports
- full badge management
- points correction
- parent dashboard
- complex analytics
- curriculum authoring
- advanced audit explorer

Those can follow after the organizational backbone is proven.

---

## 31. Final Instruction to Codex

Build this as the first **real vertical slice** of ePawatech.

Use:

```text
Supabase Auth
      ↓
Authenticated Admin
      ↓
Reusable API/Data Layer
      ↓
Supabase PostgreSQL
      ↓
RLS
      ↓
Admin Dashboard
```

Do not:

- create tables
- seed data
- create users
- reset the database
- run migrations against the database
- use localStorage as a backend fallback
- use mock data as a backend fallback

If the database needs a change, stop and report the exact required change for the developer to apply manually.

The reusable API/data conventions established here will become the template for migrating the Trainer Dashboard and Student Dashboard afterward.
