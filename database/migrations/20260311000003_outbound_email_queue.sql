-- Outbound email queue foundation
-- Allows email drafts to be attached directly to an inbox thread and keep
-- the intended recipient even before the thread is linked to an inquiry/client.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_thread
  ON public.messages(tenant_id, conversation_thread_id)
  WHERE conversation_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_outbound_drafts
  ON public.messages(tenant_id, status, channel, direction, created_at DESC)
  WHERE direction = 'outbound' AND channel = 'email' AND status = 'draft';

COMMENT ON COLUMN public.messages.conversation_thread_id IS
  'Optional link to a communication inbox thread for outbound email drafts and sends.';

COMMENT ON COLUMN public.messages.recipient_email IS
  'Resolved recipient email used for outbound email drafts, even when no client record is linked yet.';
