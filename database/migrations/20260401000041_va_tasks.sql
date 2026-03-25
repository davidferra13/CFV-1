-- VA task delegation
create table if not exists va_tasks (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('admin', 'scheduling', 'communication', 'data_entry', 'research', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
  assigned_to text, -- VA name/email
  due_date date,
  completed_at timestamptz,
  notes text,
  attachments jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table va_tasks enable row level security;
DROP POLICY IF EXISTS "chef_own_va_tasks" ON va_tasks;
create policy "chef_own_va_tasks" on va_tasks for all using (chef_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_va_tasks_chef_status on va_tasks(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_va_tasks_due_date on va_tasks(due_date);
