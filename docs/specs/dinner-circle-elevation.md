# Spec: Dinner Circle Elevation (Dashboard, Nav, Command Center, Rename)

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (6-8 files)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30
> **Verified:** 2026-03-30 (Playwright screenshots, type check, all tests pass)

---

## What This Does (Plain English)

Dinner Circles become a first-class, always-visible feature in ChefFlow. The chef sees an "Active Dinner Circles" widget on their dashboard showing their circles with unread counts and a quick-create button. Dinner Circles gets its own Command Center card with a live count and quick links. It also gets promoted to a top-level sidebar nav item (primary tier, right after "Clients"). All user-facing labels that say "Hub" are renamed to "Dinner Circle" across the chef app, client portal, and public guest pages.

---

## Why It Matters

Dinner Circles is the container everything lives inside. Every event, every client interaction, every menu, every guest profile connects through it. Right now it's buried 3 clicks deep in the nav under "Network > All Features." A chef should see their active circles the moment they open the dashboard, create new ones in one click, and navigate to them from the sidebar without hunting.

---

## Files to Create

| File                                                      | Purpose                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `app/(chef)/dashboard/_sections/dinner-circles-cards.tsx` | Dashboard widget: active circles list with unread badges, member counts, quick-create CTA |

---

## Files to Modify

| File                                                     | What to Change                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(chef)/dashboard/page.tsx`                          | Add DinnerCirclesCards section between "Respond Next" and "Priority Queue"                                                                                                                                                                                                                                                                 |
| `components/dashboard/command-center.tsx`                | Add "Dinner Circles" as a Command Center card (Row 1, after "Clients") with count + quick links                                                                                                                                                                                                                                            |
| `app/(chef)/dashboard/_sections/command-center-data.tsx` | Fetch `circles` count from `hub_groups` table (active, tenant-scoped)                                                                                                                                                                                                                                                                      |
| `components/navigation/nav-config.tsx`                   | (1) Add Dinner Circles to `standaloneTop` after Clients. (2) Remove from Network group (line 1147-1150). (3) Rename `'Hub Overview'` to `'Dinner Circle Overview'` (line 1280). (4) Rename `'Hub Groups'` to `'Dinner Circle Groups'` in admin section (line 1519). (5) Rename `'Community'` to `'Circles'` in actionBarItems (line 1975). |
| `app/(chef)/circles/page.tsx`                            | Update subtitle copy from "All your client conversations in one place" to "Every dinner, every guest, one place"                                                                                                                                                                                                                           |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`     | Line 246: rename `"My Hub"` link text to `"My Profile"` (only user-visible "Hub" text in this file)                                                                                                                                                                                                                                        |
| `app/(chef)/social/hub-overview/hub-overview-client.tsx` | Line 43: `"Social Event Hub"` to `"Dinner Circle Admin"`. Line 111: `"Recent Hub Activity"` to `"Recent Circle Activity"`. Line 114: `"No hub activity yet"` to `"No circle activity yet"`.                                                                                                                                                |
| `lib/hub/chef-circle-actions.ts`                         | Add optional `limit` parameter to `getChefCircles()` to cap results for dashboard performance (avoids N+1 unread queries for all 50+ circles when dashboard only needs 4)                                                                                                                                                                  |

---

## Database Changes

None. All data already exists in `hub_groups`, `hub_group_members`, `hub_messages`. The dashboard widget uses existing server actions.

---

## Data Model

No changes. Existing model:

- `hub_groups` (tenant_id, group_token, name, emoji, is_active, message_count, last_message_at, event_id, inquiry_id)
- `hub_group_members` (group_id, profile_id, role, last_read_at)
- `hub_messages` (group_id, created_at, deleted_at)

---

## Server Actions

One modification to an existing server action. No new actions.

