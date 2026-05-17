-- Waiting Age Configs + Owner Language Rules
-- Lifecycle #17: Waiting Age And Owner Language System

create table if not exists waiting_age_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lifecycle_stage text not null,
  bracket text not null check (bracket in ('fresh', 'normal', 'aging', 'stale', 'critical')),
  min_days integer not null default 0,
  max_days integer,
  label text not null default '',
  color text not null default '',
  icon text,
  escalation_action text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_waiting_age_tenant_stage_bracket
  on waiting_age_configs (tenant_id, lifecycle_stage, bracket);

create index if not exists idx_waiting_age_tenant
  on waiting_age_configs (tenant_id);

create table if not exists owner_language_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lifecycle_stage text not null,
  age_bracket text not null check (age_bracket in ('fresh', 'normal', 'aging', 'stale', 'critical')),
  owner_type text not null check (owner_type in ('chef', 'client', 'vendor', 'system')),
  message_template text not null default '',
  tone text not null check (tone in ('neutral', 'urgent', 'friendly', 'formal')) default 'neutral',
  created_at timestamptz not null default now()
);

create index if not exists idx_owner_lang_tenant_stage
  on owner_language_rules (tenant_id, lifecycle_stage);

create index if not exists idx_owner_lang_tenant
  on owner_language_rules (tenant_id);
