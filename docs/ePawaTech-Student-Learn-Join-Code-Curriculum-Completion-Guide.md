# ePawaTech — Student Curriculum Access, Classroom Join Code & Classroom Curriculum Persistence
## Codex Implementation Guide — Functional Gaps 1–4

## Purpose

Implement the first four functional gaps identified after the Trainer/Student API migration.

The current migration report confirms that authentication, classroom context, classroom curriculum overrides, student progress for master-backed activities, attendance, comments, projects, and challenge assignment listing are already using real Supabase-backed data.

This task should **build on that work**, not replace it.

The four items in scope are:

1. Student `/learn` behavior before joining a classroom
2. Student `/learn` behavior after joining a classroom
3. Trainer access to the classroom join code
4. Complete persistence and student visibility of Trainer-customized curriculum, including a safe progress model for Trainer-added items

---

# 1. Critical Database Safety Rule

Codex must **not**:

- create tables from the CLI
- execute migrations
- seed data
- create Supabase users
- reset the database
- alter RLS automatically
- execute unapproved SQL
- change PostgreSQL enums/types automatically

If a schema, RPC, RLS, or Storage change is required:

1. Stop at that database boundary.
2. Explain the exact limitation.
3. Provide the proposed SQL/configuration.
4. Explain affected APIs and UI.
5. Do not execute it.

The developer will apply database changes manually in Supabase.

---

# 2. Preserve Existing Working Architecture

Do not replace working implementations for:

- Supabase Auth
- profile loading
- Trainer classroom context
- Admin classroom lifecycle APIs
- student enrollment architecture
- classroom curriculum overrides
- lesson progress for master-backed activities
- existing RLS patterns
- reusable Admin API conventions

Use the same API/data-access style already established in the repository.

This is a focused functional completion task.

---

# 3. Student `/learn` Has Two Modes

The Student Learn experience must distinguish between:

```text
A. Authenticated Student with NO active classroom enrollment
B. Authenticated Student WITH an active classroom enrollment
```

These states have different curriculum and persistence behavior.

---

# 4. Mode A — Student Has Not Joined a Classroom

A signed-in Student who has not yet joined a classroom should still be able to access the **Master Curriculum**.

Expected flow:

```text
Student signs in
      ↓
No active classroom enrollment
      ↓
/learn
      ↓
Master Curriculum
```

The Learn page must not be completely blocked merely because the Student has not enrolled yet.

The Student should be able to:

- browse the master curriculum
- open lessons
- read learning content
- use supported interactive lesson components
- run client-side activities such as Pyodide exercises where already available

However:

> **No curriculum interaction may be persisted as student learning progress until the Student has an active classroom enrollment.**

---

# 5. No-Enrollment Persistence Rule

When the Student has no active classroom enrollment:

```text
Master Curriculum
      ↓
Student interaction
      ↓
NO lesson_progress write
```

Do not:

- create fake classroom IDs
- create placeholder enrollments
- save progress under master curriculum alone
- save completion to localStorage
- silently queue progress for later
- backfill earlier exploratory activity after the Student joins, unless explicitly designed later

The database/API must remain the source of truth.

---

# 6. No-Enrollment Learn UX

Clearly tell the Student why progress is not being saved.

Suggested behavior:

```text
You are exploring the ePawaTech curriculum.

Join a classroom to save your progress, receive Trainer assignments,
and access your classroom learning plan.

[ Join Classroom ]
```

Keep the message visually unobtrusive but clear.

The Student should not be misled into believing completion is being recorded.

Where a lesson has a completion button or equivalent action, the UI should either:

- keep the learning interaction available but explain that completion will not be saved, or
- disable the persistence-specific action with an explanation

Choose the approach that best preserves the existing UX.

---

# 7. Join Classroom CTA

For Students without an active enrollment, expose an obvious:

```text
[ Join Classroom ]
```

action from an appropriate Student/Learn location.

The join operation must use the existing approved classroom join-code API/RPC.

Do not recreate the enrollment mechanism if `join_classroom_by_code` or the current equivalent already exists.

---

