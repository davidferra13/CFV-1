-- Service Lifecycle Intelligence Layer
-- Three new tables for checkpoint tracking, progress state, and detection audit log.
-- All additive. No existing tables modified.

-- Checkpoint definitions (the blueprint, configurable per chef)
CREATE TABLE IF NOT EXISTS service_lifecycle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  checkpoint_key TEXT NOT NULL,
  checkpoint_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  auto_detect_rule TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  client_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, checkpoint_key)
);

CREATE INDEX idx_slt_chef_stage ON service_lifecycle_templates(chef_id, stage_number);

-- Per-inquiry/event checkpoint state (the actual progress)
CREATE TABLE IF NOT EXISTS service_lifecycle_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  stage_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'auto_detected', 'confirmed', 'skipped', 'not_applicable')),
  detected_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  evidence_type TEXT,
  evidence_source TEXT,
  evidence_excerpt TEXT,
  extracted_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_context CHECK (
    (inquiry_id IS NOT NULL AND event_id IS NULL) OR
    (inquiry_id IS NULL AND event_id IS NOT NULL) OR
    (inquiry_id IS NOT NULL AND event_id IS NOT NULL)
  ),
  UNIQUE(chef_id, inquiry_id, checkpoint_key),
  UNIQUE(chef_id, event_id, checkpoint_key)
);

CREATE INDEX idx_slp_inquiry ON service_lifecycle_progress(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_slp_event ON service_lifecycle_progress(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_slp_status ON service_lifecycle_progress(chef_id, status);

-- Detection log (append-only audit trail)
CREATE TABLE IF NOT EXISTS lifecycle_detection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  raw_content TEXT,
  detection_method TEXT NOT NULL,
  checkpoints_detected JSONB NOT NULL,
  checkpoints_missing JSONB,
  stage_assessment INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ldl_inquiry ON lifecycle_detection_log(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_ldl_created ON lifecycle_detection_log(created_at DESC);
