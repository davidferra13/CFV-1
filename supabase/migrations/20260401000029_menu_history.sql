-- Menu Service History
-- Tracks every menu served to each client with dates, dishes, and feedback.
-- Allows chefs to avoid repetition and see what clients liked/disliked.

create table if not exists menu_service_history (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  menu_id uuid,
  served_date date not null,
  dishes_served jsonb not null default '[]'::jsonb,
  overall_rating int check (overall_rating >= 1 and overall_rating <= 5),
  client_feedback text,
  chef_notes text,
  guest_count int,
  created_at timestamptz not null default now()
);

comment on table menu_service_history is 'Tracks menus served to each client with feedback and dish-level preferences';
comment on column menu_service_history.dishes_served is 'Array of {name, category, liked, disliked, notes}';

-- Index for efficient lookups by chef + client + date
create index idx_menu_history_chef_client_date
  on menu_service_history (chef_id, client_id, served_date);

-- RLS: chefs see only their own history
alter table menu_service_history enable row level security;

create policy "Chefs manage own menu history"
  on menu_service_history
  for all
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'))
  with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef'));
