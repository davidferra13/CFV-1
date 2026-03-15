-- Client Gifting & Follow-Up Automation
-- Tracks gift history per client and configurable follow-up rules

-- ─── Gift Log ────────────────────────────────────────────────────────────────

create table if not exists client_gift_log (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  gift_type text not null check (gift_type in ('thank_you', 'birthday', 'holiday', 'milestone', 'apology', 'custom')),
  occasion text not null default '',
  description text not null default '',
  cost_cents int not null default 0,
  sent_at timestamptz not null default now(),
  delivery_method text not null check (delivery_method in ('hand_delivered', 'shipped', 'digital', 'with_service')),
  notes text,
  created_at timestamptz not null default now()
);

alter table client_gift_log enable row level security;

create policy "Chefs manage own gift log"
  on client_gift_log for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

create index idx_client_gift_log_chef on client_gift_log(chef_id);
create index idx_client_gift_log_client on client_gift_log(client_id);

-- ─── Follow-Up Rules ─────────────────────────────────────────────────────────

create table if not exists client_followup_rules (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  trigger_type text not null check (trigger_type in (
    'post_event', 'birthday', 'anniversary',
    'no_booking_30d', 'no_booking_60d', 'no_booking_90d',
    'holiday', 'milestone_event_count'
  )),
  action text not null check (action in ('reminder', 'email_draft', 'gift_suggestion')),
  template_text text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table client_followup_rules enable row level security;

create policy "Chefs manage own followup rules"
  on client_followup_rules for all
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

create index idx_client_followup_rules_chef on client_followup_rules(chef_id);
