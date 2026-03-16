-- Meal Prep: Container Tracking + Delivery Scheduling
-- Containers: track reusable containers sent to clients and their return status
-- Deliveries: schedule meal prep deliveries with time windows
-- All tenant-scoped via chef_id

-- Container inventory and tracking
create table if not exists meal_prep_containers (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text,
  container_type text not null default 'other' check (container_type in ('glass', 'plastic', 'metal', 'ceramic', 'insulated', 'other')),
  label text not null,
  sent_date date,
  returned_date date,
  status text not null default 'returned' check (status in ('with_client', 'returned', 'lost', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Delivery scheduling
create table if not exists meal_prep_deliveries (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  client_name text not null,
  delivery_date date not null,
  window_start time,
  window_end time,
  address text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_transit', 'delivered', 'cancelled', 'missed')),
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_meal_prep_containers_chef on meal_prep_containers(chef_id);
create index if not exists idx_meal_prep_containers_status on meal_prep_containers(chef_id, status);
create index if not exists idx_meal_prep_containers_client on meal_prep_containers(client_id);
create index if not exists idx_meal_prep_deliveries_chef on meal_prep_deliveries(chef_id);
create index if not exists idx_meal_prep_deliveries_date on meal_prep_deliveries(chef_id, delivery_date);
create index if not exists idx_meal_prep_deliveries_status on meal_prep_deliveries(chef_id, status);

-- RLS
alter table meal_prep_containers enable row level security;
alter table meal_prep_deliveries enable row level security;

create policy "Chefs manage their own containers"
  on meal_prep_containers for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

create policy "Chefs manage their own deliveries"
  on meal_prep_deliveries for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

-- Updated_at triggers
create trigger meal_prep_containers_updated_at
  before update on meal_prep_containers
  for each row execute function update_updated_at_column();

create trigger meal_prep_deliveries_updated_at
  before update on meal_prep_deliveries
  for each row execute function update_updated_at_column();
