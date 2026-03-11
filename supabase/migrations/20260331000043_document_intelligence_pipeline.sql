-- Persistent document-intelligence intake pipeline.
-- Stores uploaded files, classification results, routing metadata, and final record links.

CREATE TABLE IF NOT EXISTS document_intelligence_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'archive_inbox',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_intelligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES document_intelligence_jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  source_filename TEXT NOT NULL,
  file_storage_bucket TEXT NOT NULL DEFAULT 'document-intelligence',
  file_storage_path TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  file_hash TEXT,

  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'classifying', 'review', 'routing', 'completed', 'failed')),
  detected_type TEXT
    CHECK (detected_type IN ('client_info', 'recipe', 'receipt', 'document', 'menu')),
  suggested_destination TEXT
    CHECK (suggested_destination IN ('menu', 'receipt', 'client', 'recipe', 'document')),
  selected_destination TEXT
    CHECK (selected_destination IN ('menu', 'receipt', 'client', 'recipe', 'document')),
  confidence TEXT
    CHECK (confidence IN ('high', 'medium', 'low')),
  warnings JSONB NOT NULL DEFAULT '[]'::JSONB,
  extracted_text TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_message TEXT,

  routed_record_type TEXT,
  routed_record_id UUID,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_intelligence_jobs_tenant_status
  ON document_intelligence_jobs (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_intelligence_items_job_status
  ON document_intelligence_items (job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_intelligence_items_tenant_hash
  ON document_intelligence_items (tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_intelligence_items_tenant_type
  ON document_intelligence_items (tenant_id, detected_type, selected_destination, created_at DESC);

DROP TRIGGER IF EXISTS update_document_intelligence_jobs_updated_at ON document_intelligence_jobs;
CREATE TRIGGER update_document_intelligence_jobs_updated_at
  BEFORE UPDATE ON document_intelligence_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_intelligence_items_updated_at ON document_intelligence_items;
CREATE TRIGGER update_document_intelligence_items_updated_at
  BEFORE UPDATE ON document_intelligence_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE document_intelligence_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_intelligence_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_intelligence_jobs_chef_all ON document_intelligence_jobs;
CREATE POLICY document_intelligence_jobs_chef_all ON document_intelligence_jobs
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS document_intelligence_jobs_service_all ON document_intelligence_jobs;
CREATE POLICY document_intelligence_jobs_service_all ON document_intelligence_jobs
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS document_intelligence_items_chef_all ON document_intelligence_items;
CREATE POLICY document_intelligence_items_chef_all ON document_intelligence_items
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS document_intelligence_items_service_all ON document_intelligence_items;
CREATE POLICY document_intelligence_items_service_all ON document_intelligence_items
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE document_intelligence_jobs IS
  'Persistent batches of mixed document uploads waiting for classification and routing.';
COMMENT ON TABLE document_intelligence_items IS
  'Each uploaded file tracked through document intelligence classification and final workflow routing.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-intelligence',
  'document-intelligence',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "document_intelligence_upload_scoped"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'document-intelligence'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "document_intelligence_read_scoped"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'document-intelligence'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "document_intelligence_delete_scoped"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'document-intelligence'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