# 8. Mode B — Student Has Joined a Classroom

Once the Student has an active classroom enrollment:

```text
Student
   ↓
Active Enrollment
   ↓
Classroom
   ↓
Effective Classroom Curriculum
```

The Student should no longer be limited to the generic master-only Learn experience.

Their `/learn` page should display the **effective curriculum for that classroom**.

---

# 9. Effective Classroom Curriculum

The effective curriculum is conceptually:

```text
Master Curriculum
       +
Classroom Overrides
       +
Classroom Trainer Additions
       -
Classroom Removed Items
       ↓
Effective Classroom Curriculum
```

The Student must see the same classroom arrangement the Trainer configured.

This includes, where supported:

- Trainer-edited lesson titles
- Trainer-edited content/instructions
- classroom-specific ordering
- removed master items being excluded
- Trainer-added supported curriculum items
- classroom item state/visibility rules

---

# 10. Enrollment Enables Persistence

Once the Student has an active classroom:

```text
Student
  ↓
Enrollment
  ↓
Classroom Curriculum
  ↓
Lesson/Activity
  ↓
lesson_progress
```

Now supported Student interactions may be persisted.

The API must verify that:

- the Student is authenticated
- the Student has an active enrollment
- the curriculum item belongs to/effectively exists in that classroom
- the Student is writing only their own progress

Do not trust client-supplied Student identity.

---

# 11. Switching from Master-Only to Classroom Curriculum

After successful classroom enrollment, the Student Learn page should refresh/revalidate its curriculum context.

Expected:

```text
Before joining:
Master Curriculum

Student enters valid classroom code

After joining:
Effective Classroom Curriculum
```

Do not require the Student to clear localStorage or manually log out/in to see the classroom curriculum.

Use the application's established cache/revalidation/data-fetch pattern.

---

# 12. Trainer Classroom Join Code — Current Functional Gap

The enrollment flow depends on the Trainer being able to provide a classroom join code to Students.

The user previously observed a classroom code in the Admin experience, but it is currently no longer visible there, and the Trainer cannot currently see the code.

This flow must be completed.

Expected:

```text
Trainer
  ↓
Active Classroom
  ↓
Student Join Code
  ↓
Shares code
  ↓
Student joins
```

---

# 13. Join Code Security

Never display:

```text
join_code_hash
```

to Trainer, Admin, Student, logs, or frontend code.

The hash is an internal verification value.

The system must determine how the current classroom lifecycle implementation handles the plaintext code.

Codex must inspect:

- classroom creation API/RPC
- join-code generation
- hash creation
- whether plaintext is returned on creation
- whether a separate rotation RPC/API exists
- whether the Admin UI previously held transient plaintext state only

Do not attempt to decrypt a hash.

---

# 14. Trainer Join Code UX

The Trainer Dashboard should have an obvious classroom-access section.

Example:

```text
Classroom Access

Student Join Code

ABC7-K92

[ Copy Code ]   [ Rotate Code ]
```

The exact format should follow the existing UI design.

Useful functionality:

- view the current usable join code where securely possible
- copy code
- rotate/regenerate code
- clear success/error states
- ensure only authorized Trainers for that classroom can manage it

---

# 15. If the Plain Join Code Is Not Recoverable

If the deployed architecture stores only a one-way hash and does not retain the plaintext code, Codex must **not** weaken security by storing or exposing the hash.

Instead implement/use a controlled rotation flow:

```text
Trainer requests Rotate Code
        ↓
Authenticated/authorized API
        ↓
Generate new plaintext code
        ↓
Hash code
        ↓
Replace stored hash
        ↓
Return plaintext code
        ↓
Trainer sees/copies new code
```

If the current schema/RPC does not support this:

- document the required RPC/API/database change
- provide proposed SQL if necessary
- do not execute it

---

# 16. Admin Join Code Visibility

Because the Admin previously had a classroom-code view, inspect whether the current Admin Dashboard lost functionality during the classroom lifecycle changes.

Admin should have appropriate classroom oversight.

However, do not create insecure permanent plaintext storage merely so Admin can display a code.

