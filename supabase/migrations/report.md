## Checkpoint 4 — Trainer Phase B classroom context

- Added a real trainer teaching-context API that reads active `trainer_assignments`, `classrooms`, `cohorts`, and `centres` through the authenticated Supabase client.
- Authorization remains database-led: the client never supplies a trainer id or arbitrary classroom id as proof of access, and RLS limits the result set to the signed-in trainer.
- Corrected the dashboard decision tree so an active trainer assignment is evaluated separately from an active classroom.
- The trainer dashboard shell now blocks access until context loads, shows a clear unavailable/no-teaching-assignment state, shows a non-active-classroom state when an assignment exists but no active classroom is returned, and lets trainers switch only between active classrooms returned by RLS.
- Removed the hardcoded trainer name from the visible dashboard greeting and replaced the header/sidebar classroom identity with real centre/cohort/classroom data.
- Prototype student, attendance, awards, and curriculum override persistence intentionally remain browser-local for later Trainer migration phases.

### Migration audit report

Reviewed migration files:

- `001_extensions_types.sql`
- `002_profiles_organization.sql`
- `003_assignments_enrollment.sql`
- `008_rls.sql`
- `009_seed_compatibility.sql`
- `010_student_usernames.sql`
- `011_trainer_contact_details.sql`

Handled by the current migrations:

- Trainer account approval is represented by `profiles.status`. Trainer sign-up creates `pending` trainer profiles, and admin approval can move them to `active`.
- Centres and cohorts exist. `cohorts` belongs to `centres`, and the schema enforces one active cohort per centre.
- Classrooms belong to cohorts through `classrooms.cohort_id`, so Centre is derivable through `classroom -> cohort -> centre`.
- Historical trainer/classroom placement is represented by `trainer_assignments.status`, `start_date`, and `end_date`.
- Active classroom authorization is represented through `trainer_assignments.classroom_id`; RLS helpers such as `is_active_trainer_for_classroom` and `is_active_trainer_for_centre` derive access through existing classroom assignments.
- When an active trainer creates a classroom, `009_seed_compatibility.sql` automatically inserts an active lead `trainer_assignments` row for that new classroom.

Not handled by the current migrations:

- There is no pre-classroom assignment model for `Trainer -> Centre + Cohort`. `trainer_assignments` requires `classroom_id`, so it can only represent `Trainer -> Classroom` after a classroom exists.
- The state "approved trainer assigned to Centre + Cohort but no classroom yet" cannot be stored or queried from the checked-in schema.
- The dashboard cannot reliably distinguish "approved but not assigned" from "assigned to Centre + Cohort but no classroom" using only the current `trainer_assignments` table.
- `classrooms.status` supports `active`, `completed`, and `archived`; there is no `pending` or `awaiting_approval` classroom status.
- Classroom creation currently defaults to `active`, and the trigger creates an active lead assignment immediately. That bypasses the intended "created -> pending approval -> active" classroom lifecycle.
- The classroom insert RLS policy checks `created_by = auth.uid()`, active trainer status, and active cohort status. It does not verify that the trainer is assigned to that specific Centre/Cohort before allowing classroom creation.
- `classrooms.join_code_hash` is `NOT NULL`, but there is no dedicated classroom creation RPC in the migrations that derives the authorized assignment, generates the join-code hash, inserts a pending classroom, and returns the plain join code.

Required lifecycle from `ePawatech-Trainer-Assignment-and-Classroom-Lifecycle-Codex.md`:

1. Admin approves Trainer.
2. Admin assigns Trainer to Centre + Cohort.
3. Trainer creates Classroom within that assigned Cohort.
4. Admin approves Classroom.
5. Active Classroom loads the full Trainer Dashboard.

Conclusion:

The limitations are not handled by the current migration files. The schema supports active trainer-to-classroom operations after a classroom exists, but it does not yet support the intended Centre/Cohort assignment stage or classroom approval stage.

Suggested database review:

- Add or expose an assignment model that can represent `Trainer -> Centre + Cohort` before any classroom exists.
- Add or expose a classroom approval status/API if pending classroom approval is required.
- Update RLS/API so classroom creation is authorized by the authenticated trainer's Centre + Cohort assignment, not by arbitrary client-selected Centre/Cohort values.
- Add a controlled classroom creation RPC or route-backed API that generates `join_code_hash`, creates the classroom in the correct initial status, and returns the plain join code only once.

## Checkpoint 5 — Classroom lifecycle and Admin API proposal

Source guide: `ePawatech-Classroom-Lifecycle-and-Admin-API.md`

This phase cannot be completed as a real Admin Dashboard/API implementation using only the current migrations. The guide requires:

```text
Admin assigns Trainer to Centre + Cohort
Trainer/Admin creates Classroom
Classroom starts pending
Admin activates Classroom
Trainer assignment becomes operational
```

The current schema instead does this:

```text
Classroom insert
  -> status defaults to active
  -> trigger immediately inserts active Trainer -> Classroom assignment
```

