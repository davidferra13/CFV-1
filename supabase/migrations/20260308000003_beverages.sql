-- Beverage Management: wine, cocktail, and beverage library with menu pairing support
-- Additive migration: creates 2 new tables, no existing tables modified

-- ─── Beverages Library ──────────────────────────────────────────────────────────

create table if not exists beverages (
  id          uuid primary key default gen_random_uuid(),
  chef_id     uuid not null references chefs(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('wine', 'cocktail', 'mocktail', 'beer', 'spirit', 'non-alcoholic')),
  subtype     text,
  description text,
  cost_cents  int,
  markup_percent int default 200,
  sell_price_cents int,
  serving_size text,
  servings_per_unit int,
  pairing_notes text,
  recipe      text,
  tags        text[] default '{}',
  region      text,
  vintage     text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_beverages_chef on beverages(chef_id);
create index if not exists idx_beverages_type on beverages(chef_id, type);

-- ─── Menu Beverage Pairings ─────────────────────────────────────────────────────

create table if not exists menu_beverage_pairings (
  id            uuid primary key default gen_random_uuid(),
  chef_id       uuid not null references chefs(id) on delete cascade,
  menu_id       uuid references menus(id) on delete cascade,
  dish_name     text not null,
  beverage_id   uuid not null references beverages(id) on delete cascade,
  course_number int,
  pairing_note  text,
  created_at    timestamptz default now()
);

create index if not exists idx_menu_bev_pairings_menu on menu_beverage_pairings(menu_id);
create index if not exists idx_menu_bev_pairings_bev on menu_beverage_pairings(beverage_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────────

alter table beverages enable row level security;
alter table menu_beverage_pairings enable row level security;

-- Beverages: chef can CRUD their own
create policy "beverages_select_own" on beverages
  for select using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "beverages_insert_own" on beverages
  for insert with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "beverages_update_own" on beverages
  for update using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "beverages_delete_own" on beverages
  for delete using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

-- Menu Beverage Pairings: chef can CRUD their own
create policy "menu_bev_pairings_select_own" on menu_beverage_pairings
  for select using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "menu_bev_pairings_insert_own" on menu_beverage_pairings
  for insert with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "menu_bev_pairings_update_own" on menu_beverage_pairings
  for update using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

create policy "menu_bev_pairings_delete_own" on menu_beverage_pairings
  for delete using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));

-- ─── Updated-at trigger ─────────────────────────────────────────────────────────

create or replace function update_beverages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_beverages_updated_at
  before update on beverages
  for each row execute function update_beverages_updated_at();
