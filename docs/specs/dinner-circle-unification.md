# Spec: Dinner Circle Unification & Chef-to-Chef Collaboration

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none (builds on existing hub_groups + chef network infra)
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-24 00:00 | Planner (Opus 4.6) |        |
| Status: ready         |                  |                    |        |
| Claimed (in-progress) |                  |                    |        |
| Build completed       |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

### Raw Signal

"I have a chef friend with his own business. I want a private space where we share recipes, clients, co-plan events, split purchasing, communicate, all within ChefFlow."

Two systems exist that do related things but are completely isolated:

- Dinner Circles (hub_groups) handle chef-to-guest communication around events
- Chef Network (chef_connections, chef_network_contact_shares, event_collaborators) handles professional chef-to-chef connections, referrals, handoffs, and recipe sharing

The real need is a Chef-to-Chef Circle: a persistent private collaboration space between connected chefs. Not a new social network, not a Slack clone. A controlled window into each other's operations where you can share specific recipes, coordinate on co-hosted events, split purchases, and talk shop. Privacy is paramount: tenant isolation must not break. Sharing is opt-in and revocable.

Seven circle types total: chef-client (built), community (built), dinner club (built), chef-chef (new, primary focus), chef-vendor (future), chef-staff (future), event circle for multi-chef events (new).

### Developer Intent

- **Core goal:** Unify the hub and network systems through a Chef-to-Chef Circle that gives connected chefs a persistent, private collaboration space built on existing infrastructure
- **Key constraints:** Zero new tables if possible. Tenant isolation must hold. Shared content is referenced, not copied. Chef Network flows INTO circles, never rebuilt. Privacy: leaving revokes all access
- **Motivation:** The bridge between hub_groups and chef_connections exists only in intro bridges. Real chefs who are friends need an ongoing workspace, not point-to-point actions
- **Success from the developer's perspective:** Two connected chefs can create a circle, share recipes with attribution, share client leads with consent, co-plan events with a shared prep/shopping view, coordinate co-purchasing, and communicate, all within the existing hub infrastructure

---

## What This Does (Plain English)

Connected chefs can create a Chef-to-Chef Circle: a persistent, private collaboration space. Inside the circle, they can share recipes (read-only with import option), share client referrals (upgrading the existing contact share flow), co-plan events (shared visibility into event details, prep lists, and grocery lists), coordinate co-purchasing ("I'm buying 20 lbs wagyu, want to split?"), and communicate via the existing hub messaging system. When a co-hosted event is created between circle members, an Event Circle automatically links to give both chefs operational access. Leaving a circle revokes all shared access.

---

## Why It Matters

Chefs who are friends and business allies currently use text messages, phone calls, and separate apps to coordinate. ChefFlow has the infrastructure on both sides (circles for communication, network for trust) but no bridge for ongoing collaboration. This spec makes ChefFlow the place where chefs work together, not just work alone.

---

## Circle Type Taxonomy (All 7)

| #   | Type                      | group_type value | Status  | tenant_id | Purpose                                                           |
| --- | ------------------------- | ---------------- | ------- | --------- | ----------------------------------------------------------------- |
| 1   | Chef-Client               | `circle`         | BUILT   | chef's    | Event communication, menu polling, lifecycle notifications        |
| 2   | Community                 | `community`      | BUILT   | NULL      | Public food circles, discovery, any authenticated user            |
| 3   | Dinner Club               | `dinner_club`    | BUILT   | chef's    | Multi-event persistent groups, recurring guests                   |
| 4   | **Chef-Chef**             | `chef_collab`    | **NEW** | NULL      | Private professional collaboration between connected chefs        |
| 5   | Chef-Vendor               | `chef_vendor`    | FUTURE  | chef's    | Extension point only (not in this spec)                           |
| 6   | Chef-Staff                | `chef_staff`     | FUTURE  | chef's    | Extension point only (not in this spec)                           |
| 7   | Event Circle (multi-chef) | `event_collab`   | **NEW** | chef's    | Co-hosted event ops circle, auto-created from event_collaborators |

### Why `tenant_id = NULL` for Chef-Chef Circles