Preferred behavior:

- Admin can rotate/regenerate a classroom code if authorized
- the generated plaintext is returned/displayed securely
- the stored hash remains internal

If the existing implementation already provides a secure Admin flow, restore/reconnect it instead of building a duplicate.

---

# 17. Join Code Authorization

Trainer:

```text
may manage join code only for authorized classroom(s)
```

Admin:

```text
may manage classroom join-code lifecycle according to Admin privileges
```

Student:

```text
may submit plaintext join code to the controlled enrollment endpoint
```

Student must never read:

- plaintext classroom code from a classroom API
- join-code hash

RLS/API authorization must enforce these boundaries.

---

# 18. Trainer Curriculum Changes Must Persist

The migration report confirms classroom curriculum customization already writes to:

```text
classroom_curriculum_overrides
classroom_curriculum_items
```

This behavior must be verified and completed end-to-end.

Trainer changes must persist across:

- page refresh
- logout/login
- another browser/session
- Student classroom view

There must be **no localStorage dependency** for classroom curriculum persistence.

---

# 19. Trainer Edit → Student View Contract

This task must explicitly test the complete flow:

```text
Trainer opens Classroom A
       ↓
Edits classroom curriculum
       ↓
Save succeeds in Supabase
       ↓
Student A is enrolled in Classroom A
       ↓
Student opens /learn
       ↓
Student sees Trainer's saved version
```

The following must remain unchanged:

```text
Student B in Classroom B
Master Curriculum
```

This is a required integration test, not just a UI assumption.

---

# 20. Trainer Curriculum Actions in Scope

Verify real persistence for the currently supported Trainer operations:

### Edit master-backed classroom item

Example:

```text
Master Title
     ↓
Classroom title/content override
```

### Remove master-backed item

The item remains in the master curriculum but is excluded from that classroom.

### Restore master-backed item

The classroom should return to the appropriate master/default representation.

### Reorder

Classroom ordering should persist without changing master ordering.

### Add supported classroom item

Trainer may add only curriculum/activity types already supported by the shared architecture.

### Edit Trainer-added item

Trainer-added classroom items must persist and appear to enrolled Students.

Do not introduce arbitrary unsupported activity types.

---

# 21. Classroom Curriculum API Must Be Shared

Avoid a Trainer-only read model and a separate Student-only curriculum implementation that can drift.

Prefer one domain concept:

```text
Effective Classroom Curriculum
```

with role-appropriate API functions.

Conceptually:

```text
Trainer:
getClassroomCurriculum(classroomId)
saveClassroomOverride(...)
saveClassroomItem(...)

Student:
getMyEffectiveCurriculum()
```

The Student API should derive the classroom from their active enrollment rather than trusting an arbitrary classroom ID.

---

# 22. Known Progress Schema Gap for Trainer-Added Items

The migration report identifies a real schema limitation:

```text
lesson_progress.curriculum_activity_id
        REFERENCES lesson_activities(id)
```

Trainer-added classroom items live in:

```text
classroom_curriculum_items
```

Therefore:

```text
Trainer adds classroom item
       ↓
Student sees item
       ↓
Student completes item
       ↓
Current schema cannot persist completion
```

Do not pretend this save succeeded.

This gap must be resolved as part of the first four functionality items.

---

# 23. Preferred Progress Direction

Preserve the distinction between:

```text
Master Curriculum Activity
```

and:

```text
Classroom-Specific Curriculum Item
```

Do **not** automatically promote Trainer-added classroom content into the global master curriculum simply so `lesson_progress` can reference it.

The preferred conceptual direction is that progress can reference either:

```text
Master lesson activity
OR
Classroom curriculum item
```

while preserving a single Student progress domain.

For example, conceptually:

```text
lesson_progress
├── curriculum_activity_id nullable
└── classroom_curriculum_item_id nullable
```

with an integrity rule that the row references the correct supported source.

This is a conceptual recommendation only.

Codex must inspect the deployed schema and produce the precise manual database proposal.

Do not execute it.

---

# 24. Progress Model Requirements

The final model must support:

