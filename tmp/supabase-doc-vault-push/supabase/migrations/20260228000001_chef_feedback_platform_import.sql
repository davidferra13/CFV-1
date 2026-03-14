-- ============================================================================
-- ChefFlow V1 - Extend chef_feedback for Platform Review Import
-- Migration: 20260228000001_chef_feedback_platform_import.sql
-- Description:
--   1. Adds nullable reviewer_name column to chef_feedback
--   2. Expands the source CHECK constraint to cover all major review platforms
-- Additive only: no DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.
-- Existing rows are fully unaffected.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add reviewer_name column
-- NULL for verbal/email entries where reviewer is a known ChefFlow client.
-- Populated for platform imports where reviewer is an external person.
-- ============================================================================
ALTER TABLE chef_feedback
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
COMMENT ON COLUMN chef_feedback.reviewer_name IS
  'Name of the external reviewer for platform-imported reviews (Airbnb, Facebook, etc.).
   NULL when client_id is set (reviewer is a known ChefFlow client).
   Populated manually for all non-ChefFlow platform sources.';
-- ============================================================================
-- STEP 2: Expand the source CHECK constraint
-- PostgreSQL auto-names an inline CHECK as <table>_<column>_check.
-- We drop the old constraint and replace with the expanded value list.
-- All original values ('verbal', 'google', 'yelp', 'email', 'social_media',
-- 'text_message', 'other') are preserved exactly.
-- ============================================================================
ALTER TABLE chef_feedback
  DROP CONSTRAINT IF EXISTS chef_feedback_source_check;
ALTER TABLE chef_feedback
  ADD CONSTRAINT chef_feedback_source_check
  CHECK (source IN (
    -- Original values (preserved)
    'verbal',
    'google',
    'yelp',
    'email',
    'social_media',
    'text_message',
    'other',
    -- New platform values
    'airbnb',
    'facebook',
    'tripadvisor',
    'thumbtack',
    'bark',
    'gigsalad',
    'taskrabbit',
    'houzz',
    'angi',
    'nextdoor',
    'instagram',
    'yelp_guest'
  ));
-- ============================================================================
-- STEP 3: Index on reviewer_name for future search/filter queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_chef_feedback_reviewer_name
  ON chef_feedback(tenant_id, reviewer_name)
  WHERE reviewer_name IS NOT NULL;
