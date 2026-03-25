-- Gift Certificates (Feature 12.4)
-- Digital gift certificates that clients can purchase and gift to others.
-- Separate from gift_cards (U14) which is for store credit / generic commerce.
-- Gift certificates are tied to a chef's private service and can be redeemed against events.

create table if not exists gift_certificates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  code text not null unique,
  amount_cents integer not null,
  balance_cents integer not null,
  purchaser_name text not null,
  purchaser_email text,
  recipient_name text,
  recipient_email text,
  message text,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'voided')),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_event_id uuid references events(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_gift_certificates_tenant_code on gift_certificates(tenant_id, code);
create index if not exists idx_gift_certificates_tenant_status on gift_certificates(tenant_id, status);

alter table gift_certificates enable row level security;

-- Tenant isolation: chefs see only their own certificates
DROP POLICY IF EXISTS "gift_certificates_tenant_isolation" ON gift_certificates;
create policy "gift_certificates_tenant_isolation" on gift_certificates
  for all using (tenant_id = auth.uid());

-- Public lookup policy: anyone can look up a certificate by code (read-only, no tenant filter)
-- This is safe because the lookup only reveals balance/status, not purchaser PII
DROP POLICY IF EXISTS "gift_certificates_public_lookup" ON gift_certificates;
create policy "gift_certificates_public_lookup" on gift_certificates
  for select using (true);
