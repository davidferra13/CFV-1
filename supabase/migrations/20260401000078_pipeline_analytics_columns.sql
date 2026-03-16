-- Pipeline Analytics: Add missing columns for advanced pipeline stats
-- Used by: lib/analytics/pipeline-analytics.ts
-- All columns are nullable (additive, no existing data affected)

-- Inquiries: ghost tracking and decline reasons
alter table inquiries
  add column if not exists ghost_at timestamptz,
  add column if not exists decline_reason text;

-- Events: track when the original inquiry was received (for lead time calculation)
alter table events
  add column if not exists inquiry_received_at timestamptz;

-- Quotes: negotiation tracking
alter table quotes
  add column if not exists negotiation_occurred boolean default false,
  add column if not exists original_quoted_cents integer;

-- Index for ghost analysis (find ghosted inquiries efficiently)
create index if not exists idx_inquiries_ghost_at on inquiries(tenant_id, ghost_at)
  where ghost_at is not null;

-- Index for decline reason analysis
create index if not exists idx_inquiries_decline_reason on inquiries(tenant_id, decline_reason)
  where decline_reason is not null;
