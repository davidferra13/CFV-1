-- Physical Inventory Stocktake tables
-- Periodic counting workflow: start stocktake, count items, reconcile variances, adjust inventory

-- Stocktake header
create table if not exists stocktakes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  stocktake_date date not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  counted_by text,
  notes text,
  total_items integer not null default 0,
  variance_items integer not null default 0,
  variance_value_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stocktake line items
create table if not exists stocktake_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  stocktake_id uuid not null references stocktakes(id) on delete cascade,
  ingredient_name text not null,
  expected_quantity numeric not null default 0,
  counted_quantity numeric,
  unit text not null,
  variance numeric,
  variance_percent numeric,
  unit_cost_cents integer,
  variance_value_cents integer,
  variance_reason text
    check (variance_reason is null or variance_reason in (
      'waste', 'theft', 'recording_error', 'spoilage', 'donation', 'unknown'
    )),
  adjusted boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_stocktakes_tenant_date
  on stocktakes(tenant_id, stocktake_date);

create index if not exists idx_stocktake_items_stocktake
  on stocktake_items(stocktake_id);

create index if not exists idx_stocktake_items_tenant
  on stocktake_items(tenant_id);

-- RLS
alter table stocktakes enable row level security;
alter table stocktake_items enable row level security;

create policy "Chefs see own stocktakes"
  on stocktakes for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create policy "Chefs see own stocktake items"
  on stocktake_items for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- Updated_at trigger for stocktakes
create or replace function update_stocktakes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_stocktakes_updated_at
  before update on stocktakes
  for each row execute function update_stocktakes_updated_at();
