-- Instant Note Refinement Layer
-- Adds note threads, route adapters, context bindings, seasonality windows,
-- digest items, watchdog events, and learning rule lifecycle controls.
-- ADDITIVE ONLY. No DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.

ALTER TABLE chef_quick_notes
  ADD COLUMN IF NOT EXISTS thread_id UUID,
  ADD COLUMN IF NOT EXISTS command_source TEXT;

ALTER TABLE chef_note_learning_rules
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retired_reason TEXT;

CREATE TABLE IF NOT EXISTS chef_note_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'merged', 'archived')),
  latest_quick_note_id UUID REFERENCES chef_quick_notes(id) ON DELETE SET NULL,
  note_count INTEGER NOT NULL DEFAULT 1 CHECK (note_count >= 1),
  first_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_into_thread_id UUID REFERENCES chef_note_threads(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, thread_key)
);

DO $$ BEGIN
  ALTER TABLE chef_quick_notes
    ADD CONSTRAINT chef_quick_notes_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES chef_note_threads(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_chef_note_threads_chef_recent
  ON chef_note_threads(chef_id, last_captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_quick_notes_thread
  ON chef_quick_notes(thread_id) WHERE thread_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chef_note_context_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  binding_type TEXT NOT NULL
    CHECK (binding_type IN ('client', 'event', 'ingredient', 'inventory', 'calendar', 'route', 'thread')),
  target_table TEXT,
  target_id UUID,
  label TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'confirmed', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_context_bindings_note
  ON chef_note_context_bindings(quick_note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_context_bindings_chef
  ON chef_note_context_bindings(chef_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS chef_note_route_adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  adapter_key TEXT NOT NULL,
  target_layer TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'routed', 'needs_review', 'failed')),
  adapter_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_route_adapters_note
  ON chef_note_route_adapters(quick_note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_route_adapters_chef
  ON chef_note_route_adapters(chef_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS chef_note_seasonality_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  ingredient_name TEXT,
  window_label TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  urgency_reason TEXT,
  source TEXT NOT NULL DEFAULT 'note_inference',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reviewed', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_seasonality_windows_due
  ON chef_note_seasonality_windows(chef_id, start_date, end_date, status);

CREATE TABLE IF NOT EXISTS chef_note_digest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_kind TEXT NOT NULL
    CHECK (item_kind IN ('captured', 'routed', 'review_needed', 'urgent_window', 'failed', 'watchdog')),
  title TEXT NOT NULL,
  detail TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'seen', 'dismissed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_digest_items_chef_date
  ON chef_note_digest_items(chef_id, digest_date DESC, status);

CREATE TABLE IF NOT EXISTS chef_note_watchdog_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  action_id UUID REFERENCES chef_note_actions(id) ON DELETE SET NULL,
  watchdog_type TEXT NOT NULL
    CHECK (watchdog_type IN ('missing_action', 'stale_review', 'stale_processing', 'failed_route', 'stale_followup')),
  title TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_watchdog_events_chef
  ON chef_note_watchdog_events(chef_id, status, severity, created_at DESC);

ALTER TABLE chef_note_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_context_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_route_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_seasonality_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_digest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_watchdog_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY chef_note_threads_chef_all ON chef_note_threads
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_context_bindings_chef_all ON chef_note_context_bindings
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_route_adapters_chef_all ON chef_note_route_adapters
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_seasonality_windows_chef_all ON chef_note_seasonality_windows
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_digest_items_chef_all ON chef_note_digest_items
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_watchdog_events_chef_all ON chef_note_watchdog_events
    FOR ALL USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
