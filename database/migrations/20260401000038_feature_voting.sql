-- Feature Voting / Public Roadmap
-- Allows chefs to submit, vote on, and track feature requests.
-- Publicly visible roadmap showing planned, in-progress, and shipped features.

-- Feature requests table
create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  submitted_by uuid references chefs(id) on delete set null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  category text not null default 'other'
    check (category in ('core_ops', 'clients', 'finance', 'scheduling', 'marketing', 'recipes', 'team', 'integrations', 'other')),
  vote_count int not null default 0,
  admin_response text,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feature votes table (one vote per chef per feature)
create table if not exists feature_votes (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references feature_requests(id) on delete cascade,
  chef_id uuid not null references chefs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (feature_id, chef_id)
);

-- Performance index for listing by status sorted by votes
create index if not exists idx_feature_requests_status_votes
  on feature_requests (status, vote_count desc);

-- Index on feature_votes for lookups by chef
create index if not exists idx_feature_votes_chef
  on feature_votes (chef_id);

-- RLS
alter table feature_requests enable row level security;
alter table feature_votes enable row level security;

-- feature_requests: readable by all authenticated users
DROP POLICY IF EXISTS "feature_requests_select" ON feature_requests;
create policy "feature_requests_select"
  on feature_requests for select
  to authenticated
  using (true);

-- feature_requests: insertable by all authenticated users (submit requests)
DROP POLICY IF EXISTS "feature_requests_insert" ON feature_requests;
create policy "feature_requests_insert"
  on feature_requests for insert
  to authenticated
  with check (true);

-- feature_requests: updatable by admins only (status changes handled via service role in server actions)
-- Admin updates go through createServerClient({ admin: true }) so no RLS policy needed for update.

-- feature_votes: insertable by the voting chef
DROP POLICY IF EXISTS "feature_votes_insert" ON feature_votes;
create policy "feature_votes_insert"
  on feature_votes for insert
  to authenticated
  with check (chef_id = (
    select entity_id from user_roles
    where auth_user_id = auth.uid() and role = 'chef'
    limit 1
  ));

-- feature_votes: deletable by the voting chef
DROP POLICY IF EXISTS "feature_votes_delete" ON feature_votes;
create policy "feature_votes_delete"
  on feature_votes for delete
  to authenticated
  using (chef_id = (
    select entity_id from user_roles
    where auth_user_id = auth.uid() and role = 'chef'
    limit 1
  ));

-- feature_votes: readable by all authenticated users (to show vote counts)
DROP POLICY IF EXISTS "feature_votes_select" ON feature_votes;
create policy "feature_votes_select"
  on feature_votes for select
  to authenticated
  using (true);

-- Updated_at trigger
create or replace function update_feature_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_feature_requests_updated_at ON feature_requests;
create trigger trg_feature_requests_updated_at
  before update on feature_requests
  for each row
  execute function update_feature_requests_updated_at();
