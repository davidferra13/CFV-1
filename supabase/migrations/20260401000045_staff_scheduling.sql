-- Staff scheduling and time tracking
-- Extends the staff management system (20260303000005) with shift scheduling,
-- availability tracking, and payroll-ready time tracking.

-- ============================================
-- TABLE 1: STAFF SCHEDULES (Shift-level tracking)
-- ============================================

create table if not exists staff_schedules (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  role text not null default 'assistant'
    check (role in ('assistant', 'sous_chef', 'server', 'bartender', 'prep_cook', 'cleanup', 'other')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'checked_in', 'checked_out', 'no_show', 'cancelled')),
  hourly_rate_cents integer,
  notes text,
  actual_start time,
  actual_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table staff_schedules is 'Per-shift scheduling with time tracking for payroll.';
comment on column staff_schedules.hourly_rate_cents is 'Rate for this shift. NULL = use staff_member default.';
comment on column staff_schedules.actual_start is 'Actual check-in time (set on checked_in status).';
comment on column staff_schedules.actual_end is 'Actual check-out time (set on checked_out status).';

create trigger trg_staff_schedules_updated_at
  before update on staff_schedules
  for each row execute function update_updated_at_column();

-- ============================================
-- TABLE 2: STAFF AVAILABILITY
-- ============================================

create table if not exists staff_availability (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  specific_date date,
  is_available boolean not null default true,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz not null default now()
);

comment on table staff_availability is 'Weekly recurring and date-specific availability for staff members.';
comment on column staff_availability.day_of_week is '0=Sunday, 6=Saturday. NULL if specific_date is set.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table staff_schedules enable row level security;
alter table staff_availability enable row level security;

-- staff_schedules: chef-only

create policy ss_chef_select on staff_schedules
  for select using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy ss_chef_insert on staff_schedules
  for insert with check (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy ss_chef_update on staff_schedules
  for update using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy ss_chef_delete on staff_schedules
  for delete using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

-- staff_availability: chef-only

create policy sa_chef_select on staff_availability
  for select using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy sa_chef_insert on staff_availability
  for insert with check (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy sa_chef_update on staff_availability
  for update using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

create policy sa_chef_delete on staff_availability
  for delete using (
    get_current_user_role() = 'chef' and
    chef_id = get_current_tenant_id()
  );

-- ============================================
-- INDEXES
-- ============================================

create index idx_staff_schedules_date on staff_schedules(chef_id, shift_date);
create index idx_staff_schedules_member on staff_schedules(staff_member_id, shift_date);
create index idx_staff_schedules_event on staff_schedules(event_id);
create index idx_staff_availability_member on staff_availability(staff_member_id);
