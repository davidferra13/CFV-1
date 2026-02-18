# Client Connections — Replacing Households

**Date:** 2026-02-17
**Scope:** Database migration, server actions, UI component, cleanup of Households feature

---

## Why This Change

The Households feature was over-engineered for what chefs actually need. It had:
- Its own dedicated tab/pages (`/households`, `/households/[id]`)
- A two-table schema (`households` + `household_members`)
- A rigid enum of relationship types limited to family contexts (partner, child, family_member, regular_guest)

In practice, chefs need to know **who their clients are connected to and why** — and those connections aren't always family. They could be friends, acquaintances, business partners, referrals, colleagues, etc. The feature also needs to be lightweight (rare usage) and chef-only (clients never see groupings).

---

## What Changed

### New: Client Connections (peer-to-peer)

A single `client_connections` table links two clients with a flexible relationship type:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID FK → chefs | Multi-tenant scoping |
| `client_a_id` | UUID FK → clients | First client |
| `client_b_id` | UUID FK → clients | Second client |
| `relationship_type` | TEXT | Freeform: spouse, friend, family, acquaintance, colleague, etc. |
| `notes` | TEXT | Optional context about the connection |
| `created_at` | TIMESTAMPTZ | When the connection was created |

**Key design decisions:**
- **Bidirectional:** If Sarah is connected to Mike, it shows on both their detail pages
- **Flexible types:** Freeform TEXT (not enum) with UI suggestions for common types
- **No separate pages:** Lives entirely as a compact card on the client detail page
- **Chef-only:** RLS policies restrict to chef role; clients never see groupings
- **One table, not two:** Simpler than the old households + household_members model

### UI: Connections card on client detail page

Replaces the old "Household tag" text input with a full Connections card:
- Lists all connected clients with relationship badges
- "Add Connection" inline form with client dropdown, relationship type picker, optional notes
- Edit and Remove actions on each connection (hover to reveal)
- Links to connected client's detail page

### Removed: Household UI

**Deleted files:**
- `app/(chef)/households/page.tsx` — Households list page
- `app/(chef)/households/[id]/page.tsx` — Household detail page
- `app/(chef)/households/[id]/household-detail-members.tsx` — Member management UI
- `components/households/household-card.tsx`
- `components/households/household-form.tsx`
- `components/households/household-manager.tsx`
- `lib/households/actions.ts` — All household server actions

**Modified files:**
- `components/events/event-form.tsx` — Removed household dropdown
- `lib/events/actions.ts` — Removed `household_id` from create/update schemas
- `app/(chef)/events/new/page.tsx` — Removed household fetching
- `app/(chef)/events/[id]/edit/page.tsx` — Removed household fetching
- `app/(chef)/clients/[id]/page.tsx` — Replaced household tag with Connections component

### Not removed: Database tables

The `households` and `household_members` tables remain in the database. No data was dropped. The tables are simply no longer referenced by any UI or server action.

---

## Migration

**File:** `supabase/migrations/20260221000013_client_connections.sql`

Creates the `client_connections` table with:
- Unique constraint: `(tenant_id, client_a_id, client_b_id)` — one connection per ordered pair
- Check constraint: no self-connections
- Indexes for bidirectional lookups
- RLS policies for chef-only CRUD

**To apply:** `npx supabase db push --linked`

**After applying:** Regenerate types with `npx supabase gen types --lang=typescript --linked > types/database.ts`

---

## Server Actions

**File:** `lib/connections/actions.ts`

| Action | Purpose |
|--------|---------|
| `getClientConnections(clientId)` | Get all connections for a client (from either side) |
| `createConnection({ client_a_id, client_b_id, relationship_type, notes? })` | Create a connection |
| `updateConnection(connectionId, { relationship_type?, notes? })` | Update type/notes |
| `removeConnection(connectionId)` | Delete a connection |

All actions use `requireChef()` and tenant scoping.

---

## Suggested Relationship Types

The UI suggests these common types but accepts any freeform text:
- Spouse, Partner, Friend, Family, Acquaintance, Colleague, Regular Guest, Referral
