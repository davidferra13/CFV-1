-- Migration: Chef Opportunity Network
-- Adds structured hiring/opportunity posts to the chef social feed.
-- ADDITIVE ONLY: no DROP, DELETE, or ALTER on existing columns.
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
-- It must be the first statement, before any BEGIN block.

-- Add kitchen_manager to staff_role enum (if not already present)
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'kitchen_manager';

-- Update the post_type check constraint on chef_social_posts to include 'opportunity'
ALTER TABLE chef_social_posts DROP CONSTRAINT IF EXISTS chef_social_posts_post_type_check;
ALTER TABLE chef_social_posts ADD CONSTRAINT chef_social_posts_post_type_check
  CHECK (post_type IN ('text', 'photo', 'video', 'reel', 'poll', 'share', 'opportunity'));

-- Structured metadata for opportunity posts (one-to-one with chef_social_posts)
CREATE TABLE IF NOT EXISTS chef_opportunity_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  compensation_type TEXT NOT NULL DEFAULT 'negotiable'
    CHECK (compensation_type IN ('hourly', 'salary', 'day_rate', 'negotiable')),
  compensation_low_cents INTEGER,
  compensation_high_cents INTEGER,
  duration_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (duration_type IN ('permanent', 'seasonal', 'per_event', 'contract')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'filled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_posts_chef ON chef_opportunity_posts(chef_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_status ON chef_opportunity_posts(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_location ON chef_opportunity_posts(location_state, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_posts_post_id ON chef_opportunity_posts(post_id);

-- Interest expressions on opportunity posts
CREATE TABLE IF NOT EXISTS chef_opportunity_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES chef_opportunity_posts(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'expressed'
    CHECK (status IN ('expressed', 'viewed', 'connected', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, chef_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_interests_opp ON chef_opportunity_interests(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_chef ON chef_opportunity_interests(chef_id);
