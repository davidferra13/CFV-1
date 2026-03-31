# Spec: Introduction Bridge

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-31
> **Built by:** Claude Opus 4.6 session 2026-03-31

---

## What This Does (Plain English)

Adds a temporary mixed-party introduction workflow between `Network > Collab` handoffs and the canonical Dinner Circle. When Chef A wants to hand off or introduce a client to Chef B, the source chef can launch an `Introduction Bridge`: a focused three-party intro thread for Chef A, Chef B, and the primary client contact, plus an automatically created target-chef-owned Dinner Circle where ongoing dinner communication should continue. The bridge is the cordial handoff surface; the destination Dinner Circle is the canonical dinner container.

---

## Why It Matters

The app already has Dinner Circles for chef/client dinner coordination and `chef_handoffs` for chef-to-chef referrals, but it has no product-native place for the actual introduction moment the developer described. Today that crucial transition falls back to SMS group chats and ad hoc copy-paste. This spec fills that missing layer without corrupting Dinner Circle, event collaboration, or chef-client chat semantics.

---

## Current-State Summary (Verified Before Spec)

1. `Dinner Circles` already exist as the chef-side list of client dinner groups at `/circles`, described as the same token-based circles guests use at `/hub/g/[groupToken]/` in `docs/chefflow-product-definition.md:1721-1731`, surfaced in the audit at `docs/app-complete-audit.md:188-195`, and rendered at `app/(chef)/circles/page.tsx:5-25`.
2. The public hub route already loads a full group experience with chat, meals, events, photos, notes, members, search, and settings through `HubGroupView` in `app/(public)/hub/g/[groupToken]/page.tsx:32-70` and `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:29-438`.
3. Inquiry-created circles already write `hub_groups` plus chef/client memberships in `lib/hub/inquiry-circle-actions.ts:109-152`.
4. Chef-side circle inbox copy explicitly defines circles as private client channels for menus, dietary alerts, quotes, and updates in `components/hub/circles-inbox.tsx:81-89`.
5. Chef-to-chef structured handoffs already exist under `Network > Collab` in `app/(chef)/network/page.tsx:175-210` and `app/(chef)/network/page.tsx:429-446`, backed by `chef_handoffs` in `database/migrations/20260330000026_chef_collaboration_network.sql:33-124` and created by `createCollabHandoff` in `lib/network/collab-actions.ts:934-1004`.
6. The current collab UI creates and receives handoffs, but it does not create any mixed-party intro thread or client-facing continuation surface in `app/(chef)/network/collab-inbox.tsx:122-170`, `app/(chef)/network/collab-inbox.tsx:620-760`, and `app/(chef)/network/collab-inbox.tsx:880-980`.
7. Cross-chef event collaboration is a different system that keeps event ownership in the original chef namespace and must not be reused for this feature, per `components/events/event-collaborators-panel.tsx:3-17` and `lib/collaboration/actions.ts:4-10`.
8. Chef-client chat already supports `standalone` conversations outside Dinner Circles in `lib/chat/actions.ts:59-75`, `lib/chat/actions.ts:185-223`, and `components/chat/new-conversation-button.tsx:48-59`, which conflicts with the developer's intended container-first model and is the wrong foundation for this workflow.
9. The hub data model already supports token-access groups, hub identities, memberships, and messages through `lib/hub/types.ts:43-163`, `lib/hub/group-actions.ts:11-52`, `lib/hub/group-actions.ts:133-228`, and `lib/hub/message-actions.ts:12-149`.
10. Dinner Circle chef listing is currently tenant-scoped through `getChefCircles()` filtering `hub_groups.tenant_id = tenantId` in `lib/hub/chef-circle-actions.ts:34-63`, which means a recipient-chef-owned Dinner Circle must be created explicitly if Chef B is supposed to own the ongoing dinner communication.

---

## INTENT SOURCE / ORIGIN CONTEXT

This section is permanent. It exists so the builder understands what was said, what was meant, and why this feature exists.

### A. Clean Structured Transcript

1. The developer described an existing real-world workflow where two chefs repeatedly text each other to ask, `can you take this dinner`, `did the client get back to you`, `how did that handoff go`, `how did the dinner go`, and `do you have pictures`.
2. The developer clarified that this workflow is not only chef-only backchannel discussion. It often includes a real introduction moment where Chef A introduces Chef B to the client in a three-person thread, then one or more parties may remain involved or leave.
3. The developer gave a concrete example: if Chef A cannot take an April 11 dinner, Chef A asks the trusted chef friend whether they can cover it, then would introduce the new chef to the client if the answer is yes.
4. The developer emphasized that current behavior happens in SMS and ad hoc group chats, then often immediately splits into a new private thread once the introduction is made.
5. The developer required that the app stop relying on random texts, emails, screenshots, links, and Google Docs for this workflow.
6. The developer clarified that `Dinner Circle` already has meaning in the product and should stay the canonical dinner-facing container.
7. The developer asked for the system to support multiple handoff outcomes instead of one hard-coded path:
   - clean sever / full transfer
   - continued involvement without parenting the relationship
   - fully shared involvement when appropriate
