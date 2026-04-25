# Crew Circles: Team Coordination via Dinner Circle Infrastructure

> **Status:** Build Spec (ready for Codex)
> **Author:** Claude Opus 4.6 session, 2026-04-25
> **Persona driver:** Hannah Brooks (multi-chef team operator, scaling beyond solo)
> **Priority:** P1 (enables team scaling, uses existing infrastructure)

---

## Problem

A chef running a team (prep cooks, junior chefs, servers) has no shared coordination surface. Tasks are assigned verbally or via text. No real-time visibility into what is done, pending, or in progress. The chef is the bottleneck for every "what's next?" question.

ChefFlow already has:

- A **staff portal** with task views, station clipboards, recipe access (isolated pages, no shared feed)
- **Dinner Circles** with real-time chat, notifications, polls, photo sharing, notes, SSE sync, zero-auth token access

The bridge: a **Crew Circle** per event that gives staff the same shared coordination surface guests already get, but with ops data instead of social data.

---

## Architecture Decision: Why Crew Circles, Not a New System

1. `hub_groups.group_type` is a plain `text()` column (not an enum). Adding `'crew'` requires zero migrations.
2. `hub_group_members` already supports roles, permissions, notification preferences.
3. SSE realtime, chat, polls, photo sharing, notes board all exist and work.
4. `staff_event_tokens` already provides per-event token-gated access for staff.
5. The public hub view (`/hub/g/{token}`) already renders without auth.

**What we are NOT doing:**

- No new database tables
- No new migrations
- No modifications to the hub_groups schema
- No changes to SSE/realtime infrastructure
- No changes to existing guest-facing circle behavior

---

## What Gets Built

### 1. Server Actions: `lib/hub/crew-circle-actions.ts` (NEW FILE)

Three exported functions:

#### `ensureCrewCircle(eventId: string, tenantId: string): Promise<{ groupToken: string } | null>`

- Idempotent. If a crew circle already exists for this event+tenant, return its token.
- Query: `hub_groups` where `event_id = eventId AND tenant_id = tenantId AND group_type = 'crew'`
- If none, create one:
  - `group_type: 'crew'`
  - `name: 'Crew: {event.occasion || "Event"} - {formatDate(event.event_date)}'`
  - `emoji: null` (crew circles are utilitarian)
  - `visibility: 'private'`
  - `tenant_id: tenantId`
  - `event_id: eventId`
  - Chef added as `role: 'chef'` member (same pattern as `ensureCircleForEvent` lines 906-959 in `lib/hub/chef-circle-actions.ts`)
- Uses `createServerClient({ admin: true })` (works in system contexts)
- Wrapped in try/catch, returns null on failure (non-blocking)

#### `addStaffToCrewCircle(eventId: string, staffMemberId: string, tenantId: string): Promise<void>`

- Finds the crew circle for this event: `hub_groups WHERE event_id = eventId AND tenant_id = tenantId AND group_type = 'crew'`
- If no crew circle exists, call `ensureCrewCircle` first
- Gets or creates a `hub_guest_profiles` row for the staff member:
  - Query `hub_guest_profiles` by `email` matching the staff member's email
  - If no profile, create one with `display_name` from `staff_members.name`, `email` from `staff_members.email`
  - Use `getOrCreateProfile` from `lib/hub/profile-actions.ts` (dynamic import, same pattern as ensureCircleForEvent line 922)
- Add as `hub_group_members` with `role: 'member'`, `can_post: true`, `can_invite: false`, `can_pin: false`
- Upsert on (group_id, profile_id) to be idempotent
- Non-blocking (try/catch, log errors, never throw)

#### `removeStaffFromCrewCircle(eventId: string, staffMemberId: string, tenantId: string): Promise<void>`

- Find crew circle, find staff member's hub profile, delete the hub_group_members row
- Non-blocking

**Pattern to follow:** Copy the structure of `ensureCircleForEvent` at `lib/hub/chef-circle-actions.ts:830-986`. Use the same DB client pattern, same error handling, same dynamic imports.

**Validation rule:** The `CreateGroupSchema` in `lib/hub/group-actions.ts:22` restricts `group_type` to `['circle', 'dinner_club', 'planning', 'bridge', 'community']`. The crew circle actions file must NOT use `createHubGroup` for creation. Instead, insert directly into `hub_groups` via the admin DB client, bypassing the Zod validation. This avoids modifying the shared validation schema.

---

### 2. Wire Into Staff Assignment: Modify `lib/staff/actions.ts`

#### In `assignStaffToEvent` (line 286):

After the successful upsert (after line 327 `return data`), add a non-blocking crew circle call BEFORE the return:

```typescript
// Non-blocking: ensure crew circle exists and add staff member
try {
  const { ensureCrewCircle, addStaffToCrewCircle } = await import('@/lib/hub/crew-circle-actions')
  await ensureCrewCircle(validated.event_id, user.tenantId!)
  await addStaffToCrewCircle(validated.event_id, validated.staff_member_id, user.tenantId!)
} catch (err) {
  console.error('[assignStaffToEvent] crew circle sync failed (non-blocking)', err)
}
```

Place this AFTER `revalidatePath` (line 326) and BEFORE `return data` (line 327).

#### In `removeStaffFromEvent` (line 330):

After the successful delete (after line 352), add:

