CREATE TABLE IF NOT EXISTS magic_gate_evaluations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, route TEXT NOT NULL, scores JSONB DEFAULT '[]', overall_score INTEGER DEFAULT 0, passed BOOLEAN DEFAULT FALSE, evaluated_by TEXT, evaluated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
CREATE INDEX idx_magic_gate_route ON magic_gate_evaluations(tenant_id, route, evaluated_at DESC);
CREATE TABLE IF NOT EXISTS magic_gate_thresholds (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, dimension TEXT NOT NULL, min_score INTEGER NOT NULL DEFAULT 70, weight REAL NOT NULL DEFAULT 1.0, active BOOLEAN DEFAULT TRUE);
CREATE UNIQUE INDEX idx_magic_threshold_dim ON magic_gate_thresholds(tenant_id, dimension);
