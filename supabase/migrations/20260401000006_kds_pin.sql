-- Add KDS PIN to chefs table for public kitchen display access
-- PIN is a simple 4-6 digit code that kitchen staff enter on the monitor
-- to view the KDS without needing a full login.

ALTER TABLE chefs ADD COLUMN IF NOT EXISTS kds_pin TEXT;

COMMENT ON COLUMN chefs.kds_pin IS 'Optional 4-6 digit PIN for unauthenticated KDS monitor access at /kds/[tenantId]';
