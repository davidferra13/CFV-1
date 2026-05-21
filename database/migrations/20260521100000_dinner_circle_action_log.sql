-- Dinner Circle Action Log
-- Tracks all participant actions for undo/recovery and change history.
-- Append-only: rows are never updated. Reversal creates a new row.

CREATE TABLE IF NOT EXISTS public.dinner_circle_action_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id      UUID NOT NULL REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  action_type    TEXT NOT NULL,
  -- e.g. 'edit_post', 'delete_post', 'claim_bring_item', 'unclaim_bring_item',
  --      'change_rsvp', 'cancel_broadcast', 'retract_poll_vote', 'revise_theme'
  actor_id       UUID NOT NULL,
  actor_role     TEXT NOT NULL CHECK (actor_role IN ('owner', 'host', 'co_host', 'member', 'chef', 'admin')),
  entity_id      UUID,          -- FK to the affected row (nullable, generic)
  entity_type    TEXT,          -- 'post', 'bring_item', 'poll', 'rsvp', 'broadcast', 'theme_board'
  before_state   JSONB,
  after_state    JSONB,
  reversible     BOOLEAN NOT NULL DEFAULT TRUE,
  reversed_at    TIMESTAMPTZ,
  reversed_by    UUID,
  reversal_log_id UUID,         -- FK to the action_log row that reversed this one
  notes          TEXT,
  tenant_id      UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcal_circle_id
  ON public.dinner_circle_action_log(circle_id);

CREATE INDEX IF NOT EXISTS idx_dcal_actor_id
  ON public.dinner_circle_action_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_dcal_entity
  ON public.dinner_circle_action_log(entity_id, entity_type)
  WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcal_tenant_created
  ON public.dinner_circle_action_log(tenant_id, created_at DESC);

COMMENT ON TABLE public.dinner_circle_action_log IS
  'Append-only audit log of participant actions in a Dinner Circle for recovery, undo, and history display.';
