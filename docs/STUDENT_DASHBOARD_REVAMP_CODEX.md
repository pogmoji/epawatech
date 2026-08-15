# ePawaTech Student Dashboard Revamp — Codex Implementation Guide

## Purpose

Revamp the **student dashboard** so that it becomes a clear, personalized, age-appropriate workspace comparable in quality and structure to the current **trainer dashboard**, while preserving the existing ePawaTech architecture and avoiding unnecessary rewrites.

This revamp has two goals:

1. Introduce several **new student-facing capabilities** that do not exist today.
2. Reorganize the **student UI/UX** so existing functionality is easier to discover and the Learn page is no longer overloaded.

Codex should first inspect the existing trainer, student, and admin implementations before changing code. Reuse existing patterns, shared components, route conventions, API conventions, authentication rules, styles, and dashboard layouts wherever sensible.

---

# 1. Important Product Boundaries

The application effectively has **four experiences**:

1. **Visitor experience**
   - Existing public landing page.
   - Existing public navbar.
   - Used when nobody is logged in.
   - **Do not redesign or replace this as part of the student dashboard revamp.**

2. **Student dashboard**
   - This is the primary target of this revamp.
   - Should become a proper authenticated dashboard with its own navigation and overview.

3. **Trainer dashboard**
   - Existing authenticated trainer experience.
   - Treat it as the visual and structural reference for the new student dashboard.

4. **Admin dashboard**
   - Existing authenticated administrator experience.
   - Must gain read-only visibility into new student feedback functionality where required.

The visitor experience and its logged-out navbar must remain unchanged.

---

# 2. First Step for Codex: Inspect Before Implementing

Before making changes, inspect the existing codebase and document internally:

- current student dashboard route structure;
- current trainer dashboard shell/layout;
- trainer overview page;
- trainer navbar/sidebar/top bar;
- trainer classroom switcher if applicable;
- authenticated role routing;
- student Learn page;
- current classroom join flow;
- trainer weekly comments functionality;
- homework/challenge terminology currently used;
- student profile/user data models;
- admin profile editing functionality;
- database/API conventions;
- Prisma models and migrations;
- authorization helpers;
- current UI component library and shared dashboard components.

Do not duplicate working functionality just to satisfy this document.

Prefer extending existing architecture.

---

# 3. High-Level Student Information Architecture

The student dashboard should become a structured application rather than a single content-heavy screen.

Recommended primary navigation:

- Overview
- Learn
- Assignments
- Challenges
- Progress
- Profile

If an existing student route or feature already serves one of these responsibilities, reuse or relocate it instead of creating a duplicate.

The final navigation may contain additional items if the existing application requires them, but the dashboard should remain simple enough for a young learner.

---

# 4. Student Dashboard Visual Direction

## 4.1 Use Trainer Dashboard as the Reference

The student dashboard should feel like a sibling of the trainer dashboard.

Codex should inspect the trainer dashboard and reuse its general ideas where appropriate:

- dashboard shell;
- page width;
- navbar/sidebar structure;
- mobile navigation pattern;
- card styling;
- spacing;
- header layout;
- section hierarchy;
- statistics/summary cards;
- content panels;
- responsive behavior.

Do **not** simply copy trainer wording or trainer-only controls.

The student dashboard should retain a younger, simpler, more encouraging experience.

---

# 5. Student Navbar / Dashboard Header

The authenticated student navigation should be clearly different from the logged-out visitor navbar.

Recommended student identity treatment:

- student profile picture/avatar;
- student display name;
- optional classroom or cohort context;
- profile menu or clickable identity area;
- clicking the student identity/avatar should lead to the Profile page.

Possible profile menu actions:

- View Profile
- Edit Profile
- Account / Settings if such a page already exists
- Sign Out

Keep this consistent with the rest of the application's authentication and user-menu patterns.

---

# 6. NEW FUNCTIONALITY vs UI REVAMP

Codex must treat the following categories differently.

## A. New Functionalities

These require new data behavior, APIs, persistence, authorization, or workflows:

1. Student feedback / reflection system.
2. Trainer read-only access to student feedback.
3. Admin read-only access to student feedback.
4. Student profile fields beyond current basic identity.
5. Student profile picture support if it does not already exist.
6. Universal admin-created Challenges system.
7. Challenge levels and progression unlocking.
8. Student challenge completion/progress persistence.
9. Separation between universal Challenges and trainer-posted Homework/Assignments.

