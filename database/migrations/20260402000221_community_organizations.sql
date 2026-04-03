-- Community organizations
-- Adds first-class organization records for logged volunteer/community impact work.
-- Keeps existing charity_hours rows intact while linking them to reusable org records.

CREATE TABLE IF NOT EXISTS community_organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL,
  address             TEXT,
  google_place_id     TEXT,
  ein                 TEXT,
  website_url         TEXT,
  verification_source TEXT,
  verification_url    TEXT,
  is_verified_501c    BOOLEAN NOT NULL DEFAULT false,
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE community_organizations IS 'Chef-owned community organizations used for volunteer and community impact records.';
COMMENT ON COLUMN community_organizations.google_place_id IS 'Google Place ID used to build stable Maps links and deduplicate organizations.';
COMMENT ON COLUMN community_organizations.ein IS 'IRS Employer Identification Number used for nonprofit verification and deduplication.';
COMMENT ON COLUMN community_organizations.verification_source IS 'Source of verification, such as ProPublica or Google Places.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_orgs_chef_place
  ON community_organizations(chef_id, google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_orgs_chef_ein
  ON community_organizations(chef_id, ein)
  WHERE ein IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_orgs_chef_name_address
  ON community_organizations(
    chef_id,
    lower(trim(display_name)),
    lower(trim(COALESCE(address, '')))
  )
  WHERE google_place_id IS NULL AND ein IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_orgs_chef_updated
  ON community_organizations(chef_id, updated_at DESC);

DROP TRIGGER IF EXISTS set_community_organizations_updated_at ON community_organizations;
CREATE TRIGGER set_community_organizations_updated_at
  BEFORE UPDATE ON community_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE community_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_orgs_chef_select ON community_organizations;
CREATE POLICY community_orgs_chef_select ON community_organizations
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS community_orgs_chef_insert ON community_organizations;
CREATE POLICY community_orgs_chef_insert ON community_organizations
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS community_orgs_chef_update ON community_organizations;
CREATE POLICY community_orgs_chef_update ON community_organizations
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS community_orgs_chef_delete ON community_organizations;
CREATE POLICY community_orgs_chef_delete ON community_organizations
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

ALTER TABLE charity_hours
  ADD COLUMN IF NOT EXISTS community_organization_id UUID REFERENCES community_organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_charity_hours_org_id
  ON charity_hours(community_organization_id)
  WHERE community_organization_id IS NOT NULL;

INSERT INTO community_organizations (
  chef_id,
  display_name,
  address,
  google_place_id,
  ein,
  verification_source,
  verification_url,
  is_verified_501c,
  last_verified_at
)
SELECT DISTINCT ON (ch.chef_id, ch.google_place_id)
  ch.chef_id,
  ch.organization_name,
  ch.organization_address,
  ch.google_place_id,
  NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), ''),
  CASE
    WHEN ch.is_verified_501c AND NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NOT NULL
      THEN 'propublica'
    ELSE 'google_places'
  END,
  CASE
    WHEN ch.is_verified_501c AND NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NOT NULL
      THEN 'https://projects.propublica.org/nonprofits/organizations/' || NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '')
    ELSE NULL
  END,
  ch.is_verified_501c,
  CASE WHEN ch.is_verified_501c THEN now() ELSE NULL END
FROM charity_hours ch
WHERE ch.google_place_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM community_organizations co
    WHERE co.chef_id = ch.chef_id
      AND co.google_place_id = ch.google_place_id
  )
ORDER BY ch.chef_id, ch.google_place_id, ch.service_date DESC, ch.created_at DESC;

INSERT INTO community_organizations (
  chef_id,
  display_name,
  address,
  google_place_id,
  ein,
  verification_source,
  verification_url,
  is_verified_501c,
  last_verified_at
)
SELECT DISTINCT ON (ch.chef_id, normalized_ein)
  ch.chef_id,
  ch.organization_name,
  ch.organization_address,
  ch.google_place_id,
  normalized_ein,
  CASE
    WHEN ch.is_verified_501c THEN 'propublica'
    WHEN ch.google_place_id IS NOT NULL THEN 'google_places'
    ELSE NULL
  END,
  CASE
    WHEN ch.is_verified_501c
      THEN 'https://projects.propublica.org/nonprofits/organizations/' || normalized_ein
    ELSE NULL
  END,
  ch.is_verified_501c,
  CASE WHEN ch.is_verified_501c THEN now() ELSE NULL END
FROM (
  SELECT
    ch.*,
    NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') AS normalized_ein
  FROM charity_hours ch
) ch
WHERE ch.google_place_id IS NULL
  AND ch.normalized_ein IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM community_organizations co
    WHERE co.chef_id = ch.chef_id
      AND co.ein = ch.normalized_ein
  )
ORDER BY ch.chef_id, normalized_ein, ch.service_date DESC, ch.created_at DESC;

INSERT INTO community_organizations (
  chef_id,
  display_name,
  address,
  is_verified_501c
)
SELECT DISTINCT ON (
  ch.chef_id,
  lower(trim(ch.organization_name)),
  lower(trim(COALESCE(ch.organization_address, '')))
)
  ch.chef_id,
  ch.organization_name,
  ch.organization_address,
  ch.is_verified_501c
FROM charity_hours ch
WHERE ch.google_place_id IS NULL
  AND NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM community_organizations co
    WHERE co.chef_id = ch.chef_id
      AND lower(trim(co.display_name)) = lower(trim(ch.organization_name))
      AND lower(trim(COALESCE(co.address, ''))) = lower(trim(COALESCE(ch.organization_address, '')))
  )
ORDER BY
  ch.chef_id,
  lower(trim(ch.organization_name)),
  lower(trim(COALESCE(ch.organization_address, ''))),
  ch.service_date DESC,
  ch.created_at DESC;

WITH resolved_orgs AS (
  SELECT
    ch.id AS charity_hour_id,
    (
      SELECT co.id
      FROM community_organizations co
      WHERE co.chef_id = ch.chef_id
        AND (
          (ch.google_place_id IS NOT NULL AND co.google_place_id = ch.google_place_id)
          OR (
            ch.google_place_id IS NULL
            AND NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NOT NULL
            AND co.ein = NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '')
          )
          OR (
            ch.google_place_id IS NULL
            AND NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NULL
            AND lower(trim(co.display_name)) = lower(trim(ch.organization_name))
            AND lower(trim(COALESCE(co.address, ''))) = lower(trim(COALESCE(ch.organization_address, '')))
          )
        )
      ORDER BY
        CASE
          WHEN ch.google_place_id IS NOT NULL AND co.google_place_id = ch.google_place_id THEN 0
          WHEN NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') IS NOT NULL
            AND co.ein = NULLIF(regexp_replace(COALESCE(ch.ein, ''), '\D', '', 'g'), '') THEN 1
          ELSE 2
        END,
        co.updated_at DESC
      LIMIT 1
    ) AS community_organization_id
  FROM charity_hours ch
  WHERE ch.community_organization_id IS NULL
)
UPDATE charity_hours ch
SET community_organization_id = resolved_orgs.community_organization_id
FROM resolved_orgs
WHERE ch.id = resolved_orgs.charity_hour_id
  AND resolved_orgs.community_organization_id IS NOT NULL;
