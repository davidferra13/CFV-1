-- =====================================================================================
-- FIX: Gift Card Creator Constraints
-- =====================================================================================
-- Migration: 20260228000002_fix_gift_card_creator_constraints.sql
-- Description: Fixes two constraint violations that occur when the Stripe webhook
--              creates a gift card on behalf of a guest buyer (not a registered user).
--
-- Problem 1: created_by_user_id is NOT NULL, but guest buyers have no auth account.
-- Problem 2: CHECK constraint requires created_by_role='client' implies
--            created_by_client_id IS NOT NULL, but webhook-created cards have no
--            client_id since the buyer is anonymous.
--
-- Solution: Add 'system' to the user_role enum and allow webhook-created records
--           to use created_by_role='system' with both user/client IDs as NULL.
--           Makes created_by_user_id nullable for the system case.
--
-- Dependencies: 20260224000015_vouchers_and_gift_cards.sql
-- Date: February 28, 2026
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Add 'system' value to user_role enum
-- 'system' represents records created by automated processes (webhooks, crons)
-- rather than a human chef or client.
-- This is purely additive — no existing rows are affected.
-- =====================================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system';
-- =====================================================================================
-- STEP 2: Make created_by_user_id nullable on client_incentives
-- Previously NOT NULL, this was fine for chef- and client-created records.
-- Now that webhook (system) creates gift cards without an auth user, we must
-- allow NULL when created_by_role = 'system'.
-- =====================================================================================

ALTER TABLE client_incentives
  ALTER COLUMN created_by_user_id DROP NOT NULL;
-- =====================================================================================
-- STEP 3: Update the creator role shape check constraint
-- NOTE: Cannot reference the new 'system' enum value in the same transaction
-- that added it (PostgreSQL SQLSTATE 55P04). The constraint update is deferred
-- to migration 20260228000008_fix_gift_card_system_constraint.sql, which runs
-- in a subsequent transaction where 'system' is already committed.
-- =====================================================================================

-- Drop the old constraint so webhook-created rows aren't blocked.
-- The new constraint (with the system case) is added in the next migration.
ALTER TABLE client_incentives
  DROP CONSTRAINT IF EXISTS chk_client_incentives_creator_role_shape;
COMMENT ON COLUMN client_incentives.created_by_role IS
  'chef = created by chef in dashboard; client = created by a registered client;
   system = created by webhook or automated process (e.g. Stripe gift card purchase by guest).';
-- =====================================================================================
-- END
-- =====================================================================================;
