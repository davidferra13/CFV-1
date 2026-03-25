-- Structured Allergy Records
-- Upgrades allergy tracking from flat string[] to structured records with
-- severity classification, source provenance, AI detection lineage,
-- and chef confirmation workflow.
--
-- The existing clients.allergies string[] is preserved for backwards
-- compatibility with document generators. This table is the new source
-- of truth; the flat array is kept in sync via application logic.
--
-- New table: client_allergy_records

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_allergy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- What the allergen is
  allergen TEXT NOT NULL,

  -- Severity: how bad is exposure?
  -- preference = dislike/avoid if possible (not dangerous)
  -- intolerance = causes discomfort (bloating, headache, etc.)
  -- allergy = immune response, must avoid
  -- anaphylaxis = life-threatening, absolute hard block
  severity TEXT NOT NULL DEFAULT 'allergy'
    CHECK (severity IN ('preference', 'intolerance', 'allergy', 'anaphylaxis')),

  -- Where this record came from
  source TEXT NOT NULL DEFAULT 'chef_entered'
    CHECK (source IN ('chef_entered', 'ai_detected', 'intake_form', 'client_stated')),

  -- Chef confirmation workflow
  -- AI-detected records start as unconfirmed; chef must review and confirm
  confirmed_by_chef BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,

  -- Free-form notes (e.g., "mild intolerance, small amounts OK")
  notes TEXT,

  -- Lineage: which message triggered AI detection (if any)
  detected_in_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE client_allergy_records IS
  'Structured per-allergen records for clients. Severity-classified, source-tracked, '
  'and confirmation-gated. AI-detected records require chef confirmation before '
  'they influence planning and document generation.';

COMMENT ON COLUMN client_allergy_records.severity IS
  'preference=dislike only; intolerance=GI discomfort; allergy=immune response; '
  'anaphylaxis=life-threatening (hard block in documents)';

COMMENT ON COLUMN client_allergy_records.confirmed_by_chef IS
  'false = AI suggestion or unreviewed; true = chef explicitly confirmed this record';

-- ─── Indexes ────────────────────────────────────────────────────────────────

-- Most common query: all allergy records for a client
CREATE INDEX IF NOT EXISTS idx_allergy_records_client
  ON client_allergy_records(client_id, severity);

-- Chef admin: all unconfirmed records across tenant
CREATE INDEX IF NOT EXISTS idx_allergy_records_unconfirmed
  ON client_allergy_records(tenant_id, confirmed_by_chef)
  WHERE confirmed_by_chef = false;

-- Safety query: anaphylaxis records that need urgent attention
CREATE INDEX IF NOT EXISTS idx_allergy_records_critical
  ON client_allergy_records(tenant_id, severity)
  WHERE severity = 'anaphylaxis';

-- ─── Unique constraint ───────────────────────────────────────────────────────

-- One record per allergen per client (case-insensitive deduplication handled
-- at application layer via LOWER() before insert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_allergy_records_unique_allergen
  ON client_allergy_records(client_id, LOWER(allergen));

-- ─── Auto-update timestamp trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_allergy_record_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS allergy_record_updated_at ON client_allergy_records;
CREATE TRIGGER allergy_record_updated_at
  BEFORE UPDATE ON client_allergy_records
  FOR EACH ROW EXECUTE FUNCTION update_allergy_record_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE client_allergy_records ENABLE ROW LEVEL SECURITY;

-- Chef can read/write all records for their tenant
DO $$ BEGIN
  DROP POLICY IF EXISTS allergy_records_chef_all ON client_allergy_records;
  CREATE POLICY allergy_records_chef_all ON client_allergy_records
    FOR ALL USING (
      get_current_user_role() = 'chef' AND
      tenant_id = get_current_tenant_id()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grants (service role bypass RLS automatically)
GRANT SELECT, INSERT, UPDATE ON client_allergy_records TO authenticated;
