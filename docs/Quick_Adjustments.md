Before proceeding to **Phase 2 Part C**, simplify and verify the student curriculum access model.

## Core Rule

For students who belong to a classroom:

> **Modules are always visible/open. Individual lessons inside the modules are locked or unlocked by the classroom trainer(s).**

Do not implement module-level locking.

The module itself should always be accessible so the student can see:

* module title;
* module description;
* lesson list;
* their progress;
* which lessons are available;
* which lessons are still locked.

Only the individual lessons require trainer-controlled access.

---

## Example

A student may open Module 4 and see:

```text
Module 4 — Python Basics

✓ Lesson 1 — Introduction to Python
▶ Lesson 2 — Variables
🔒 Lesson 3 — Conditions
🔒 Lesson 4 — Loops
```

The student can open Lessons 1 and 2.

Lessons 3 and 4 remain visible but cannot be opened until a trainer unlocks them.

---

## Trainer Control

Lesson availability belongs to the classroom.

All authorized trainers assigned to the classroom should see and control the same lesson states.

Example:

```text
Classroom: Python Stars

Lesson 1     Unlocked
Lesson 2     Unlocked
Lesson 3     Locked
Lesson 4     Locked
```

Trainer actions:

```text
Unlock Lesson
Lock Lesson
```

Do not create different lesson availability for each trainer.

The state belongs to:

```text
classroom + lesson
```

not:

```text
trainer + lesson
```

---

## Multi-Trainer Compatibility

Phase 2 Part A now supports multiple trainers in one classroom.

Therefore:

* Trainer A unlocking a lesson must affect the whole classroom.
* Trainer B should immediately see the same state.
* Students receive one consistent classroom curriculum state.
* Any assigned trainer who currently has curriculum-management permission may lock/unlock lessons.

Do not make ordinary lesson unlocking Lead-Trainer-only unless the existing product explicitly requires it.

The Lead Trainer distinction is primarily for workflows such as the official Weekly Classroom Report.

---

## Existing Curriculum Override System

Inspect the current classroom curriculum implementation first.

The project already has classroom curriculum customization/override concepts.

Determine whether the existing tables can store lesson availability.

Reuse existing structures where sensible.

Do not build a parallel curriculum system just for lesson locking.

---

## Important Distinction: Locked vs Removed

Keep these separate.

### Locked

Lesson belongs to the classroom curriculum but is not yet available to students.

```text
Lesson 3 — Locked
```

Trainer can unlock it later.

### Removed

Trainer intentionally excludes the lesson from that classroom curriculum.

A removed lesson should follow the existing classroom override behavior.

Do not use `removed` as a replacement for `locked`.

---

## Student Learn Experience

A classroom student should be allowed to open every module page.

Inside the module, lesson cards must clearly communicate availability.

### Unlocked lesson

Show normal CTA:

```text
Start Lesson
Continue
Review
```

depending on progress.

### Locked lesson

Show a visually distinct locked state.

Do not simply grey out the lesson with no explanation.

Recommended locked lesson card:

```text
🔒 Lesson 4
Loops

Locked

Your trainer will unlock this lesson when your class is ready.
```

No active `Start Lesson` button.

A small lock icon should appear prominently.

The lesson card should still display enough information for the student to understand what is coming next.

---

## Locked Lesson UI Direction

The locked state should look intentional and polished, not broken or disabled accidentally.

Recommended characteristics:

* visible lock icon;
* slightly muted card appearance;
* lesson title remains readable;
* clear `Locked` badge;
* short explanation;
* no misleading active CTA;
* maintain normal card size/layout so the curriculum roadmap stays visually consistent.

Example structure:

```text
┌────────────────────────────────────┐
│ 🔒 LOCKED                          │
│                                    │
│ Lesson 5                           │
│ Building Loops                     │
│                                    │
│ Your trainer will unlock this      │
│ lesson when your class is ready.   │
│                                    │
│              🔒 Locked             │
└────────────────────────────────────┘
```

Codex should adapt this to the existing ePawaTech design language rather than copying this literally.

---

## Optional Visual Progression

If the current module UI supports it cleanly, lessons may visually form a progression such as:

```text
✓ Completed
↓
▶ Available
↓
🔒 Locked
↓
🔒 Locked
```

This can help young learners understand what comes next.

Do not overcomplicate the page with excessive animation.

---

