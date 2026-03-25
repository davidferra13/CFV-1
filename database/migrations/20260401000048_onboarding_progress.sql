create table if not exists onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  step_key text not null,
  completed_at timestamptz,
  skipped boolean default false,
  data jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table onboarding_progress enable row level security;
DROP POLICY IF EXISTS "chef_own_onboarding" ON onboarding_progress;
create policy "chef_own_onboarding" on onboarding_progress for all using (chef_id = auth.uid());
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_chef_step on onboarding_progress(chef_id, step_key);
