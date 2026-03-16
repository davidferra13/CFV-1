-- Commerce Engine: Order-Ahead Tables
-- Enables chefs to offer pre-order items (meal kits, prepared meals, baked goods)
-- Three tables: items catalog, orders, order line items
-- All tenant-scoped via chef_id

-- Order-ahead item catalog
create table if not exists order_ahead_items (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  category text,
  image_url text,
  max_quantity_per_order integer,
  available_from date,
  available_until date,
  lead_time_days integer not null default 1,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders placed by clients
create table if not exists order_ahead_orders (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  requested_date date not null,
  total_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Line items per order
create table if not exists order_ahead_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_ahead_orders(id) on delete cascade,
  item_id uuid not null references order_ahead_items(id) on delete restrict,
  item_name text not null,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_order_ahead_items_chef on order_ahead_items(chef_id);
create index if not exists idx_order_ahead_items_status on order_ahead_items(chef_id, status);
create index if not exists idx_order_ahead_orders_chef on order_ahead_orders(chef_id);
create index if not exists idx_order_ahead_orders_status on order_ahead_orders(chef_id, status);
create index if not exists idx_order_ahead_orders_date on order_ahead_orders(chef_id, requested_date);
create index if not exists idx_order_ahead_order_items_order on order_ahead_order_items(order_id);

-- RLS
alter table order_ahead_items enable row level security;
alter table order_ahead_orders enable row level security;
alter table order_ahead_order_items enable row level security;

create policy "Chefs manage their own order-ahead items"
  on order_ahead_items for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

create policy "Chefs manage their own orders"
  on order_ahead_orders for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

create policy "Order items visible via order ownership"
  on order_ahead_order_items for all
  using (
    exists (
      select 1 from order_ahead_orders o
      where o.id = order_ahead_order_items.order_id
      and o.chef_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from order_ahead_orders o
      where o.id = order_ahead_order_items.order_id
      and o.chef_id = auth.uid()
    )
  );

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger order_ahead_items_updated_at
  before update on order_ahead_items
  for each row execute function update_updated_at_column();

create trigger order_ahead_orders_updated_at
  before update on order_ahead_orders
  for each row execute function update_updated_at_column();
