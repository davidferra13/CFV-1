-- Evidence Label Visual Treatment Tables
-- UI System #12: styling, positioning, emphasis levels for data-backed labels

CREATE TABLE IF NOT EXISTS evidence_label_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  evidence_level text NOT NULL,
  display_label text NOT NULL,
  bg_color text NOT NULL DEFAULT '#f3f4f6',
  text_color text NOT NULL DEFAULT '#111827',
  border_color text,
  icon text,
  tooltip_template text,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_level_check CHECK (
    evidence_level IN ('verified', 'calculated', 'estimated', 'user-provided', 'system-default')
  )
);

CREATE UNIQUE INDEX idx_evidence_label_configs_tenant_level
  ON evidence_label_configs (tenant_id, evidence_level);

CREATE TABLE IF NOT EXISTS evidence_label_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  route text NOT NULL,
  field_name text NOT NULL,
  evidence_level text NOT NULL,
  position text NOT NULL DEFAULT 'inline',
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT placement_level_check CHECK (
    evidence_level IN ('verified', 'calculated', 'estimated', 'user-provided', 'system-default')
  ),
  CONSTRAINT placement_position_check CHECK (
    position IN ('inline', 'badge', 'tooltip')
  )
);

CREATE UNIQUE INDEX idx_evidence_label_placements_tenant_route_field
  ON evidence_label_placements (tenant_id, route, field_name);

CREATE INDEX idx_evidence_label_placements_route
  ON evidence_label_placements (tenant_id, route);