8. The developer required that every real dinner still be anchored to a Dinner Circle and that communication on the site should happen inside explicit containers, not free-floating messages.
9. The developer explicitly said that the intro workflow should create a temporary three-person thread because every interaction needs a cordial greeting.
10. The developer also said that after the intro, the best ongoing communication surface should be determined deliberately rather than guessed, but reaffirmed that dinner-facing communication belongs in a Dinner Circle.
11. The developer insisted the spec preserve both the raw reasoning and the product intent, not only a compressed to-do list.

### B. Valid Signal Extraction

#### Intent

- Add a first-class intro layer between chef-to-chef handoff and client-facing dinner execution.
- Keep the intro moment temporary and purpose-built instead of dumping everyone into the wrong existing chat.
- Preserve Dinner Circle as the canonical dinner container.
- Support multiple post-intro outcomes without forcing one path.
- Replace off-platform group-text handoff behavior with a ChefFlow-native surface.

#### Decisions

- `Dinner Circle` remains the ongoing dinner container.
- `Introduction Bridge` is a temporary mixed-party surface, not a permanent chef workspace.
- The bridge should be launched from existing structured handoffs in `Network > Collab`.
- The bridge should reuse the existing hub identity/member/message stack rather than inventing a new fourth messaging model.
- The bridge should create a recipient-chef-owned Dinner Circle explicitly for ongoing dinner communication.
- Shared or observer source-chef involvement should remain in the bridge in this slice rather than pretending the current tenant-scoped Dinner Circle model already supports true cross-chef co-ownership.

#### Constraints

- Spec-only. No runtime build work in this thread.
- Everything must be private by default.
- Builders must not overload event collaboration, standalone chat, or flat community DM for this feature.
- Builders must not guess how the post-intro container works; the spec must make it explicit.

### C. Developer Intent Layer

What the developer was actually trying to achieve beneath the surface wording:

1. **Make the introduction itself a product object.**
   The gap is not only chat or handoff metadata. The missing product moment is the actual courteous transfer from one chef to another in front of the client.

2. **Prevent container confusion.**
   The developer is trying to preserve product language: chef-only collaboration, mixed-party introduction, and real dinner execution are three different contexts and should not collapse into one overloaded system.

3. **Support real-world ambiguity without losing structure.**
   Sometimes the source chef disappears. Sometimes the source chef stays nearby. Sometimes everyone keeps talking for a while. The system needs a default path plus explicit options.

4. **Move the relationship from transfer moment to owned dinner context.**
   Once Chef B is the operating chef, the ongoing dinner communication needs a proper home that Chef B owns and can continue inside the existing Dinner Circle model.

5. **Keep future expansion possible without blocking the first useful slice.**
   The developer wants rich packet transfer, debriefs, universal feeds, and deeper governance later, but the builder needs a narrow, correct introduction slice first.

### D. Missing Pieces Identified + Resolved

| Missing / Underdeveloped Point                                              | Resolution in This Spec                                                                                                                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Where does the actual Chef A -> Chef B -> client introduction happen today? | Nowhere product-native. This spec adds `Introduction Bridge` as a first-class surface launched from `chef_handoffs`.                                                                                         |
| Is the bridge the same thing as a Dinner Circle?                            | No. The bridge is temporary and mixed-party. The destination Dinner Circle remains the canonical dinner container.                                                                                           |
| Does the bridge replace the structured handoff?                             | No. `chef_handoffs` stays the formal transfer record. The bridge is the human introduction layer around it.                                                                                                  |
| Who owns the ongoing dinner after the intro?                                | The recipient chef. This spec creates a target-chef-owned Dinner Circle for the ongoing dinner.                                                                                                              |
| How does the source chef remain involved if needed?                         | In this slice, ongoing source-chef involvement remains in the bridge, not the recipient's Dinner Circle.                                                                                                     |
| Why not reuse event collaboration?                                          | Event collaboration explicitly preserves original event ownership and is chef-only. It is the wrong model for a client-facing intro.                                                                         |
| Why not reuse standalone chat?                                              | Standalone chat is chef-client 1:1 and not container-first. It is the wrong model for a mixed-party intro.                                                                                                   |
| Why not dump bridges into Dinner Circles directly?                          | The existing Dinner Circle route is a full dinner hub and tenant-scoped list model. The intro needs a smaller temporary surface and the target chef needs explicit ownership of the follow-on Dinner Circle. |

### E. Execution Translation

#### Requirements

- Add an `Introduction Bridge` lifecycle record.
- Reuse `hub_groups`, `hub_group_members`, and `hub_messages` for the temporary bridge thread.
- Launch bridges from existing outgoing structured handoffs after a specific recipient has accepted.
- Resolve or create hub profiles for both chefs and the primary client contact.
- Create a target-chef-owned Dinner Circle for ongoing dinner communication.
- Provide bridge access inside `Network > Collab` for chefs and token/join access for client-side participants.
- Let the source chef mark the intro complete or leave the bridge after the greeting.

