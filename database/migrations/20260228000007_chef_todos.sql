-- Chef To Do List
-- Chefs can maintain a free-form running to-do list from their dashboard.
-- Scoped per chef (tenant). RLS enforced — chef sees only their own rows.

CREATE TABLE chef_todos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  text         TEXT        NOT NULL
                           CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 500),
  completed    BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID        NOT NULL REFERENCES auth.users(id)
);

-- Index for fast per-chef ordered fetches
CREATE INDEX chef_todos_chef_order_idx ON chef_todos (chef_id, completed, sort_order, created_at);

ALTER TABLE chef_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_todos_select" ON chef_todos;
CREATE POLICY "chef_todos_select" ON chef_todos
  FOR SELECT USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "chef_todos_insert" ON chef_todos;
CREATE POLICY "chef_todos_insert" ON chef_todos
  FOR INSERT WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "chef_todos_update" ON chef_todos;
CREATE POLICY "chef_todos_update" ON chef_todos
  FOR UPDATE USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "chef_todos_delete" ON chef_todos;
CREATE POLICY "chef_todos_delete" ON chef_todos
  FOR DELETE USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
