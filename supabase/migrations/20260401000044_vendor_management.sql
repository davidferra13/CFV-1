-- Supplier/vendor management
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  category text not null check (category in ('grocery', 'specialty', 'farmers_market', 'wholesale', 'equipment', 'rental', 'other')),
  contact_name text,
  phone text,
  email text,
  website text,
  address text,
  notes text,
  is_preferred boolean default false,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table vendors enable row level security;
create policy "chef_own_vendors" on vendors for all using (chef_id = auth.uid());
create index idx_vendors_chef on vendors(chef_id, category);

-- Vendor price history (track prices over time)
create table if not exists vendor_price_entries (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  item_name text not null,
  price_cents integer not null,
  unit text not null, -- 'lb', 'oz', 'each', 'case', etc.
  recorded_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table vendor_price_entries enable row level security;
create policy "chef_own_vendor_prices" on vendor_price_entries for all using (chef_id = auth.uid());
create index idx_vendor_prices_item on vendor_price_entries(chef_id, item_name, recorded_at desc);
create index idx_vendor_prices_vendor on vendor_price_entries(vendor_id, recorded_at desc);
