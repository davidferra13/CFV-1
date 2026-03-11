-- Event document generation jobs
-- Tracks generation attempts, retries, and idempotent request reuse for event PDFs.

CREATE TABLE IF NOT EXISTS event_document_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requested_type TEXT NOT NULL CHECK (
    requested_type IN (
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
      'all',
      'pack'
    )
  ),
  selected_types TEXT[] NOT NULL DEFAULT '{}'::text[] CHECK (
    selected_types <@ ARRAY[
      'summary',
      'grocery',
      'foh',
      'prep',
      'execution',
      'checklist',
      'packing',
      'reset',
      'travel',
      'shots'
    ]::text[]
  ),
  archive_requested BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (
    status IN ('started', 'succeeded', 'failed')
  ),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  error_message TEXT,
  result_filename TEXT,
  result_document_type TEXT CHECK (
    result_document_type IS NULL
    OR result_document_type IN (
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
  result_size_bytes INTEGER CHECK (result_size_bytes IS NULL OR result_size_bytes >= 0),
  result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_doc_generation_jobs_event_created
  ON event_document_generation_jobs(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_doc_generation_jobs_tenant_status_created
  ON event_document_generation_jobs(tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_doc_generation_jobs_idempotency
  ON event_document_generation_jobs(tenant_id, event_id, requested_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_event_doc_generation_jobs_updated_at ON event_document_generation_jobs;
    CREATE TRIGGER trg_event_doc_generation_jobs_updated_at
      BEFORE UPDATE ON event_document_generation_jobs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
ALTER TABLE event_document_generation_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_document_generation_jobs_tenant_isolation ON event_document_generation_jobs;
CREATE POLICY event_document_generation_jobs_tenant_isolation
  ON event_document_generation_jobs
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
