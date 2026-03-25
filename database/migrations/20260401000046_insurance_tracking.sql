create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  policy_type text not null check (policy_type in ('general_liability', 'product_liability', 'professional_liability', 'workers_comp', 'commercial_auto', 'property', 'umbrella', 'other')),
  provider text not null,
  policy_number text,
  coverage_amount_cents integer,
  premium_cents integer,
  start_date date not null,
  end_date date not null,
  auto_renew boolean default false,
  document_url text,
  notes text,
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table insurance_policies enable row level security;

DROP POLICY IF EXISTS "chef_own_insurance" ON insurance_policies;
create policy "chef_own_insurance" on insurance_policies for all using (chef_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_insurance_chef on insurance_policies(chef_id, end_date);