### Master-backed activity

```text
Student
 ↓
Master lesson_activity
 ↓
Progress saved
```

### Trainer-added classroom item

```text
Student
 ↓
Classroom curriculum item
 ↓
Progress saved
```

### Isolation

A Student in Classroom A must not save progress against a custom item belonging to Classroom B.

### Historical integrity

If a Trainer later changes/removes an item, previously saved progress must not silently become attached to another item.

### No master contamination

Trainer-added content remains classroom-scoped.

---

# 25. Progress API Update

After the developer manually applies any approved schema change, update the existing progress API so it handles both:

```text
master-backed curriculum items
classroom-added curriculum items
```

Do not create two unrelated progress systems unless the actual architecture requires it.

The Student-facing contract should remain conceptually:

```text
completeActivity(...)
saveActivityProgress(...)
```

The server/API should determine the correct backing curriculum reference.

---

# 26. Classroom Item Completion Authorization

Before saving Trainer-added item completion, verify:

```text
Authenticated Student
      ↓
Active enrollment
      ↓
Student classroom
      ↓
Classroom curriculum item belongs to same classroom
      ↓
Item is available to Student
      ↓
Progress write allowed
```

A Student must not be able to complete another classroom's custom item by manually submitting its ID.

RLS/server authorization must enforce this.

---

# 27. Student Learn Behavior Summary

## Not enrolled

```text
Student Login
   ↓
Master Curriculum
   ↓
Can Explore
   ↓
No Persistent Progress
   ↓
[ Join Classroom ]
```

## Enrolled

```text
Student Login
   ↓
Active Enrollment
   ↓
Effective Classroom Curriculum
   ↓
Trainer Changes Visible
   ↓
Progress Can Be Saved
```

---

# 28. Trainer Flow Summary

```text
Trainer Login
   ↓
Active Classroom
   ↓
View Join Code
   ↓
Share with Students

Trainer
   ↓
Customize Classroom Curriculum
   ↓
Save to Supabase
   ↓
Student in same classroom sees changes
```

Both workflows must work together.

---

# 29. Required API Work

Inspect existing APIs first, then implement/reconnect only what is missing.

Expected domains include:

### Student curriculum context

```text
getStudentLearnContext
getMyEffectiveCurriculum
```

### Join classroom

Use existing:

```text
join_classroom_by_code
```

or the current equivalent.

### Classroom join-code management

Conceptually:

```text
getClassroomJoinCodeState
rotateClassroomJoinCode
```

Do not expose hashes.

### Classroom curriculum

Use/reuse:

```text
getClassroomCurriculum
saveClassroomOverride
addClassroomCurriculumItem
updateClassroomCurriculumItem
removeClassroomCurriculumItem
reorderClassroomCurriculum
```

### Progress

Extend existing progress operations after the approved schema supports custom classroom items.

Follow the repository's existing naming conventions rather than blindly introducing these exact names.

---

# 30. Required UI Work

## Student

Update `/learn` to support:

- master-only exploration when not enrolled
- Join Classroom CTA
- clear "progress is not saved" messaging
- effective classroom curriculum after enrollment
- saved progress after enrollment
- Trainer-added items
- Trainer-edited content

## Trainer

Add/reconnect:

- classroom join-code display/state
- Copy Code
- Rotate/Regenerate Code where supported
- clear error/success state

Verify the existing curriculum editor persistence rather than redesigning it.

## Admin

Inspect and restore/reconnect appropriate classroom join-code management if it was removed.

Do not weaken join-code security to restore old UI behavior.

---

# 31. Required Integration Tests

## Test A — Unenrolled Student

```text
Student signs in
No active enrollment
        ↓
/learn loads Master Curriculum
        ↓
Student can browse/open lessons
        ↓
No lesson_progress row created
```

## Test B — Join Classroom

```text
Trainer obtains join code
        ↓
Student enters code
        ↓
Enrollment created
        ↓
Student /learn refreshes
        ↓
Effective Classroom Curriculum loads
```

## Test C — Trainer Edit Persists

