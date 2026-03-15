create table if not exists subcontract_agreements (
  id uuid primary key default gen_random_uuid(),
  hiring_chef_id uuid not null references chefs(id) on delete cascade,
  subcontractor_chef_id uuid references chefs(id),
  subcontractor_name text not null,
  subcontractor_email text,
  subcontractor_phone text,
  event_id uuid references events(id),
  role text not null default 'sous_chef' check (role in ('sous_chef', 'line_cook', 'prep_cook', 'server', 'bartender', 'pastry', 'lead_chef', 'other')),
  rate_type text not null check (rate_type in ('hourly', 'flat', 'percentage')),
  rate_cents integer not null,
  estimated_hours numeric,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'active', 'completed', 'cancelled')),
  coi_document_url text,
  coi_expiry_date date,
  coi_verified boolean default false,
  insurance_required boolean default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table subcontract_agreements enable row level security;
DROP POLICY IF EXISTS "hiring_chef_agreements" ON subcontract_agreements;
create policy "hiring_chef_agreements" on subcontract_agreements for all using (hiring_chef_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_subcontracts_chef on subcontract_agreements(hiring_chef_id, status);
CREATE INDEX IF NOT EXISTS idx_subcontracts_event on subcontract_agreements(event_id);
