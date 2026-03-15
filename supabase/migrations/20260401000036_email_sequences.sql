-- Email Marketing / Nurture Sequences
-- Automated follow-up email sequences for leads and clients.
-- Trigger-based: post_inquiry, post_event, post_quote, anniversary, dormant, manual.

-- ============================================
-- email_sequences (sequence definitions)
-- ============================================
create table if not exists email_sequences (
  id            uuid primary key default gen_random_uuid(),
  chef_id       uuid not null references chefs(id) on delete cascade,
  name          text not null,
  trigger_type  text not null check (trigger_type in (
    'post_inquiry', 'post_event', 'post_quote',
    'anniversary', 'dormant_30d', 'dormant_60d', 'manual'
  )),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_email_sequences_chef_id on email_sequences(chef_id);

alter table email_sequences enable row level security;

create policy "Chefs manage own sequences"
  on email_sequences for all
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1))
  with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1));

-- ============================================
-- email_sequence_steps (steps within a sequence)
-- ============================================
create table if not exists email_sequence_steps (
  id                uuid primary key default gen_random_uuid(),
  sequence_id       uuid not null references email_sequences(id) on delete cascade,
  step_number       int not null,
  delay_days        int not null default 0,
  subject_template  text not null,
  body_template     text not null,
  created_at        timestamptz not null default now(),
  unique (sequence_id, step_number)
);

create index idx_email_sequence_steps_sequence_id on email_sequence_steps(sequence_id);

alter table email_sequence_steps enable row level security;

create policy "Chefs manage own sequence steps"
  on email_sequence_steps for all
  using (
    sequence_id in (
      select id from email_sequences
      where chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1)
    )
  )
  with check (
    sequence_id in (
      select id from email_sequences
      where chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1)
    )
  );

-- ============================================
-- email_sequence_enrollments (client enrollments)
-- ============================================
create table if not exists email_sequence_enrollments (
  id            uuid primary key default gen_random_uuid(),
  chef_id       uuid not null references chefs(id) on delete cascade,
  sequence_id   uuid not null references email_sequences(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  inquiry_id    uuid,
  current_step  int not null default 1,
  status        text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  enrolled_at   timestamptz not null default now(),
  next_send_at  timestamptz,
  completed_at  timestamptz
);

create index idx_email_sequence_enrollments_chef_id on email_sequence_enrollments(chef_id);
create index idx_email_sequence_enrollments_sequence_id on email_sequence_enrollments(sequence_id);
create index idx_email_sequence_enrollments_status on email_sequence_enrollments(status);
create index idx_email_sequence_enrollments_next_send on email_sequence_enrollments(next_send_at)
  where status = 'active';

alter table email_sequence_enrollments enable row level security;

create policy "Chefs manage own enrollments"
  on email_sequence_enrollments for all
  using (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1))
  with check (chef_id = (select entity_id from user_roles where auth_user_id = auth.uid() and role = 'chef' limit 1));
