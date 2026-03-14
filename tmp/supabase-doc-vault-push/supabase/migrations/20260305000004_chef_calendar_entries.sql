-- Migration: Chef Calendar Entries
-- Adds a comprehensive personal + business calendar entry system for chefs.
-- Supports 13 entry types (vacation, time_off, market, target_booking, etc.),
-- multi-day date ranges, revenue tracking for income-generating entries,
-- and public "seeking bookings" signals for target_booking entries.
-- All entries are private by default (is_private = true in V1).

-- Entry type enum
CREATE TYPE chef_calendar_entry_type AS ENUM (
  -- Hard blocks (blocks_bookings = true by default)
  'vacation',
  'time_off',
  'personal',
  'market',
  'festival',
  'class',
  'photo_shoot',
  'media',
  'meeting',
  'admin_block',
  'other',
  -- Soft intentions (blocks_bookings = false by default)
  'target_booking',
  'soft_preference'
);
CREATE TABLE chef_calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Classification
  entry_type chef_calendar_entry_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Date range (single-day: end_date = start_date)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,   -- NULL = all day
  end_time TIME,     -- NULL = all day

  -- Blocking behavior
  -- Defaults: true for most types, false for target_booking + soft_preference
  -- Chef can override
  blocks_bookings BOOLEAN NOT NULL DEFAULT true,

  -- Revenue tracking (meaningful for: market, festival, class, photo_shoot, media)
  is_revenue_generating BOOLEAN NOT NULL DEFAULT false,
  revenue_type TEXT CHECK (revenue_type IN ('income', 'promotional')),
  -- 'income'      = chef earns money (market booth fee, class fee, shoot fee)
  -- 'promotional' = chef is present for brand awareness, no direct pay
  expected_revenue_cents INTEGER,
  actual_revenue_cents INTEGER,
  revenue_notes TEXT,

  -- Public availability signal (meaningful for: target_booking only)
  -- When is_public = true, this date appears on the chef's public profile
  -- as "seeking bookings for this date"
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_note TEXT,  -- Optional message shown to clients (e.g., "Available Valentine's Day")

  -- Optional color override (uses type default from color system otherwise)
  color_override TEXT,

  -- Recurrence (schema-ready for future; V1 has no recurrence UI)
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,         -- iCal RRULE format for future use
  recurrence_end_date DATE,

  -- Always private in V1 (no client-visible calendar except is_public signals)
  is_private BOOLEAN NOT NULL DEFAULT true,

  -- Completion tracking (relevant for market, class, etc.)
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Validate date range
  CONSTRAINT end_after_start CHECK (end_date >= start_date),
  -- Validate time range when not all-day
  CONSTRAINT time_range_valid CHECK (
    all_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  ),
  -- Revenue fields only meaningful when is_revenue_generating = true
  CONSTRAINT revenue_type_requires_flag CHECK (
    revenue_type IS NULL OR is_revenue_generating = true
  )
);
-- Indexes
CREATE INDEX idx_cal_entries_chef_date
  ON chef_calendar_entries(chef_id, start_date, end_date);
CREATE INDEX idx_cal_entries_chef_type
  ON chef_calendar_entries(chef_id, entry_type);
CREATE INDEX idx_cal_entries_blocking
  ON chef_calendar_entries(chef_id, start_date)
  WHERE blocks_bookings = true;
CREATE INDEX idx_cal_entries_public
  ON chef_calendar_entries(chef_id, start_date)
  WHERE is_public = true;
CREATE INDEX idx_cal_entries_revenue
  ON chef_calendar_entries(chef_id)
  WHERE is_revenue_generating = true;
-- Updated_at trigger (uses project's established update_updated_at_column function)
CREATE TRIGGER set_updated_at_chef_calendar_entries
  BEFORE UPDATE ON chef_calendar_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Row Level Security
ALTER TABLE chef_calendar_entries ENABLE ROW LEVEL SECURITY;
-- Chefs fully manage their own entries
CREATE POLICY "chef owns calendar entries"
  ON chef_calendar_entries
  FOR ALL
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- Public can read entries marked is_public = true (for public chef profile)
CREATE POLICY "public can view public calendar signals"
  ON chef_calendar_entries
  FOR SELECT
  USING (is_public = true);
