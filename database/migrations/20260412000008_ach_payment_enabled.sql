-- Add ACH payment toggle to chefs table
-- When enabled, US bank account (ACH) is offered as a payment method at checkout.
-- Default false - chef must explicitly enable it in payment settings.

ALTER TABLE chefs ADD COLUMN IF NOT EXISTS ach_enabled boolean NOT NULL DEFAULT false;
