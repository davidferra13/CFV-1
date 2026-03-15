-- Foundation for storage-backed business documents.
-- Adds original-file metadata to chef_documents and provisions a private bucket.

ALTER TABLE chef_documents
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (extraction_status IN ('not_requested', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5, 2);
CREATE INDEX IF NOT EXISTS idx_chef_documents_storage_path
  ON chef_documents(storage_path)
  WHERE storage_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chef_documents_tenant_entity
  ON chef_documents(tenant_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chef_documents_tenant_hash
  ON chef_documents(tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-documents',
  'chef-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
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
  DROP POLICY IF EXISTS "chef_documents_upload_scoped" ON storage.objects;
CREATE POLICY "chef_documents_upload_scoped"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'chef-documents'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "chef_documents_read_scoped" ON storage.objects;
CREATE POLICY "chef_documents_read_scoped"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'chef-documents'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "chef_documents_delete_scoped" ON storage.objects;
CREATE POLICY "chef_documents_delete_scoped"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chef-documents'
      AND (storage.foldername(name))[1] IN (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
