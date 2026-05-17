CREATE TABLE IF NOT EXISTS microcopy_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, key TEXT NOT NULL, category TEXT NOT NULL, text TEXT NOT NULL, context TEXT, route TEXT, tone TEXT DEFAULT 'professional', max_length INTEGER, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
CREATE UNIQUE INDEX idx_microcopy_key ON microcopy_entries(tenant_id, key);
CREATE TABLE IF NOT EXISTS microcopy_glossary (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, term TEXT NOT NULL, definition TEXT NOT NULL, preferred_usage TEXT, avoid_usage TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
CREATE UNIQUE INDEX idx_glossary_term ON microcopy_glossary(tenant_id, term);
