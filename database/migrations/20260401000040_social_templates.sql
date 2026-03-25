-- Social media content templates
create table if not exists social_templates (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'twitter', 'linkedin')),
  template_type text not null check (template_type in ('post', 'story', 'reel_caption', 'bio', 'hashtag_set')),
  title text not null,
  content text not null,
  hashtags text[] default '{}',
  is_default boolean default false,
  used_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table social_templates enable row level security;
DROP POLICY IF EXISTS "chef_own_social_templates" ON social_templates;
create policy "chef_own_social_templates" on social_templates for all using (chef_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_social_templates_chef on social_templates(chef_id, platform);
