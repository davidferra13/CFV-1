-- Remy Draft Boundary: enforce chef approval before AI-drafted lifecycle transitions execute.
-- Core principle: Remy suggests, chef decides.

-- 1. Drafted transitions table
CREATE TABLE IF NOT EXISTS remy_drafted_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL,
  from_state varchar(50) NOT NULL,
  to_state varchar(50) NOT NULL,
  reason text NOT NULL DEFAULT '',
  remy_confidence decimal(3,2) NOT NULL DEFAULT 0.00,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_remy_drafted_transitions_chef_status
  ON remy_drafted_transitions (chef_id, draft_status);

CREATE INDEX IF NOT EXISTS idx_remy_drafted_transitions_event
  ON remy_drafted_transitions (event_id);

CREATE INDEX IF NOT EXISTS idx_remy_drafted_transitions_expires
  ON remy_drafted_transitions (expires_at)
  WHERE draft_status = 'pending';

-- 2. Draft boundary config table (per-chef, per-transition overrides)
CREATE TABLE IF NOT EXISTS draft_boundary_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL,
  transition_from varchar(50) NOT NULL,
  transition_to varchar(50) NOT NULL,
  requires_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, transition_from, transition_to)
);

CREATE INDEX IF NOT EXISTS idx_draft_boundary_config_chef
  ON draft_boundary_config (chef_id);
