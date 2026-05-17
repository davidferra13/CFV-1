CREATE TABLE IF NOT EXISTS codex_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  description TEXT,
  readiness TEXT NOT NULL DEFAULT 'needs_spec',
  spec_path TEXT,
  test_path TEXT,
  complexity TEXT NOT NULL DEFAULT 'medium',
  dependencies JSONB NOT NULL DEFAULT '[]',
  last_assessed TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_codex_tasks_area ON codex_tasks(area);

CREATE TABLE IF NOT EXISTS codex_dispatch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_description TEXT NOT NULL,
  area TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN,
  notes TEXT
);
CREATE INDEX idx_codex_dispatches_recent ON codex_dispatch_records(dispatched_at DESC);
ALTER TABLE codex_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_dispatch_records ENABLE ROW LEVEL SECURITY;