| Action                     | Auth            | Used By                           | Change                                                                                                                                                                                                                                                                                                      |
| -------------------------- | --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getChefCircles(options?)` | `requireChef()` | Dashboard widget, `/circles` page | Add optional `{ limit?: number }` parameter. When limit is set, cap the DB query with `.limit(limit)` and skip the N+1 unread count queries (just use `last_message_at > last_read_at` as a boolean `has_unread` flag instead). When no limit, behavior unchanged (full unread counts for `/circles` page). |
| `getCirclesUnreadCount()`  | `requireChef()` | Nav badge (already exists)        | No change                                                                                                                                                                                                                                                                                                   |

**Dashboard widget data fetch**: Calls `getChefCircles({ limit: 4 })` to get only the 4 most recent circles without expensive per-circle unread count queries.

**Command Center count**: New count query added to `command-center-data.tsx` using `safeCount(db, 'hub_groups', 'tenant_id', tid, q => q.eq('is_active', true))`.

**Performance note**: `getChefCircles()` currently runs a COUNT query per circle for unread messages (N+1 pattern, see `chef-circle-actions.ts:84-109`). For the dashboard showing 4 circles, this means at most 4 extra queries (acceptable). For the full `/circles` page with many circles, the existing behavior continues. The `limit` parameter prevents the dashboard from triggering 50+ queries for a chef with many circles.

---

## UI / Component Spec

### 1. Dashboard Widget: `DinnerCirclesCards`

**Position**: After "Respond Next", before "Priority Queue" section. Full-width (col-span-4).

**Layout**:

- Section label: "Dinner Circles"
- Top-right: "New Circle" button (link to `/circles` with create modal, or inline) + "View All" link to `/circles`
- Grid of up to 4 circle cards (horizontal scroll on mobile)
- Each card shows: emoji + name, member count, unread badge (if > 0), last message preview (truncated), time since last activity

**Card structure**:

```
[emoji] Circle Name                    [3 unread]
4 members - "Looking forward to..."    2h ago
```

### States

- **Loading:** `WidgetCardSkeleton` (2 cards)
- **Empty:** "No active Dinner Circles yet. Create one for your next event." with "Create Circle" button linking to `/circles`
- **Error:** Widget silently fails (returns null, like other dashboard sections). Uses `safe()` wrapper.
- **Populated:** Up to 4 most recent circles sorted by last_message_at DESC

### 2. Command Center Card

**Position**: Row 1, index 3 (after Clients, before Quotes). This puts it in the core daily workflow row.

**Card data**:

```typescript
{
  label: 'Dinner Circles',
  href: '/circles',
  icon: MessagesSquare,
  color: '#f97316',  // orange, distinct from existing cards
  description: 'Guest groups, chat, and event coordination',
  count: counts.circles,
  countLabel: 'active',
  quickLinks: [
    { label: 'All Circles', href: '/circles' },
    { label: 'New Circle', href: '/circles?create=true' },
    { label: 'Social Feed', href: '/circles?tab=feed' },
  ],
}
```

### 3. Sidebar Nav Item

**Add to `standaloneTop`** at index 4 (after Clients, before Culinary):

```typescript
{
  href: '/circles',
  label: 'Dinner Circles',
  icon: MessagesSquare,
  coreFeature: true,
  tier: 'primary',
  subMenu: [
    { href: '/circles', label: 'All Circles' },
    { href: '/circles?tab=feed', label: 'Social Feed' },
  ],
}
```

**Remove** the Dinner Circles item from the `network` nav group (line 1147-1150 in nav-config.tsx) to avoid duplication.

### 4. UI Rename: "Hub" to "Dinner Circle"

All user-facing strings. Internal code (variable names, file paths, table names) stay as-is.

**IMPORTANT: Only change the exact strings listed below. Do NOT modify files that don't have "Hub" in their visible UI. The join page (`/hub/join/`) and profile page (`/hub/me/`) do NOT contain user-visible "Hub" text and should NOT be touched.**

| File                      | Line | Current Text                   | New Text                   |
| ------------------------- | ---- | ------------------------------ | -------------------------- |
| `hub-group-view.tsx`      | 246  | `"My Hub"`                     | `"My Profile"`             |
| `hub-overview-client.tsx` | 43   | `"Social Event Hub"`           | `"Dinner Circle Admin"`    |
| `hub-overview-client.tsx` | 111  | `"Recent Hub Activity"`        | `"Recent Circle Activity"` |
| `hub-overview-client.tsx` | 114  | `"No hub activity yet"`        | `"No circle activity yet"` |
| `nav-config.tsx`          | 1280 | `'Hub Overview'`               | `'Dinner Circle Overview'` |
| `nav-config.tsx`          | 1519 | `'Hub Groups'`                 | `'Dinner Circle Groups'`   |
| `nav-config.tsx`          | 1975 | `'Community'` (for `/circles`) | `'Circles'`                |

**Routes stay the same** (`/hub/g/...`, `/my-hub/...`). Only labels change. Route changes would break existing shared links.

---

## Edge Cases and Error Handling

| Scenario                             | Correct Behavior                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Chef has 0 circles                   | Dashboard widget shows empty state with "Create Circle" CTA                       |
| Chef has 50+ circles                 | Dashboard shows top 4 by recent activity; "View All" links to `/circles`          |
| `getChefCircles()` fails             | Widget returns null (invisible), does not break dashboard. Uses `safe()` wrapper. |
| Circle count fails in Command Center | Shows 0 (existing `safeCount` pattern handles this)                               |
| Chef is not admin                    | All circles features visible (circles are not admin-only)                         |

---

## Implementation Order

1. Modify `getChefCircles()` in `lib/hub/chef-circle-actions.ts` to accept optional `{ limit }` param
2. Add `circles` count to `command-center-data.tsx` (data layer)
3. Add Dinner Circles card to `command-center.tsx` (UI, index 3 after Clients)
4. All 5 nav-config.tsx changes (standaloneTop insert, network removal, 3 renames)
5. Create `dinner-circles-cards.tsx` dashboard widget component
6. Add widget to `dashboard/page.tsx`
7. Update `circles/page.tsx` subtitle
8. Apply all 4 hub-overview-client.tsx renames
9. Apply hub-group-view.tsx "My Hub" rename
10. Type check + build check

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/dashboard`
3. Verify: "Dinner Circles" section appears between "Respond Next" and "Priority Queue"
4. Verify: If no circles exist, empty state shows with "Create Circle" link
5. Verify: Command Center has a "Dinner Circles" card with orange icon
6. Verify: Sidebar shows "Dinner Circles" in the primary nav (after Clients)
7. Verify: Clicking sidebar "Dinner Circles" navigates to `/circles`
8. Navigate to `/circles` - verify page title says "Dinner Circles"
9. Navigate to `/social/hub-overview` - verify title says "Dinner Circle Admin", "Recent Circle Activity"
10. Open any circle via `/hub/g/{token}` - verify "My Hub" link now says "My Profile"
11. Verify Action Bar shows "Circles" (not "Community") for the `/circles` shortcut
12. Screenshot all changes

