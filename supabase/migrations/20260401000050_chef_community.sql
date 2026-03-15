-- Chef Community Network: profiles, anonymous benchmarking, peer messaging
-- Feature 13.1

create table if not exists community_profiles (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  display_name text not null,
  cuisine_types text[] default '{}',
  years_experience integer,
  service_area text,
  bio text,
  is_visible boolean default true,
  accepting_referrals boolean default false,
  specialties text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table community_profiles enable row level security;
create policy "chef_own_community_profile" on community_profiles for all using (chef_id = auth.uid());
create policy "public_read_visible_profiles" on community_profiles for select using (is_visible = true);
create unique index idx_community_profile_chef on community_profiles(chef_id);

create table if not exists community_benchmarks (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  metric_type text not null check (metric_type in ('avg_event_price', 'events_per_month', 'food_cost_pct', 'client_retention_rate', 'avg_party_size')),
  value numeric not null,
  period text not null, -- '2026-Q1', '2026-03', etc.
  created_at timestamptz not null default now()
);
alter table community_benchmarks enable row level security;
create policy "chef_own_benchmarks" on community_benchmarks for all using (chef_id = auth.uid());
create index idx_benchmarks_metric on community_benchmarks(metric_type, period);

create table if not exists community_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references chefs(id) on delete cascade,
  recipient_id uuid not null references chefs(id) on delete cascade,
  subject text,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table community_messages enable row level security;
create policy "sender_messages" on community_messages for all using (sender_id = auth.uid());
create policy "recipient_read_messages" on community_messages for select using (recipient_id = auth.uid());
create index idx_messages_recipient on community_messages(recipient_id, created_at desc);
