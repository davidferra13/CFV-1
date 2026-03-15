-- Recipe step photos for visual documentation
create table if not exists recipe_step_photos (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  step_number integer not null,
  photo_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table recipe_step_photos enable row level security;
create policy "chef_own_recipe_step_photos" on recipe_step_photos for all using (chef_id = auth.uid());
create index idx_recipe_step_photos_recipe on recipe_step_photos(recipe_id, step_number);
