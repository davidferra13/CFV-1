-- Migration: 20260523100000_remy_skill_proposals.sql
-- Creates the remy_skill_proposals table for Remy Codex skill proposal handoff.
-- Tracks routine patterns that qualify for promotion to reusable skills.

CREATE TABLE IF NOT EXISTS remy_skill_proposals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id      uuid NOT NULL REFERENCES remy_routines(id) ON DELETE CASCADE,
  skill_template  jsonb NOT NULL,
  usage_count     integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  tenant_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS remy_skill_proposals_tenant_id_idx
  ON remy_skill_proposals (tenant_id);

CREATE INDEX IF NOT EXISTS remy_skill_proposals_routine_id_idx
  ON remy_skill_proposals (routine_id);

CREATE INDEX IF NOT EXISTS remy_skill_proposals_status_idx
  ON remy_skill_proposals (status);

COMMENT ON TABLE remy_skill_proposals IS
  'Remy skill proposals: routine patterns used 5+ times that qualify for promotion to reusable skills. Chef reviews and approves or rejects.';