#### Constraints

- `Introduction Bridge` groups must use `group_type = 'bridge'`, `visibility = 'secret'`, and `tenant_id = NULL` so they do not leak into Dinner Circle lists.
- The target Dinner Circle must be owned by the recipient chef and use the normal Dinner Circle model.
- The source chef must not be auto-added to the recipient-owned Dinner Circle in this slice.
- All bridge participants must already have or be resolved into `hub_guest_profiles`.

#### Behaviors

- Starting a bridge from an accepted handoff creates:
  - one bridge `hub_group`
  - one `chef_intro_bridges` row
  - bridge memberships for source chef, target chef, and primary client contact
  - one recipient-chef-owned Dinner Circle
- Bridge chat is temporary and introduction-focused.
- Destination Dinner Circle is the place the client and recipient chef continue dinner-facing communication.
- If the source chef chooses `transfer`, the UI should prompt them to leave the bridge after the greeting.
- If the source chef chooses `shared` or `observer`, the bridge remains the place they can stay involved while the client/recipient-chef dinner continues in the recipient's Dinner Circle.

---

## Files to Create

| File                                                        | Purpose                                                                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/specs/p1-introduction-bridge.md`                      | This spec file.                                                                                                                                          |
| `database/migrations/20260401000145_chef_intro_bridges.sql` | Adds the bridge lifecycle table and indexes. Must use the next migration number after `20260401000144_openclaw_upc_unique.sql` in `database/migrations`. |
| `lib/network/intro-bridge-actions.ts`                       | Server actions for creating, listing, loading, completing, and leaving intro bridges.                                                                    |
| `app/(chef)/network/bridges/[bridgeId]/page.tsx`            | Authenticated chef route for opening a bridge with the current chef's hub profile token pre-resolved.                                                    |
| `components/hub/hub-bridge-view.tsx`                        | Minimal mixed-party intro UI that reuses `HubFeed` instead of the full Dinner Circle tabbed surface.                                                     |

---

## Files to Modify

| File                                               | What to Change                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/network/page.tsx`                      | Load active intro bridges alongside the existing collab inbox and pass them into the collab UI.                                       |
| `app/(chef)/network/collab-inbox.tsx`              | Add `Start Intro` flow for accepted outgoing handoffs and render active intro bridge cards.                                           |
| `app/(public)/hub/g/[groupToken]/page.tsx`         | Branch on `group.group_type`; render `HubBridgeView` for `bridge`, `HubGroupView` otherwise.                                          |
| `app/(client)/my-hub/g/[groupToken]/page.tsx`      | Same branch for authenticated clients, with auto-join preserved.                                                                      |
| `app/(public)/hub/join/[groupToken]/page.tsx`      | Adjust preview copy when `group_type = 'bridge'` so client-side join language matches an intro thread rather than a dinner circle.    |
| `app/(public)/hub/join/[groupToken]/join-form.tsx` | Accept customizable submit/redirect copy for bridge join flows while preserving existing cookie setup and redirect behavior.          |
| `lib/hub/types.ts`                                 | Add `'bridge'` to `HubGroup.group_type` and any related type unions.                                                                  |
| `lib/hub/group-actions.ts`                         | Extend `createHubGroup` Zod enum to include `'bridge'` for consistency, even though bridge creation happens in the new intro actions. |
| `lib/db/migrations/schema.ts`                      | Auto-generated schema snapshot after the migration is applied.                                                                        |

---

## Database Changes

This spec reuses `hub_groups`, `hub_group_members`, and `hub_messages` for the actual intro thread. The only new database object is the lifecycle table that links a bridge hub group to a handoff and its source/destination circles.

### New Tables

```sql
CREATE TABLE IF NOT EXISTS chef_intro_bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_group_id UUID NOT NULL UNIQUE REFERENCES hub_groups(id) ON DELETE CASCADE,
  handoff_id UUID REFERENCES chef_handoffs(id) ON DELETE SET NULL,
  source_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  target_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  source_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  target_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  initiated_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE RESTRICT,
  intro_mode TEXT NOT NULL DEFAULT 'shared'
    CHECK (intro_mode IN ('shared', 'observer', 'transfer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'source_left', 'completed', 'cancelled')),
  intro_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  source_left_at TIMESTAMPTZ,
  CONSTRAINT chef_intro_bridges_no_self CHECK (source_chef_id <> target_chef_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_intro_bridges_handoff_target
  ON chef_intro_bridges(handoff_id, target_chef_id)
  WHERE handoff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_source
  ON chef_intro_bridges(source_chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_target
  ON chef_intro_bridges(target_chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_status
  ON chef_intro_bridges(status, created_at DESC);
```

### New Columns on Existing Tables

None.

### Migration Notes

- Migration filename must be `20260401000145_chef_intro_bridges.sql` because the current highest migration is `20260401000144_openclaw_upc_unique.sql` in `database/migrations`.
- `hub_groups.group_type` is already plain text in the DB snapshot at `lib/db/migrations/schema.ts:14941-14956`, so no DB enum change is required for `'bridge'`.
- `hub_groups.visibility` already supports `'secret'` at `lib/db/migrations/schema.ts:15003-15005`.
- Keep the migration additive only.

