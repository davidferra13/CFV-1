-- Client Satisfaction Surveys - add missing columns
-- Table already exists from earlier migration; adding columns needed by
-- lib/analytics/client-analytics.ts (NPS stats) and lib/communication/survey-actions.ts

-- Add missing columns to existing table
alter table client_satisfaction_surveys add column if not exists overall_rating integer;
alter table client_satisfaction_surveys add column if not exists food_rating integer;
alter table client_satisfaction_surveys add column if not exists service_rating integer;
alter table client_satisfaction_surveys add column if not exists comments text;
alter table client_satisfaction_surveys add column if not exists would_recommend boolean;
alter table client_satisfaction_surveys add column if not exists review_requested boolean default false;
alter table client_satisfaction_surveys add column if not exists review_request_sent_at timestamptz;
alter table client_satisfaction_surveys add column if not exists sent_at timestamptz;
alter table client_satisfaction_surveys add column if not exists completed_at timestamptz;

-- Add check constraints for ratings if columns were just added
-- (safe: do nothing if constraint already exists)
do $$
begin
  alter table client_satisfaction_surveys add constraint chk_overall_rating check (overall_rating between 1 and 5);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table client_satisfaction_surveys add constraint chk_food_rating check (food_rating between 1 and 5);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table client_satisfaction_surveys add constraint chk_service_rating check (service_rating between 1 and 5);
exception when duplicate_object then null;
end $$;

-- Indexes
create index if not exists idx_satisfaction_surveys_completed on client_satisfaction_surveys(chef_id, completed_at)
  where completed_at is not null;
