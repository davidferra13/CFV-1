-- Local Postgres compatibility: auth.uid() shim + RLS helper functions.
--
-- The standalone-Postgres migration left these behind. `auth.uid()` is a Supabase
-- builtin, and the helper functions from 20260215000001_layer_1_foundation.sql were
-- never created here because that migration's tables already existed and it was
-- treated as applied. Dozens of later migrations declare RLS policies that call
-- them, so without these the policy DDL fails to parse and those migrations abort.
--
-- Tenant scoping is enforced in application code; these exist so policy DDL is
-- valid and RLS behaves sanely if a connection ever runs as a non-superuser.
-- Additive: creates functions only, no table or column is touched.

CREATE SCHEMA IF NOT EXISTS auth;

-- Supabase's auth.uid() reads the JWT subject from the request GUC. Only define it
-- when absent so a real Supabase-provided version is never overwritten.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid() RETURNS UUID AS $body$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::UUID
      $body$ LANGUAGE sql STABLE;
    $fn$;
  END IF;
END
$$;

COMMENT ON FUNCTION auth.uid IS 'Supabase-compatible shim: current auth user id from the request JWT GUC';

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Same trigger under the shorter name some migrations use.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Policies written against clients use this name for the caller's auth id.
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid()
$$ LANGUAGE sql STABLE;

-- Supabase exposes the caller's role on the JWT; policies compare it to 'service_role'.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'role'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.role() RETURNS TEXT AS $body$
        SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated')
      $body$ LANGUAGE sql STABLE;
    $fn$;
  END IF;
END
$$;

-- Supabase ships these roles; GRANT statements throughout the migrations name them.
-- NOLOGIN and unprivileged: they exist so the grants resolve, not to be connected as.
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT', r);
    END IF;
  END LOOP;
END
$$;
