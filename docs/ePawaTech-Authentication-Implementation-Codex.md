# ePawatech — Authentication Implementation Guide for Codex

## Purpose

Implement the first real authentication layer for ePawatech using the existing Supabase project.

This is **not** a prototype authentication implementation.

Supabase Auth and the existing `profiles` table/database are the source of truth.

The implementation must prepare the application for the real Admin, Trainer, and Student dashboards.

---

## 1. Critical Database Rule

### DO NOT create database tables from the CLI

Codex must **not**:

- create tables
- alter tables
- create/apply migrations
- seed database records
- create demo users
- create Admin users
- reset the database

The developer will manually manage database changes in Supabase.

If a schema change is required:

1. Stop before applying it.
2. Explain the exact required change.
3. Provide SQL if useful.
4. Do **not** execute it.
5. Do not create duplicate tables as a workaround.

This manual-control rule is intentional so the developer can track database changes.

---

## 2. Inspect Before Coding

Inspect:

- current Supabase client
- `.env.local` usage
- actual deployed `profiles` schema
- current authentication UI
- route structure
- demo/mock user logic
- existing role handling
- `dbFallback`
- current dashboard route protection
- TypeScript types

Do not assume the planning MD exactly matches the deployed schema.

The **actual deployed Supabase database is the source of truth**.

---

## 3. Environment Variables

The project already has `.env.local`.

Verify the existing convention.

The frontend may use the Supabase public client key.

Never expose:

- service-role keys
- database passwords
- private Supabase secrets

Do not print secrets in logs or commit `.env.local`.

---

## 4. Supabase Client

Create or refactor the reusable Supabase client.

Use environment variables rather than hardcoded credentials.

Maintain one consistent client pattern across the application unless the framework requires separate browser/server clients.

Follow the framework's recommended Supabase pattern when server and browser contexts differ.

---

## 5. Authentication Scope

Implement:

- sign up
- sign in
- sign out
- session persistence
- current authenticated user
- profile loading
- role loading
- protected routes
- authentication state handling

Do not add additional authentication providers unless already required by the project.

---

## 6. Identity and Roles

Roles:

```text
admin
trainer
student
```

Conceptually:

```text
Supabase Auth User
        ↓
profiles.id
        ↓
profiles.role
        ↓
Application permissions
```

Do not treat an email address as a role.

Do not infer role from the URL.

Do not use hardcoded demo accounts.

---

## 7. Trainer Signup

Trainer flow:

```text
Trainer signs up
      ↓
Supabase Auth
      ↓
Profile
      ↓
pending
      ↓
Admin approval
      ↓
active
```

A new Trainer must not automatically receive active Trainer privileges.

The database/RLS layer is authoritative.

---

## 8. Student Signup

Students can authenticate.

Student account creation does **not** automatically enroll them in a classroom.

Future flow:

```text
Student account
      ↓
Authenticated
      ↓
Enter classroom join code
      ↓
Database enrollment
```

Classroom enrollment belongs to the later classroom/enrollment implementation.

---

## 9. Admin Authentication

An Admin account already exists and has been manually configured.

Do not create another Admin.

The existing Admin must be able to:

```text
sign in
   ↓
load profile
   ↓
role = admin
   ↓
access protected Admin routes
```

---

## 10. Session Handling

Authentication must survive normal page refreshes.

Handle:

- initial session loading
- authenticated state
- unauthenticated state
- session changes
- sign out
- expired/invalid sessions

Use an explicit loading state to avoid login/logout flicker.

---

## 11. Reusable Auth Layer

Create a reusable authentication abstraction if appropriate.

Conceptually:

```text
useAuth()
```

may expose:

```text
user
profile
role
loading
isAuthenticated
signIn()
signUp()
signOut()
```

Do not duplicate authentication logic across dashboards.

---

## 12. Protected Routes

Create reusable protection for authenticated/role-specific routes.

Conceptually:

```text
requireAuth()
requireRole("admin")
requireRole("trainer")
requireRole("student")
```

The exact implementation must follow the application's framework.

Important:

> Route protection is not the security boundary. RLS/server-side authorization is.

---

## 13. Role-Based Redirects

After authentication, route according to the actual database role.

Conceptually:

```text
admin   → /admin
trainer → /trainer
student → /student
```

Pending/rejected/suspended Trainers must be handled appropriately.

Do not redirect based on demo identity.

---

## 14. Remove Mock Identity Carefully

Identify and progressively replace:

- mock user IDs
- demo role selectors
- hardcoded users
- localStorage auth state
- fake session state

Do not leave two competing authentication sources.

After this work:

```text
Supabase Auth
      +
profiles
```

must be the source of truth.

---

## 15. Error Handling

Handle:

- invalid credentials
- duplicate email
- invalid signup
- missing profile
- pending Trainer
- suspended/rejected user
- expired session
- network errors
- Supabase errors

Do not expose raw database errors unnecessarily.

Do not expose secrets.

---

## 16. Profile Loading

After authentication:

```text
auth.users.id
      ↓
profiles.id
      ↓
profile
```

If a profile is unexpectedly missing:

- do not create a random fallback
- do not assign a default role
- do not use a demo profile

Surface a controlled configuration/data error.

---

## 17. Security

Never trust browser-supplied:

```text
role
user_id
classroom_id
```

The authenticated Supabase session is the identity source.

RLS determines what the user can actually access.

---

## 18. Testing

### Admin

- Existing Admin can sign in.
- Admin profile loads.
- Admin role resolves correctly.
- Admin reaches `/admin`.
- Refresh preserves session.
- Sign out works.

### Trainer

- Trainer can sign up.
- New Trainer is pending.
- Pending Trainer cannot access active Trainer functionality.
- Approved Trainer can authenticate.

### Student

- Student can authenticate.
- Student role resolves correctly.
- Student is not automatically enrolled.

### Security

- Browser state cannot turn Trainer into Admin.
- Browser state cannot turn Student into Trainer.
- Demo identity is no longer authoritative.

---

## 19. API/Data Layer Compatibility

Authentication establishes the foundation for the reusable Admin/Trainer/Student data layer:

```text
Supabase Client
      ↓
Auth Layer
      ↓
Reusable API/Data Layer
      ↓
Dashboard UI
```

Do not build one-off authentication calls inside pages.

---

## 20. Definition of Done

Authentication is complete when:

- real Supabase Auth works
- session persistence works
- sign in/out works
- profile loading works
- roles come from the database
- protected routes work
- Trainer approval state is respected
- demo identity is no longer authoritative
- no secrets are exposed
- no tables/data were created or seeded by Codex
- the implementation is reusable by Admin, Trainer, and Student dashboards

---

## Final Instruction

**Do not create tables.**

**Do not seed data.**

**Do not create users.**

**Do not run database reset/migration commands.**

If the existing database cannot support a required behavior, report the exact schema requirement and let the developer change the database manually.
