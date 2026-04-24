# Codex Task: Write One Migration File for Ticketed Events

## Rules Before You Start

1. Read `CLAUDE.md` at the project root. Follow its rules.
2. You are writing ONE file. Do not edit, delete, or create any other file.
3. Do NOT run `drizzle-kit push` or apply the migration. Only write the file.
4. Show the full SQL to the developer and get approval before writing.
5. Remind the developer to back up the database before applying.

## The Problem

Migration `database/migrations/20260416000004_event_ticketing.sql` line 1 does:

```sql
ALTER TABLE event_share_settings ...
```

But `event_share_settings` does not exist. It was never created. Every file in `lib/tickets/*.ts` queries this table. The app crashes when any ticket feature is used.

Additionally, `event_guests.event_share_id` is `NOT NULL` but ticket buyers do not come through the RSVP flow, so the webhook handler at `lib/tickets/webhook-handler.ts` line 125 fails on insert.

## What to Do

### Step 1: Find the correct timestamp

Run:

```bash
ls database/migrations/*.sql | tail -1
```

Take the timestamp from the last file. Your new file must use a timestamp STRICTLY HIGHER. If the last file is `20260425000001_*.sql`, name yours `20260425000002_ticketed_events_share_settings.sql`.

### Step 2: Write the file

Create `database/migrations/{your-timestamp}_ticketed_events_share_settings.sql` with this exact SQL:

```sql
-- Fix: Create event_share_settings table for ticketed events.
-- Original migration (20260416000004) tried to ALTER a table that was never created.
-- event_shares = client-created RSVP share links (requires client_id).
-- event_share_settings = chef-created ticketing config (no client needed).
-- All code in lib/tickets/*.ts already queries event_share_settings.

-- 1. Chef-owned public event page + ticketing configuration
CREATE TABLE IF NOT EXISTS event_share_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  share_token     TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  tickets_enabled BOOLEAN NOT NULL DEFAULT false,
  show_menu       BOOLEAN NOT NULL DEFAULT true,
  show_date       BOOLEAN NOT NULL DEFAULT true,
  show_location   BOOLEAN NOT NULL DEFAULT true,
  show_chef_name  BOOLEAN NOT NULL DEFAULT true,
  show_guest_list BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_ess_event ON event_share_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_ess_tenant ON event_share_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ess_token ON event_share_settings(share_token);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_event_share_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_event_share_settings_updated_at
      BEFORE UPDATE ON event_share_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2. Allow ticket-originated guests (no RSVP share link)
ALTER TABLE event_guests ALTER COLUMN event_share_id DROP NOT NULL;

-- 3. Co-host flag for hub circle members
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS is_co_host BOOLEAN NOT NULL DEFAULT false;
```

### Step 3: Verify

```bash
# File exists
ls -la database/migrations/*ticketed_events_share_settings.sql

# Correct SQL structure
grep -c 'CREATE TABLE' database/migrations/*ticketed_events_share_settings.sql
# Expected: 1

grep -c 'ALTER TABLE' database/migrations/*ticketed_events_share_settings.sql
# Expected: 2
```

## What NOT to Do

- Do NOT edit any existing migration file.
- Do NOT edit any TypeScript file.
- Do NOT run drizzle-kit push.
- Do NOT create more than one file.
- Do NOT use em dashes in SQL comments (use hyphens).
