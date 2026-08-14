-- ============================================================
-- Migration 007 — Append-only Audit Log
-- ePawatech — Stage 2
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  reason      TEXT,
  before_data JSONB,
  after_data  JSONB,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

COMMENT ON TABLE audit_logs IS
  'Append-only record of security-sensitive and administrative actions. '
  'UPDATE and DELETE are revoked from client roles in this migration and no RLS '
  'read policy is created in 008_rls.sql.';

-- Do not rely on RLS alone for audit-log immutability. These revocations also
-- prevent a client role from changing rows if a future policy is misconfigured.
REVOKE UPDATE, DELETE ON TABLE audit_logs FROM anon, authenticated;
