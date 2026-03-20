-- Client Touchpoint Rules
-- Configurable rules that surface touchpoint opportunities for the chef.
-- The chef always decides what action to take; the system only reminds.

create table if not exists client_touchpoint_rules (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  rule_type text not null check (rule_type in (
    'birthday', 'anniversary', 'days_since_last_event',
    'lifetime_spend_milestone', 'streak_milestone', 'custom'
  )),
  trigger_value text,
  action_suggestion text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_touchpoint_rules enable row level security;

DROP POLICY IF EXISTS "Chefs manage own touchpoint rules" ON client_touchpoint_rules;
create policy "Chefs manage own touchpoint rules"
  on client_touchpoint_rules for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_client_touchpoint_rules_chef
  on client_touchpoint_rules(chef_id);

-- updated_at trigger
create or replace function update_client_touchpoint_rules_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_client_touchpoint_rules_updated_at ON client_touchpoint_rules;
create trigger trg_client_touchpoint_rules_updated_at
  before update on client_touchpoint_rules
  for each row execute function update_client_touchpoint_rules_updated_at();
