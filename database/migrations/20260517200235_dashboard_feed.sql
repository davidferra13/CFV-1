-- Dashboard lifecycle feed tables

CREATE TABLE IF NOT EXISTS lifecycle_feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('stage-change', 'action-completed', 'action-required', 'alert', 'milestone', 'comment')),
  title text NOT NULL,
  description text,
  actor_id uuid,
  actor_name text,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lfi_tenant_created ON lifecycle_feed_items (tenant_id, created_at DESC);
CREATE INDEX idx_lfi_tenant_read ON lifecycle_feed_items (tenant_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_lfi_tenant_type ON lifecycle_feed_items (tenant_id, item_type);
CREATE INDEX idx_lfi_event ON lifecycle_feed_items (event_id) WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lifecycle_feed_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  item_types text[] NOT NULL DEFAULT '{}',
  event_ids uuid[] NOT NULL DEFAULT '{}',
  date_range jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lff_tenant ON lifecycle_feed_filters (tenant_id);
