-- UTM Source Attribution + Response Template Enhancements
-- Migration: 20260303000021
-- Purpose: UTM tracking on inquiries + merge tag support on existing response templates

-- ─── UTM Source Attribution on Inquiries ──────────────────────────────────────

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
-- Index for channel performance analytics
CREATE INDEX IF NOT EXISTS idx_inquiries_utm_source ON inquiries(utm_source) WHERE utm_source IS NOT NULL;
-- ─── Enhance existing response_templates with merge tag tracking ──────────────

ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS merge_tags TEXT[] NOT NULL DEFAULT '{}';
