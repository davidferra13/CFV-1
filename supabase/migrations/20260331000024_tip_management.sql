-- Tip Management (U13)
-- Records tips by shift/employee, configures pooling rules, generates distribution reports.

-- Tip entries: individual tip records per staff member per shift
create table if not exists tip_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  shift_date date not null,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  cash_tips_cents integer not null default 0,
  card_tips_cents integer not null default 0,
  total_tips_cents integer generated always as (cash_tips_cents + card_tips_cents) stored,
  hours_worked numeric null,
  pool_eligible boolean not null default true,
  notes text null,
  created_at timestamptz not null default now()
);

create index idx_tip_entries_tenant_date on tip_entries(tenant_id, shift_date);
create index idx_tip_entries_staff on tip_entries(tenant_id, staff_member_id);

alter table tip_entries enable row level security;

create policy "tip_entries_tenant_isolation" on tip_entries
  for all using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- Tip pool configurations: how tips get distributed
create table if not exists tip_pool_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  pool_method text not null check (pool_method in ('equal', 'hours_based', 'points_based')),
  included_roles text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tip_pool_configs_tenant on tip_pool_configs(tenant_id);

alter table tip_pool_configs enable row level security;

create policy "tip_pool_configs_tenant_isolation" on tip_pool_configs
  for all using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- Tip distributions: finalized distribution records
create table if not exists tip_distributions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  distribution_date date not null,
  pool_config_id uuid not null references tip_pool_configs(id) on delete cascade,
  total_pool_cents integer not null,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  share_cents integer not null,
  method_used text not null,
  created_at timestamptz not null default now()
);

create index idx_tip_distributions_tenant_date on tip_distributions(tenant_id, distribution_date);
create index idx_tip_distributions_staff on tip_distributions(tenant_id, staff_member_id);

alter table tip_distributions enable row level security;

create policy "tip_distributions_tenant_isolation" on tip_distributions
  for all using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());