## B. Primarily UI / UX Revamp

These should normally reuse existing backend functionality unless the current implementation proves insufficient:

1. New student dashboard shell.
2. Student Overview page.
3. New authenticated student navbar.
4. Moving homework into a dedicated Assignments tab.
5. Simplifying the Learn page.
6. Moving non-learning statistics/information away from Learn.
7. Making classroom-join state understandable for a newly registered student.
8. Adding clear entry points to existing functionality.
9. Reorganizing progress/WPM/leaderboard information.
10. Adding profile identity UI in navigation.

Do not create unnecessary tables or APIs for UI-only work.

---

# 7. Student Overview Page

Create a student **Overview** page similar in spirit to the trainer overview.

The overview should answer simple questions at a glance:

- What should I do next?
- What am I currently learning?
- Do I have homework?
- What challenges can I attempt?
- How am I progressing?
- Am I part of a classroom?
- What did I recently complete?
- Can I leave feedback about my learning?

The page should avoid long paragraphs.

Use cards, concise status panels, clear buttons, friendly empty states, and visual progress indicators.

Possible overview sections:

### Welcome / Identity
- Greeting using student's preferred/display name.
- Profile image/avatar.
- Short personalized message.
- Current classroom if joined.
- Current centre/cohort if applicable.

### Continue Learning
- Current or recommended module.
- Last activity.
- Resume button.
- Progress indicator.

### Assignment Summary
- Number of active homework assignments.
- Due soon if due dates exist.
- Completed / pending summary.
- CTA: `View Assignments`.

### Challenge Summary
- Current challenge level.
- Current level completion.
- Next available challenge.
- CTA: `View Challenges`.

### Progress Snapshot
Potential existing metrics:
- curriculum progress;
- WPM best score;
- WPM accuracy;
- leaderboard position if already supported;
- weekly progress;
- badges when later introduced;
- recent activity.

Only display metrics supported by actual backend data.

### Student Feedback
A compact feedback/reflection composer should be available from the overview.

More details are defined below.

---

# 8. NEW FUNCTIONALITY — Student Feedback / Reflection

## 8.1 Goal

Students should be able to leave ongoing feedback/reflections from their dashboard, similar in concept to trainer comments but with a different ownership model.

Examples:

- what they enjoyed;
- what was difficult;
- what they want help with;
- how they feel about the current module;
- what they want to improve;
- general learning reflection.

This should not be treated as a public discussion feed.

---

# 9. Student Feedback Permissions

### Student
A student can:

- create feedback;
- view their own previous feedback;
- edit their own feedback;
- see when feedback was created;
- see when it was last edited.

A student must **not** be able to read another student's feedback.

### Trainer
A trainer can:

- view feedback for students belonging to classrooms they are authorized to teach;
- view feedback history;
- see created/updated timestamps.

Trainer access is **read-only**.

Trainer must not:

- edit student feedback;
- delete student feedback;
- create feedback on behalf of the student.

### Admin
An admin can:

- view student feedback;
- filter/access feedback by student/classroom/centre/cohort where appropriate.

Admin access should also be **read-only** unless the existing admin architecture has a very strong reason otherwise.

---

# 10. Feedback Data Design

Codex should inspect the existing trainer comments model first.

Reuse patterns where sensible, but do not force student feedback into the trainer comments table if ownership/authorization semantics make that inappropriate.

A reasonable model may resemble:

```text
student_feedback
- id
- student_id
- classroom_id nullable where appropriate
- cohort_id nullable if architecture requires it
- feedback_text
- created_at
- updated_at
```

Optional fields only if they improve the actual UX:

```text
- category
- mood
- module_id / week
```

Avoid overengineering.

The essential requirements are:

- history is persistent;
- feedback is editable by the author;
- trainer/admin can read it;
- authorization is enforced server-side.

---

# 11. Feedback UI

On Student Overview:

- concise heading such as `My Reflection`;
- multiline input;
- clear submit/save action;
- optional prompt suggestions;
- link/button to `View Feedback History`.

Feedback history can appear:

