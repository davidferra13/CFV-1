-- Communication Log (U18)
-- Unified timeline of every interaction per client: emails, SMS, phone calls,
-- notes, feedback, orders, events, and system-generated entries.

create table if not exists communication_log (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references chefs(id) on delete cascade,
  client_id      uuid references clients(id) on delete set null,
  client_identifier text,
  channel        text not null,          -- email, sms, phone, note, system, feedback, order, event
  direction      text not null,          -- inbound, outbound, internal
  subject        text,
  content        text,
  entity_type    text,                   -- event, bakery_order, quote, invoice, feedback, reservation
  entity_id      uuid,
  metadata       jsonb,
  logged_by      text,                   -- auto or manual or user name
  created_at     timestamptz not null default now()
);
-- Indexes for efficient timeline queries
create index if not exists idx_commlog_tenant_client_created
  on communication_log (tenant_id, client_id, created_at desc);
create index if not exists idx_commlog_tenant_identifier_created
  on communication_log (tenant_id, client_identifier, created_at desc);
-- Full-text search support
create index if not exists idx_commlog_content_search
  on communication_log using gin (to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(content, '')));
-- RLS
alter table communication_log enable row level security;
create policy "Chefs see own communication_log"
  on communication_log for select
  using (tenant_id = (select id from chefs where auth_user_id = auth.uid()));
create policy "Chefs insert own communication_log"
  on communication_log for insert
  with check (tenant_id = (select id from chefs where auth_user_id = auth.uid()));
create policy "Chefs update own communication_log"
  on communication_log for update
  using (tenant_id = (select id from chefs where auth_user_id = auth.uid()));
create policy "Chefs delete own communication_log"
  on communication_log for delete
  using (tenant_id = (select id from chefs where auth_user_id = auth.uid()));
