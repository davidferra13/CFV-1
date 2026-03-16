-- Client Satisfaction Surveys
-- Post-event survey responses with ratings, comments, and review request tracking
-- Used by: lib/analytics/client-analytics.ts (NPS stats)
--          lib/communication/survey-actions.ts (survey management)
-- Tenant-scoped via chef_id

create table if not exists client_satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  -- Ratings (1-5 scale)
  overall_rating integer check (overall_rating between 1 and 5),
  food_rating integer check (food_rating between 1 and 5),
  service_rating integer check (service_rating between 1 and 5),
  -- Feedback
  comments text,
  would_recommend boolean,
  -- Review request workflow
  review_requested boolean not null default false,
  review_request_sent_at timestamptz,
  -- Lifecycle
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_satisfaction_surveys_chef on client_satisfaction_surveys(chef_id);
create index if not exists idx_satisfaction_surveys_event on client_satisfaction_surveys(event_id);
create index if not exists idx_satisfaction_surveys_client on client_satisfaction_surveys(client_id);
create index if not exists idx_satisfaction_surveys_completed on client_satisfaction_surveys(chef_id, completed_at)
  where completed_at is not null;

-- RLS
alter table client_satisfaction_surveys enable row level security;

create policy "Chefs manage their own surveys"
  on client_satisfaction_surveys for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());
