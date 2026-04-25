# Build Spec: Ticketed Events Migration Fix

> **Scope:** Write ONE migration SQL file. No other files.
> **Risk:** LOW. Additive only. No DROP/DELETE/TRUNCATE.
> **Time:** ~5 minutes.

Read `CLAUDE.md` before starting. Show the developer the full SQL and get explicit approval before writing the file. Remind them to back up the database.

---

## Problem

Migration `database/migrations/20260416000004_event_ticketing.sql` line 101 does:

```sql
ALTER TABLE event_share_settings
  ADD COLUMN IF NOT EXISTS tickets_enabled BOOLEAN NOT NULL DEFAULT false;
```

But `event_share_settings` does not exist. The existing table `event_shares` is for client-created RSVP links (`created_by_client_id NOT NULL`). Ticketing is chef-owned. All existing ticket code in `lib/tickets/*.ts` queries `event_share_settings`. We need to CREATE the table, not fix the code.

Additionally, `event_guests.event_share_id` is `NOT NULL` (set in `database/migrations/20260221000001_layer_7_guest_rsvp.sql` line 58). Ticket buyers don't come through RSVP, so the webhook handler at `lib/tickets/webhook-handler.ts` line 124 inserts without `event_share_id` and fails.

---

## What to Build

Create exactly one file: `database/migrations/20260425000001_ticketed_events_share_settings.sql`

The latest existing migration is `20260424000004`. Use timestamp `20260425000001`.

Verify this by running:

```bash
ls database/migrations/*.sql | tail -3
```

If a file with timestamp `20260425*` already exists, increment the sequence number.

---

## Exact SQL

```sql
-- Fix: Create event_share_settings table for ticketed events.
-- The original migration (20260416000004) tried to ALTER a non-existent table.
-- event_shares = client-created RSVP share links (requires client_id).
-- event_share_settings = chef-created ticketing/public-page config (no client).
-- All existing code in lib/tickets/*.ts already queries event_share_settings.

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

-- Safe trigger creation (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_event_share_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_event_share_settings_updated_at
      BEFORE UPDATE ON event_share_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2. Allow ticket-originated guests (they have no RSVP share link)
ALTER TABLE event_guests ALTER COLUMN event_share_id DROP NOT NULL;

-- 3. Co-host flag on hub circle members
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS is_co_host BOOLEAN NOT NULL DEFAULT false;
```

---

## Verification

After writing the file, confirm:

```bash
# File exists with correct name
ls -la database/migrations/20260425000001_ticketed_events_share_settings.sql

# No syntax errors (basic check)
grep -c 'CREATE TABLE' database/migrations/20260425000001_ticketed_events_share_settings.sql
# Expected: 1

grep -c 'ALTER TABLE' database/migrations/20260425000001_ticketed_events_share_settings.sql
# Expected: 2
```

Do NOT run `drizzle-kit push` or apply the migration. The developer will do that manually.

---

## Rules

- Show full SQL to developer before writing.
- Remind developer to back up database before applying.
- Do NOT modify any other files.
- Do NOT run drizzle-kit push.
- No em dashes in comments (use hyphens).
