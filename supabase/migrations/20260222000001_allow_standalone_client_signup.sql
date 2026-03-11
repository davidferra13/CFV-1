-- Allow standalone client accounts not attached to a chef tenant at signup.
-- This keeps invitation/chef-linked flows working while removing mandatory tenant binding.

ALTER TABLE clients
  ALTER COLUMN tenant_id DROP NOT NULL;
COMMENT ON COLUMN clients.tenant_id IS
  'Optional at signup. NULL means standalone client account not yet attached to a chef tenant.';
