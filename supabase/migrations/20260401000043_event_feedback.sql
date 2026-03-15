-- Post-event feedback collection
create table if not exists event_feedback (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  client_id uuid references clients(id),
  overall_rating integer check (overall_rating between 1 and 5),
  food_rating integer check (food_rating between 1 and 5),
  service_rating integer check (service_rating between 1 and 5),
  communication_rating integer check (communication_rating between 1 and 5),
  favorite_dish text,
  improvement_suggestions text,
  would_recommend boolean,
  additional_comments text,
  is_public boolean default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table event_feedback enable row level security;
create policy "chef_own_event_feedback" on event_feedback for all using (chef_id = auth.uid());
create unique index idx_event_feedback_unique on event_feedback(event_id, client_id);
create index idx_event_feedback_chef on event_feedback(chef_id, submitted_at desc);
