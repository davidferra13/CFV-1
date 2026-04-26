-- Add split_share_token to events for public group split sharing
ALTER TABLE events ADD COLUMN IF NOT EXISTS split_share_token text UNIQUE;