```text
Trainer edits Classroom A lesson
        ↓
Save succeeds
        ↓
Refresh Trainer Dashboard
        ↓
Edit remains
```

## Test D — Student Sees Trainer Edit

```text
Student A enrolled in Classroom A
        ↓
/learn
        ↓
Trainer-edited lesson visible
```

## Test E — Other Classroom Isolation

```text
Trainer edits Classroom A
        ↓
Student B in Classroom B
        ↓
No Classroom A edit visible
```

## Test F — Master Isolation

```text
Trainer edits Classroom A
        ↓
Master Curriculum remains unchanged
```

## Test G — Trainer-Added Item

```text
Trainer adds supported custom item
        ↓
Save succeeds
        ↓
Student A sees item
        ↓
Student completes item
        ↓
Progress save succeeds after approved schema update
```

## Test H — Join Code Security

```text
Trainer A → own classroom code management → allowed
Trainer A → Classroom B code management → denied
Student → read join-code hash → denied
```

## Test I — Rotation

```text
Rotate code
   ↓
New plaintext code returned
   ↓
Old code no longer joins
   ↓
New code joins
```

Only run rotation tests if supported by the final deployed implementation.

---

# 32. RLS Requirements

Verify that policies support:

### Student without enrollment

- can read master curriculum needed for Learn exploration
- cannot write classroom-linked progress

### Enrolled Student

- can read effective curriculum for their classroom
- can write only their own progress
- can access only their classroom's custom curriculum items

### Trainer

- can read/write classroom curriculum only for authorized classroom(s)
- can manage join code only for authorized classroom(s)

### Admin

- can manage classroom lifecycle/join-code administration according to existing Admin privileges

Do not solve RLS issues by bypassing them from unrestricted browser code.

---

# 33. Definition of Done

This task is complete when all four gaps are resolved:

## 1. Master curriculum before enrollment

- Signed-in Student can access `/learn`.
- Master Curriculum is visible without classroom enrollment.
- Student can explore lessons.
- No persistent progress is written.
- UI explains that joining a classroom enables progress saving.

## 2. Classroom curriculum after enrollment

- Student joins through the Trainer-provided code.
- Active enrollment is created.
- `/learn` switches to the effective classroom curriculum.
- Trainer modifications/additions/removals are respected.
- Supported progress saves successfully.

## 3. Trainer classroom join code

- Trainer can obtain/manage the code for their authorized classroom.
- Copy Code works.
- Secure rotate/regenerate works where supported.
- `join_code_hash` is never exposed.
- Admin join-code functionality is restored/reconnected where appropriate.

## 4. Trainer curriculum persistence and custom-item progress

- Trainer edits persist in Supabase.
- Trainer-added items persist in Supabase.
- Student in the same classroom sees those saved changes.
- Another classroom is unaffected.
- Master curriculum is unaffected.
- Student progress can persist for Trainer-added classroom items after the manually approved schema extension.
- No UI falsely claims custom-item completion was saved before the schema/API supports it.

---

# 34. Final Instruction to Codex

Do not rebuild the Student Learn page or Trainer curriculum editor from scratch.

Complete the missing behavior around the existing implementation.

The target Student lifecycle is:

```text
Login
  ↓
No Classroom?
  ├── YES
  │    ↓
  │ Master Curriculum
  │    ↓
  │ Explore Only
  │    ↓
  │ No Persistent Progress
  │    ↓
  │ Join Classroom
  │
  └── NO
       ↓
    Effective Classroom Curriculum
       ↓
    Trainer Customization
       ↓
    Persistent Progress
```

The target Trainer lifecycle is:

```text
Active Classroom
      ↓
Join Code
      ↓
Students Join

Active Classroom
      ↓
Curriculum Editor
      ↓
Real Supabase Persistence
      ↓
Students See Same Classroom Version
```

Preserve classroom isolation.

Preserve the global master curriculum.

Do not expose join-code hashes.

Do not fake progress persistence.

Do not create database changes automatically.

If progress for Trainer-added items requires a schema update, produce the exact manual database proposal first, wait for the developer to apply it, then complete the API/UI integration.
