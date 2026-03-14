-- Event Document Snapshots
-- Stores archived PDF snapshots for operational event documents.
-- Path format in storage: {tenant_id}/{event_id}/{document_type}/v####-timestamp.pdf

CREATE TABLE IF NOT EXISTS event_document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'summary',
      'grocery',
      'foh',
      'prep',
      'execution',
      'checklist',
      'packing',
      'reset',
      'travel',
      'shots',
      'all'
    )
  ),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, event_id, document_type, version_number),
  UNIQUE (tenant_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_event_doc_snapshots_event
  ON event_document_snapshots(event_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_doc_snapshots_type
  ON event_document_snapshots(tenant_id, document_type, generated_at DESC);

ALTER TABLE event_document_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_document_snapshots_tenant_isolation ON event_document_snapshots;
CREATE POLICY event_document_snapshots_tenant_isolation
  ON event_document_snapshots
  FOR ALL
  USING (
    tenant_id = (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );

-- Private bucket for archived event PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-documents',
  'event-documents',
  false,
  26214400, -- 25 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  DROP POLICY IF EXISTS event_documents_chef_upload ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY event_documents_chef_upload
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'event-documents'
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
  DROP POLICY IF EXISTS event_documents_chef_read ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY event_documents_chef_read
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'event-documents'
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
  DROP POLICY IF EXISTS event_documents_chef_delete ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY event_documents_chef_delete
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'event-documents'
      AND (storage.foldername(name))[1] = (
        SELECT entity_id::text
        FROM user_roles
        WHERE auth_user_id = auth.uid() AND role = 'chef'
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL;
END $$;
