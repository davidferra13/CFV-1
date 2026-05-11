-- Regulated Batch Records + COA Intake
-- Additive foundation for cannabis batch provenance, COA evaluation, and verified dosing.

CREATE TABLE IF NOT EXISTS regulated_batch_coas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  source_lot_number TEXT NOT NULL,
  lot_number TEXT,
  batch_number TEXT,
  source_material_type TEXT NOT NULL DEFAULT 'flower',
  lab_name TEXT NOT NULL,
  lab_accreditation TEXT,
  sample_collected_at DATE,
  report_issued_at DATE NOT NULL,
  cannabinoid_panel JSONB NOT NULL DEFAULT '{}'::jsonb,
  contaminant_panels JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_status TEXT NOT NULL,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_thc NUMERIC(12,6),
  total_cbd NUMERIC(12,6),
  document_storage_path TEXT,
  document_file_name TEXT,
  document_content_type TEXT,
  document_size_bytes INTEGER,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT regulated_batch_coas_material_type_check
    CHECK (source_material_type IN ('flower', 'solvent_extract', 'solventless_extract', 'distillate', 'finished_liquid', 'other')),
  CONSTRAINT regulated_batch_coas_status_check
    CHECK (evaluation_status IN ('accepted', 'review', 'rejected')),
  CONSTRAINT regulated_batch_coas_cannabinoid_panel_object
    CHECK (jsonb_typeof(cannabinoid_panel) = 'object'),
  CONSTRAINT regulated_batch_coas_contaminant_panels_object
    CHECK (jsonb_typeof(contaminant_panels) = 'object'),
  CONSTRAINT regulated_batch_coas_red_flags_array
    CHECK (jsonb_typeof(red_flags) = 'array'),
  CONSTRAINT regulated_batch_coas_document_size_positive
    CHECK (document_size_bytes IS NULL OR document_size_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_coas_tenant_status_created
  ON regulated_batch_coas(tenant_id, evaluation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_coas_tenant_lot
  ON regulated_batch_coas(tenant_id, source_lot_number);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_coas_event
  ON regulated_batch_coas(event_id)
  WHERE event_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_regulated_batch_coas_updated_at ON regulated_batch_coas;
CREATE TRIGGER set_regulated_batch_coas_updated_at
  BEFORE UPDATE ON regulated_batch_coas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS regulated_batch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  inventory_batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  coa_id UUID NOT NULL REFERENCES regulated_batch_coas(id) ON DELETE RESTRICT,
  batch_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'infused_liquid',
  status TEXT NOT NULL,

  source_material_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'flower',
  source_lot_number TEXT NOT NULL,
  source_provider_type TEXT NOT NULL DEFAULT 'host_provided',
  source_supplier_name TEXT,
  source_received_date DATE,
  source_initial_mass_g NUMERIC(12,3) NOT NULL,
  source_storage_notes TEXT,
  chain_of_custody_note TEXT,

  decarb_efficiency NUMERIC(6,5) NOT NULL DEFAULT 0.9,
  extraction_efficiency NUMERIC(6,5) NOT NULL DEFAULT 0.8,
  transfer_efficiency NUMERIC(6,5) NOT NULL DEFAULT 0.95,
  retention_efficiency NUMERIC(6,5) NOT NULL DEFAULT 1,
  final_volume_ml NUMERIC(12,3) NOT NULL,
  target_dose_mg NUMERIC(12,3),
  label_claim_mg_per_ml NUMERIC(12,6),

  total_thc NUMERIC(12,6),
  potential_thc_mg NUMERIC(14,6),
  estimated_finished_thc_mg NUMERIC(14,6),
  estimated_mg_per_ml NUMERIC(14,6),
  target_dose_volume_ml NUMERIC(14,6),
  release_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  coa_red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,

  finalization_locked BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT regulated_batch_records_tenant_batch_code_unique UNIQUE (tenant_id, batch_code),
  CONSTRAINT regulated_batch_records_status_check
    CHECK (status IN ('ready_for_confirmation', 'review', 'rejected', 'released', 'finalized')),
  CONSTRAINT regulated_batch_records_product_type_check
    CHECK (product_type IN ('infused_liquid', 'infused_oil', 'infused_butter', 'extract', 'finished_food', 'other')),
  CONSTRAINT regulated_batch_records_source_type_check
    CHECK (source_type IN ('flower', 'solvent_extract', 'solventless_extract', 'distillate', 'finished_liquid', 'other')),
  CONSTRAINT regulated_batch_records_provider_type_check
    CHECK (source_provider_type IN ('host_provided', 'supplier', 'chef_inventory', 'other')),
  CONSTRAINT regulated_batch_records_source_mass_positive
    CHECK (source_initial_mass_g > 0),
  CONSTRAINT regulated_batch_records_final_volume_positive
    CHECK (final_volume_ml > 0),
  CONSTRAINT regulated_batch_records_target_dose_nonnegative
    CHECK (target_dose_mg IS NULL OR target_dose_mg >= 0),
  CONSTRAINT regulated_batch_records_label_claim_nonnegative
    CHECK (label_claim_mg_per_ml IS NULL OR label_claim_mg_per_ml >= 0),
  CONSTRAINT regulated_batch_records_efficiency_ranges
    CHECK (
      decarb_efficiency >= 0 AND decarb_efficiency <= 1
      AND extraction_efficiency >= 0 AND extraction_efficiency <= 1
      AND transfer_efficiency >= 0 AND transfer_efficiency <= 1
      AND retention_efficiency >= 0 AND retention_efficiency <= 1
    ),
  CONSTRAINT regulated_batch_records_release_checks_array
    CHECK (jsonb_typeof(release_checks) = 'array'),
  CONSTRAINT regulated_batch_records_coa_red_flags_array
    CHECK (jsonb_typeof(coa_red_flags) = 'array'),
  CONSTRAINT regulated_batch_records_finalization_fields
    CHECK (
      finalization_locked = false
      OR (finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_records_tenant_status_created
  ON regulated_batch_records(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_records_tenant_event
  ON regulated_batch_records(tenant_id, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_regulated_batch_records_tenant_lot
  ON regulated_batch_records(tenant_id, source_lot_number);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_records_coa
  ON regulated_batch_records(coa_id);

DROP TRIGGER IF EXISTS set_regulated_batch_records_updated_at ON regulated_batch_records;
CREATE TRIGGER set_regulated_batch_records_updated_at
  BEFORE UPDATE ON regulated_batch_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS regulated_batch_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  batch_record_id UUID NOT NULL REFERENCES regulated_batch_records(id) ON DELETE CASCADE,
  correction_note TEXT NOT NULL,
  evidence_storage_path TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulated_batch_corrections_batch_created
  ON regulated_batch_corrections(batch_record_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_regulated_batch_correction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'regulated_batch_corrections are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_regulated_batch_correction_mutation_trigger ON regulated_batch_corrections;
CREATE TRIGGER prevent_regulated_batch_correction_mutation_trigger
  BEFORE UPDATE OR DELETE ON regulated_batch_corrections
  FOR EACH ROW EXECUTE FUNCTION prevent_regulated_batch_correction_mutation();

ALTER TABLE event_cannabis_course_config
  ADD COLUMN IF NOT EXISTS regulated_batch_record_id UUID REFERENCES regulated_batch_records(id) ON DELETE SET NULL;

ALTER TABLE event_cannabis_course_config
  ADD COLUMN IF NOT EXISTS dose_volume_ml_per_guest NUMERIC(14,6);

ALTER TABLE event_cannabis_course_config
  DROP CONSTRAINT IF EXISTS event_cannabis_course_config_dose_volume_nonnegative;

ALTER TABLE event_cannabis_course_config
  ADD CONSTRAINT event_cannabis_course_config_dose_volume_nonnegative
  CHECK (dose_volume_ml_per_guest IS NULL OR dose_volume_ml_per_guest >= 0);

CREATE INDEX IF NOT EXISTS idx_event_cannabis_course_config_batch
  ON event_cannabis_course_config(regulated_batch_record_id)
  WHERE regulated_batch_record_id IS NOT NULL;

ALTER TABLE regulated_batch_coas ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulated_batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulated_batch_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regulated_batch_coas_chef_all ON regulated_batch_coas;
CREATE POLICY regulated_batch_coas_chef_all
  ON regulated_batch_coas FOR ALL
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS regulated_batch_records_chef_all ON regulated_batch_records;
CREATE POLICY regulated_batch_records_chef_all
  ON regulated_batch_records FOR ALL
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS regulated_batch_corrections_chef_all ON regulated_batch_corrections;
CREATE POLICY regulated_batch_corrections_chef_all
  ON regulated_batch_corrections FOR ALL
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'regulated-coa-documents',
  'regulated-coa-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  DROP POLICY IF EXISTS regulated_coa_storage_chef_insert ON storage.objects;
  CREATE POLICY regulated_coa_storage_chef_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'regulated-coa-documents'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS regulated_coa_storage_chef_select ON storage.objects;
  CREATE POLICY regulated_coa_storage_chef_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'regulated-coa-documents'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS regulated_coa_storage_chef_delete ON storage.objects;
  CREATE POLICY regulated_coa_storage_chef_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'regulated-coa-documents'
    AND get_current_user_role() = 'chef'
    AND split_part(name, '/', 1) = get_current_tenant_id()::text
  );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