---

## Data Model

### 1. Bridge Hub Group

The actual intro thread is a normal `hub_groups` row plus `hub_group_members` plus `hub_messages`, because the hub stack already supports mixed authenticated and token-based participants:

- `hub_groups` supports token access, names, group type, and message preview fields in `lib/db/migrations/schema.ts:14922-15006`
- `hub_group_members` supports member roles, read state, notification settings, and unique membership in `lib/db/migrations/schema.ts:14774-14810`
- `hub_messages` already supports text/system messages, replies, notification metadata, and last-message rollups in `lib/hub/message-actions.ts:12-149`

For bridge groups specifically:

- `group_type = 'bridge'`
- `visibility = 'secret'`
- `tenant_id = NULL`
- `default_tab = 'chat'`
- `created_by_profile_id = source chef hub profile`

`tenant_id` must stay `NULL` so the bridge never appears inside chef Dinner Circle listings that currently query tenant-owned groups in `lib/hub/chef-circle-actions.ts:46-63`.

### 2. Bridge Lifecycle Row

`chef_intro_bridges` is the authoritative lifecycle record:

- links the bridge hub group to the originating handoff
- records source and target chefs
- records primary client contact
- records intro mode
- links optional source and destination Dinner Circles
- records whether the source chef has left or the bridge is completed

### 3. Destination Dinner Circle

The destination Dinner Circle is a normal `hub_groups` row with:

- `group_type = 'circle'`
- `tenant_id = target chef id`
- `created_by_profile_id = target chef hub profile`
- `visibility = 'secret'`

Membership rules:

- always add the target chef as `role = 'chef'`
- always add the primary client contact as `role = 'member'`
- if `source_circle_group_id` exists and `copySourceGuests = true`, copy all non-chef members from the source circle into the destination circle
- do **not** add the source chef to the destination Dinner Circle in this slice

This keeps the ongoing dinner communication in a target-chef-owned circle while leaving shared or observer source-chef involvement in the bridge.

---

## Server Actions

| Action                                   | Auth            | Input                                                                                   | Output                                                                                                      | Side Effects                                                                                                                         |
| ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `getChefIntroBridges()`                  | `requireChef()` | none                                                                                    | `IntroBridgeSummary[]`                                                                                      | None                                                                                                                                 |
| `createIntroductionBridge(input)`        | `requireChef()` | `{ handoffId: string; recipientChefId: string; clientName: string; clientEmail?: string | null; introMode: 'shared' \| 'observer' \| 'transfer'; introMessage?: string; copySourceGuests?: boolean }` | `{ success: boolean; bridgeId?: string; bridgeGroupToken?: string; targetCircleToken?: string; error?: string }`                     | Creates bridge row, bridge hub group, memberships, intro message, destination Dinner Circle, revalidates `/network` |
| `getIntroductionBridgeForChef(bridgeId)` | `requireChef()` | `{ bridgeId: string }`                                                                  | Bridge detail with hub group, members, profile token, linked circle tokens                                  | None                                                                                                                                 |
| `leaveIntroductionBridgeAsSource(input)` | `requireChef()` | `{ bridgeId: string }`                                                                  | `{ success: boolean }`                                                                                      | Sets `source_left_at`, `status = 'source_left'`, removes source-chef bridge membership, posts system message, revalidates `/network` |
| `markIntroductionBridgeComplete(input)`  | `requireChef()` | `{ bridgeId: string }`                                                                  | `{ success: boolean }`                                                                                      | Sets `status = 'completed'`, `completed_at`, revalidates `/network`                                                                  |

### Action Behavior Details

#### `createIntroductionBridge(input)`

1. Verify current chef is the `from_chef_id` owner of the handoff.
2. Verify the chosen `recipientChefId` has an accepted `chef_handoff_recipients` row for that handoff.
3. Resolve `source_circle_group_id` by using the handoff source:
   - if `source_entity_type = 'event'`, use `getCircleForContext({ eventId })` from `lib/hub/circle-lookup.ts:21-60`
   - if `source_entity_type = 'inquiry'`, use `getCircleForContext({ inquiryId })` from `lib/hub/circle-lookup.ts:21-60`
   - if `manual`, no source circle
4. Resolve or create hub profiles for:
   - source chef
   - target chef
   - primary client contact
5. Create the bridge `hub_groups` row directly, not through Dinner Circle flows.
6. Insert bridge memberships:
   - source chef
   - target chef
   - primary client contact
7. Create the destination Dinner Circle under the target chef.
8. Create the `chef_intro_bridges` row linking bridge, handoff, source circle, and target circle.
9. Post a system message announcing the introduction.
10. If `introMessage` is provided, insert it as the first normal text message authored by the source chef.

#### `getChefIntroBridges()`

Returns active and recent completed bridge summaries for the current chef where:

