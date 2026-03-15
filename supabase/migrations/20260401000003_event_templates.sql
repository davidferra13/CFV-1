-- Event Templates
-- Stores reusable event configurations that chefs can apply when creating new events.
-- Additive only: new table, no existing tables modified.

create table if not exists event_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,

  -- Template metadata
  name text not null,
  description text,
  is_default boolean not null default false,

  -- Event defaults
  occasion text,
  service_style text,
  guest_count integer,
  serve_time time,
  arrival_time time,
  departure_time time,

  -- Location defaults
  location_address text,
  location_city text,
  location_state text,
  location_zip text,
  location_notes text,
  access_instructions text,
  kitchen_notes text,
  site_notes text,

  -- Pricing defaults
  pricing_model text,
  quoted_price_cents integer,
  deposit_amount_cents integer,
  pricing_notes text,

  -- Dietary defaults
  dietary_restrictions text[] default '{}',
  allergies text[] default '{}',
  special_requests text,

  -- Tracking
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for tenant lookups
create index if not exists idx_event_templates_tenant on event_templates(tenant_id);

-- RLS
alter table event_templates enable row level security;

DROP POLICY IF EXISTS "Chefs manage own templates" ON event_templates;
create policy "Chefs manage own templates"
  on event_templates for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_event_templates_updated_at ON event_templates;
create trigger set_event_templates_updated_at
  before update on event_templates
  for each row
  execute function update_updated_at();
