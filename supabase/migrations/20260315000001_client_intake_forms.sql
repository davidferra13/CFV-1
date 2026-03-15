-- Client Intake/Assessment Forms
-- Allows chefs to create customizable intake forms and send them to clients via shareable links.
-- Clients submit responses without needing an account. Chefs can then merge responses into client profiles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Form templates (chef-created)
CREATE TABLE IF NOT EXISTS client_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_forms_tenant ON client_intake_forms(tenant_id);

-- Client responses to intake forms
CREATE TABLE IF NOT EXISTS client_intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES client_intake_forms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  responses JSONB NOT NULL DEFAULT '{}',
  applied_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  share_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);

CREATE INDEX IF NOT EXISTS idx_intake_responses_tenant ON client_intake_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_form ON client_intake_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_client ON client_intake_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_token ON client_intake_responses(share_token);

-- Share links for sending forms to clients (pre-populated with client info)
CREATE TABLE IF NOT EXISTS client_intake_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES client_intake_forms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_email TEXT,
  client_name TEXT,
  share_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  response_id UUID REFERENCES client_intake_responses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_intake_shares_token ON client_intake_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_intake_shares_tenant ON client_intake_shares(tenant_id);

-- RLS policies
ALTER TABLE client_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_intake_shares ENABLE ROW LEVEL SECURITY;

-- Chef can manage their own forms
DO $$ BEGIN
CREATE POLICY intake_forms_chef_all ON client_intake_forms
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Chef can manage their own responses
DO $$ BEGIN
CREATE POLICY intake_responses_chef_all ON client_intake_responses
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public can INSERT responses (via share token validation in server action)
DO $$ BEGIN
CREATE POLICY intake_responses_public_insert ON client_intake_responses
  FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Chef can manage their own shares
DO $$ BEGIN
CREATE POLICY intake_shares_chef_all ON client_intake_shares
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public can read shares by token (for loading the form)
DO $$ BEGIN
CREATE POLICY intake_shares_public_select ON client_intake_shares
  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public can read forms (needed to render the form on the public page)
DO $$ BEGIN
CREATE POLICY intake_forms_public_select ON client_intake_forms
  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE client_intake_forms IS 'Chef-created intake/assessment form templates with customizable fields.';
COMMENT ON TABLE client_intake_responses IS 'Client submissions to intake forms. Can be linked to a client record and merged into their profile.';
COMMENT ON TABLE client_intake_shares IS 'Shareable links for sending intake forms to clients. Contains pre-populated client info and expiration.';
