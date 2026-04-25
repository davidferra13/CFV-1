-- Expand chef_todos into a full personal reminder system
-- Adds due dates, priority, categories, timed reminders, and notes.
-- Fully additive - no column drops or renames.

-- Priority enum
DO $$ BEGIN
  CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Category enum
DO $$ BEGIN
  CREATE TYPE todo_category AS ENUM (
    'general',
    'prep',
    'shopping',
    'client',
    'admin',
    'follow_up',
    'personal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to chef_todos
ALTER TABLE chef_todos
  ADD COLUMN IF NOT EXISTS due_date      DATE,
  ADD COLUMN IF NOT EXISTS due_time      TIME,
  ADD COLUMN IF NOT EXISTS priority      todo_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category      todo_category NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS reminder_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes         TEXT CHECK (char_length(notes) <= 2000),
  ADD COLUMN IF NOT EXISTS event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id     UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index for due date queries (upcoming reminders)
CREATE INDEX IF NOT EXISTS chef_todos_due_idx
  ON chef_todos (chef_id, due_date)
  WHERE completed = false;

-- Index for pending reminders that need firing
CREATE INDEX IF NOT EXISTS chef_todos_reminder_pending_idx
  ON chef_todos (reminder_at)
  WHERE reminder_sent = false AND completed = false AND reminder_at IS NOT NULL;

COMMENT ON COLUMN chef_todos.due_date IS 'Optional due date for the todo';
COMMENT ON COLUMN chef_todos.due_time IS 'Optional due time (combined with due_date for full datetime)';
COMMENT ON COLUMN chef_todos.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN chef_todos.category IS 'Category for grouping and filtering';
COMMENT ON COLUMN chef_todos.reminder_at IS 'When to fire a notification reminder';
COMMENT ON COLUMN chef_todos.reminder_sent IS 'Whether the reminder notification has been sent';
COMMENT ON COLUMN chef_todos.notes IS 'Optional longer notes (up to 2000 chars)';
COMMENT ON COLUMN chef_todos.event_id IS 'Optional link to an event';
COMMENT ON COLUMN chef_todos.client_id IS 'Optional link to a client';
