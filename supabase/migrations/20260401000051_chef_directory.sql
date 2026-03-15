create table if not exists chef_directory_listings (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  business_name text not null,
  tagline text,
  cuisines text[] default '{}',
  dietary_specialties text[] default '{}',
  service_types text[] default '{}',
  city text,
  state text,
  zip_code text,
  service_radius_miles integer,
  min_price_cents integer,
  max_price_cents integer,
  profile_photo_url text,
  portfolio_urls text[] default '{}',
  website_url text,
  is_published boolean default false,
  featured boolean default false,
  rating_avg numeric,
  review_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chef_directory_listings enable row level security;

DROP POLICY IF EXISTS "chef_own_listing" ON chef_directory_listings;
create policy "chef_own_listing" on chef_directory_listings
  for all using (chef_id = auth.uid());

DROP POLICY IF EXISTS "public_read_published" ON chef_directory_listings;
create policy "public_read_published" on chef_directory_listings
  for select using (is_published = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_chef
  on chef_directory_listings(chef_id);

CREATE INDEX IF NOT EXISTS idx_directory_location
  on chef_directory_listings(state, city)
  where is_published = true;

CREATE INDEX IF NOT EXISTS idx_directory_cuisines
  on chef_directory_listings using gin(cuisines)
  where is_published = true;
