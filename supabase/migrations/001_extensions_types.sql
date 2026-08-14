-- ============================================================
-- Migration 001 — Extensions & Custom Types
-- ePawatech — Stage 2
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── User / Profile Types ───────────────────────────────────
CREATE TYPE app_role AS ENUM (
  'admin',
  'trainer',
  'student'
);

CREATE TYPE profile_status AS ENUM (
  'pending',    -- trainer waiting for admin approval
  'active',     -- approved and operational
  'suspended',  -- temporarily disabled
  'rejected'    -- permanently denied
);

-- ─── Organisation Types ─────────────────────────────────────
CREATE TYPE centre_status AS ENUM (
  'active',
  'archived'
);

CREATE TYPE cohort_status AS ENUM (
  'planned',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE classroom_status AS ENUM (
  'active',
  'completed',
  'archived'
);

-- ─── Assignment / Enrollment Types ──────────────────────────
CREATE TYPE assignment_role AS ENUM (
  'lead',
  'co_teacher'
);

CREATE TYPE assignment_status AS ENUM (
  'pending',
  'active',
  'completed',
  'rejected'
);

CREATE TYPE enrollment_status AS ENUM (
  'active',
  'completed',
  'withdrawn',
  'removed'
);

-- ─── Curriculum Types ────────────────────────────────────────
CREATE TYPE activity_type AS ENUM (
  'quiz',
  'drag-label',
  'drag-classify',
  'keyboard',
  'typing-test',
  'rich-text-editor',
  'slide-editor',
  'python-runner',
  'ai-chat',
  'wokwi-embed',
  'youtube-embed',
  'html-preview',
  'scenario-question',
  'external-link'
);

CREATE TYPE curriculum_origin AS ENUM (
  'master',   -- inherited from master curriculum
  'custom'    -- trainer-added classroom-only item
);

CREATE TYPE curriculum_state AS ENUM (
  'draft',      -- not yet visible to students (future: "Make Live")
  'live',       -- visible to students
  'completed',
  'hidden'
);

-- ─── Learning Operations Types ───────────────────────────────
CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent'
);

CREATE TYPE hw_outcome AS ENUM (
  'completed',
  'partial',
  'not_attempted'
);

CREATE TYPE progress_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TYPE project_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected'
);
