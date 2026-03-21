-- Task Dependencies Table
-- Enables finish-to-start and start-to-start relationships between tasks.
-- Used for prep timeline visualization and critical path analysis.
--
-- Additive migration: creates new table, no existing data affected.

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
    CHECK (dependency_type IN ('finish_to_start', 'start_to_start')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent self-dependencies
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  -- Prevent duplicate dependencies
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_deps_task
  ON task_dependencies(task_id);

CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on
  ON task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_task_deps_chef
  ON task_dependencies(chef_id);

-- RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_task_dependencies"
  ON task_dependencies
  FOR ALL
  USING (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
