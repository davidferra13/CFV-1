-- Mentorship matching system (feature 13.4)
-- Connects new chefs with experienced ones for guidance and growth

create table if not exists mentorship_profiles (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  role text not null check (role in ('mentor', 'mentee', 'both')),
  expertise_areas text[] default '{}',
  goals text,
  availability text,
  years_experience integer,
  max_mentees integer default 3,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table mentorship_profiles enable row level security;
create policy "chef_own_mentorship" on mentorship_profiles for all using (chef_id = auth.uid());
create policy "public_read_active" on mentorship_profiles for select using (is_active = true);
create unique index idx_mentorship_chef on mentorship_profiles(chef_id);

create table if not exists mentorship_connections (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references chefs(id) on delete cascade,
  mentee_id uuid not null references chefs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'declined')),
  message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table mentorship_connections enable row level security;
create policy "mentor_connections" on mentorship_connections for all using (mentor_id = auth.uid());
create policy "mentee_connections" on mentorship_connections for all using (mentee_id = auth.uid());
create unique index idx_mentorship_pair on mentorship_connections(mentor_id, mentee_id);