Per the guide's database safety rule, Codex must not create, execute, or apply these schema changes. The proposal below is for manual Supabase review.

### Required schema change 1 — Centre/Cohort trainer assignment

Required schema change:

Add a pre-classroom assignment model for `Trainer -> Centre + Cohort`.

Why it is required:

The intended product flow needs an approved Trainer to be assigned to a Centre + Cohort before a classroom exists. The current `trainer_assignments` table requires `classroom_id`, so it can only represent `Trainer -> Classroom`.

Affected tables:

- `profiles`
- `centres`
- `cohorts`
- new assignment table, proposed as `trainer_cohort_assignments`
- `classrooms`
- `trainer_assignments`

Affected RLS:

- Add trainer read access to their own active Centre/Cohort assignment.
- Restrict trainer classroom creation to cohorts in their active Centre/Cohort assignment.
- Keep Admin write authority over assignment creation, completion, rejection, and reassignment.

Affected APIs:

- Admin: `assignTrainerToCohort`
- Admin: `completeTrainerCohortAssignment`
- Trainer: `getTrainerClassroomContext`
- Trainer/Admin: `createClassroom`

Suggested SQL/migration for review:

```sql
CREATE TABLE trainer_cohort_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE RESTRICT,
  status assignment_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tca_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_tca_trainer_id ON trainer_cohort_assignments (trainer_id);
CREATE INDEX idx_tca_centre_id ON trainer_cohort_assignments (centre_id);
CREATE INDEX idx_tca_cohort_id ON trainer_cohort_assignments (cohort_id);
CREATE INDEX idx_tca_status ON trainer_cohort_assignments (status);

CREATE UNIQUE INDEX uidx_one_active_tca_per_trainer
  ON trainer_cohort_assignments (trainer_id)
  WHERE status = 'active';

ALTER TABLE trainer_cohort_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY trainer_cohort_assignments_select ON trainer_cohort_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin() OR trainer_id = auth.uid());

CREATE POLICY trainer_cohort_assignments_admin_write ON trainer_cohort_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### Required schema change 2 — Pending classroom lifecycle

Required schema change:

Add a pending classroom status and make new classrooms start pending unless Admin explicitly creates an already active classroom through an approved Admin operation.

Why it is required:

The guide says Trainer-created classrooms must not become active immediately. The current `classroom_status` enum is only `active`, `completed`, and `archived`, and `classrooms.status` defaults to `active`.

Affected tables/types:

- `classroom_status`
- `classrooms`
- `audit_logs`

Affected RLS:

- Trainer can read their own pending classroom request where supported by the final assignment model.
- Trainer cannot activate their classroom.
- Admin can activate, complete, and archive classrooms.

Affected APIs:

- `createClassroom`
- `activateClassroom`
- `completeClassroom`
- `archiveClassroom`
- Trainer classroom context
- Admin classroom dashboard

Suggested SQL/migration for review:

```sql
ALTER TYPE classroom_status ADD VALUE IF NOT EXISTS 'pending';

ALTER TABLE classrooms
  ALTER COLUMN status SET DEFAULT 'pending';
```

Note: PostgreSQL enum value ordering and transactional behavior should be checked against the deployed Supabase PostgreSQL version before applying. If ordering matters for application logic, use explicit comparisons rather than enum order.

### Required schema change 3 — Stop automatic active lead assignment

Required schema change:

Replace the current `on_classroom_created` trigger behavior so classroom creation does not automatically create an active lead `trainer_assignments` row.

Why it is required:

The current trigger `create_lead_assignment_for_classroom()` immediately inserts an active `Trainer -> Classroom` assignment after classroom creation. That bypasses the required pending classroom approval state.

Affected database objects:

- trigger `on_classroom_created`
- function `create_lead_assignment_for_classroom`
- table `trainer_assignments`

Affected APIs:

- `createClassroom`
- `activateClassroom`
- `assignTrainerToClassroom`
- `reassignTrainerToClassroom`

Suggested SQL/migration for review:

```sql
DROP TRIGGER IF EXISTS on_classroom_created ON classrooms;