- `source_chef_id = currentChefId` or `target_chef_id = currentChefId`
- joined `hub_groups` provides `group_token`, `last_message_at`, and `last_message_preview`
- joined `hub_guest_profiles` provides the primary client display name

#### `leaveIntroductionBridgeAsSource(input)`

- Only the `source_chef_id` may call it.
- Remove the source-chef membership from the bridge `hub_group_members`.
- Set `source_left_at = NOW()` and `status = 'source_left'`.
- Post a bridge system message like `Source chef left the intro thread; continue in the Dinner Circle`.

#### `markIntroductionBridgeComplete(input)`

- Either source or target chef may call it.
- Do not archive or delete the bridge hub group.
- Mark the lifecycle row complete for the collab dashboard and history.

---

## UI / Component Spec

### Page Layout

#### 1. `Network > Collab`

Keep the existing handoff layout and add one new section above the handoff grids:

- **Section title:** `Active Introductions`
- Each card shows:
  - client display name
  - counterpart chef
  - mode badge (`Shared`, `Observer`, `Transfer`)
  - last message preview
  - `Open Intro`
  - `Open Dinner Circle`

In outgoing handoff cards, add `Start Intro` when:

- the current chef owns the handoff
- the selected recipient has already accepted
- no existing bridge already exists for `handoff_id + recipient_chef_id`

Clicking `Start Intro` opens a modal with:

- accepted recipient selector if more than one recipient accepted
- client name
- client email
- intro mode select
- `copy source dinner-circle guests` checkbox, default `on` when a source circle exists
- intro message textarea

#### 2. Chef Bridge Route

`/network/bridges/[bridgeId]` is the chef-authenticated bridge page. It loads the bridge, resolves the current chef's hub profile token, and renders `HubBridgeView`.

#### 3. Public / Client Bridge Access

Reuse the existing token-based hub route:

- `app/(public)/hub/g/[groupToken]/page.tsx`
- `app/(client)/my-hub/g/[groupToken]/page.tsx`

If `group.group_type === 'bridge'`, render `HubBridgeView` instead of `HubGroupView`.

### `HubBridgeView`

This component is intentionally smaller than `HubGroupView`.

Header content:

- bridge title, e.g. `Introduction: {clientName}`
- subtext: `Temporary intro thread between chefs and client`
- participants row
- linked destination Dinner Circle CTA when available
- mode badge

Action strip:

- source chef:
  - `Leave Intro Thread` when mode is `transfer`
  - `Mark Intro Complete`
- target chef:
  - `Open Dinner Circle`
  - `Mark Intro Complete`
- client:
  - no management controls

Main body:

- reuse `HubFeed` for the actual messages
- no Dinner Circle tabs
- no meals / photos / schedule / notes / search / settings tabs

### States

- **Loading:** skeleton card stack in collab panel; centered bridge loader on bridge page
- **Empty:** collab intro section says `No active introductions yet`
- **Error:** real error callout; never fake empty state
- **Populated:** intro cards and bridge feed with real participants and last-message previews

### Interactions

- `Start Intro` validates accepted recipient and required client name before submit.
- Successful creation routes the source chef to `/network/bridges/[bridgeId]`.
- `Open Dinner Circle` opens the destination Dinner Circle token route in a new tab.
- `Leave Intro Thread` uses the new server action, then returns the source chef to `/network?tab=collab`.
- Client join flow keeps the current cookie-based membership behavior from `app/(public)/hub/join/[groupToken]/join-form.tsx:24-40`.

---

## Edge Cases and Error Handling

| Scenario                                                  | Correct Behavior                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Recipient has not accepted the handoff yet                | Do not show `Start Intro`; bridge creation must reject server-side too.                                               |
| Handoff already has an intro bridge for this target chef  | Return the existing bridge instead of creating a duplicate.                                                           |
| No source circle exists                                   | Allow bridge creation, but require explicit client name; destination circle contains only the primary client contact. |
| Client email is missing                                   | Create bridge and destination circle with name-only profile if needed; token route remains the access path.           |
| Source circle has additional guests                       | Copy them into the destination circle only when `copySourceGuests = true`.                                            |
| Source chef leaves bridge                                 | Keep bridge history and destination Dinner Circle intact.                                                             |
| Source chef wants shared involvement                      | Keep bridge open; do not attempt cross-tenant chef co-ownership in the destination Dinner Circle.                     |
| Chef opens a public token link without hub profile cookie | Use the authenticated chef bridge route from collab cards; do not rely on public token flow for chef authoring.       |
| Bridge token is invalid or inactive                       | `notFound()` / existing invalid-group behavior.                                                                       |

---

## Verification Steps

1. Sign in as seeded `chef` account from `scripts/launcher/open-login.mjs:87-105`.
2. Sign in separately as seeded `chef-b` account from `scripts/launcher/open-login.mjs:106-124`.
3. Create or use a handoff in `Network > Collab`, accept it as `chef-b`, then return to the source chef.
4. Verify `Start Intro` appears only for the accepted recipient.
5. Start the intro with client name/email and `transfer` mode.
6. Verify:
   - a bridge card appears in `Active Introductions`
   - `/network/bridges/[bridgeId]` opens
   - the bridge feed shows the intro system message
