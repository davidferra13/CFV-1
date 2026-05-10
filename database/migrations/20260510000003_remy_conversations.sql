-- Remy Conversations: add pinned, archived, summary, and message enhancements
-- These tables already exist from 20260322000035. This migration adds new columns.

-- Conversation columns
ALTER TABLE remy_conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE remy_conversations ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE remy_conversations ADD COLUMN IF NOT EXISTS summary TEXT;

-- Message columns
ALTER TABLE remy_messages ADD COLUMN IF NOT EXISTS quick_replies JSONB;
ALTER TABLE remy_messages ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('up', 'down'));
ALTER TABLE remy_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_remy_conversations_pinned
  ON remy_conversations(tenant_id, pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_remy_conversations_archived
  ON remy_conversations(tenant_id, archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_remy_messages_pinned
  ON remy_messages(tenant_id, pinned) WHERE pinned = true;

-- Full-text search on message content (for search feature)
CREATE INDEX IF NOT EXISTS idx_remy_messages_search
  ON remy_messages USING gin(to_tsvector('english', content));
