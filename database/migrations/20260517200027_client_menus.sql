-- Client Menu Submissions: clients submit menu ideas for chef review.
-- ADDITIVE ONLY. No drops, no destructive changes.

CREATE TABLE IF NOT EXISTS client_menu_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  submitted_by_token uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'rejected', 'counter_proposed')),
  raw_text text NOT NULL,
  parsed_dishes jsonb NOT NULL DEFAULT '[]'::jsonb,
  dietary_notes text,
  inspiration_urls text[],
  chef_notes text,
  counter_menu_id uuid REFERENCES menus(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_menu_submissions_event
  ON client_menu_submissions USING btree (event_id);

CREATE INDEX idx_client_menu_submissions_tenant
  ON client_menu_submissions USING btree (tenant_id);

CREATE INDEX idx_client_menu_submissions_status
  ON client_menu_submissions USING btree (tenant_id, status);

-- RLS
ALTER TABLE client_menu_submissions ENABLE ROW LEVEL SECURITY;

-- Chef can see submissions for their tenant
CREATE POLICY client_menu_submissions_chef_select
  ON client_menu_submissions FOR SELECT
  USING (tenant_id = auth.uid());

-- Chef can update (review) submissions for their tenant
CREATE POLICY client_menu_submissions_chef_update
  ON client_menu_submissions FOR UPDATE
  USING (tenant_id = auth.uid());

-- Insert is done via admin client (bypasses RLS) since clients use token auth
-- No direct client RLS policy needed; admin client handles inserts and reads
