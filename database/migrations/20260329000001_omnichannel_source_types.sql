-- Add new communication source types for omni-channel inquiry capture
-- Phase 0: expand the communication_source enum with all planned channels
-- This is additive only — no drops, no renames, no destructive changes.

ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'yhangry';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'phone';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'theknot';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'thumbtack';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'bark';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'cozymeal';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'google_business';
ALTER TYPE communication_source ADD VALUE IF NOT EXISTS 'gigsalad';
