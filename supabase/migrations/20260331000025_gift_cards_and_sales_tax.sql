-- Gift Cards / Store Credit and Sales Tax Tracking (U14, U15)
-- Adds standalone commerce gift card system and multi-jurisdiction sales tax tracking

-- ═══════════════════════════════════════════════════════════════════════
-- U14: Gift Cards / Store Credit
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  code text not null,
  initial_value_cents integer not null,
  current_balance_cents integer not null,
  purchaser_name text,
  purchaser_email text,
  recipient_name text,
  recipient_email text,
  message text,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at date,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_gift_cards_tenant_code on gift_cards(tenant_id, code);
create index if not exists idx_gift_cards_tenant_status on gift_cards(tenant_id, status);

alter table gift_cards enable row level security;

create policy "gift_cards_tenant_isolation" on gift_cards
  for all using (tenant_id = auth.uid());

create table if not exists gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('purchase', 'redemption', 'refund', 'adjustment')),
  amount_cents integer not null,
  balance_after_cents integer not null,
  description text,
  sale_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_gc_txn_tenant on gift_card_transactions(tenant_id);
create index if not exists idx_gc_txn_card on gift_card_transactions(gift_card_id);

alter table gift_card_transactions enable row level security;

create policy "gc_txn_tenant_isolation" on gift_card_transactions
  for all using (tenant_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════
-- U15: Sales Tax Tracking (multi-jurisdiction)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  rate_percent numeric not null,
  jurisdiction_type text not null check (jurisdiction_type in ('state', 'county', 'city', 'district')),
  is_active boolean not null default true,
  filing_frequency text not null default 'monthly' check (filing_frequency in ('monthly', 'quarterly', 'annual')),
  next_filing_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tax_jurisdictions_tenant on tax_jurisdictions(tenant_id);

alter table tax_jurisdictions enable row level security;

create policy "tax_jurisdictions_tenant_isolation" on tax_jurisdictions
  for all using (tenant_id = auth.uid());

create table if not exists tax_collected (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  sale_date date not null,
  sale_id uuid,
  taxable_amount_cents integer not null,
  tax_amount_cents integer not null,
  jurisdiction_id uuid references tax_jurisdictions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tax_collected_tenant_date on tax_collected(tenant_id, sale_date);

alter table tax_collected enable row level security;

create policy "tax_collected_tenant_isolation" on tax_collected
  for all using (tenant_id = auth.uid());

create table if not exists tax_filings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_taxable_cents integer not null,
  total_tax_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'filed', 'paid')),
  filed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tax_filings_tenant on tax_filings(tenant_id);

alter table tax_filings enable row level security;

create policy "tax_filings_tenant_isolation" on tax_filings
  for all using (tenant_id = auth.uid());
