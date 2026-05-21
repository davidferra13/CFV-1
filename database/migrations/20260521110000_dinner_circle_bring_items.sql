-- Dinner Circle Bring Items
-- Collaborative things-to-bring list per circle.
-- Members create items; attendees claim/unclaim and mark brought.

CREATE TABLE IF NOT EXISTS public.dinner_circle_bring_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID NOT NULL REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  item_name     TEXT NOT NULL,
  item_notes    TEXT,
  image_url     TEXT,
  required      BOOLEAN NOT NULL DEFAULT FALSE,
  quantity      TEXT,
  category      TEXT,                        -- e.g. 'drinks', 'snacks', 'supplies', 'other'
  created_by    UUID NOT NULL,               -- profile_id of creator
  claimed_by    UUID,                        -- profile_id of claimant (nullable = unclaimed)
  claimed_at    TIMESTAMPTZ,
  brought_at    TIMESTAMPTZ,
  reminder_at   TIMESTAMPTZ,
  is_fulfilled  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  tenant_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcbi_circle_id
  ON public.dinner_circle_bring_items(circle_id);

CREATE INDEX IF NOT EXISTS idx_dcbi_claimed_by
  ON public.dinner_circle_bring_items(claimed_by)
  WHERE claimed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcbi_tenant
  ON public.dinner_circle_bring_items(tenant_id);

COMMENT ON TABLE public.dinner_circle_bring_items IS
  'Collaborative things-to-bring list for Dinner Circle events. Members create items; participants claim and mark brought.';