- on the Overview in a compact recent list; or
- in a dedicated drawer/modal/page;
- or under Progress if that produces a cleaner experience.

Each history item should show:

- feedback text;
- date created;
- last edited indicator when applicable;
- Edit action for the student.

Do not make the Overview noisy.

---

# 12. Trainer Visibility of Student Feedback

Add a student feedback area to the trainer dashboard.

Codex should inspect where trainer student details currently live.

Best placement:

- Student details/profile drawer/page; or
- a student-specific section in the trainer dashboard.

Trainer should be able to select a student and view:

- latest feedback;
- feedback history;
- dates;
- optionally module/week context where available.

This view is read-only.

Do not clutter the main trainer overview with every student's full feedback history.

A summary may be appropriate, such as:

- `3 new student reflections this week`
- recent reflections requiring attention

Only add such summaries if they can be implemented cleanly.

---

# 13. Admin Visibility of Student Feedback

Admin should also have read-only visibility.

Prefer integrating this into an existing student management/profile view rather than creating an entirely separate admin subsystem.

Possible filters:

- student;
- classroom;
- centre;
- cohort;
- date.

Do not add unnecessary analytics during this revamp.

---

# 14. NEW FUNCTIONALITY — Student Profile

Create a proper student Profile page.

The student should be able to edit allowed personal information themselves.

This should be similar in spirit to the admin's ability to edit user details, but scoped only to fields the student is allowed to control.

---

# 15. Student Editable Profile Fields

Required / strongly recommended:

- full/display name;
- profile picture/avatar;
- bio;
- school grade/class;
- academic term expectations/goals.

The term expectations field should answer something like:

> What would you like to achieve this term?

Examples:

- improve typing accuracy;
- complete Python modules;
- become confident with robotics;
- finish all assignments;
- improve school ICT performance.

Codex can introduce other useful low-risk profile fields where they improve personalization, for example:

- preferred name;
- interests;
- favorite coding topic;
- learning goal;
- personal motto;
- preferred avatar color if image upload is not configured.

Do not collect unnecessary sensitive data.

---

# 16. Profile Data Rules

Student-editable fields should be intentionally whitelisted.

Students must not be able to change privileged fields such as:

- role;
- approval/status fields;
- centre assignment;
- cohort assignment;
- classroom ownership;
- admin/trainer privileges;
- protected account identifiers.

Server-side authorization is required.

Do not rely only on hiding fields in the UI.

---

# 17. Profile Picture

If storage infrastructure already exists, reuse it.

If profile images are not currently supported:

- add a clean avatar upload flow;
- validate file type and size;
- provide fallback initials/avatar;
- reuse the app's current storage solution;
- avoid adding a completely different storage provider merely for avatars.

The avatar should be visible in:

- student navbar;
- Profile page;
- optionally Overview;
- trainer/admin student views where appropriate.

---

# 18. NEW FUNCTIONALITY — Challenges

Challenges are a distinct concept from homework.

This distinction must remain explicit in:

- database;
- API naming;
- routes;
- dashboard labels;
- UI copy;
- authorization.

---

# 19. Homework vs Challenge

## Homework / Assignment

Homework is:

- created/posted by a trainer;
- assigned to a classroom;
- visible to students in that classroom;
- part of trainer-to-classroom work.

Student navigation name:

**Assignments**

The existing trainer homework functionality should continue to power this.

Avoid renaming database concepts blindly if existing code depends on the word `homework`; the student-facing UI can use `Assignments` while preserving backend compatibility.

## Challenge

A Challenge is:

- universal;
- created/published by an admin;
- not tied to one trainer;
- intended for the wider student platform;
- organized into difficulty/progression levels;
- unlocked progressively.

Challenges must not be mixed into classroom homework.

---

# 20. Challenge Progression Levels

Create a level-based system.

Suggested progression:

1. Easy
2. Medium
3. Hard
4. Extreme

Alternative student-friendly names are acceptable if the product style benefits from them, but the underlying difficulty progression must remain clear.

For example:

- Explorer
- Builder
- Coder
- Master

Codex can be creative with labels/icons, but avoid making the system confusing.

---

# 21. Challenge Unlock Rules

Core rule:

> A student must complete the previous level before the next level becomes available.

Within each level there can be multiple challenges.

Recommended interpretation:

