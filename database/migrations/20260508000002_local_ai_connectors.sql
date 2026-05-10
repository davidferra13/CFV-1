-- local_ai_connectors: per-device ChefFlow connector keys for BYOA (Bring Your Own Ollama)
-- The connector is a small local app the user runs on their machine.
-- It authenticates outbound to ChefFlow, pulls AI jobs, sends to local Ollama, returns results.
-- Ollama itself is NEVER exposed to the internet.

CREATE TABLE IF NOT EXISTS public.local_ai_connectors (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  device_name        TEXT        NOT NULL CHECK (char_length(device_name) BETWEEN 1 AND 100),
  key_hash           TEXT        NOT NULL UNIQUE,
  key_prefix         TEXT        NOT NULL,           -- first 20 chars of raw key, for UI display
  default_model      TEXT        NOT NULL DEFAULT 'gemma4',
  -- Optional: advanced users who run Ollama behind a secured proxy can set this.
  -- Stored for the connector to read; NEVER used server-side.
  ollama_base_url    TEXT        NOT NULL DEFAULT 'http://localhost:11434',
  ollama_auth_token  TEXT,                          -- only for proxy-auth; null = no auth
  last_seen_at       TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  status             TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_ai_connectors_user_id   ON public.local_ai_connectors (user_id);
CREATE INDEX IF NOT EXISTS idx_local_ai_connectors_key_hash  ON public.local_ai_connectors (key_hash);
CREATE INDEX IF NOT EXISTS idx_local_ai_connectors_status    ON public.local_ai_connectors (user_id, status);

-- RLS: chefs can only see/manage their own connectors
ALTER TABLE public.local_ai_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY local_ai_connectors_select ON public.local_ai_connectors
  FOR SELECT TO public
  USING (user_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY local_ai_connectors_insert ON public.local_ai_connectors
  FOR INSERT TO public
  WITH CHECK (user_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY local_ai_connectors_update ON public.local_ai_connectors
  FOR UPDATE TO public
  USING (user_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- Reminder: do NOT add a DELETE policy. Revoke via status='revoked'. Never hard-delete connector records.
