-- Fun Q&A answers for clients
-- Completely optional, personality-driven questions displayed in the client portal.
-- Stored as JSONB keyed by stable question identifiers (e.g. "theme_song", "ideal_evening").
-- The chef can read answers from the client detail page to personalise follow-ups.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS fun_qa_answers JSONB DEFAULT '{}';
COMMENT ON COLUMN clients.fun_qa_answers IS
  'Optional fun Q&A answers submitted by the client. Keyed by stable question identifiers. Used by the chef to personalise communication and encourage rebookings.';