- all required challenges in Easy must be completed before Medium unlocks;
- all required challenges in Medium must be completed before Hard unlocks;
- and so on.

If optional challenges are introduced later, the data model should be able to distinguish required vs optional, but optional challenges are not required for the first implementation.

---

# 22. Challenge Data Model

Codex should adapt this to the current Prisma/database conventions.

Potential structures:

```text
challenge_levels
- id
- name
- slug
- sort_order
- difficulty
- is_active
- created_at
- updated_at
```

```text
challenges
- id
- level_id
- title
- description
- instructions/content
- sort_order
- is_published
- created_by_admin_id
- created_at
- updated_at
```

```text
student_challenge_progress
- id
- student_id
- challenge_id
- status
- started_at
- completed_at
- score / result nullable if relevant
- submission_data nullable if relevant
- created_at
- updated_at
```

Do not add score/submission fields unless there is a real use for them.

The first implementation can focus on:

- available;
- locked;
- in progress;
- completed.

---

# 23. Admin Challenge Management

Admin should be able to:

- create a challenge;
- edit a challenge;
- publish/unpublish;
- choose the level;
- order challenges;
- see basic completion information if easy to integrate.

Do not make trainers administrators of universal challenges.

Trainer challenge creation is out of scope unless the existing product already defines another trainer-specific challenge concept.

---

# 24. Student Challenge Page

The Challenges tab should feel motivating and visual.

Recommended design:

### Level Roadmap
Show levels in progression order.

Each level displays:

- name;
- icon;
- difficulty;
- progress;
- locked/unlocked state;
- completed state.

### Within a Level
Show challenge cards with:

- title;
- short description;
- status;
- progress/completion marker;
- CTA: Start / Continue / Review;
- lock reason where relevant.

Example:

`Complete all Easy challenges to unlock Medium.`

Avoid showing disabled controls without explanation.

---

# 25. Assignment Tab

Create a dedicated **Assignments** page for trainer-posted homework.

This is primarily a UI relocation/clarification around existing trainer homework functionality.

The student should see:

- assignment title;
- trainer;
- classroom;
- instructions;
- date assigned;
- due date if supported;
- status;
- submission/completion state if supported.

Useful categories:

- To Do
- Completed
- Past / Closed

Only expose states actually supported by backend behavior.

The aim is to remove homework-related clutter from Learn.

---

# 26. Learn Page Revamp

The current Learn page should remain the place where curriculum modules live.

The modules themselves are useful and should not be unnecessarily redesigned.

The problem is the amount of information around/above them.

Revamp Learn so the mental model is simple:

> Learn = Curriculum and learning activities.

Move unrelated or secondary information elsewhere.

Potential content to remove from Learn and surface elsewhere:

- generic account information;
- profile data;
- homework summaries;
- challenge information;
- WPM stats unless directly tied to a module;
- leaderboard summaries;
- classroom status explanations;
- long onboarding text;
- repeated progress statistics.

Use Overview, Assignments, Challenges, Progress, and Profile instead.

---

# 27. Learn Page for Student With a Classroom

Existing product rule must remain:

- student joined to a classroom sees the trainer-customized curriculum for that classroom.

The Learn page should make this context clear but concise.

Example:

`Learning with [Classroom Name]`

Do not place large explanatory sections above the modules.

---

# 28. Learn Page for Student Without a Classroom

Existing product rule must remain:

- a student who is not in a classroom can see the master curriculum;
- their interactions with that curriculum should not be persisted where the existing business rule says progress is not saved before joining.

The revamp needs a much better first-time experience.

A newly registered student should understand:

- they successfully created an account;
- they can explore the learning content;
- joining a classroom unlocks saved classroom progress/homework/trainer context;
- where to enter the trainer's classroom join code.

Avoid a large wall of text.

Recommended UX:

### Overview empty-state card
`You are not in a classroom yet.`

Short supporting text:

`Enter the code from your trainer to join your class and start saving classroom progress.`

CTA:

`Join a Classroom`

Secondary CTA:

`Explore Lessons`

### Learn page
A compact banner can state:

`Exploration mode — join a classroom to save classroom learning progress.`

Do not repeatedly show the same explanation across every page.

---

# 29. Classroom Join Flow

Codex should inspect the current join-code implementation and reuse it.

