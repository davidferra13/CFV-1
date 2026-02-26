# Admin Dashboard — Implementation Reference

**Branch:** `fix/grade-improvements`
**Status:** Complete — TypeScript clean, build compiles

---

## What Was Built

A full platform command center at `/admin` giving god-mode visibility over all chef tenants, clients, events, finances, and system health. Access is restricted to email addresses listed in `ADMIN_EMAILS` env var.

---

## Route Map

| Route                   | Page           | Purpose                                           |
| ----------------------- | -------------- | ------------------------------------------------- |
| `/admin`                | Overview       | Platform KPIs — total chefs, clients, events, GMV |
| `/admin/presence`       | Live Presence  | Real-time who's on the site (Supabase Realtime)   |
| `/admin/users`          | Chef List      | All chef accounts with event/client/GMV counts    |
| `/admin/users/[chefId]` | Chef Detail    | Events, clients, ledger for one chef              |
| `/admin/clients`        | Client List    | All clients across all tenants                    |
| `/admin/analytics`      | Analytics      | Growth by month, revenue by month                 |
| `/admin/financials`     | Financials     | Platform GMV, expense overview, ledger entries    |
| `/admin/events`         | All Events     | Every event across every chef                     |
| `/admin/audit`          | Audit Log      | Immutable record of sensitive actions             |
| `/admin/system`         | System Health  | Table row counts, zombie events, orphaned records |
| `/admin/communications` | Communications | Announcement banner, direct email (UI scaffolded) |
| `/admin/flags`          | Feature Flags  | Per-chef feature toggles                          |

---

## Access Control

```typescript
// lib/auth/admin.ts
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)

export async function requireAdmin(): Promise<AdminUser>
export async function isAdmin(): Promise<boolean>
```

**Setup required:**

1. Add `ADMIN_EMAILS=your@email.com` to `.env.local`
2. Add same to Vercel environment variables (Production + Preview)

No database changes required — purely env-var driven.

---

## Real-Time Presence

### How It Works

1. `<PresenceBeacon />` is rendered in the root `app/layout.tsx` — runs on every page for every visitor (anonymous + authenticated)
2. It generates a stable `sessionId` in `sessionStorage` (persists for the browser tab)
3. On mount it subscribes to the `site:presence` Supabase Realtime channel and calls `.track()` with:
   - `sessionId`, `userId`, `email`, `role` (`authenticated` | `anonymous`)
   - `page` (updates on every route change via `usePathname()`)
   - `joinedAt`, `userAgent`, `referrer`
4. On tab close, Realtime automatically removes the presence entry
5. `AdminPresencePanel` (client component on `/admin/presence`) subscribes to the same channel and renders the live state

### Presence Channel

```
CHANNEL_NAME = 'site:presence'
```

No database storage — purely in-memory via Supabase Realtime presence. Nothing persists after tab close.

---

## Key Files

### Server Libraries

| File                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `lib/auth/admin.ts`           | `requireAdmin()` + `isAdmin()` — env-var email gate      |
| `lib/admin/platform-stats.ts` | All cross-tenant query functions (uses service role key) |
| `lib/admin/audit.ts`          | `logAdminAction()` — append to `admin_audit_log`         |

### Components

| File                                        | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `components/admin/admin-sidebar.tsx`        | Dark slate-900 sidebar, 11 nav items, `'use client'` |
| `components/admin/presence-beacon.tsx`      | Silent tracker, renders null, `'use client'`         |
| `components/admin/admin-presence-panel.tsx` | Live presence viewer, `'use client'`                 |

### Layout

| File                     | Purpose                               |
| ------------------------ | ------------------------------------- |
| `app/(admin)/layout.tsx` | `requireAdmin()` gate + sidebar shell |

---

## Database Migrations

Two new migrations applied to remote Supabase:

### `20260306000010_admin_audit_log.sql`

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT now() NOT NULL,
  actor_email TEXT,
  actor_user_id UUID,
  action_type TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  details JSONB,
  ip_address TEXT
);
-- No-delete rule + update-blocking trigger + RLS (service role only)
```

### `20260306000011_chef_feature_flags.sql`

```sql
CREATE TABLE chef_feature_flags (
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chef_id, flag_name)
);
-- Chefs can read their own flags; admin writes via service role
```

**Note:** These tables are NOT yet in `types/database.ts` (auto-generated). Queries against them use `as any` casts in `platform-stats.ts` and `audit.ts`. Run `supabase gen types typescript --linked` after applying migrations to generate updated types.

---

## Middleware

`middleware.ts` was updated to let `/admin/*` routes pass through without chef/client enforcement:

```typescript
const isAdminRoute = adminPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
if (isAdminRoute) {
  return response
}
```

Auth/role enforcement for admin happens in `app/(admin)/layout.tsx` via `requireAdmin()`.

---

## Known Limitations / Coming Soon

- **Announcement banner** (Communications page): UI is scaffolded but disabled. Needs `platform_settings` table to store the message.
- **Direct email + broadcast** (Communications page): UI scaffolded but disabled. Needs email infrastructure integration.
- **Feature flag toggles** (Flags page): Read-only display. Toggle actions need server actions wired up.
- **`entry_type` 'expense'**: Not in current ledger enum. Expense-related filters return 0 until schema adds this type. Valid current types: `payment | deposit | installment | final_payment | tip | refund | adjustment | add_on | credit`.
- **Chef detail danger zone**: "Deactivate account" is noted as coming soon.
- **`types/database.ts`**: Does not yet reflect `admin_audit_log` or `chef_feature_flags` tables. Run type generation after migrations are applied.

---

## Connecting to System Architecture

- **Tenant isolation**: Admin uses `createAdminClient()` (service role key) — bypasses RLS deliberately. All other portal code uses session-scoped clients.
- **AI Policy**: Admin panel is read-only observation. No AI features here; no automated mutations.
- **Immutability**: `admin_audit_log` has a no-delete rule enforced at DB level. Once written, cannot be removed.
- **Presence vs. session tracking**: Presence is ephemeral (Realtime, in-memory). If you need persistent visitor history, that would require a separate `page_views` table.
