create table if not exists insurance_claims (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  event_id uuid references events(id),
  claim_type text not null check (claim_type in ('property_damage', 'bodily_injury', 'food_illness', 'equipment_loss', 'vehicle', 'other')),
  incident_date date not null,
  description text not null,
  amount_cents integer,
  status text not null default 'documenting' check (status in ('documenting', 'filed', 'under_review', 'approved', 'denied', 'settled')),
  policy_number text,
  adjuster_name text,
  adjuster_phone text,
  adjuster_email text,
  evidence_urls jsonb default '[]',
  witness_info text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table insurance_claims enable row level security;

create policy "chef_own_claims" on insurance_claims
  for all using (chef_id = auth.uid());

create index idx_claims_chef on insurance_claims(chef_id, status);
