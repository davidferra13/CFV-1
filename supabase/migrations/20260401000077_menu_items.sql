-- Menu Items
-- Individual dishes within a menu, used for menu engineering analytics
-- (sales counting, popularity tracking, contribution margin analysis)
-- Used by: lib/analytics/menu-engineering.ts
-- Tenant-scoped via chef_id

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  name text not null,
  description text,
  category text, -- appetizer, entree, dessert, etc.
  price_cents integer, -- selling price per portion
  food_cost_cents integer, -- cost to make per portion
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- Analytics counters (updated when events use this menu)
  times_served integer not null default 0,
  last_served_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_menu_items_chef on menu_items(chef_id);
create index if not exists idx_menu_items_menu on menu_items(menu_id);
create index if not exists idx_menu_items_recipe on menu_items(recipe_id);
create index if not exists idx_menu_items_active on menu_items(menu_id, is_active) where is_active = true;

-- RLS
alter table menu_items enable row level security;

create policy "Chefs manage their own menu items"
  on menu_items for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

-- Updated_at trigger
create trigger menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at_column();
