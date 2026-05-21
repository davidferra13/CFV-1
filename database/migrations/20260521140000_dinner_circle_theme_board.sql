-- Dinner Circle Theme Board
-- Visual experience board: mood, colors, decor ideas, playlist, atmosphere.
-- One board per circle. Chef sees summary by default; full view requires elevated visibility.

CREATE TABLE IF NOT EXISTS public.dinner_circle_theme_boards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id            UUID NOT NULL UNIQUE REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  mood_description     TEXT,
  color_palette        JSONB DEFAULT '[]'::jsonb,
  -- format: [{"name": "Sage", "hex": "#87A878"}, ...]
  decor_ideas          JSONB DEFAULT '[]'::jsonb,
  -- format: [{"title": "...", "notes": "...", "image_url": "...", "submitted_by": uuid, "submitted_at": iso}]
  playlist_notes       TEXT,
  playlist_url         TEXT,
  atmosphere_notes     TEXT,
  menu_aesthetic_notes TEXT,               -- menu-adjacent aesthetic only; no pricing impact
  chef_visibility      TEXT NOT NULL DEFAULT 'summary'
                         CHECK (chef_visibility IN ('full', 'summary', 'none')),
  last_chef_review_at  TIMESTAMPTZ,
  contributions        JSONB DEFAULT '[]'::jsonb,
  -- format: [{"submitted_by": uuid, "role": "host"|"member", "content_type": "decor"|"playlist"|"mood", "content": "...", "submitted_at": iso}]
  tenant_id            UUID NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dctb_tenant
  ON public.dinner_circle_theme_boards(tenant_id);

COMMENT ON TABLE public.dinner_circle_theme_boards IS
  'Visual theme and experience board for Dinner Circle events. One board per circle. Chef sees logistics summary only by default.';
