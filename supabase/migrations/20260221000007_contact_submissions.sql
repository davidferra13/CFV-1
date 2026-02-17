-- Contact Submissions Table
-- Stores public contact form submissions for admin review.
-- No tenant scoping needed — this is platform-level.

CREATE TABLE contact_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: admin/service role can read; anon can insert
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_submissions_anon_insert ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Chef can read contact submissions (platform admin)
CREATE POLICY contact_submissions_chef_select ON contact_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

GRANT INSERT ON contact_submissions TO anon;
GRANT SELECT ON contact_submissions TO authenticated;
