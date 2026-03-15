-- Entity Photos: universal photo documentation for any entity
-- Attach photos to events, recipes, equipment, bakery orders, compliance logs, etc.

create table if not exists entity_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references chefs(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'event', 'recipe', 'equipment', 'bakery_order', 'compliance',
    'station', 'vendor', 'menu', 'staff', 'general'
  )),
  entity_id uuid not null,
  url text not null,
  thumbnail_url text,
  caption text,
  tags text[],
  sort_order integer not null default 0,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_photos_lookup on entity_photos(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_photos_recent on entity_photos(tenant_id, created_at desc);
-- RLS
alter table entity_photos enable row level security;
DROP POLICY IF EXISTS "Chefs see own photos" ON entity_photos;
create policy "Chefs see own photos"
  on entity_photos for select
  using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs insert own photos" ON entity_photos;
create policy "Chefs insert own photos"
  on entity_photos for insert
  with check (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs update own photos" ON entity_photos;
create policy "Chefs update own photos"
  on entity_photos for update
  using (tenant_id = auth.uid());
DROP POLICY IF EXISTS "Chefs delete own photos" ON entity_photos;
create policy "Chefs delete own photos"
  on entity_photos for delete
  using (tenant_id = auth.uid());
