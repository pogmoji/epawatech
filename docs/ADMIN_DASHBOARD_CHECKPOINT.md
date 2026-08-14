# Admin Dashboard Checkpoint — Core Organisational Backbone

## Milestone status

Completed on 2026-08-11.

The `/admin` route is now an authenticated, Supabase-backed administrative dashboard. It has no mock-data or localStorage fallback for administrative resources.

## Completed

- Reusable `lib/api/admin/dashboard.ts` data layer with a consistent `{ data, error }` result shape.
- Real overview metrics for centres, active cohorts, active trainers, active classrooms, active students, and pending trainer approvals.
- Centre list and create form.
- Cohort list and create form, including the database-enforced active-cohort conflict message.
- Trainer list, current assignment visibility, approval, and rejection actions.
- Classroom oversight showing centre, cohort, active lead trainer, and active student count.
- Student oversight showing active enrollment and organisation context.
- Existing protected account-correction and trainer-password-reset interfaces now use the shared admin data layer for their reads.
- Loading, empty, error, success, and pending-submission states.

## Verification completed

- `npx tsc --noEmit`
- `npm run lint`

## Deliberately not implemented

- An audit-log explorer: the repository RLS migration intentionally defines no `SELECT` policy for `audit_logs`. The frontend must not bypass RLS or fabricate activity records. If audit viewing is required, an administrator-readable policy or a secured RPC/API must be applied manually in Supabase first.
- Full classroom lifecycle controls are blocked pending manual schema approval. The current migrations do not yet support pre-classroom `Trainer -> Centre + Cohort` assignments, pending classroom approval, or assignment-verified classroom creation. See `supabase/migrations/report.md` Checkpoint 5.
- Database schema, RLS, users, seed records, migrations, and RPCs were not changed.

## Next validation milestone

Use an actual administrator, trainer, and student account against the deployed Supabase project to verify the RLS matrix and confirm the deployed schema still matches repository migrations. In particular, verify the `profiles.username` field exists before exercising profile corrections.
