-- Feature 3.12: Comprehensive expense tracking beyond food
-- Tracks mileage, equipment, supplies, insurance, subscriptions, and more

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  category text not null check (category in ('food', 'equipment', 'supplies', 'mileage', 'insurance', 'subscriptions', 'marketing', 'rent', 'utilities', 'professional_services', 'training', 'other')),
  description text not null,
  amount_cents integer not null,
  date date not null default current_date,
  event_id uuid references events(id),
  vendor text,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'quarterly', 'annually')),
  receipt_url text,
  tax_deductible boolean default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table expenses enable row level security;

create policy "chef_own_expenses" on expenses for all using (chef_id = auth.uid());

create index idx_expenses_chef_date on expenses(chef_id, date desc);
create index idx_expenses_category on expenses(chef_id, category);
create index idx_expenses_event on expenses(event_id);