Chef-Client circles are tenant-scoped because one chef owns the relationship. Chef-Chef circles span two (or more) tenants as peers. Setting `tenant_id = NULL` follows the same pattern as community circles ([community-circle-actions.ts:84](lib/hub/community-circle-actions.ts#L84)). Access is controlled via `hub_group_members`, not tenant scoping.

### Why `event_collab` is a Separate Type from `circle`

A co-hosted event needs both chefs to have operational access (prep lists, shopping lists, financial split view). The `event_collab` type signals that this circle has multi-chef event semantics: both chefs' hub profiles get `chef` role, and the event appears in both chefs' dashboards via `event_collaborators`.

---

## Chef-to-Chef Circle Deep Design

### Creating a Chef-Chef Circle

**Prerequisite:** An accepted `chef_connections` row must exist between the two chefs ([chef_friends_network.sql:36-60](database/migrations/20260221000002_chef_friends_network.sql#L36-L60)). The `assertConnected()` helper in [collaboration/actions.ts:38-54](lib/collaboration/actions.ts#L38-L54) validates this.

**Flow:**

1. Chef A navigates to `/network` and clicks "Create Circle" on Chef B's connection card
2. Server action creates a `hub_groups` row with `group_type = 'chef_collab'`, `tenant_id = NULL`, `visibility = 'private'`
3. Both chefs are added as `hub_group_members` with `role = 'chef'`, full permissions (`can_post`, `can_invite`, `can_pin` all true)
4. System message posted: "{Chef A} created a collaboration circle with {Chef B}"
5. Chef B gets an in-app notification + email with circle link

**Multi-chef circles:** A chef-chef circle can have more than 2 members. Any `chef`-role member can invite another connected chef. The connection gate applies per invite (inviter must be connected to invitee).

### Recipe Sharing in Circle Context

**Current state:** `recipe_shares` table ([collaboration_system.sql:84-118](database/migrations/20260304000008_chef_collaboration_system.sql#L84-L118)) handles point-to-point sharing. On accept, `deepCopyRecipe()` ([collaboration/actions.ts:683-798](lib/collaboration/actions.ts#L683-L798)) creates an editable copy in the recipient's namespace.

**New behavior:** When sharing a recipe inside a chef-chef circle, the flow uses the existing `recipe_shares` infrastructure but adds circle context:

1. Chef A clicks "Share Recipe" in the circle, picks from their recipe book
2. Creates a `hub_circle_shared_recipes` junction row (circle_id, recipe_id, shared_by_chef_id)
3. Posts a `recipe_share` message to the circle with recipe metadata (name, course, dietary tags)
4. Other circle members see the recipe card in the feed (read-only preview: name, ingredients, method summary)
5. Any member can click "Import to My Recipes" which triggers the existing `deepCopyRecipe()` flow with attribution
6. Original recipe is never exposed beyond the preview. Full recipe detail requires import.

**Privacy:** When a chef leaves the circle, their `hub_circle_shared_recipes` rows are soft-deleted (revoked). The recipe cards in the feed show "Recipe no longer shared" instead of content. Already-imported copies are unaffected (they are independent deep copies).

### Client Sharing in Circle Context

**Current state:** `chef_network_contact_shares` ([contact_shares.sql](database/migrations/20260223000010_chef_network_contact_shares.sql)) handles direct referral sharing with status tracking.

**New behavior:** Client sharing in a circle upgrades the existing contact share into a circle-contextualized referral:

1. Chef A clicks "Share a Lead" in the circle
2. Fills in: client name, phone, email, event details, notes (same fields as `chef_network_contact_shares`)
3. Creates a `chef_network_contact_shares` row with an additional `circle_group_id` reference
4. Posts a `client_referral` message to the circle feed with sanitized preview (name, occasion, date, location; no phone/email in the feed message)
5. Circle members with `chef` role can view full contact details via a "View Details" action
6. Accepting/passing uses the existing status flow on `chef_network_contact_shares`

**Client consent:** When a chef shares a client who is an existing `clients` row in their tenant, a consent flag is recorded. The client receives an email: "Chef A shared your contact info with Chef B for [occasion]. If this was not expected, contact Chef A." This is informational, not blocking. The chef owns the referral relationship.

### Co-Hosted Events

**Current state:** `event_collaborators` ([collaboration_system.sql:17-59](database/migrations/20260304000008_chef_collaboration_system.sql#L17-L59)) manages cross-chef event access with roles and JSONB permissions. `inviteChefToEvent()` ([collaboration/actions.ts:122-236](lib/collaboration/actions.ts#L122-L236)) handles invitations. No shared communication channel exists.

**New behavior:** When Chef A invites Chef B (a circle member) to collaborate on an event:

1. The existing `inviteChefToEvent()` flow runs as-is
2. After acceptance, the system creates (or adopts) a `hub_groups` row with `group_type = 'event_collab'`, `event_id` set, `tenant_id` = event owner's tenant
3. Both chefs are added as `hub_group_members` with `role = 'chef'`
4. If the event already has a standard `circle`-type dinner circle, it is upgraded in-place: `group_type` changes to `event_collab`, collaborating chef is added as `chef` role
5. The event circle links to the chef-chef circle via a "parent circle" reference in the `hub_circle_shared_recipes` junction (for recipe context)
6. Both chefs see the event in their respective dashboards
7. Shared views: prep timeline, grocery list (read access to both chefs' lists for this event), dietary dashboard

**Financial split:** Per the existing `event_collaborators.permissions.can_view_financials` flag. Revenue split details are stored in `event_collaborators.permissions` as additional fields (`revenue_split_pct`). The ledger stays single-tenant; split is a display-layer calculation, not a ledger mutation.

**Compatibility with ticketed events:** The `event_collab` circle is compatible with [ticketed-events-and-distribution.md](docs/specs/ticketed-events-and-distribution.md). The co-host circle admin bridge described in Phase 3 of that spec maps directly to the `chef` role in the `event_collab` circle. No conflict.

### Co-Purchasing

**Not a procurement system.** Co-purchasing is a coordination tool inside the circle:

1. Chef A posts a `co_purchase` message type: "Buying 20 lbs wagyu from [supplier]. Want to split?"
2. The message includes: item name, quantity, unit price, supplier (optional), deadline
3. Circle members reply with their desired quantity
4. Chef A confirms the split and posts an update
5. No financial transaction between chefs inside ChefFlow. Payment is handled externally. ChefFlow tracks the coordination, not the money.

**Implementation:** This is a structured message type in `hub_messages`, not a new table. The `system_metadata` JSONB field holds: `{ type: 'co_purchase', item, quantity, unit, unit_price_cents, supplier, deadline, responses: [{ chef_id, quantity }] }`.

### Communication

All communication uses the existing `hub_messages` infrastructure ([hub types](lib/hub/types.ts#L113-L170)). Message types: text, image, system, poll, note, photo_share. SSE realtime via the existing `useSSE()` hook. Circle-first notifications via [circle-first-notify.ts](lib/hub/circle-first-notify.ts).

### Permissions Model Per Circle Type

| Permission     | Chef-Client                      | Community                   | Dinner Club                | Chef-Chef                                | Event Collab                             |
| -------------- | -------------------------------- | --------------------------- | -------------------------- | ---------------------------------------- | ---------------------------------------- |
| Who creates    | Chef (auto at inquiry/payment)   | Any auth user               | Chef                       | Any connected chef                       | System (on collab accept)                |
| tenant_id      | Chef's                           | NULL                        | Chef's                     | NULL                                     | Event owner's                            |
| visibility     | private                          | public/private              | private                    | private                                  | private                                  |
| Chef role      | `chef` (owner)                   | `owner` or `member`         | `chef` (owner)             | `chef` (all chefs)                       | `chef` (all collaborators)               |
| Guest role     | `member`                         | `member`                    | `member`                   | N/A (chefs only)                         | `member` (event guests)                  |
| Who can invite | Chef + members with `can_invite` | Anyone (if public)          | Chef                       | Any `chef` member (must be connected)    | Chef (event owner)                       |
| Recipe sharing | N/A                              | N/A                         | N/A                        | Yes (junction table)                     | Yes (via parent chef-chef circle)        |
| Client sharing | N/A                              | N/A                         | N/A                        | Yes (contact shares with circle context) | N/A                                      |
| Menu polling   | Yes                              | N/A                         | Yes                        | N/A                                      | Yes                                      |
| Leave = revoke | Guest leaves, loses access       | Member leaves, loses access | Guest leaves, loses access | Chef leaves, shared recipes revoked      | Collaborator removed, loses event access |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Expand group_type enum to include new types
-- Current CHECK is implicit via application layer (no DB-level CHECK constraint on group_type)
-- The CreateGroupSchema in group-actions.ts:22 needs updating

-- Add circle_group_id to chef_network_contact_shares for circle-contextualized referrals
ALTER TABLE chef_network_contact_shares
  ADD COLUMN IF NOT EXISTS circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_contact_shares_circle
  ON chef_network_contact_shares(circle_group_id) WHERE circle_group_id IS NOT NULL;

-- Add revenue_split_pct to event_collaborators permissions
-- (No schema change needed: permissions is JSONB, application adds the field)
```

### New Junction Tables

```sql
-- Shared recipes within a circle (references, not copies)
CREATE TABLE IF NOT EXISTS hub_circle_shared_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  shared_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  UNIQUE(group_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_circle_shared_recipes_group
  ON hub_circle_shared_recipes(group_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hub_circle_shared_recipes_chef
  ON hub_circle_shared_recipes(shared_by_chef_id);

-- RLS
ALTER TABLE hub_circle_shared_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_circle_shared_recipes_select" ON hub_circle_shared_recipes;
CREATE POLICY "hub_circle_shared_recipes_select" ON hub_circle_shared_recipes
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM hub_group_members
      WHERE profile_id IN (
        SELECT id FROM hub_guest_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "hub_circle_shared_recipes_insert" ON hub_circle_shared_recipes;
CREATE POLICY "hub_circle_shared_recipes_insert" ON hub_circle_shared_recipes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "hub_circle_shared_recipes_manage_service" ON hub_circle_shared_recipes;
CREATE POLICY "hub_circle_shared_recipes_manage_service" ON hub_circle_shared_recipes
  FOR ALL USING (auth.role() = 'service_role');
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule). Latest is `20260423000005`. Use `20260424000001`.
- All migrations are additive. No DROP/DELETE.
- `hub_circle_shared_recipes` is the only new table. One junction table, not zero, because recipe sharing needs revocation tracking that a message JSONB cannot provide.

---

## Data Model

### Key Entities and Relationships

```
chef_connections (accepted)
    |
    v
hub_groups (group_type='chef_collab', tenant_id=NULL)
    |
    +-- hub_group_members (role='chef' for all chef members)
    |
    +-- hub_messages (text, co_purchase, recipe_share, client_referral)
    |
    +-- hub_circle_shared_recipes (recipe references, revocable)
    |
    +-- chef_network_contact_shares (circle_group_id reference)
    |
    v
event_collaborators (when co-hosting)
    |
    v
hub_groups (group_type='event_collab', event_id set)
    +-- hub_group_members (both chefs as role='chef', guests as 'member')
```

### Constraints

- `chef_collab` circles: `tenant_id` must be NULL
- `event_collab` circles: `tenant_id` must match event owner, `event_id` must be set
- `hub_circle_shared_recipes.recipe_id` must belong to `shared_by_chef_id`'s tenant (validated in application)
- Connection gate: all circle member additions validated via `assertConnected()` or existing `chef_connections` check

---

## Server Actions

### New Actions

| Action                            | Auth             | Input                                                                                                                                            | Output                             | Side Effects                                                                                |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `createChefCollabCircle(input)`   | `requireChef()`  | `{ targetChefId: string, name?: string }`                                                                                                        | `{ success, groupToken, groupId }` | Creates hub_group, adds both chefs, system message, notification to target                  |
| `inviteChefToCollabCircle(input)` | `requireChef()`  | `{ groupId: string, targetChefId: string }`                                                                                                      | `{ success }`                      | Adds member, system message, notification. Connection gate enforced                         |
| `shareRecipeInCircle(input)`      | `requireChef()`  | `{ groupId: string, recipeId: string, note?: string }`                                                                                           | `{ success, sharedRecipeId }`      | Creates junction row, posts recipe_share message                                            |
| `revokeSharedRecipe(input)`       | `requireChef()`  | `{ sharedRecipeId: string }`                                                                                                                     | `{ success }`                      | Sets revoked_at, updates feed card                                                          |
| `importSharedRecipe(input)`       | `requireChef()`  | `{ sharedRecipeId: string }`                                                                                                                     | `{ success, newRecipeId }`         | Calls existing deepCopyRecipe(), records attribution                                        |
| `shareClientInCircle(input)`      | `requireChef()`  | `{ groupId: string, contactName: string, contactPhone?: string, contactEmail?: string, details: string, eventDate?: string, location?: string }` | `{ success, shareId }`             | Creates chef_network_contact_shares row with circle_group_id, posts client_referral message |
| `postCoPurchaseRequest(input)`    | `requireChef()`  | `{ groupId: string, item: string, quantity: number, unit: string, unitPriceCents?: number, supplier?: string, deadline?: string }`               | `{ success, messageId }`           | Posts co_purchase structured message                                                        |
| `respondToCoPurchase(input)`      | `requireChef()`  | `{ messageId: string, quantity: number }`                                                                                                        | `{ success }`                      | Updates message system_metadata.responses array                                             |
| `ensureEventCollabCircle(input)`  | System (no auth) | `{ eventId: string, tenantId: string, collaboratorChefId: string }`                                                                              | `{ groupToken } or null`           | Creates or upgrades event circle, adds collaborator as chef role                            |
| `leaveChefCollabCircle(input)`    | `requireChef()`  | `{ groupId: string }`                                                                                                                            | `{ success }`                      | Removes member, revokes shared recipes, system message                                      |

### Modified Actions

| Action                       | File                                                                           | What Changes                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `createHubGroup()`           | [lib/hub/group-actions.ts:30](lib/hub/group-actions.ts#L30)                    | Add `'chef_collab'` and `'event_collab'` to CreateGroupSchema group_type enum                               |
| `respondToEventInvitation()` | [lib/collaboration/actions.ts:242-276](lib/collaboration/actions.ts#L242-L276) | After acceptance, call `ensureEventCollabCircle()` to create/upgrade the event circle                       |
| `removeCollaborator()`       | [lib/collaboration/actions.ts:327-357](lib/collaboration/actions.ts#L327-L357) | After removal, remove chef from event_collab circle                                                         |
| `getChefCircles()`           | [lib/hub/chef-circle-actions.ts:34](lib/hub/chef-circle-actions.ts#L34)        | Also fetch chef_collab circles where chef is a member (tenant_id = NULL, same pattern as community circles) |

---

## UI / Component Spec

### Surface Grammar Mode

All new surfaces operate in `triage` mode (chef-chef circle list) or `editing` mode (inside a circle).

### New Pages

| Route       | Purpose                                                                           | Mode   |
| ----------- | --------------------------------------------------------------------------------- | ------ |
| None needed | Chef-chef circles appear in existing `/circles` page alongside other circle types | triage |

### Modified Pages/Components

| File                                                         | What Changes                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [app/(chef)/circles/page.tsx](<app/(chef)/circles/page.tsx>) | Chef-collab circles appear in the circles list with a distinct badge ("Collab")                        |
| [app/(chef)/network/page.tsx](<app/(chef)/network/>)         | "Create Circle" button on each connected chef's card                                                   |
| `/hub/g/[groupToken]` (public circle page)                   | Add recipe sharing panel, client referral panel, co-purchase message rendering for chef_collab circles |
| Circle feed component                                        | Render new message types: `recipe_share`, `client_referral`, `co_purchase`                             |
| Event detail collaborators tab                               | Link to event_collab circle when it exists                                                             |

### States

- **Loading:** Skeleton cards (same as existing circles)
- **Empty:** "No collaboration circles yet. Connect with other chefs in the Network tab to get started."
- **Error:** Toast with error message, never silent zeros
- **Populated:** Circle cards with member avatars, last message preview, unread badge

---

## Network-to-Circle Bridge Design

The Chef Network already tracks trust, connections, and collaboration preferences. The circle system adds persistent communication. The bridge works in one direction: **network flows into circles, never the reverse.**

1. **Connection is prerequisite.** No circle without an accepted `chef_connections` row. If a connection is severed (either chef removes the connection), all chef_collab circles shared between them are deactivated (soft delete via `is_active = false`). Both chefs get a notification.

2. **Trusted circle informs defaults.** If Chef B is in Chef A's trusted circle ([trusted-circle.tsx](<app/(chef)/network/trusted-circle.tsx>)), the circle creation auto-sets higher default permissions (can_invite = true for both).

3. **Handoff creates circle.** When a collab handoff is accepted via the intro bridge ([chef_intro_bridges](database/migrations/20260401000148_chef_intro_bridges.sql)), the bridge's `hub_group` (group_type='bridge') can be upgraded to a `chef_collab` circle if both chefs agree to continue collaborating beyond the single handoff.

4. **Availability signals visible.** Inside a chef-chef circle, each member's availability signals (from collab-inbox) are surfaced as a sidebar widget. No new data, just a read view of existing `chef_availability_signals`.

---

## Migration Path for Existing Data

1. **Existing bridge circles:** `hub_groups` rows with `group_type = 'bridge'` remain as-is. They can be manually upgraded to `chef_collab` via a "Keep this circle" action.
2. **Existing event_collaborators:** No migration needed. When a new collaboration is accepted after this feature ships, the `event_collab` circle is auto-created. Existing collaborations do not retroactively get circles (they can be created manually via "Create Event Circle" on the event detail page).
3. **Existing recipe_shares:** No migration. Future shares within a circle context use the junction table. Existing point-to-point shares continue to work as-is.
4. **Existing contact_shares:** No migration. The new `circle_group_id` column is nullable, so existing rows are unaffected.

---

## Edge Cases and Error Handling

| Scenario                                               | Correct Behavior                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Chef creates circle with non-connected chef            | Error: "You can only create circles with connected chefs"                                         |
| Connection severed while circle exists                 | Circle deactivated (is_active = false), both chefs notified, shared recipes revoked               |
| Chef shares recipe then deletes it from their own book | Junction row stays, feed card shows "Recipe no longer available". Import blocked.                 |
| Chef leaves circle                                     | Member removed, all their shared recipes in this circle revoked, system message                   |
| Both chefs leave circle                                | Circle becomes inactive (no members with chef role)                                               |
| Event collab circle: event owner removes collaborator  | Collaborator removed from event_collab circle, loses event access                                 |
| Co-purchase: supplier out of stock                     | Chef A updates the message with a "Cancelled" status. Notification to respondents.                |
| Circle already exists between two chefs                | Error: "You already have a collaboration circle with this chef" (one active circle per chef pair) |

---

## Files to Create

| File                                                         | Purpose                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `database/migrations/20260424000001_chef_collab_circles.sql` | New junction table + column additions                                          |
| `lib/hub/chef-collab-circle-actions.ts`                      | Server actions for chef-chef circle CRUD, recipe/client sharing, co-purchasing |
| `components/hub/chef-collab-circle-features.tsx`             | Recipe sharing panel, client referral panel, co-purchase message card          |
| `components/hub/co-purchase-message.tsx`                     | Structured co-purchase message renderer + response form                        |

## Files to Modify

| File                                       | What to Change                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `lib/hub/group-actions.ts`                 | Add `chef_collab` and `event_collab` to CreateGroupSchema enum                                                                   |
| `lib/hub/types.ts`                         | Add `chef_collab` and `event_collab` to group_type union, add `recipe_share`, `client_referral`, `co_purchase` to HubMessageType |
| `lib/hub/chef-circle-actions.ts`           | Fetch chef_collab circles in `getChefCircles()` (same pattern as community circles)                                              |
| `lib/collaboration/actions.ts`             | Call `ensureEventCollabCircle()` after collaboration acceptance; remove from circle on collaborator removal                      |
| `app/(chef)/circles/page.tsx`              | Display chef_collab circles with "Collab" badge                                                                                  |
| `app/(chef)/network/` page                 | "Create Circle" button on connection cards                                                                                       |
| `app/(public)/hub/g/[groupToken]/page.tsx` | Render recipe/client/co-purchase features for chef_collab circles                                                                |
| `components/hub/circles-page-tabs.tsx`     | Add collab circle filter tab                                                                                                     |
| `types/database.ts`                        | Auto-generated after migration                                                                                                   |

---

## Verification Steps

1. Sign in with agent account (Chef A)
2. Connect with a second chef (Chef B) via the network
3. Create a Chef-Chef circle from Chef B's connection card
4. Verify: circle appears in `/circles` with "Collab" badge
5. Open the circle, share a recipe from Chef A's recipe book
6. Verify: recipe card appears in the feed with name, dietary tags, and "Import" button
7. Sign in as Chef B, verify: circle appears, recipe card visible, "Import to My Recipes" works
8. Share a client lead in the circle, verify: message appears with sanitized preview
9. Post a co-purchase request, verify: structured card renders with response form
10. Leave the circle as Chef B, verify: member removed, shared recipes show "no longer shared"
11. Verify: event_collab circle auto-created when Chef B accepts a collaboration invite on Chef A's event
12. Screenshot final results

---

## Out of Scope

- Chef-Vendor circles (future, separate spec)
- Chef-Staff circles (future, separate spec)
- Financial transactions between chefs (co-purchasing is coordination only)
- Full procurement/purchasing system
- Cross-tenant ingredient database merging
- Real-time collaborative editing of recipes or menus
- Video/audio calling within circles

---

## System Integrity Questions

### Q1. Does adding `chef_collab` to group_type break any existing queries that filter on group_type?

**A:** No. Existing queries filter with explicit `.in('group_type', [...])` or `.eq('group_type', 'community')`. The `getChefCircles()` function ([chef-circle-actions.ts:47-54](lib/hub/chef-circle-actions.ts#L47-L54)) queries by `tenant_id`, not group_type. Community circle discovery ([community-circle-actions.ts:133](lib/hub/community-circle-actions.ts#L133)) filters `.in('group_type', ['community', 'dinner_club'])`. Neither will accidentally include `chef_collab`.

### Q2. How does tenant_id = NULL affect tenant-scoped queries in getChefCircles?

**A:** `getChefCircles()` already handles this. Lines [47-54](lib/hub/chef-circle-actions.ts#L47-L54) query `.eq('tenant_id', tenantId)` for business circles, then lines [63-83](lib/hub/chef-circle-actions.ts#L63-L83) separately query community circles via `hub_group_members` membership + `.is('tenant_id', null)`. Chef-collab circles use the same pattern: queried via membership, not tenant_id.

### Q3. What prevents a non-connected chef from being added to a chef_collab circle?

**A:** The `createChefCollabCircle()` and `inviteChefToCollabCircle()` actions call `assertConnected()` ([collaboration/actions.ts:38-54](lib/collaboration/actions.ts#L38-L54)) before any member addition. This checks for an accepted `chef_connections` row.

### Q4. What happens to shared recipes when the source recipe is deleted?

**A:** `hub_circle_shared_recipes.recipe_id` has `ON DELETE CASCADE`. The junction row is deleted. The feed message (hub_messages) retains the recipe name in its `system_metadata` but the "Import" button is disabled because the junction row no longer exists. Already-imported copies (via deepCopyRecipe) are independent and unaffected.

### Q5. Does the co-purchase structured message need a new hub_messages.message_type?

**A:** No. Co-purchase uses `message_type = 'text'` with structured `system_metadata`. The rendering component checks `system_metadata.type === 'co_purchase'` to render the structured card. This avoids a schema change on `hub_messages.message_type`.

### Q6. How is the event_collab circle related to the existing ensureCircleForEvent()?

**A:** `ensureCircleForEvent()` ([chef-circle-actions.ts:579-736](lib/hub/chef-circle-actions.ts#L579-L736)) creates standard `circle`-type circles. When a collaborator accepts, `ensureEventCollabCircle()` either upgrades the existing circle (changes group_type to `event_collab`, adds collaborator) or creates a new one if none exists. The upgrade is safe because `event_collab` is a superset of `circle` behavior.

### Q7. Can a chef be in multiple chef_collab circles?

**A:** Yes. One per chef-pair (enforced by application-level check, not DB constraint), but a chef can have circles with many different chefs. The one-per-pair rule prevents duplicate circles, not multiple circles.

### Q8. What happens when a connection is severed?

**A:** A background check (triggered by connection removal) finds all active `chef_collab` circles where both chefs are members. Each circle is deactivated (`is_active = false`). Shared recipes are bulk-revoked. Both chefs receive notifications. This is a non-blocking side effect of the connection removal action.

### Q9. Does the hub_circle_shared_recipes table respect tenant isolation?

**A:** Yes. The recipe_id references a recipe that belongs to `shared_by_chef_id`'s tenant. Other circle members can see the recipe preview (name, ingredients) via a read-only server action that joins through the junction table. They cannot access the full recipe record directly. Import creates an independent copy in their own tenant.

### Q10. How does circle-first-notify work for chef_collab circles?

**A:** It already works. `circleFirstNotify()` ([circle-first-notify.ts:63-115](lib/hub/circle-first-notify.ts#L63-L115)) looks up circles by eventId or inquiryId. For chef_collab circles (no event/inquiry link), notifications use the standard hub_messages + SSE flow. The email notification path works because all members have hub_guest_profiles with email addresses.

### Q11. Can guests (non-chefs) be added to chef_collab circles?

**A:** No. The `createChefCollabCircle()` and `inviteChefToCollabCircle()` actions enforce that all members are chefs via `requireChef()` and `assertConnected()`. The UI does not expose an "invite guest" action for chef_collab circles.

### Q12. How does the recipe preview work without exposing the full recipe?

**A:** The `shareRecipeInCircle()` action snapshots recipe metadata (name, course, dietary_tags, allergen_flags, ingredient names, method summary truncated to 200 chars) into the hub_message's `system_metadata`. This snapshot is immutable in the message. The "Import" action fetches the live recipe via the junction table for the deep copy.

### Q13. What if both chefs share the same recipe (imported from each other)?

**A:** The UNIQUE constraint on `hub_circle_shared_recipes(group_id, recipe_id)` prevents sharing the same recipe_id twice. But imported copies have different recipe_ids (they are new rows in the recipient's tenant), so Chef B can share their imported copy back. This is intentional: it creates a provenance chain, not a conflict.

### Q14. Does the event_collab circle support menu polling?

**A:** Yes. Menu polling ([menu-poll-actions.ts](lib/hub/menu-poll-actions.ts)) operates on any circle linked to an event via `getCircleForContext({ eventId })`. Since `event_collab` circles have `event_id` set, they are found by the same lookup. Both chefs (as `chef` role members) can create and lock poll iterations.

### Q15. What prevents unauthorized access to shared recipe content?

**A:** The `getSharedRecipePreview()` action verifies the caller is a member of the circle (via `hub_group_members` lookup) before returning any recipe data. The junction table's RLS policy restricts SELECT to circle members. The recipe's own tenant_id scoping is bypassed only through this controlled read path.

### Q16. How does this interact with the existing Introduction Bridge flow?

**A:** Introduction bridges ([chef_intro_bridges](database/migrations/20260401000148_chef_intro_bridges.sql)) create `group_type = 'bridge'` circles. When the bridge completes, the chefs can upgrade the bridge circle to a `chef_collab` circle via a "Keep Collaborating" action. This updates `group_type` from `bridge` to `chef_collab`. The bridge lifecycle (source_left, completed, cancelled) is preserved in `chef_intro_bridges`; the upgrade only affects the hub_group row.

### Q17. Can a chef_collab circle be linked to multiple events?

**A:** Not directly. Chef-chef circles are event-independent. When chefs co-host events, each event gets its own `event_collab` circle. The chef-chef circle is for ongoing collaboration; event circles are for event-specific ops. They coexist as separate circles in the chef's circle list.

### Q18. What database indexes support the new queries?

**A:** `idx_hub_circle_shared_recipes_group` (filtered on revoked_at IS NULL) covers the "show active shared recipes for this circle" query. `idx_hub_circle_shared_recipes_chef` covers "show all recipes I've shared across circles". `idx_chef_contact_shares_circle` covers "show referrals in this circle".

### Q19. Does leaving a chef_collab circle affect event_collab circles?

**A:** No. Event collaboration is managed via `event_collaborators`, not circle membership. Leaving a chef_collab circle does not remove the chef from any event_collab circles or revoke event collaboration access. These are independent relationships.

### Q20. What is the correct implementation order?

**A:** (1) Migration: junction table + column. (2) Type updates: group_type enum in types.ts and group-actions.ts. (3) Server actions: chef-collab-circle-actions.ts. (4) Modified actions: getChefCircles, respondToEventInvitation. (5) UI: circle list badge, create button on network, feature panels in circle view. (6) Message renderers: recipe_share, client_referral, co_purchase cards.

### Q21. What about the "no new features without validated user feedback" anti-clutter rule?

**A:** This spec was directly requested by the developer based on a real use case ("I have a chef friend with his own business"). It is driven by validated personal need, not speculative feature expansion.

---

## Notes for Builder Agent

1. **Pattern to follow:** Community circles ([community-circle-actions.ts](lib/hub/community-circle-actions.ts)) are the closest existing pattern for chef_collab circles. Same tenant_id=NULL approach, same membership-based access.

2. **assertConnected() is the gate.** Import and use it from [collaboration/actions.ts:38-54](lib/collaboration/actions.ts#L38-L54). Do not duplicate the connection check logic.

3. **deepCopyRecipe() already exists.** Use it as-is for recipe imports ([collaboration/actions.ts:683-798](lib/collaboration/actions.ts#L683-L798)). Do not write a new copy function.

4. **group_type has no DB-level CHECK constraint.** The constraint is application-level in the Zod schema ([group-actions.ts:22](lib/hub/group-actions.ts#L22)). Adding new values only requires updating the Zod enum.

5. **Non-blocking side effects.** All notifications, emails, and recipe revocations on circle leave/connection sever must be wrapped in try/catch. Follow the pattern in [chef-circle-actions.ts:732-735](lib/hub/chef-circle-actions.ts#L732-L735).

6. **Cache invalidation.** After circle mutations: `revalidatePath('/circles')`, `revalidatePath('/network')`, `revalidatePath('/dashboard')`.

7. **Do NOT modify the existing recipe_shares flow.** Point-to-point recipe sharing continues to work independently. Circle recipe sharing is additive, using the junction table.

8. **Surface grammar:** Circle list is `triage` mode. Inside a circle is `editing` mode. Follow [surface-grammar-governance.md](docs/specs/surface-grammar-governance.md).
