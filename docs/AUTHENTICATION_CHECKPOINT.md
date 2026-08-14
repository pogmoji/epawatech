# Authentication checkpoint

## Completed

- Read `ePawatech-Authentication-Implementation-Codex.md` and the installed Next.js 16 authentication guidance.
- Confirmed the checked-in schema expects `profiles(id, full_name, role, status)` and that `handle_new_user` creates a student or pending trainer profile from Auth metadata.
- Added a reusable browser auth provider, role/status helpers, and reusable client route guard.
- Replaced the mock login and signup submissions with Supabase Auth calls; signup sends only `full_name` and `requested_role` metadata for the existing trigger.
- Added protected `/admin`, `/student`, and `/trainer` entry routes.

## Guardrails

- Do not create or apply database migrations, tables, seeds, users, or admin accounts.
- Supabase Auth plus `profiles` is the identity source; browser role values are never trusted.
- Pending, suspended, and rejected profiles must not receive active dashboard access.

- Added working sign-out controls in the global navigation and trainer workspace.
- Replaced learning progress, attempts, typing results, and project submission IDs with the authenticated user ID.

## Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes in the developer terminal.
- The typing-test renderer receives the authenticated user ID explicitly, preventing a child-component scope error.
