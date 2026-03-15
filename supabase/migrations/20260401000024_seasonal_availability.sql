-- Seasonal Availability Management
-- For chefs who travel between locations (Hamptons summer, Aspen winter, etc.)
-- Tracks location-based availability periods across the year.

create table if not exists chef_seasonal_availability (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  season_name text not null,
  location text not null,
  start_date date not null,
  end_date date not null,
  is_available boolean default true,
  travel_radius_miles int,
  notes text,
  is_recurring boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint seasonal_dates_valid check (end_date > start_date)
);

-- Index for querying a chef's seasonal periods by date range
create index if not exists idx_chef_seasonal_availability_dates
  on chef_seasonal_availability (chef_id, start_date, end_date);

-- RLS
alter table chef_seasonal_availability enable row level security;

DROP POLICY IF EXISTS "Chefs can view own seasonal availability" ON chef_seasonal_availability;
create policy "Chefs can view own seasonal availability"
  on chef_seasonal_availability for select
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

DROP POLICY IF EXISTS "Chefs can insert own seasonal availability" ON chef_seasonal_availability;
create policy "Chefs can insert own seasonal availability"
  on chef_seasonal_availability for insert
  with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

DROP POLICY IF EXISTS "Chefs can update own seasonal availability" ON chef_seasonal_availability;
create policy "Chefs can update own seasonal availability"
  on chef_seasonal_availability for update
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

DROP POLICY IF EXISTS "Chefs can delete own seasonal availability" ON chef_seasonal_availability;
create policy "Chefs can delete own seasonal availability"
  on chef_seasonal_availability for delete
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));
