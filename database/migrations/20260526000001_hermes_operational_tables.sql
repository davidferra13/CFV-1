-- Hermes operational tables for PIE autonomous operation
-- These tables enable communication between ChefFlow and Hermes via PostgreSQL

-- Heartbeat: Hermes writes every 60s, ChefFlow reads to detect liveness
CREATE TABLE IF NOT EXISTS hermes_heartbeats (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'alive',
  queue_depth INTEGER DEFAULT 0,
  current_skill TEXT,
  last_action TEXT,
  error_count INTEGER DEFAULT 0
);

CREATE INDEX idx_hermes_heartbeats_timestamp ON hermes_heartbeats (timestamp DESC);

-- Actions log: both Hermes and fallback write here for unified audit trail
CREATE TABLE IF NOT EXISTS hermes_actions (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skill TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hermes',
  action TEXT NOT NULL,
  reason TEXT,
  items_affected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  result TEXT DEFAULT 'success'
);

CREATE INDEX idx_hermes_actions_timestamp ON hermes_actions (timestamp DESC);
CREATE INDEX idx_hermes_actions_skill ON hermes_actions (skill);

-- Event queue: ChefFlow writes events, Hermes polls and processes
CREATE TABLE IF NOT EXISTS hermes_queue (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_hermes_queue_pending ON hermes_queue (priority, timestamp) WHERE status = 'pending';

-- Feedback: chef price corrections that inform Hermes learning
CREATE TABLE IF NOT EXISTS hermes_feedback (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingredient_id TEXT NOT NULL,
  resolved_price NUMERIC,
  actual_price NUMERIC,
  source TEXT,
  region TEXT,
  notes TEXT
);

CREATE INDEX idx_hermes_feedback_ingredient ON hermes_feedback (ingredient_id);
