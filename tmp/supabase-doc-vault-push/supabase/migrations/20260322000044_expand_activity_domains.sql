-- Expand chef_activity_log domain constraint to support new activity categories.
-- Adds 6 new domains: staff, scheduling, document, marketing, ai, settings.
-- Part of the full-coverage activity breadcrumbs rollout.

ALTER TABLE chef_activity_log DROP CONSTRAINT IF EXISTS chk_activity_domain;
ALTER TABLE chef_activity_log ADD CONSTRAINT chk_activity_domain
  CHECK (domain IN (
    'event', 'inquiry', 'quote', 'menu', 'recipe', 'client',
    'financial', 'communication', 'operational',
    'staff', 'scheduling', 'document', 'marketing', 'ai', 'settings'
  ));