The revamp may relocate the join entry point to:

- student Overview;
- student navbar/profile menu if appropriate;
- onboarding state.

Do not break the existing trainer/admin join-code lifecycle.

Ensure a student cannot join unauthorized classrooms or bypass server checks.

---

# 30. Progress Page

Create or refine a dedicated student Progress page if enough existing metrics justify it.

Potential content:

- curriculum completion;
- module progress;
- WPM history;
- best WPM;
- best accuracy;
- leaderboard position;
- completed assignments;
- completed challenges;
- feedback/reflection history;
- badges later.

The current product requirement for WPM remains:

- students may make multiple attempts;
- attempts are persisted;
- leaderboard should use appropriate best metrics such as WPM and accuracy.

Do not discard historical WPM data.

Avoid duplicating the same large metrics panels on both Overview and Progress.

Overview = snapshot.
Progress = deeper history.

---

# 31. Personalization

The dashboard should feel like it belongs to the student.

Possible personalization:

- greeting by preferred name;
- avatar;
- current classroom;
- current module;
- current challenge level;
- progress toward the next goal;
- term goal;
- recent achievement;
- recommended next action.

Do not generate fake insights.

Only personalize from real stored data.

---

# 32. Young Learner UX Principles

The audience includes young students.

Design accordingly:

- concise text;
- obvious actions;
- one clear purpose per card;
- friendly empty states;
- clear icons with labels;
- visual progression;
- minimal jargon;
- avoid dense tables unless needed;
- responsive cards;
- no information overload;
- make the next action obvious.

Do not infantilize the interface.

Aim for modern, encouraging, and easy to understand.

---

# 33. Empty States

Every new page should have meaningful empty states.

Examples:

### No Assignments
`No assignments yet. Your trainer's homework will appear here.`

### No Challenge Progress
`Start your first Easy challenge.`

### No Feedback
`You haven't written a reflection yet.`

### No Classroom
`Join your trainer's classroom to unlock assignments and saved classroom progress.`

### No Profile Picture
Show initials/avatar rather than a broken image.

---

# 34. Navigation Visibility

Functionality should be visible.

Avoid hiding major features exclusively behind:

- dropdown menus;
- nested settings;
- text links buried inside cards;
- the Learn page.

The primary student capabilities should be reachable directly from authenticated student navigation.

At minimum:

- Overview
- Learn
- Assignments
- Challenges
- Progress
- Profile

Mobile navigation may use a drawer/menu, but should retain the same information architecture.

---

# 35. Role-Based Navigation

Use role-aware authenticated dashboard navigation.

### Visitor
Existing public navbar unchanged.

### Student
Student-specific authenticated dashboard navigation.

### Trainer
Existing trainer dashboard navigation.

### Admin
Existing admin dashboard navigation.

Do not create one giant navbar with controls for every role.

Role authorization must remain server-enforced, not just visually hidden.

---

# 36. API / Security Requirements

All new routes must enforce authentication and authorization.

Important rules:

### Student Profile
Student can update only their own permitted profile fields.

### Student Feedback
Student can CRUD only their own feedback, except delete should only be added if intentionally supported.
Trainer/admin are read-only.

### Trainer Feedback Visibility
Trainer only sees students within authorized classroom relationships.

### Challenges
Students can read published challenges.
Admins can manage challenge content.
Students can update only their own challenge progress.

### Homework / Assignments
Continue using current classroom ownership and trainer authorization.

Never trust `studentId`, `classroomId`, or role values coming directly from the browser without validating them against the authenticated user.

---

# 37. Database / Migration Guidelines

The project currently uses Prisma/PostgreSQL.

Follow existing project conventions.

When schema changes are required:

- add Prisma models/migrations cleanly;
- preserve existing data;
- avoid destructive migrations;
- use proper foreign keys;
- add useful indexes;
- avoid duplicate concepts;
- ensure role-based access is enforced in application APIs/server actions.

Before creating a table, inspect whether a semantically equivalent table already exists.

---

# 38. Reuse Trainer Comment Patterns Carefully

Student feedback is conceptually similar to trainer weekly comments but is not the same thing.

Trainer comments:

- authored by trainer;
- generally about a student;
- part of trainer/classroom evaluation.

Student feedback:

