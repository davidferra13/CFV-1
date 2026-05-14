-- Add first-class Dinner Circle host role for primary client/event hosts.
-- Host is intentionally distinct from chef-only operational authority.
ALTER TABLE hub_group_members DROP CONSTRAINT IF EXISTS hub_group_members_role_check;
ALTER TABLE hub_group_members ADD CONSTRAINT hub_group_members_role_check
  CHECK (role = ANY (ARRAY[
    'owner'::text,
    'admin'::text,
    'chef'::text,
    'host'::text,
    'member'::text,
    'viewer'::text,
    'delegate'::text
  ]));
