-- Menu share tokens for public FOH menu viewing
-- Token-gated public access to front-of-house menu pages

CREATE TABLE IF NOT EXISTS menu_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_share_tokens_token ON menu_share_tokens(token);
CREATE INDEX idx_menu_share_tokens_menu_id ON menu_share_tokens(menu_id);
