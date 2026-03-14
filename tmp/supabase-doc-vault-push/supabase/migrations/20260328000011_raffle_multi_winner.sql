-- =====================================================================================
-- MULTI-WINNER RAFFLE — 3 winner categories per month
-- =====================================================================================
-- Migration: 20260328000011_raffle_multi_winner.sql
-- Description: Adds top_scorer and most_dedicated winner slots + per-category prizes
--              to raffle_rounds. Fully additive — no drops, no deletes.
-- Dependencies: 20260328000009_monthly_raffle.sql
-- Date: 2026-02-27
-- =====================================================================================

-- ── Per-category prize descriptions (nullable — chef can opt in to each) ──

ALTER TABLE raffle_rounds
  ADD COLUMN IF NOT EXISTS prize_random_draw TEXT,
  ADD COLUMN IF NOT EXISTS prize_top_scorer TEXT,
  ADD COLUMN IF NOT EXISTS prize_most_dedicated TEXT;
-- ── Top Scorer winner (highest game_score — deterministic) ──

ALTER TABLE raffle_rounds
  ADD COLUMN IF NOT EXISTS top_scorer_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS top_scorer_alias TEXT,
  ADD COLUMN IF NOT EXISTS top_scorer_entry_id UUID REFERENCES raffle_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS top_scorer_score INTEGER;
-- ── Most Dedicated winner (most days played — deterministic) ──

ALTER TABLE raffle_rounds
  ADD COLUMN IF NOT EXISTS most_dedicated_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS most_dedicated_alias TEXT,
  ADD COLUMN IF NOT EXISTS most_dedicated_entry_count INTEGER;
-- ── Per-category delivery tracking ──

ALTER TABLE raffle_rounds
  ADD COLUMN IF NOT EXISTS prize_random_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prize_random_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prize_top_scorer_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prize_top_scorer_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prize_most_dedicated_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prize_most_dedicated_delivered_at TIMESTAMPTZ;
-- ── Backfill: copy prize_description into prize_random_draw for existing rounds ──

UPDATE raffle_rounds
  SET prize_random_draw = prize_description
  WHERE prize_random_draw IS NULL AND prize_description IS NOT NULL;
-- ── Comments ──

COMMENT ON COLUMN raffle_rounds.prize_random_draw IS 'Prize for random draw winner (main raffle)';
COMMENT ON COLUMN raffle_rounds.prize_top_scorer IS 'Prize for highest game score of the month. NULL = category disabled.';
COMMENT ON COLUMN raffle_rounds.prize_most_dedicated IS 'Prize for most days played. NULL = category disabled.';
COMMENT ON COLUMN raffle_rounds.top_scorer_client_id IS 'Client who achieved the highest single game score this round.';
COMMENT ON COLUMN raffle_rounds.most_dedicated_client_id IS 'Client who played on the most distinct days this round.';
