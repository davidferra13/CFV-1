-- Migration: Add inquiry auto-responder template to chef_automation_settings
-- Additive only. Chef writes their own first-response template that pre-fills
-- the message compose box when viewing a new inquiry.

ALTER TABLE chef_automation_settings
  ADD COLUMN IF NOT EXISTS inquiry_auto_response_template TEXT,
  ADD COLUMN IF NOT EXISTS auto_response_template_enabled  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN chef_automation_settings.inquiry_auto_response_template IS
  'Chef-written template that pre-fills the reply box on new inquiries. AI policy: draft only, chef must send.';
COMMENT ON COLUMN chef_automation_settings.auto_response_template_enabled IS
  'When true, the auto-response template appears pre-filled when composing a reply to a new inquiry.';
