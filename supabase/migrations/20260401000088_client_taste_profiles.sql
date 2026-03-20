-- Client Taste Profiles
-- Tracks per-client flavor preferences, ingredient likes/dislikes,
-- spice tolerance, texture preferences, and special occasion notes.
-- Chef-entered data only (Formula > AI rule).

create table if not exists client_taste_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  tenant_id uuid not null references chefs(id) on delete cascade,
  favorite_cuisines text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  spice_tolerance integer not null default 3 check (spice_tolerance between 1 and 5),
  texture_preferences text[] not null default '{}',
  flavor_notes text,
  preferred_proteins text[] not null default '{}',
  avoids text[] not null default '{}',
  special_occasions_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, tenant_id)
);

-- Indexes
create index if not exists idx_taste_profiles_tenant on client_taste_profiles(tenant_id);
create index if not exists idx_taste_profiles_client on client_taste_profiles(client_id);

-- RLS
alter table client_taste_profiles enable row level security;

create policy "Chefs manage their own client taste profiles"
  on client_taste_profiles for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

-- Updated_at trigger (reuse existing function from prior migrations)
create trigger client_taste_profiles_updated_at
  before update on client_taste_profiles
  for each row execute function update_updated_at_column();
