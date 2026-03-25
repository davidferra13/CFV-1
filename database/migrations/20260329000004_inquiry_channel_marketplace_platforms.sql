-- Add marketplace platform channels to inquiry_channel enum
-- Phase 1: Email parsers for Thumbtack, The Knot, Bark, Cozymeal, GigSalad, Google Business
-- These parsers create inquiries with these channel values via Gmail sync.
-- Additive only — no drops, no renames.

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'thumbtack';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'theknot';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'bark';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'cozymeal';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'google_business';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'gigsalad';