## Direct URL Protection

UI locking alone is not enough.

A student must not unlock/access a lesson by manually entering its route.

For example:

```text
/student/learn/module-4/lesson-5
```

Server-side lesson access must verify:

1. authenticated user is a student;
2. student belongs to a classroom where classroom rules apply;
3. requested lesson belongs to the effective classroom curriculum;
4. lesson is not removed;
5. lesson is unlocked for that classroom.

If locked:

* deny lesson content;
* return a clear locked response/page;
* do not leak activity content through APIs.

---

## API Protection

The same rule must apply to:

* page/server loaders;
* APIs;
* server actions;
* activity endpoints;
* save-progress endpoints.

A student cannot bypass a locked lesson by directly calling an endpoint.

---

## What Happens When a Lesson Is Re-Locked?

If a trainer locks a lesson that students previously accessed:

* do not delete existing progress;
* do not delete WPM/activity history;
* do not erase submissions or completion history.

Locking controls current/future access only.

Historical data remains.

---

## Trainer Curriculum UI

Trainer needs a straightforward lesson-management UI.

Inside each module, show lessons with availability controls.

Example:

```text
Module 5

Introduction        Unlocked    [Lock]
Variables           Unlocked    [Lock]
Conditions          Locked      [Unlock]
Loops               Locked      [Unlock]
```

The UI should make it obvious what students can currently open.

Avoid requiring the trainer to enter a separate settings page for every lesson if an inline control works cleanly.

---

## Module UI for Trainer

Because modules themselves are never locked, do not show controls such as:

```text
Lock Module
Unlock Module
```

Remove or avoid adding module-level availability controls.

The trainer may still retain other existing module actions such as:

* reorder;
* customize;
* add/remove lessons;
* edit classroom overrides;

where already supported.

---

## Visitor Behavior

This classroom lesson locking does **not** apply to the Visitor experience.

Visitor/public pages should continue following existing public curriculum rules.

Do not query classroom lesson-lock state for visitors.

---

## Student Without Classroom

A registered student who has not joined a classroom continues using the existing master-curriculum exploration behavior.

They do not have trainer-controlled lesson locks yet.

Once they join a classroom:

```text
master exploration
→ classroom curriculum
→ classroom lesson unlock rules
```

---

## Assignments Remain Separate

Do not automatically unlock lessons based on assignments.

Trainer creating an assignment related to Lesson 5 does not automatically unlock Lesson 5.

Likewise, completing homework does not unlock a lesson unless such behavior is intentionally introduced in a future feature.

---

## Universal Challenges Remain Separate

Universal Challenges have their own progression system.

Do not use lesson lock data for:

* Easy;
* Medium;
* Hard;
* Extreme

challenge progression.

---

## Recommended Data Shape

Adapt to the existing schema.

If no suitable state exists, the minimum requirement is effectively:

```text
classroom_id
lesson_id
is_unlocked
```

or an equivalent classroom curriculum override.

Avoid introducing a module availability column because modules are always open.

If the existing override table already contains a useful availability field, reuse it.

---

## Default Lesson State

Codex should inspect current behavior before deciding defaults.

For a new classroom, use a predictable starting rule.

Recommended simple default:

* first intended lesson is unlocked;
* later lessons are locked;

or preserve current application defaults if already established.

Do not unexpectedly lock existing production classrooms without migration/backfill logic.

Existing classroom data must be handled safely.

---

## Testing

Before Part C, verify:

### Classroom Student

* can open every module.
* can see all non-removed lessons.
* unlocked lesson opens.
* locked lesson cannot open.
* locked lesson is clearly styled.
* direct URL cannot bypass lock.
* API cannot bypass lock.

### Trainer

* can see lesson lock state.
* can unlock lesson.
* can lock lesson.
* another trainer in same classroom sees the same state.

### Unassigned Trainer

* cannot change lesson state.

### Visitor

* public curriculum behavior unchanged.

### Student Without Classroom

* master curriculum exploration unchanged.

### Re-Locking

* historical progress remains after lesson is locked.

---

## Final Rule

Keep the mental model extremely simple:

```text
Modules = always open
Lessons = trainer controlled
```

The student should always be able to understand the full module roadmap while clearly seeing which lessons are available now and which ones their trainer will release later.

Once this is verified, proceed with **Phase 2 Part C — Weekly Inputs**.
