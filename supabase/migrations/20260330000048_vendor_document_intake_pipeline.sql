-- Vendor document intake pipeline.
-- Lets chefs upload supplier catalogs, invoices, expense backups, and vendor docs
-- into a single staged queue tied to each vendor.

CREATE TABLE IF NOT EXISTS vendor_document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL
    CHECK (document_type IN ('catalog', 'invoice', 'expense', 'supplier_doc', 'other')),
  source_filename TEXT NOT NULL,
  file_storage_path TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  file_hash TEXT,

  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'review', 'completed', 'failed')),
  parse_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_document_uploads_chef_vendor_status
  ON vendor_document_uploads (chef_id, vendor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_document_uploads_vendor_created
  ON vendor_document_uploads (vendor_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_document_uploads_dedupe_hash
  ON vendor_document_uploads (chef_id, vendor_id, file_hash)
  WHERE file_hash IS NOT NULL;

DROP TRIGGER IF EXISTS update_vendor_document_uploads_updated_at ON vendor_document_uploads;
CREATE TRIGGER update_vendor_document_uploads_updated_at
  BEFORE UPDATE ON vendor_document_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vendor_document_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_document_uploads_chef_all ON vendor_document_uploads;
CREATE POLICY vendor_document_uploads_chef_all ON vendor_document_uploads
  FOR ALL USING (
    chef_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS vendor_document_uploads_service_all ON vendor_document_uploads;
CREATE POLICY vendor_document_uploads_service_all ON vendor_document_uploads
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE vendor_document_uploads IS
  'Tracks uploaded vendor files and their staged processing status.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-documents',
  'vendor-documents',
  false,
  52428800,
  ARRAY[
    'text/csv',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_upload ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_upload ON storage.objects;
  CREATE POLICY vendor_documents_chef_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'vendor-documents'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_read ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_read ON storage.objects;
  CREATE POLICY vendor_documents_chef_read ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'vendor-documents'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_delete ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS vendor_documents_chef_delete ON storage.objects;
  CREATE POLICY vendor_documents_chef_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'vendor-documents'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