```typescript
// Non-blocking: remove from crew circle
try {
  const { removeStaffFromCrewCircle } = await import('@/lib/hub/crew-circle-actions')
  await removeStaffFromCrewCircle(eventId, assignmentId, user.tenantId!)
  // Note: assignmentId is used here but we need staff_member_id.
  // We need to query the assignment before deleting to get staff_member_id.
} catch (err) {
  console.error('[removeStaffFromEvent] crew circle sync failed (non-blocking)', err)
}
```

**IMPORTANT FIX:** `removeStaffFromEvent` deletes by `assignmentId`, but `removeStaffFromCrewCircle` needs `staffMemberId`. The assignment row is already deleted by the time we call this. Solution: query the assignment's `staff_member_id` BEFORE the delete, store it in a local variable, then pass it to `removeStaffFromCrewCircle`. This requires moving the query before the delete.

---

### 3. Crew Circle Access for Staff: Modify `lib/hub/group-actions.ts`

The `CreateGroupSchema` Zod validator on line 22 restricts group_type. Do NOT modify this schema. Crew circles bypass it by inserting directly.

The `getGroupByToken` function must already return crew circles since it queries by token without filtering on group_type. Verify this is true (no group_type filter in the select query). If it filters, remove the filter for crew type.

---

### 4. Chef UI: Crew Circle Card on Event Ops Tab

#### New component: `components/events/crew-circle-card.tsx` (NEW FILE)

A small card that shows on the event ops tab. Server component or simple client component.

Props: `eventId: string`, `tenantId: string`

Behavior:

- Query `hub_groups` for `event_id = eventId AND tenant_id = tenantId AND group_type = 'crew'`
- If exists: show card with "Crew Circle" title, member count, link to `/hub/g/{token}` (opens in new tab)
- If not exists: show nothing (crew circle auto-creates on first staff assignment)

Use existing Card component from `@/components/ui/card`. Keep it minimal: name, member count, "Open" link.

#### Wire into ops tab: `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`

Add `CrewCircleCard` alongside the existing `EventStaffPanel`. Import and render it right after the staff panel section. Pass `event.id` and `event.tenant_id`.

---

### 5. Chef Circles Dashboard: Filter Crew Circles

#### Modify `lib/hub/chef-circle-actions.ts`

In `getChefCircles` (line 58), crew circles are already included because the query filters on `tenant_id = tenantId` with no group_type exclusion. They will show up in the chef's circle list automatically.

The `PipelineStage` type (line 11) already covers event-linked circles. Crew circles will get the same pipeline enrichment as regular circles.

**Only change needed:** In the circle dashboard UI (`app/(chef)/circles/page.tsx`), add a visual indicator (badge or label) when `group_type === 'crew'` so the chef can distinguish crew circles from client circles. This is a small conditional in the circle list item rendering.

---

## What Gets EXCLUDED (Explicit Boundaries)

1. **No staff-specific circle view variant.** Staff access the standard `/hub/g/{token}` view. The existing tabs (chat, notes, photos, members) all work for team coordination out of the box. A crew-specific view is a future iteration.
2. **No task-to-circle message sync.** Tasks from `tasks` table are not auto-posted to the crew circle. The chef posts task updates manually in chat. Auto-sync is a future iteration.
3. **No prep timeline in circle.** The prep tab on the event detail page remains the source of truth. Staff are directed there via links, not via circle.
4. **No recipe rendering in circle.** Staff access recipes via the existing staff portal recipe pages.
5. **No migration.** `group_type` is text, not enum. No schema change needed.
6. **No modification to guest circle behavior.** The `'circle'` type is untouched. Crew circles are `'crew'` type and completely separate.

---

## File Inventory (What Gets Created/Modified)

| File                                                          | Action                       | Risk                              |
| ------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| `lib/hub/crew-circle-actions.ts`                              | CREATE                       | None (new file)                   |
| `components/events/crew-circle-card.tsx`                      | CREATE                       | None (new file)                   |
| `lib/staff/actions.ts`                                        | MODIFY (2 functions)         | Low (non-blocking try/catch only) |
| `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` | MODIFY (add import + render) | Low (additive only)               |
| `app/(chef)/circles/page.tsx`                                 | MODIFY (crew badge)          | Low (conditional label)           |

---

## Testing Criteria

1. Assign a staff member to an event. Verify a crew circle row appears in `hub_groups` with `group_type = 'crew'`.
2. Assign a second staff member. Verify they are added to the same crew circle (idempotent).
3. Remove a staff member. Verify they are removed from the crew circle members.
4. Navigate to event ops tab. Verify crew circle card appears with correct member count and working link.
5. Click the crew circle link. Verify the standard hub view loads with chat, notes, photos, members tabs.
6. Chef can post a message in the crew circle. Staff member (if they have the token URL) can see it.
7. Verify existing guest circles (`group_type = 'circle'`) are completely unaffected.
8. Verify `assignStaffToEvent` still succeeds even if crew circle creation fails (non-blocking).

---

## Codex Safety Constraints

- Do NOT modify any Zod schemas in `lib/hub/group-actions.ts`
- Do NOT modify any existing hub_groups queries that filter on group_type
- Do NOT add migrations
- Do NOT modify the hub group view (`hub-group-view.tsx`)
- Do NOT modify any staff portal pages
- All new code in `lib/hub/crew-circle-actions.ts` must use `'use server'` directive
- All DB operations use `createServerClient({ admin: true })`
- All side effects wrapped in try/catch with console.error logging
- Never throw from crew circle operations (non-blocking pattern)
