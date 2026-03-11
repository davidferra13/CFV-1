-- Chef response to client reviews
-- Allows the chef to write a response that is shown back to the client.

ALTER TABLE client_reviews
  ADD COLUMN IF NOT EXISTS chef_response TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
COMMENT ON COLUMN client_reviews.chef_response IS
  'The chef''s written response to this client review.';
COMMENT ON COLUMN client_reviews.responded_at IS
  'When the chef responded to this review.';
