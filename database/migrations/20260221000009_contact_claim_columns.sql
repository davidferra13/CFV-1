-- Contact Claim Pipeline
-- Adds claim tracking to contact_submissions so chefs can claim leads
-- and convert them into tenant-scoped inquiries.
--
-- Design: contact_submissions is intentionally NOT tenant-scoped (shared pool).
-- Any chef can see unclaimed submissions. Claiming marks it with their chef_id
-- and creates a tenant-scoped inquiry via the application layer.

ALTER TABLE contact_submissions
  ADD COLUMN claimed_by_chef_id UUID REFERENCES chefs(id),
  ADD COLUMN claimed_at TIMESTAMPTZ,
  ADD COLUMN inquiry_id UUID REFERENCES inquiries(id);

-- Fast lookup for unclaimed submissions
CREATE INDEX idx_contact_submissions_unclaimed
  ON contact_submissions (claimed_by_chef_id)
  WHERE claimed_by_chef_id IS NULL;

-- Chefs can UPDATE to claim (only setting their own chef_id)
DROP POLICY IF EXISTS contact_submissions_chef_update ON contact_submissions;
CREATE POLICY contact_submissions_chef_update ON contact_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    claimed_by_chef_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

GRANT UPDATE ON contact_submissions TO authenticated;
