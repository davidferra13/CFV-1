-- SOPs (Standard Operating Procedures) and training completion tracking

create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  title text not null,
  category text not null check (category in (
    'food_safety', 'opening_closing', 'recipes', 'equipment',
    'customer_service', 'cleaning', 'emergency', 'general'
  )),
  content text not null,
  version integer not null default 1,
  required_for_roles text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_sops_tenant on sops(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sops_category on sops(tenant_id, category);
alter table sops enable row level security;
DROP POLICY IF EXISTS "Chefs see own sops" ON sops;
create policy "Chefs see own sops"
  on sops for select using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs insert own sops" ON sops;
create policy "Chefs insert own sops"
  on sops for insert with check (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs update own sops" ON sops;
create policy "Chefs update own sops"
  on sops for update using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs delete own sops" ON sops;
create policy "Chefs delete own sops"
  on sops for delete using (tenant_id = auth.uid());
-- SOP completions: tracks which staff completed which SOP version
create table if not exists sop_completions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  sop_id uuid not null references sops(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  version_completed integer not null,
  completed_at timestamptz not null default now(),
  notes text,
  unique (sop_id, staff_member_id, version_completed)
);
CREATE INDEX IF NOT EXISTS idx_sop_completions_tenant on sop_completions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sop_completions_staff on sop_completions(tenant_id, staff_member_id);
CREATE INDEX IF NOT EXISTS idx_sop_completions_sop on sop_completions(sop_id);
alter table sop_completions enable row level security;
DROP POLICY IF EXISTS "Chefs see own completions" ON sop_completions;
create policy "Chefs see own completions"
  on sop_completions for select using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs insert own completions" ON sop_completions;
create policy "Chefs insert own completions"
  on sop_completions for insert with check (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs update own completions" ON sop_completions;
create policy "Chefs update own completions"
  on sop_completions for update using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs delete own completions" ON sop_completions;
create policy "Chefs delete own completions"
  on sop_completions for delete using (tenant_id = auth.uid());
