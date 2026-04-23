-- Dinner Circle Menu Polling
-- Extends the existing hub poll system so Dinner Circles can run canonical,
-- course-based menu polling directly against real dish_index entries while
-- preserving vote history and final lock state.

-- ---------------------------------------------------------------------------
-- hub_polls: menu-aware poll metadata
-- ---------------------------------------------------------------------------

ALTER TABLE hub_polls
  ADD COLUMN IF NOT EXISTS poll_scope TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_revision_id UUID REFERENCES menu_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_number INTEGER,
  ADD COLUMN IF NOT EXISTS course_name TEXT,
  ADD COLUMN IF NOT EXISTS allow_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_selections INTEGER,
  ADD COLUMN IF NOT EXISTS locked_option_id UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by_profile_id UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT;

DO $$ BEGIN
  ALTER TABLE hub_polls DROP CONSTRAINT IF EXISTS hub_polls_poll_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE hub_polls
  ADD CONSTRAINT hub_polls_poll_type_check
  CHECK (poll_type = ANY (ARRAY['single_choice'::text, 'multi_choice'::text, 'ranked_choice'::text]));

DO $$ BEGIN
  ALTER TABLE hub_polls
    ADD CONSTRAINT hub_polls_poll_scope_check
    CHECK (poll_scope = ANY (ARRAY['general'::text, 'menu_course'::text]));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE hub_polls
    ADD CONSTRAINT hub_polls_max_selections_check
    CHECK (max_selections IS NULL OR max_selections > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE hub_polls
    ADD CONSTRAINT hub_polls_course_number_check
    CHECK (course_number IS NULL OR course_number > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE hub_polls
    ADD CONSTRAINT hub_polls_locked_option_id_fkey
    FOREIGN KEY (locked_option_id) REFERENCES hub_poll_options(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hub_polls_event_scope
  ON hub_polls(event_id, poll_scope, created_at DESC)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hub_polls_source_revision
  ON hub_polls(source_revision_id)
  WHERE source_revision_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hub_polls_source_menu
  ON hub_polls(source_menu_id)
  WHERE source_menu_id IS NOT NULL;

COMMENT ON COLUMN hub_polls.poll_scope IS
  'general = existing freeform Dinner Circle polls; menu_course = canonical course-based menu polling.';
COMMENT ON COLUMN hub_polls.source_menu_id IS
  'The event menu draft/final menu that this poll iteration will eventually materialize into.';
COMMENT ON COLUMN hub_polls.source_revision_id IS
  'The menu_revisions snapshot representing the menu option set shown for this Dinner Circle iteration.';
COMMENT ON COLUMN hub_polls.locked_option_id IS
  'Final selected option for this course poll, used to materialize the event menu without manual translation.';

-- ---------------------------------------------------------------------------
-- hub_poll_options: canonical dish linkage
-- ---------------------------------------------------------------------------

ALTER TABLE hub_poll_options
  ADD COLUMN IF NOT EXISTS option_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS dish_index_id UUID REFERENCES dish_index(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE hub_poll_options DROP CONSTRAINT IF EXISTS hub_poll_options_option_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE hub_poll_options
  ADD CONSTRAINT hub_poll_options_option_type_check
  CHECK (option_type = ANY (ARRAY['standard'::text, 'opt_out'::text]));

CREATE INDEX IF NOT EXISTS idx_hub_poll_options_dish_index
  ON hub_poll_options(dish_index_id)
  WHERE dish_index_id IS NOT NULL;

COMMENT ON COLUMN hub_poll_options.dish_index_id IS
  'Canonical dish_index entry backing a menu poll option.';
COMMENT ON COLUMN hub_poll_options.option_type IS
  'standard = canonical dish option, opt_out = explicit guest opt-out response.';

-- ---------------------------------------------------------------------------
-- hub_poll_votes: append-only history-friendly ballots
-- ---------------------------------------------------------------------------

ALTER TABLE hub_poll_votes
  ADD COLUMN IF NOT EXISTS ballot_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS rank INTEGER,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE hub_poll_votes
    ADD CONSTRAINT hub_poll_votes_rank_check
    CHECK (rank IS NULL OR rank > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_hub_poll_votes_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_poll_votes_unique_active
  ON hub_poll_votes(poll_id, profile_id, option_id)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_poll_votes_unique_rank_active
  ON hub_poll_votes(poll_id, profile_id, rank)
  WHERE revoked_at IS NULL AND rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hub_poll_votes_active_poll
  ON hub_poll_votes(poll_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hub_poll_votes_history_profile
  ON hub_poll_votes(poll_id, profile_id, created_at DESC);

COMMENT ON COLUMN hub_poll_votes.ballot_id IS
  'Groups the active or historical selections that were submitted together as one ballot revision.';
COMMENT ON COLUMN hub_poll_votes.rank IS
  'Rank position for ranked_choice polls. NULL for single_choice and multi_choice ballots.';
COMMENT ON COLUMN hub_poll_votes.revoked_at IS
  'When set, this vote is historical only and no longer counts toward the live Dinner Circle result.';
