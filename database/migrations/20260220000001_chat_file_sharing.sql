-- Chat File Sharing Enhancement
-- Adds 'file' message type to support document sharing (PDF, DOCX, XLSX, CSV, TXT)
-- alongside the existing image sharing capability.
--
-- Changes:
--   1. Add 'file' value to chat_message_type enum (additive, safe)
--   2. Update update_conversation_last_message() trigger to handle 'file' preview

-- ─── 1. Extend enum ────────────────────────────────────────────────────────

ALTER TYPE chat_message_type ADD VALUE IF NOT EXISTS 'file';
COMMENT ON TYPE chat_message_type IS 'Content types for chat messages: text, image, file, link, event_ref, system';
-- ─── 2. Update trigger function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
  preview TEXT;
BEGIN
  -- Build preview text based on message type
  CASE NEW.message_type
    WHEN 'text' THEN
      preview := LEFT(NEW.body, 100);
    WHEN 'image' THEN
      preview := COALESCE(LEFT(NEW.body, 80), '') ||
        CASE WHEN NEW.body IS NOT NULL AND LENGTH(NEW.body) > 0
          THEN ' [Photo]'
          ELSE '[Photo]'
        END;
    WHEN 'file' THEN
      preview := COALESCE(LEFT(NEW.body, 80), '') ||
        CASE WHEN NEW.body IS NOT NULL AND LENGTH(NEW.body) > 0
          THEN ' [File]'
          ELSE '[File: ' || COALESCE(LEFT(NEW.attachment_filename, 40), 'Document') || ']'
        END;
    WHEN 'link' THEN
      preview := COALESCE(LEFT(NEW.body, 80), NEW.link_url);
    WHEN 'event_ref' THEN
      preview := COALESCE(LEFT(NEW.body, 80), '[Event shared]');
    WHEN 'system' THEN
      preview := LEFT(NEW.body, 100);
    ELSE
      preview := LEFT(COALESCE(NEW.body, ''), 100);
  END CASE;

  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = preview,
    last_message_sender_id = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION update_conversation_last_message IS 'Denormalizes last message info onto conversations table for efficient inbox queries';
