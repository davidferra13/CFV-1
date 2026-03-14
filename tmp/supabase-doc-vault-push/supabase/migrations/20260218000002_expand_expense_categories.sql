-- ============================================================================
-- Expand expense_category enum
-- Adds 10 new values for non-food business overhead expenses
-- ============================================================================

ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'vehicle';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'venue_rental';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'subscriptions';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'labor';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'insurance_licenses';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'professional_services';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'uniforms';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'utilities';
