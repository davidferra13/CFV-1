-- ============================================================
-- Migration: Remy Phase 2
-- Purpose: Culinary profiles, document folders, chef reminders
-- Date: 2026-02-22
-- Depends on: 20260322000043 (AI task queue)
-- ============================================================

-- 1. Chef Culinary Profiles (Q&A — 12 structured questions)
-- Chef fills out their food philosophy, style, identity.
-- Remy reads these to deeply understand the chef.
CREATE TABLE IF NOT EXISTS chef_culinary_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  question_key  TEXT NOT NULL,
  answer        TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chef_id, question_key)
);

ALTER TABLE chef_culinary_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_culinary_profiles_tenant ON chef_culinary_profiles;
CREATE POLICY chef_culinary_profiles_tenant ON chef_culinary_profiles
  FOR ALL USING (
    chef_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE INDEX idx_chef_culinary_profiles_chef
  ON chef_culinary_profiles(chef_id);

CREATE TRIGGER chef_culinary_profiles_updated_at
  BEFORE UPDATE ON chef_culinary_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Chef Folders (organize documents via Remy)
CREATE TABLE IF NOT EXISTS chef_folders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  parent_folder_id  UUID REFERENCES chef_folders(id),
  color             TEXT DEFAULT '#94a3b8',
  icon              TEXT DEFAULT 'folder',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chef_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_folders_tenant ON chef_folders;
CREATE POLICY chef_folders_tenant ON chef_folders
  FOR ALL USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE INDEX idx_chef_folders_tenant ON chef_folders(tenant_id);
CREATE INDEX idx_chef_folders_parent ON chef_folders(parent_folder_id);

CREATE TRIGGER chef_folders_updated_at
  BEFORE UPDATE ON chef_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add folder_id to existing chef_documents table
ALTER TABLE chef_documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES chef_folders(id);
CREATE INDEX IF NOT EXISTS idx_chef_documents_folder
  ON chef_documents(folder_id);

-- 3. Chef Reminders (proactive nudges + manual reminders)
CREATE TABLE IF NOT EXISTS chef_reminders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  reminder_type       TEXT NOT NULL DEFAULT 'general'
                      CHECK (reminder_type IN (
                        'general', 'follow_up', 'prep', 'inquiry',
                        'birthday', 'event', 'payment'
                      )),
  title               TEXT NOT NULL,
  message             TEXT,
  due_at              TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,
  source              TEXT NOT NULL DEFAULT 'auto'
                      CHECK (source IN ('auto', 'manual', 'remy')),
  related_event_id    UUID REFERENCES events(id),
  related_client_id   UUID REFERENCES clients(id),
  related_inquiry_id  UUID REFERENCES inquiries(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chef_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_reminders_tenant ON chef_reminders;
CREATE POLICY chef_reminders_tenant ON chef_reminders
  FOR ALL USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE INDEX idx_chef_reminders_tenant
  ON chef_reminders(tenant_id);
CREATE INDEX idx_chef_reminders_active
  ON chef_reminders(tenant_id, due_at)
  WHERE completed_at IS NULL AND dismissed_at IS NULL;
