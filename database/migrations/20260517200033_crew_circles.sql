-- Crew Circles: team coordination tables for chef staff/crew
-- Additive only. No DROP, DELETE, or TRUNCATE.

-- 1. crew_circles: named groups for a chef's team
CREATE TABLE IF NOT EXISTS crew_circles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_circles_tenant
  ON crew_circles USING btree (tenant_id);

ALTER TABLE crew_circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_crew_circles"
  ON crew_circles FOR SELECT TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY "tenant_isolation_insert_crew_circles"
  ON crew_circles FOR INSERT TO public
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY "tenant_isolation_update_crew_circles"
  ON crew_circles FOR UPDATE TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY "tenant_isolation_delete_crew_circles"
  ON crew_circles FOR DELETE TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY "service_role_crew_circles"
  ON crew_circles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. crew_members: staff assigned to a crew circle
CREATE TABLE IF NOT EXISTS crew_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_circle_id    uuid NOT NULL REFERENCES crew_circles(id) ON DELETE CASCADE,
  staff_member_id   uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'other',
  joined_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crew_members_circle_staff_unique UNIQUE (crew_circle_id, staff_member_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_circle
  ON crew_members USING btree (crew_circle_id);

CREATE INDEX IF NOT EXISTS idx_crew_members_staff
  ON crew_members USING btree (staff_member_id);

ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_crew_members"
  ON crew_members FOR SELECT TO public
  USING (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "tenant_isolation_insert_crew_members"
  ON crew_members FOR INSERT TO public
  WITH CHECK (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "tenant_isolation_delete_crew_members"
  ON crew_members FOR DELETE TO public
  USING (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "service_role_crew_members"
  ON crew_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. crew_availability: per-date availability for staff in a crew circle
CREATE TABLE IF NOT EXISTS crew_availability (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_circle_id    uuid NOT NULL REFERENCES crew_circles(id) ON DELETE CASCADE,
  staff_member_id   uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  event_id          uuid REFERENCES events(id) ON DELETE SET NULL,
  date              date NOT NULL,
  status            text NOT NULL DEFAULT 'available',
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crew_availability_circle_staff_date_unique UNIQUE (crew_circle_id, staff_member_id, date),
  CONSTRAINT crew_availability_status_check CHECK (status IN ('available', 'tentative', 'unavailable'))
);

CREATE INDEX IF NOT EXISTS idx_crew_availability_circle
  ON crew_availability USING btree (crew_circle_id);

CREATE INDEX IF NOT EXISTS idx_crew_availability_staff
  ON crew_availability USING btree (staff_member_id);

CREATE INDEX IF NOT EXISTS idx_crew_availability_date
  ON crew_availability USING btree (crew_circle_id, date);

CREATE INDEX IF NOT EXISTS idx_crew_availability_event
  ON crew_availability USING btree (event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE crew_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_crew_availability"
  ON crew_availability FOR SELECT TO public
  USING (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "tenant_isolation_insert_crew_availability"
  ON crew_availability FOR INSERT TO public
  WITH CHECK (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "tenant_isolation_update_crew_availability"
  ON crew_availability FOR UPDATE TO public
  USING (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ))
  WITH CHECK (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "tenant_isolation_delete_crew_availability"
  ON crew_availability FOR DELETE TO public
  USING (crew_circle_id IN (
    SELECT id FROM crew_circles
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
    )
  ));

CREATE POLICY "service_role_crew_availability"
  ON crew_availability FOR ALL TO service_role
  USING (true) WITH CHECK (true);