7. Open the destination Dinner Circle from the bridge and verify it exists under the recipient chef's ownership.
8. Join the bridge as the client through the token/join route and verify the bridge page renders `HubBridgeView`, not the full Dinner Circle tabbed interface.
9. Leave the bridge as the source chef and verify:
   - source chef can no longer post in the bridge
   - the bridge stays visible in history
   - the destination Dinner Circle still works
10. Repeat with `shared` mode and verify the source chef remains in the bridge while the destination Dinner Circle still exists for client + recipient chef communication.

---

## Out of Scope

- Full `Handoff Packet` / raw-vs-curated transfer bus
- Chef-only `Private Spaces` implementation
- Universal cross-container inbox
- Dinner Circle public visibility / governance rules
- True cross-tenant multi-chef participation inside a single Dinner Circle
- Rich media/doc/ledger transfer into the bridge

---

## Notes for Builder Agent

- Reuse the hub stack for the bridge thread. Do not invent a fourth chat table.
- Do not extend `HubGroupView` into a bridge-specific one-off state monster. Add a dedicated `HubBridgeView` and branch at the route loader.
- The destination Dinner Circle should be created with the existing hub data model, not the standalone chat system.
- Do not route this through `event_collaborators` or `conversations`.
- Bridge groups must keep `tenant_id = NULL`. That is the simplest way to avoid polluting Dinner Circle lists that currently query by `tenant_id` in `lib/hub/chef-circle-actions.ts:46-63`.

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- Dinner Circle docs and routes: `docs/chefflow-product-definition.md:1721-1731`, `docs/app-complete-audit.md:188-195`, `app/(chef)/circles/page.tsx:5-25`
- Dinner Circle inbox copy and list behavior: `components/hub/circles-inbox.tsx:81-156`
- Public Dinner Circle route and full view: `app/(public)/hub/g/[groupToken]/page.tsx:32-70`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:29-438`
- Client-authenticated hub route: `app/(client)/my-hub/g/[groupToken]/page.tsx:28-63`
- Join flow: `app/(public)/hub/join/[groupToken]/page.tsx:9-53`, `app/(public)/hub/join/[groupToken]/join-form.tsx:19-40`
- Hub data model: `lib/hub/types.ts:43-163`, `lib/db/migrations/schema.ts:14774-15006`
- Hub group creation and membership: `lib/hub/group-actions.ts:11-52`, `lib/hub/group-actions.ts:133-228`
- Hub messaging: `lib/hub/message-actions.ts:12-149`
- Source-circle lookup helpers: `lib/hub/circle-lookup.ts:21-60`
- Chef-side circle listing is tenant-scoped: `lib/hub/chef-circle-actions.ts:34-63`
- Structured collab handoffs: `app/(chef)/network/page.tsx:175-210`, `app/(chef)/network/page.tsx:429-446`, `app/(chef)/network/collab-inbox.tsx:122-170`, `app/(chef)/network/collab-inbox.tsx:620-760`, `app/(chef)/network/collab-inbox.tsx:880-980`, `lib/network/collab-actions.ts:934-1085`, `database/migrations/20260330000026_chef_collaboration_network.sql:33-124`
- Adjacent system that must not be reused: `components/events/event-collaborators-panel.tsx:3-17`, `lib/collaboration/actions.ts:4-10`, `lib/chat/actions.ts:59-75`, `lib/chat/actions.ts:185-223`, `components/chat/new-conversation-button.tsx:48-59`, `lib/community/community-actions.ts:286-340`

### 2. What exactly changes?

- Add one new table: `chef_intro_bridges`.
- Add one new server-action file for intro bridge lifecycle.
- Add one new chef route for authenticated bridge access.
- Add one new minimal bridge UI component.
- Modify collab UI to create/list bridges.
- Modify existing hub route loaders to branch bridge vs Dinner Circle view.
- Modify join copy so bridge join language is not mislabeled as a generic dinner circle.
- Extend `HubGroup.group_type` typing to include `'bridge'`.

No existing Dinner Circle table structure changes. No existing `chef_handoffs` schema changes.

### 3. What assumptions are you making?

- **Verified:** `hub_groups.group_type` is plain text and does not require a DB enum migration, based on `lib/db/migrations/schema.ts:14941-14956`.
- **Verified:** `hub_groups.visibility` already supports `secret`, based on `lib/db/migrations/schema.ts:15003-15005`.
- **Verified:** source-circle lookup exists for inquiry/event-backed handoffs, based on `lib/hub/circle-lookup.ts:21-60`.
- **Verified:** current Dinner Circle chef listing is tenant-scoped and would not automatically show a recipient-owned circle to the source chef, based on `lib/hub/chef-circle-actions.ts:46-63`.
- **Unverified by current code, explicitly specified here:** the preferred default intro mode should be `shared`. This comes from product intent, not existing implementation.
- **Unverified by current code, explicitly specified here:** the destination Dinner Circle should be created immediately during bridge creation rather than waiting for a later step. This is a spec decision to avoid a dead-end intro workflow.

### 4. Where will this most likely break?

1. **Route branching at the public hub page.**
   `app/(public)/hub/g/[groupToken]/page.tsx:32-70` currently assumes every hub group uses the full `HubGroupView`. If the builder mutates `HubGroupView` instead of branching cleanly to `HubBridgeView`, Dinner Circle regressions are likely.
2. **Profile-token handling for chefs.**
   Existing public hub flows rely on cookie/profile-token join behavior in `app/(public)/hub/join/[groupToken]/join-form.tsx:24-40` and `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:92-117`. If builders rely on the public token route for chefs instead of the new authenticated chef bridge route, chefs may not get an authoring token reliably.
3. **Wrong ownership model for the post-intro dinner.**
   If builders try to keep using the source chef's existing Dinner Circle instead of creating a target-chef-owned one, the recipient chef will not own or list the ongoing dinner correctly because circle listing is tenant-scoped in `lib/hub/chef-circle-actions.ts:46-63`.

### 5. What is underspecified?

The main underspecified risks are now resolved explicitly:

- who can start a bridge: source chef only, after recipient accepted
- where the bridge is launched: outgoing collab handoffs
- what container owns the ongoing dinner: target-chef-owned Dinner Circle
- where shared or observer source-chef involvement lives: the bridge, not the target Dinner Circle
- whether bridge groups should appear in Dinner Circle lists: no, because `tenant_id = NULL`

The only intentionally deferred areas are listed in `Out of Scope`.

### 6. What dependencies or prerequisites exist?

- Existing `chef_handoffs` system must already exist: `database/migrations/20260330000026_chef_collaboration_network.sql:33-124`
- Existing hub stack must remain available: `lib/hub/types.ts:43-163`, `lib/hub/group-actions.ts:11-52`, `lib/hub/message-actions.ts:12-149`
- The migration must be added after `20260401000144_openclaw_upc_unique.sql` in `database/migrations`
- No dependency on `p1-chef-collab-spaces.md`; this slice is independently buildable

### 7. What existing logic could this conflict with?

- Full Dinner Circle route rendering in `app/(public)/hub/g/[groupToken]/page.tsx:32-70`
- Client-authenticated hub route in `app/(client)/my-hub/g/[groupToken]/page.tsx:33-61`
- Dinner Circle listing via tenant-owned `hub_groups` in `lib/hub/chef-circle-actions.ts:46-63`
- Event collaboration ownership rules in `lib/collaboration/actions.ts:4-10`
- Standalone conversation flows in `lib/chat/actions.ts:185-223`

### 8. What is the end-to-end data flow?

1. Source chef opens `Network > Collab` and sees an accepted outgoing handoff in `app/(chef)/network/collab-inbox.tsx:880-980`
2. Source chef clicks `Start Intro`
3. `createIntroductionBridge(input)` verifies the handoff/recipient, resolves hub profiles, finds a source circle when possible via `lib/hub/circle-lookup.ts:21-60`, creates a bridge `hub_groups` row, creates a destination Dinner Circle `hub_groups` row, inserts memberships, and writes a `chef_intro_bridges` row
4. The collab route revalidates and shows the new bridge in `Active Introductions`
5. Source chef lands on `/network/bridges/[bridgeId]`, which loads the bridge, current chef hub profile token, members, and `HubFeed`
6. Client accesses the bridge through the existing token/join flow, then lands on the same bridge group token route
7. Ongoing client + recipient-chef dinner communication uses the destination Dinner Circle token
8. Source chef optionally leaves the bridge or marks it complete

### 9. What is the correct implementation order?

1. Add the migration for `chef_intro_bridges`
2. Regenerate `lib/db/migrations/schema.ts`
3. Build `lib/network/intro-bridge-actions.ts`
4. Build `components/hub/hub-bridge-view.tsx`
5. Add the authenticated chef route `/network/bridges/[bridgeId]`
6. Modify public/client hub routes to branch bridge vs Dinner Circle rendering
7. Modify `Network > Collab` UI to create/list bridges
8. Adjust join-page copy for bridge groups

This order is correct because the collab UI should not ship before the lifecycle record, route, and bridge renderer exist.

### 10. What are the exact success criteria?

- A source chef can start an intro only from an accepted outgoing handoff
- Starting the intro creates exactly one bridge row and exactly one bridge hub group
- Starting the intro also creates exactly one target-chef-owned Dinner Circle
- Bridge groups render the slim intro UI, not the full Dinner Circle UI
- Client token access works through existing join mechanics
- Source chef can leave the bridge without breaking the destination Dinner Circle
- Bridge groups never appear in `/circles`

### 11. What are the non-negotiable constraints?

- Default privacy: bridge groups and destination Dinner Circles must both be private/secret
- Auth boundary: chef actions require `requireChef()`
- Ownership boundary: destination Dinner Circle belongs to the recipient chef
- Container boundary: the bridge is not a Dinner Circle and the Dinner Circle is not the bridge
- No silent reuse of standalone chat, community DM, or event collaboration

### 12. What should NOT be touched?

- Do not rewrite `HubGroupView` into a bridge-aware mega-component
- Do not change `chef_handoffs` semantics
- Do not change event ownership or `event_collaborators`
- Do not move Dinner Circles out of `/circles`
- Do not build `Handoff Packet`, `Private Spaces`, or universal inbox behavior in this spec

### 13. Is this the simplest complete version?

Yes. This is the smallest complete slice that:

- gives the product a real intro workflow
- keeps Dinner Circle canonical
- avoids inventing a new chat system
- avoids pretending cross-tenant multi-chef Dinner Circle ownership already works

Anything smaller would push builders back into SMS-like behavior or force them to guess the post-intro container.

### 14. If implemented exactly as written, what would still be wrong?

- Shared or observer source-chef participation still lives in the bridge, not inside the recipient's Dinner Circle. True multi-chef Dinner Circle governance is still a separate spec.
- Raw-vs-curated handoff packet transfer is still not implemented; the bridge only solves the intro layer.
- Universal cross-container activity feed and richer timestamp/feed QoL across the whole app remain separate work.

Those are acceptable remaining gaps for this slice because they do not break the intro bridge itself.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the `Introduction Bridge` slice.

The remaining uncertainty is not inside this slice's correctness; it belongs to adjacent follow-up specs:

- full handoff packet / transfer bus
- true shared-chef Dinner Circle governance
- universal inbox / timeline unification

Those are explicitly fenced out here, and this file does not require them to implement the intro workflow correctly.

---

## V2 Follow-Up Survey (Saved For Later)

This section exists because the current spec fully defines the `Introduction Bridge` slice, but not the entire long-term collaboration system around it. These questions should drive the next planning pass instead of being rediscovered from scratch later.

### A. Bridge Lifecycle

1. When should an intro bridge auto-close, if ever?
2. Should a bridge expire automatically after destination-circle activity starts, or only by explicit chef action?
3. Should the client ever see a label that indicates one chef is `primary` and another is `introducing`, or should that remain internal only?
4. If the source chef leaves the bridge, should the client still see historical messages from that chef?
5. Should the bridge support more than one client contact in V2, or remain anchored to one primary contact plus copied guests?

### B. Destination Dinner Circle Governance

1. In a future shared-management mode, should the source chef be able to observe the target Dinner Circle directly, or should that always remain separate from the bridge?
2. If both chefs continue working with the same client long-term, should there be one shared Dinner Circle or parallel chef-owned Dinner Circles?
3. Should the client be able to choose a default chef for future outreach, and if so, should that choice be visible to both chefs or private?
4. If copied guests are brought into the target Dinner Circle, should they receive any onboarding message that explains the chef transition?
5. Should the target chef be allowed to rename the destination Dinner Circle immediately, or should the source context naming be preserved first?

### C. Handoff Packet / Transfer Bus

1. What should be transferable in V2 by default:
   - inquiry summaries
   - full message transcript
   - menus
   - recipes
   - grocery lists
   - pricing context
   - receipts
   - photos
   - ledgers
   - files and links
2. Which assets should transfer automatically, and which should require explicit selection?
3. Should curated summary always be mandatory, even when raw transcript exists?
4. Should the recipient chef be able to request more context from the sender inside the bridge before accepting the destination Dinner Circle as canonical?
5. Should imports/exports be reversible, auditable, and timestamped at the asset level?

### D. Shared Context And Debrief

1. After a dinner is completed, should post-event photos, debrief notes, and `how did it go` discussion live in the bridge, in a private chef space, or in a new post-handoff container?
2. Should the system explicitly track debrief milestones like:
   - client responded
   - intro completed
   - dinner booked
   - dinner completed
   - photos shared
   - follow-up complete
3. Should a chef be able to reopen a completed bridge for follow-up, or should follow-up always happen in a private chef space?

### E. Inbox And Timeline QoL

1. Should intro bridges appear in one global `All` feed with Dinner Circles and Private Spaces, or in separate lanes with an aggregate tab?
2. What visual rules should trigger day separators, elapsed-time separators, and `new activity since last visit` markers across all containers?
3. Should unread counts be tracked independently for bridge, destination Dinner Circle, and eventual Private Space, or rolled up into one collaboration badge?

### F. Discovery And Public Semantics

1. When a collaboration or circle goes `public` later, should it become visible only to chefs, only to authenticated members, or in a curated showcase surface?
2. What exactly is the approval rule for public visibility when multiple people are involved:
   - unanimous one-time approval
   - persistent opt-in profile setting
   - per-post approval
3. Should public visibility ever apply to introduction bridges, or should bridges remain permanently private by design?

### G. Why This Survey Exists

If the builder implements this spec exactly as written, the intro workflow will work. What it will not answer by itself is the broader operational design around:

- long-lived shared chef involvement after the intro
- full transfer-bus depth
- destination-circle governance when more than one chef remains relevant
- cross-container inbox behavior
- public/discovery semantics

Those are the right next questions. They are now preserved here so the next spec pass can build on verified context instead of starting over.
