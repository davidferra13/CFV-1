-- Migration: Public Chef Credentials Showcase
-- Adds chef_work_history_entries table and charity/resume public fields on chefs

-- ─── New table: chef_work_history_entries ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS chef_work_history_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  organization_name text NOT NULL,
  location_label text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  summary text,
  notable_credits text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chef_work_history_entries_date_order_check
    CHECK (
      start_date IS NULL
      OR end_date IS NULL
      OR end_date >= start_date
    )
);

CREATE INDEX IF NOT EXISTS idx_chef_work_history_entries_chef_order
  ON chef_work_history_entries (chef_id, display_order, start_date DESC);

-- ─── New columns on chefs ──────────────────────────────────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS public_charity_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS public_charity_note text,
  ADD COLUMN IF NOT EXISTS show_resume_available_note boolean NOT NULL DEFAULT false;

ALTER TABLE chefs
  DROP CONSTRAINT IF EXISTS chefs_public_charity_percent_range_check;

ALTER TABLE chefs
  ADD CONSTRAINT chefs_public_charity_percent_range_check
  CHECK (
    public_charity_percent IS NULL
    OR (
      public_charity_percent >= 0
      AND public_charity_percent <= 100
    )
  );