DROP FUNCTION IF EXISTS public.create_lead_assignment_for_classroom();
```

Alternative if automatic assignment should be retained as pending:

```sql
CREATE OR REPLACE FUNCTION public.create_pending_lead_assignment_for_classroom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.created_by AND role = 'trainer' AND status = 'active'
  ) THEN
    INSERT INTO public.trainer_assignments (trainer_id, classroom_id, role, status, start_date)
    VALUES (NEW.created_by, NEW.id, 'lead', 'pending', CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_classroom_created
  AFTER INSERT ON classrooms
  FOR EACH ROW EXECUTE FUNCTION public.create_pending_lead_assignment_for_classroom();
```

The preferred option is to let the controlled `createClassroom` / `activateClassroom` APIs own this explicitly so audit records and approval state remain clear.

### Required schema change 4 — Secure classroom creation operation

Required schema change:

Add a controlled classroom creation RPC or implement an equivalent route-backed API that uses a service/admin client after verifying the authenticated actor.

Why it is required:

`classrooms.join_code_hash` is `NOT NULL`. The plain join code should be generated server-side, hashed, stored only as a hash, and returned once. The current client-facing insert path does not safely handle the full lifecycle and assignment authorization.

Affected tables:

- `classrooms`
- `trainer_cohort_assignments`
- `trainer_assignments`
- `audit_logs`

Affected RLS:

- If using RPC with `SECURITY DEFINER`, validate all authorization inside the function.
- If using route-backed API, keep table RLS restrictive and use admin/service operations only after app-level Admin/Trainer authorization checks.

Affected APIs:

- Admin: `createClassroom`
- Trainer: `createClassroom`
- Admin Dashboard classroom creation form
- Trainer no-classroom creation form

Suggested SQL/RPC shape for review:

```sql
CREATE OR REPLACE FUNCTION public.create_classroom_request(
  p_cohort_assignment_id UUID,
  p_name TEXT
)
RETURNS TABLE (classroom_id UUID, join_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  plain_code TEXT := upper(encode(gen_random_bytes(12), 'hex'));
  target_cohort_id UUID;
  actor_id UUID := auth.uid();
BEGIN
  SELECT cohort_id INTO target_cohort_id
  FROM public.trainer_cohort_assignments
  WHERE id = p_cohort_assignment_id
    AND trainer_id = actor_id
    AND status = 'active';

  IF target_cohort_id IS NULL THEN
    RAISE EXCEPTION 'Trainer is not authorized for this cohort'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.classrooms (cohort_id, name, status, join_code_hash, created_by)
  VALUES (
    target_cohort_id,
    trim(p_name),
    'pending',
    encode(digest(plain_code, 'sha256'), 'hex'),
    actor_id
  )
  RETURNING id INTO classroom_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    actor_id,
    'classroom_created_pending',
    'classroom',
    classroom_id,
    jsonb_build_object('cohort_id', target_cohort_id, 'name', trim(p_name), 'status', 'pending')
  );

  join_code := plain_code;
  RETURN NEXT;
END;
$$;
```

Admin-led classroom creation may need a separate RPC/API because Admin selects Centre/Cohort directly and may optionally assign a Trainer.

### Required schema change 5 — Activation and assignment operations

Required schema change:

Add controlled operations for Admin-only lifecycle transitions and Trainer assignment.

Why it is required:

The guide requires `activateClassroom`, `assignTrainerToClassroom`, `reassignTrainerToClassroom`, `completeClassroom`, and `archiveClassroom` to be real operations with audit records. The current Admin Dashboard can view classrooms, but it cannot safely drive the lifecycle.

Affected tables:

- `classrooms`
- `trainer_assignments`
- `trainer_cohort_assignments`
- `audit_logs`

Affected RLS:

- Admin-only status transitions.
- Admin-only Trainer assignment/reassignment.
- Trainer read/operate permissions continue to derive from active classroom assignment.

Affected APIs:

- `activateClassroom`
- `assignTrainerToClassroom`
- `reassignTrainerToClassroom`
- `completeClassroom`
- `archiveClassroom`

Suggested API behavior after schema approval:

```text
activateClassroom(classroomId)
  - verify Admin
  - verify classroom.status = pending
  - update classroom.status = active
  - activate or create lead trainer assignment
  - write audit_logs row

assignTrainerToClassroom(classroomId, trainerId)
  - verify Admin
  - verify trainer is active
  - verify classroom exists and is pending/active according to policy
  - verify trainer has compatible Centre/Cohort assignment if required
  - create pending or active assignment according to classroom status
  - write audit_logs row

reassignTrainerToClassroom(classroomId, trainerId)
  - verify Admin
  - complete current active lead assignment with end_date
  - create new lead assignment
  - preserve historical assignment
  - write audit_logs row with before_data and after_data

completeClassroom(classroomId)
  - verify Admin
  - update classroom.status = completed
  - complete active trainer assignments with end_date
  - preserve enrollments/history
  - write audit_logs row

archiveClassroom(classroomId)
  - verify Admin
  - update classroom.status = archived
  - do not delete classroom or relationships
  - write audit_logs row
```

### Admin Dashboard implementation after manual schema approval

Once the manual schema changes are approved and applied, implement:

- Admin Classroom create form backed by real `createClassroom`.
- Pending classroom list with `Activate`.
- Classroom detail panel showing Centre, Cohort, Classroom, Status, Created By, Created Date, Lead Trainer, assignment dates, student count, and join-code availability without exposing `join_code_hash`.
- Assign/Reassign Trainer controls backed by real API operations.
- Complete/Archive controls using lifecycle APIs.
- Error handling for invalid status transitions and RLS denials.

Do not build these controls against the current schema because they would either activate classrooms too early or rely on client-side enforcement.