---

## Out of Scope

- Standalone circle creation wizard (separate spec: creating circles from dashboard without an existing event/inquiry)
- "Repeat/Clone" flow for spinning new circles from existing ones (separate spec)
- Notification pipeline (email digests, web push) (separate spec)
- Auto-creation of circles for all events (separate spec)
- Client portal `/my-hub` rename (routes would break bookmarks; needs redirect strategy, separate spec)
- Backfilling existing events without circles (separate spec)

---

## Notes for Builder Agent

- **Dashboard pattern**: Follow the exact same Suspense + WidgetErrorBoundary + safe() pattern used by every other dashboard section. See `HeroMetrics`, `PriorityQueueSection`, `TouchpointsSection` for examples.
- **Command Center**: The `getFeatureAreas()` function returns an array of objects. Insert the Dinner Circles card at index 3 (after Clients). Add `circles` to the `CommandCenterProps['counts']` type and the `safeCount` parallel fetch.
- **Nav config has 5 changes**: (1) standaloneTop insert, (2) network group removal, (3) line 1280 rename, (4) line 1519 rename, (5) line 1975 rename. Do all 5 in one edit session.
- **`getChefCircles()` modification**: Add `limit` parameter. When limit is set, add `.limit(limit)` to the DB query and replace the per-circle unread COUNT with a simple boolean check (`last_message_at > last_read_at`). The full `/circles` page calls without limit (existing behavior preserved).
- **Rename scope**: ONLY change the 7 exact strings in the rename table. Do NOT open files that aren't in the table. Do NOT rename component names, variable names, file paths, or routes.
- **No em dashes**: Per CLAUDE.md, never use em dashes anywhere in UI copy.
- **Icon color**: Use `#f97316` (orange) for the Command Center card. This is distinct from all other cards.
- **Each circle card on the dashboard should link to `/hub/g/{group_token}`** (the full circle experience), not to `/circles`.
- **`resolveStandaloneTop()` at nav-config.tsx:1940**: Chefs with customized nav preferences won't auto-see the new item. This is expected and acceptable. The item will appear in their "customize nav" options.
