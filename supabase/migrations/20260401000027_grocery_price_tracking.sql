-- Grocery Price Tracking
-- Receipt-based price history for cost estimation and trend analysis

create table if not exists grocery_price_entries (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  ingredient_name text not null,
  unit text not null, -- 'lb', 'oz', 'each', 'bunch', etc.
  price_cents int not null,
  quantity numeric not null default 1,
  store_name text,
  receipt_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Fast lookups by ingredient
CREATE INDEX IF NOT EXISTS idx_grocery_price_chef_ingredient
  on grocery_price_entries (chef_id, ingredient_name);

-- Store filtering
CREATE INDEX IF NOT EXISTS idx_grocery_price_chef_store
  on grocery_price_entries (chef_id, store_name);

-- RLS
alter table grocery_price_entries enable row level security;

DROP POLICY IF EXISTS "Chefs can view own price entries" ON grocery_price_entries;
create policy "Chefs can view own price entries"
  on grocery_price_entries for select
  using (chef_id = auth.uid());

DROP POLICY IF EXISTS "Chefs can insert own price entries" ON grocery_price_entries;
create policy "Chefs can insert own price entries"
  on grocery_price_entries for insert
  with check (chef_id = auth.uid());

DROP POLICY IF EXISTS "Chefs can update own price entries" ON grocery_price_entries;
create policy "Chefs can update own price entries"
  on grocery_price_entries for update
  using (chef_id = auth.uid());

DROP POLICY IF EXISTS "Chefs can delete own price entries" ON grocery_price_entries;
create policy "Chefs can delete own price entries"
  on grocery_price_entries for delete
  using (chef_id = auth.uid());
