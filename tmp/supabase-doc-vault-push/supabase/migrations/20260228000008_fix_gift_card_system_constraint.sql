-- =====================================================================================
-- FIX: Gift Card Creator Constraint — system role case
-- =====================================================================================
-- Migration: 20260228000008_fix_gift_card_system_constraint.sql
-- Description: Adds the updated chk_client_incentives_creator_role_shape constraint
--              that includes the 'system' enum value case.
--
-- Deferred from 20260228000002 because PostgreSQL (SQLSTATE 55P04) does not allow
-- a newly-added enum value to be used in the same transaction that added it.
-- Now that 'system' is committed, this constraint runs safely in a fresh transaction.
--
-- Dependencies: 20260228000002_fix_gift_card_creator_constraints.sql
-- =====================================================================================

ALTER TABLE client_incentives
  DROP CONSTRAINT IF EXISTS chk_client_incentives_creator_role_shape;
ALTER TABLE client_incentives
  ADD CONSTRAINT chk_client_incentives_creator_role_shape CHECK (
    (
      created_by_role = 'chef'
      AND created_by_client_id IS NULL
    )
    OR
    (
      created_by_role = 'client'
      AND created_by_client_id IS NOT NULL
    )
    OR
    (
      created_by_role = 'system'
      AND created_by_user_id IS NULL
      AND created_by_client_id IS NULL
    )
  );
