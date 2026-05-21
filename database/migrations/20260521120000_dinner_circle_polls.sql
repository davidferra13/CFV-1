-- Dinner Circle Polls and Votes
-- Lightweight collaborative decision prompts for theme, playlist, arrival, etc.

CREATE TABLE IF NOT EXISTS public.dinner_circle_polls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id            UUID NOT NULL REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  question             TEXT NOT NULL,
  options              JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- options format: [{"label": "Rustic", "description": "earthy, candles"}, ...]
  poll_type            TEXT NOT NULL DEFAULT 'general',
  -- 'theme', 'playlist', 'arrival_window', 'bring_list', 'celebration', 'add_on', 'general'
  close_at             TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,          -- actual close time
  created_by           UUID NOT NULL,        -- profile_id
  result_visibility    TEXT NOT NULL DEFAULT 'after_close'
                         CHECK (result_visibility IN ('public', 'after_close', 'host_only')),
  allow_vote_change    BOOLEAN NOT NULL DEFAULT TRUE,
  max_votes_per_member INTEGER NOT NULL DEFAULT 1,
  is_closed            BOOLEAN NOT NULL DEFAULT FALSE,
  final_choice         INTEGER,              -- option index of final decision (nullable)
  final_choice_note    TEXT,
  requires_chef_review BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id            UUID NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dinner_circle_poll_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID NOT NULL REFERENCES public.dinner_circle_polls(id) ON DELETE CASCADE,
  circle_id    UUID NOT NULL,               -- denormalized for tenant scoping
  voter_id     UUID NOT NULL,               -- profile_id
  option_index INTEGER NOT NULL,
  tenant_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_dcp_circle_id
  ON public.dinner_circle_polls(circle_id);

CREATE INDEX IF NOT EXISTS idx_dcp_tenant_created
  ON public.dinner_circle_polls(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dcp_is_closed
  ON public.dinner_circle_polls(circle_id, is_closed);

CREATE INDEX IF NOT EXISTS idx_dcpv_poll_id
  ON public.dinner_circle_poll_votes(poll_id);

CREATE INDEX IF NOT EXISTS idx_dcpv_voter_id
  ON public.dinner_circle_poll_votes(voter_id);

CREATE INDEX IF NOT EXISTS idx_dcpv_circle_tenant
  ON public.dinner_circle_poll_votes(circle_id, tenant_id);

COMMENT ON TABLE public.dinner_circle_polls IS
  'Collaborative decision polls in Dinner Circles. Outcomes feed theme board / bring lists only after chef/host approval.';

COMMENT ON TABLE public.dinner_circle_poll_votes IS
  'Individual votes cast by circle participants. One vote per member per poll by default.';