- authored by student;
- about their own learning experience;
- editable by the student;
- read-only to trainer/admin.

Reuse UI/API patterns, not ownership semantics.

---

# 39. UI Consistency Requirement

A repeated ePawaTech problem to avoid:

> functionality exists in backend code but there is no practical UI path for the user to use it.

Every new capability must ship with usable UI.

For this revamp:

- API + UI + authorization must be completed together;
- no hidden functionality;
- no dead buttons;
- no placeholder tabs that imply a feature works;
- mobile and desktop states must both be usable.

---

# 40. Recommended Route Structure

Codex should use existing route conventions, but a target structure may resemble:

```text
/student
/student/overview
/student/learn
/student/assignments
/student/challenges
/student/progress
/student/profile
```

If `/student` already exists, it may redirect to `/student/overview`.

Trainer/admin routes should remain in their existing namespaces.

---

# 41. Suggested Components

Reuse existing components where possible.

Potential student-specific components:

```text
StudentDashboardShell
StudentSidebar / StudentNavbar
StudentHeader
StudentIdentityMenu
StudentOverviewCard
ContinueLearningCard
AssignmentSummaryCard
ChallengeProgressCard
StudentFeedbackComposer
StudentFeedbackHistory
StudentProfileForm
StudentAvatarUploader
ChallengeLevelCard
ChallengeCard
AssignmentCard
ProgressSummary
JoinClassroomCard
```

Do not create separate components for trivial one-off markup.

---

# 42. Dashboard Overview Suggested Layout

One possible desktop structure:

```text
------------------------------------------------
Student Header / Identity
------------------------------------------------

Welcome / Continue Learning      Current Goal

Assignments                     Challenge Level

Progress Snapshot               My Reflection

Recent Activity / Achievements
------------------------------------------------
```

On mobile, cards should stack naturally.

The exact design is flexible.

Codex should make it fit the existing trainer dashboard style.

---

# 43. Profile Suggested Layout

Potential profile sections:

### Identity
- avatar
- full/display name
- preferred name

### About Me
- bio
- grade/class
- interests

### My Goals
- academic term expectations
- coding goal

### Classroom Information
Read-only:
- centre
- cohort
- classroom
- trainer

### Account
Only existing safe account actions.

Do not allow student editing of classroom/role assignment here.

---

# 44. Challenge UX Example

Example level display:

```text
Easy        4 / 4 completed   ✓
Medium      2 / 5 completed   In progress
Hard        Locked
Extreme     Locked
```

Hard explanation:

`Complete all Medium challenges to unlock this level.`

This is preferable to simply hiding locked content, because students can see what they are working toward.

---

# 45. Admin Challenge UI

Add an admin management area using the existing admin design patterns.

Suggested capabilities:

- list challenge levels;
- list challenges per level;
- create challenge;
- edit challenge;
- publish/unpublish;
- reorder;
- see basic student completion count if straightforward.

Do not redesign the entire admin dashboard for this task.

---

# 46. Trainer Assignment Compatibility

Assignments on the student side are trainer homework.

Ensure existing trainer flow still works:

Trainer:
- creates/posts homework;
- targets their classroom.

Student:
- sees it under Assignments.

Do not create a second homework authoring system.

---

# 47. Backward Compatibility

Do not break:

- public landing page;
- public navbar;
- authentication;
- role redirects;
- trainer dashboard;
- admin dashboard;
- classroom join code behavior;
- curriculum master data;
- trainer classroom curriculum overrides;
- existing WPM persistence;
- existing homework records;
- existing student accounts.

Where routing changes are introduced, add redirects if necessary.

---

# 48. Testing Requirements

Codex should test at least the following cases.

## Visitor
- logged-out landing page unchanged;
- logged-out navbar unchanged.

## New Student — Not in Classroom
- sees Student Overview;
- sees a useful join-classroom prompt;
- can navigate to Learn;
- sees master curriculum;
- understands exploration mode;
- cannot access another student's data.

## Student — In Classroom
- overview is personalized;
- Learn uses classroom-customized curriculum;
- Assignments shows trainer homework;
- Challenges shows admin universal challenges;
- Profile updates persist;
- avatar updates persist;
- feedback can be created;
- feedback can be edited;
- feedback history is visible;
- challenge progression persists.

