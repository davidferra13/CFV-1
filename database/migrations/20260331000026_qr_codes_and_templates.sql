-- QR Code Digital Menu + Event/Order Templates
-- Additive migration: creates new tables only, no modifications to existing schema.

-- ─── QR Codes ──────────────────────────────────────────────────────────

create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  label text not null,
  target_url text not null,
  short_code text not null unique,
  qr_image_url text,
  scan_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_qr_codes_tenant on qr_codes(tenant_id);
create index idx_qr_codes_short_code on qr_codes(short_code);
alter table qr_codes enable row level security;
create policy "Chefs manage own QR codes"
  on qr_codes for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());
-- Scan tracking table
create table if not exists qr_scans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  qr_code_id uuid not null references qr_codes(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  user_agent text
);
create index idx_qr_scans_qr_code on qr_scans(qr_code_id);
create index idx_qr_scans_tenant on qr_scans(tenant_id);
create index idx_qr_scans_scanned_at on qr_scans(scanned_at);
alter table qr_scans enable row level security;
create policy "Chefs view own QR scans"
  on qr_scans for select
  using (tenant_id = auth.uid());
-- Public insert policy for scan tracking (no auth required)
create policy "Anyone can record a scan"
  on qr_scans for insert
  with check (true);
-- ─── Entity Templates ──────────────────────────────────────────────────

create table if not exists entity_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  template_type text not null,
  template_data jsonb not null default '{}',
  description text,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_entity_templates_tenant on entity_templates(tenant_id);
create index idx_entity_templates_type on entity_templates(tenant_id, template_type);
alter table entity_templates enable row level security;
create policy "Chefs manage own templates"
  on entity_templates for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());
-- Constraint: template_type must be one of the allowed values
alter table entity_templates
  add constraint entity_templates_type_check
  check (template_type in ('event', 'bakery_order', 'wholesale_order', 'meal_plan', 'production_batch'));
