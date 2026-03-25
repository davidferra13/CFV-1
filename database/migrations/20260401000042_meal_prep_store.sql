-- Online meal prep store
create table if not exists meal_prep_items (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  category text not null check (category in ('entree', 'side', 'soup', 'salad', 'snack', 'dessert', 'beverage', 'bundle')),
  dietary_tags text[] default '{}',
  ingredients_summary text,
  calories integer,
  serving_size text,
  photo_url text,
  is_available boolean default true,
  max_quantity integer, -- null = unlimited
  prep_lead_days integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table meal_prep_items enable row level security;
DROP POLICY IF EXISTS "chef_own_meal_prep_items" ON meal_prep_items;
create policy "chef_own_meal_prep_items" on meal_prep_items for all using (chef_id = auth.uid());
DROP POLICY IF EXISTS "public_read_meal_prep_items" ON meal_prep_items;
create policy "public_read_meal_prep_items" on meal_prep_items for select using (is_available = true);

create table if not exists meal_prep_orders (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  items jsonb not null, -- [{itemId, name, quantity, priceCents}]
  total_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  fulfillment_type text not null check (fulfillment_type in ('pickup', 'delivery')),
  fulfillment_date date not null,
  fulfillment_notes text,
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table meal_prep_orders enable row level security;
DROP POLICY IF EXISTS "chef_own_meal_prep_orders" ON meal_prep_orders;
create policy "chef_own_meal_prep_orders" on meal_prep_orders for all using (chef_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_meal_prep_orders_chef on meal_prep_orders(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_prep_orders_date on meal_prep_orders(fulfillment_date);

-- Ordering windows
create table if not exists meal_prep_windows (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday
  order_cutoff_time time not null, -- e.g. 18:00
  fulfillment_day_offset integer not null default 2, -- days after cutoff
  is_active boolean default true,
  created_at timestamptz not null default now()
);
alter table meal_prep_windows enable row level security;
DROP POLICY IF EXISTS "chef_own_meal_prep_windows" ON meal_prep_windows;
create policy "chef_own_meal_prep_windows" on meal_prep_windows for all using (chef_id = auth.uid());
