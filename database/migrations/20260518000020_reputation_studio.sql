-- Reputation Studio: testimonials, social proof config, and review response columns
-- Timestamp: 20260518000020 (strictly higher than 20260518000015)

-- Add response columns to client_reviews (existing table)
ALTER TABLE client_reviews
  ADD COLUMN IF NOT EXISTS responded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_text text;

-- Chef testimonials: promoted review excerpts for social proof
CREATE TABLE IF NOT EXISTS chef_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  review_id text NOT NULL,
  excerpt text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  rating integer,
  approved boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_testimonials_chef_id ON chef_testimonials(chef_id);
CREATE INDEX IF NOT EXISTS idx_chef_testimonials_featured ON chef_testimonials(chef_id, featured) WHERE featured = true;

-- Social proof display config (one row per chef)
CREATE TABLE IF NOT EXISTS social_proof_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  max_featured integer NOT NULL DEFAULT 5,
  show_on_profile boolean NOT NULL DEFAULT true,
  show_on_portal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
