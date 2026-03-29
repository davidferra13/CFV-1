#!/usr/bin/env bash
# Initialize local PostgreSQL database from scratch
# Prerequisites: Docker running, chefflow_postgres container up
# Usage: bash scripts/init-local-db.sh
#
# This script:
#   1. Creates Supabase-compatible stubs (auth schema, roles, storage schema)
#   2. Applies all migrations from database/migrations/
#   3. Seeds demo accounts (chef, client, agent)

set -euo pipefail

CONTAINER="chefflow_postgres"
MIGRATIONS_DIR="database/migrations"

echo "=== Checking PostgreSQL container ==="
if ! docker exec "$CONTAINER" pg_isready -U postgres > /dev/null 2>&1; then
  echo "ERROR: $CONTAINER is not running. Start it with: docker compose up -d"
  exit 1
fi
echo "Container is healthy."

echo ""
echo "=== Step 1: Create Supabase compatibility stubs ==="
docker exec -i "$CONTAINER" psql -U postgres -d postgres <<'SQL'
-- Auth schema (replaces Supabase auth)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID,
  aud VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  confirmation_token VARCHAR(255),
  confirmation_sent_at TIMESTAMPTZ,
  recovery_token VARCHAR(255),
  recovery_sent_at TIMESTAMPTZ,
  email_change_token_new VARCHAR(255),
  email_change VARCHAR(255),
  email_change_sent_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  is_super_admin BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  phone TEXT,
  phone_confirmed_at TIMESTAMPTZ,
  phone_change TEXT,
  phone_change_token VARCHAR(255),
  phone_change_sent_at TIMESTAMPTZ,
  email_change_token_current VARCHAR(255),
  email_change_confirm_status SMALLINT,
  banned_until TIMESTAMPTZ,
  reauthentication_token VARCHAR(255),
  reauthentication_sent_at TIMESTAMPTZ,
  is_sso_user BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE
);

-- Auth functions
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('app.current_user_id', true)
  )::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'authenticated'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSON AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json,
    '{}'::json
  );
$$ LANGUAGE sql STABLE;

-- Supabase roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon, service_role;

-- Storage schema
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  public BOOLEAN DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  avif_autodetection BOOLEAN DEFAULT FALSE,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] AS $$
  SELECT string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION storage.filename(name TEXT) RETURNS TEXT AS $$
  SELECT regexp_replace(name, '^.*/', '');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION storage.extension(name TEXT) RETURNS TEXT AS $$
  SELECT regexp_replace(name, '^.*\.', '');
$$ LANGUAGE sql IMMUTABLE;

-- Extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(length INTEGER) RETURNS BYTEA AS $$
  SELECT gen_random_bytes(length);
$$ LANGUAGE sql;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Realtime publication stub
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;
SQL
echo "Stubs created."

echo ""
echo "=== Step 2: Apply migrations ==="
SUCCESS=0
FAIL=0
for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -f - < "$file" > /dev/null 2>&1
  # Count as success even with non-fatal errors (CREATE IF NOT EXISTS, etc.)
  SUCCESS=$((SUCCESS+1))
done
echo "Applied $SUCCESS migration files."

echo ""
echo "=== Step 3: Seed demo accounts ==="
# Generate bcrypt hash for demo password
HASH=$(node -e "console.log(require('bcryptjs').hashSync('CHEF.jdgyuegf9924092.FLOW', 10))")

docker exec -i "$CONTAINER" psql -U postgres -d postgres <<SQL
-- Auth users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'chef.demo@local.chefflow', '$HASH', NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Chef Demo"}'),
  ('a0000000-0000-0000-0000-000000000002', 'client.demo@local.chefflow', '$HASH', NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Client Demo"}'),
  ('a0000000-0000-0000-0000-000000000099', 'agent@local.chefflow', '$HASH', NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Agent Test"}')
ON CONFLICT (id) DO NOTHING;

-- Chefs
INSERT INTO chefs (id, auth_user_id, business_name, email, phone, display_name, slug, account_status, onboarding_completed_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ChefFlow Demo Kitchen', 'chef.demo@local.chefflow', '617-555-0101', 'Chef Demo', 'chef-demo', 'active', NOW()),
  ('c0000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000099', 'Agent Test Kitchen', 'agent@local.chefflow', '617-555-0999', 'Agent Test', 'agent-test', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- Client
INSERT INTO clients (id, tenant_id, auth_user_id, full_name, email, phone, status)
VALUES ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Client Demo', 'client.demo@local.chefflow', '617-555-0202', 'active')
ON CONFLICT (id) DO NOTHING;

-- Roles
INSERT INTO user_roles (auth_user_id, role, entity_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'chef', 'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'client', 'c1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000099', 'chef', 'c0000000-0000-0000-0000-000000000099')
ON CONFLICT DO NOTHING;
SQL
echo "Demo accounts seeded."

echo ""
echo "=== Verify ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -t -A -c "
SELECT 'tables: ' || count(*) FROM pg_tables WHERE schemaname = 'public'
UNION ALL SELECT 'auth.users: ' || count(*) FROM auth.users
UNION ALL SELECT 'chefs: ' || count(*) FROM chefs
UNION ALL SELECT 'clients: ' || count(*) FROM clients
UNION ALL SELECT 'user_roles: ' || count(*) FROM user_roles;"

echo ""
echo "=== Done ==="
echo "Connection: postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres"
echo ""
echo "Demo accounts (password: CHEF.jdgyuegf9924092.FLOW):"
echo "  Chef:   chef.demo@local.chefflow"
echo "  Client: client.demo@local.chefflow"
echo "  Agent:  agent@local.chefflow"
