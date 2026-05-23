-- Migration: 20260522130000_archive_digester_jobs.sql
-- Creates the archive_digester_jobs table for OpenClaw Archive Digester pipeline.

CREATE TABLE IF NOT EXISTS archive_digester_jobs (
  job_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       text NOT NULL,
  file_type       text NOT NULL DEFAULT 'unknown',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data  jsonb,
  tenant_id       uuid REFERENCES chefs(id) ON DELETE CASCADE,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archive_digester_jobs_tenant_id_idx
  ON archive_digester_jobs (tenant_id);

CREATE INDEX IF NOT EXISTS archive_digester_jobs_status_idx
  ON archive_digester_jobs (status);

COMMENT ON TABLE archive_digester_jobs IS
  'OpenClaw archive digester pipeline jobs. Each row represents one file being classified, extracted, and stored.';
