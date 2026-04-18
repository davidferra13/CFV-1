-- Add opt-in local AI columns to ai_preferences
-- Allows users to route Remy chat to their own Ollama instance

ALTER TABLE ai_preferences
  ADD COLUMN local_ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN local_ai_url text NOT NULL DEFAULT 'http://localhost:11434',
  ADD COLUMN local_ai_model text NOT NULL DEFAULT 'gemma4',
  ADD COLUMN local_ai_verified_at timestamptz;
