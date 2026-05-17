CREATE TABLE IF NOT EXISTS visual_qa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  screenshot_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  violations JSONB DEFAULT '[]',
  score INTEGER,
  viewport TEXT NOT NULL DEFAULT 'desktop',
  theme TEXT NOT NULL DEFAULT 'light',
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  checked_by TEXT
);

CREATE TABLE IF NOT EXISTS screenshot_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  baseline_path TEXT NOT NULL,
  current_path TEXT NOT NULL,
  diff_path TEXT,
  pixel_diff_percent REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
