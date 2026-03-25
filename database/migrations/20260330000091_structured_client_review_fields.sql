-- Structured client review fields
-- Adds category ratings and a rebooking intent signal to post-event reviews.

ALTER TABLE client_reviews
  ADD COLUMN IF NOT EXISTS food_quality_rating INTEGER CHECK (food_quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS presentation_rating INTEGER CHECK (presentation_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS cleanup_rating INTEGER CHECK (cleanup_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS would_book_again BOOLEAN;
COMMENT ON COLUMN client_reviews.food_quality_rating IS
  'Client rating for food quality on a 1-5 scale.';
COMMENT ON COLUMN client_reviews.presentation_rating IS
  'Client rating for food presentation on a 1-5 scale.';
COMMENT ON COLUMN client_reviews.communication_rating IS
  'Client rating for communication on a 1-5 scale.';
COMMENT ON COLUMN client_reviews.punctuality_rating IS
  'Client rating for punctuality on a 1-5 scale.';
COMMENT ON COLUMN client_reviews.cleanup_rating IS
  'Client rating for cleanup on a 1-5 scale.';
COMMENT ON COLUMN client_reviews.would_book_again IS
  'Whether the client said they would book this chef again.';