## Trainer
- trainer can read feedback only for authorized students;
- trainer cannot edit student feedback;
- trainer cannot see unrelated classroom feedback;
- trainer homework flow still works.

## Admin
- admin can view student feedback;
- admin can manage universal challenges;
- admin can inspect student profile information as permitted.

## Challenge Progression
- new student starts with first level unlocked;
- later levels locked;
- completing required level challenges unlocks the next level;
- direct URL/API requests cannot bypass progression rules if such enforcement is required.

## Authorization
- student cannot update role;
- student cannot update another student profile;
- student cannot edit another student's feedback;
- trainer cannot edit feedback through direct API request;
- non-admin cannot create universal challenges.

---

# 49. Responsive Testing

Test:

- desktop;
- tablet;
- mobile.

Ensure:

- navbar/sidebar works;
- profile menu works;
- challenge cards remain readable;
- feedback composer is usable;
- module cards are not squashed;
- no horizontal overflow;
- empty states remain readable.

---

# 50. Accessibility

Maintain practical accessibility:

- keyboard navigation;
- button labels;
- alt text for profile images;
- focus states;
- sufficient contrast;
- form labels;
- error messages associated with inputs;
- icons should not be the only way meaning is communicated.

---

# 51. Error Handling

Every new mutation should have proper states:

- loading;
- success;
- validation error;
- server error.

Examples:

- profile update;
- avatar upload;
- feedback save;
- feedback edit;
- challenge completion;
- join-classroom action.

Do not leave buttons spinning indefinitely on failure.

---

# 52. Suggested Implementation Order

Implement in a way that keeps the app usable after each stage.

## Phase 1 — Inspection and dashboard shell
- inspect existing role/dashboard patterns;
- create/reuse student dashboard shell;
- add student authenticated navigation;
- establish Overview route;
- preserve Visitor UI.

## Phase 2 — UI redistribution
- simplify Learn;
- add Assignments page using existing homework;
- create Progress structure using existing data;
- improve no-classroom onboarding state.

## Phase 3 — Profile
- extend profile model if needed;
- add profile APIs/actions;
- add avatar;
- build Profile page;
- add profile identity to student navbar.

## Phase 4 — Student feedback
- database model;
- student create/edit/history;
- Overview composer;
- trainer read-only view;
- admin read-only view;
- authorization tests.

## Phase 5 — Universal challenges
- challenge level schema;
- challenge schema;
- student progress schema;
- admin management UI;
- student Challenges UI;
- unlock rules;
- persistence.

## Phase 6 — Polish
- overview summaries;
- responsive behavior;
- empty/loading/error states;
- remove remaining clutter from Learn;
- verify all dashboard links;
- regression test Visitor/Trainer/Admin experiences.

---

# 53. Definition of Done

This revamp is complete when:

- the public/visitor landing page is unchanged;
- the public/visitor navbar is unchanged;
- student login leads into a real dashboard experience;
- Student Overview is useful without being wordy;
- authenticated student navigation clearly exposes major features;
- Learn is focused mainly on curriculum;
- trainer homework appears under Assignments;
- admin universal challenges appear under Challenges;
- challenge levels unlock progressively;
- challenge progress persists;
- Profile is editable within safe student permissions;
- avatar/profile picture works or a robust fallback is implemented;
- term expectations/goals are persisted;
- student feedback can be created, edited, and viewed historically;
- trainer can read authorized student feedback;
- admin can read student feedback;
- trainer/admin cannot edit student feedback;
- a newly registered student who has not joined a classroom understands what to do;
- existing trainer/admin functionality is not broken;
- no important backend feature added by this revamp lacks a usable frontend path.

---

# 54. Final Instruction to Codex

Do not treat this task as a superficial reskin.

The student dashboard currently has useful functionality, but the experience needs clearer information architecture.

Use the trainer dashboard as the main structural/design reference, inspect the existing code carefully, and reuse working architecture.

The end result should make the student experience feel intentional:

- Overview tells the student what matters now.
- Learn contains learning.
- Assignments contains trainer homework.
- Challenges contains universal admin challenges.
- Progress contains deeper history and performance.
- Profile contains the student's identity and goals.

Most importantly, a young student should never need to search through a congested page to discover what the platform can do.
