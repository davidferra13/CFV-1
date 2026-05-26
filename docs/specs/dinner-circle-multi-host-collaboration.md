# Spec: Dinner Circle Multi-Host Collaboration

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** dinner-circle-elevation (verified), p1-chef-collab-spaces (migration exists, not built)
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-04 23:00 | Planner (Opus 4.6) |        |
| Status: ready         |                  |                    |        |
| Claimed (in-progress) |                  |                    |        |
| Spike completed       |                  |                    |        |
| Pre-flight passed     |                  |                    |        |
| Build completed       |                  |                    |        |
| Type check passed     |                  |                    |        |
| Build check passed    |                  |                    |        |
| Playwright verified   |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

### Raw Signal

A chef is co-hosting a dinner with an external partner (farmer, venue, property manager, brand, etc.) who has their own location and operational role in the event. Currently, this is handled through fragmented tools like Google Docs, which creates confusion, lack of ownership clarity, and zero operational transformation.

This must become a first-class use case inside Dinner Circle. A Dinner Circle must support multiple hosts, each with clearly defined roles and permissions. All collaborators must operate within the same shared environment. The system must allow shared planning (menu, logistics, schedule, responsibilities), visibility across the full lifecycle, structured ownership, real-time updates, and seamless transition from planning to execution to post-event.

Do not rebuild Dinner Circle from scratch. Audit what exists and extend it. Preserve current workflows. Integrate cleanly into the existing event lifecycle.

### Developer Intent

- **Core goal:** Make Dinner Circle the default system for any multi-party dinner, eliminating external coordination tools entirely.
- **Key constraints:** No rebuild. Extend existing schema and workflows. Preserve single-chef dinner flows (the common case must not break). External partners are not necessarily ChefFlow users.
- **Motivation:** Real co-hosted events are happening now and being coordinated in Google Docs. Every minute spent outside ChefFlow is a coordination failure and a product gap.
- **Success from the developer's perspective:** A chef invites a partner (farmer, venue, brand) to a dinner circle. Both can see and manage the event plan, assign responsibilities, communicate with guests, and track the full lifecycle, without ever leaving ChefFlow.

---

## What This Does (Plain English)

A chef creating or managing a dinner can invite one or more co-hosts (another chef, a farmer, a venue manager, a brand rep) directly into the Dinner Circle. Each co-host gets a defined role with specific permissions (what they can see, post, edit). Guests see all hosts transparently. The planning flow (menu, logistics, schedule, task ownership) becomes shared. All lifecycle updates, messages, and decisions live in one place. No Google Docs. No text threads. One circle, multiple hosts, structured collaboration.

---

## Why It Matters

Multi-party dinners are a real and growing use case (farm-to-table, venue partnerships, brand collaborations). Without native support, coordination happens in external tools, which means ChefFlow loses control of the event lifecycle, the chef loses operational clarity, and the product fails its core promise of being the single command center for every dinner.

---

## What Exists Today (Audit)

### Already Built (Reuse)

| System                      | Tables/Files                                                                                    | What It Does                                                                                                                                                                      | Reuse For                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Dinner Circles**          | `hub_groups`, `hub_group_members`, `hub_messages`, `hub_polls`, `hub_pinned_notes`, `hub_media` | Per-event shareable command center with chat, polls, pinned notes, photos, lifecycle broadcasts                                                                                   | The container. Circles already support multiple members with roles (owner/admin/chef/member/viewer) |
| **Event Collaborators**     | `event_collaborators`                                                                           | Chef-to-chef collaboration on events. Roles: primary, co_host, sous_chef, observer. Permissions: modify_menu, assign_staff, view_financials, communicate_with_client, close_event | The permission backbone for co-chefs on the event itself                                            |
| **Hub Guest Profiles**      | `hub_guest_profiles`                                                                            | Identity for anyone in a circle (guest, client, or chef). Token-based, no-auth access. Links to `auth_user_id` or `client_id` if registered                                       | Profile system for all circle participants including external partners                              |
| **Circle Lifecycle Hooks**  | `lib/hub/circle-lifecycle-hooks.ts`                                                             | Auto-posts system messages to circles on key events (menu shared, quote sent, payment, arrival, completion)                                                                       | Broadcasts to all participants, including co-hosts                                                  |
| **Chef Network**            | `chef_trusted_circle`, `chef_connections`                                                       | Chef-to-chef relationships and trust tiers                                                                                                                                        | Gate for inviting co-chef hosts                                                                     |
| **Collab Spaces Migration** | `chef_collab_spaces`, `chef_collab_threads`, `chef_collab_messages`                             | Tables exist in migration `20260401000147`. Private chef-only workspaces                                                                                                          | Could provide the "back-channel" for host-only planning                                             |

### Gaps Preventing Multi-Host

| Gap                                           | Impact                                                                                                                          | Solution                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **No host concept in circles**                | Circles have owner/admin/chef/member/viewer but no explicit "co-host" designation. No way to mark someone as a host vs. a guest | Add `is_host` flag to `hub_group_members` + new `host_label` field                                                      |
| **Circle is single-tenant**                   | `hub_groups.tenant_id` points to one chef. Co-hosted events need multiple chefs visible                                         | Add `hub_group_hosts` join table linking multiple chefs/partners to a circle                                            |
| **Event collaborators don't link to circles** | `event_collaborators` and `hub_group_members` are separate systems. No bridge                                                   | Auto-add event collaborators as circle members when circle exists                                                       |
| **External partners have no identity model**  | A farmer or venue manager isn't a chef and isn't a client. No profile type fits                                                 | Extend `hub_guest_profiles` with `profile_type` ('guest', 'client', 'partner', 'chef') and optional `organization_name` |
| **No task/responsibility ownership**          | No way to assign "who brings what" or "who handles X"                                                                           | Add `hub_tasks` table for structured task assignment within circles                                                     |
| **No host-only channel**                      | Hosts need a private back-channel for planning that guests don't see                                                            | Add host-only messaging scope (message visibility filter, not a separate group)                                         |
| **Lifecycle hooks are single-chef**           | `postMenuSharedToCircle()` etc. reference one chef. Multi-host needs attribution                                                | Extend hooks to accept `actingChefId` parameter for correct attribution                                                 |
| **Guest-facing host display**                 | Public circle view shows one chef name. Multi-host dinners need "Hosted by Chef A & Partner B"                                  | UI extension on circle header and share pages                                                                           |

---

## Database Changes

### New Tables

```sql
-- Task assignment within circles (shared planning)
CREATE TABLE hub_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  assigned_to_profile_id UUID REFERENCES hub_guest_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
    -- 'menu', 'logistics', 'setup', 'supplies', 'cleanup', 'general'
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'in_progress', 'done', 'cancelled'
  due_date TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_tasks_group ON hub_tasks(group_id);
CREATE INDEX idx_hub_tasks_assigned ON hub_tasks(assigned_to_profile_id);
```

### New Columns on Existing Tables

```sql
-- Mark members as hosts (vs. guests)
ALTER TABLE hub_group_members
  ADD COLUMN is_host BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN host_label TEXT,
    -- e.g. 'Chef', 'Venue', 'Farm Partner', 'Brand Rep'
  ADD COLUMN host_organization TEXT;
    -- e.g. 'Green Acres Farm', 'The Venue at Harbor'

-- Partner identity on guest profiles
ALTER TABLE hub_guest_profiles
  ADD COLUMN profile_type TEXT NOT NULL DEFAULT 'guest',
    -- 'guest', 'client', 'partner', 'chef'
  ADD COLUMN organization_name TEXT;

-- Host-only message visibility
ALTER TABLE hub_messages
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'all';
    -- 'all' (everyone sees it), 'hosts_only' (only is_host members see it)

-- Link event collaborators to their circle membership
ALTER TABLE event_collaborators
  ADD COLUMN hub_member_id UUID REFERENCES hub_group_members(id);
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule).
- All changes are additive. No drops, no renames.
- `hub_group_members.is_host` defaults false, so existing circles are unaffected.
- `hub_guest_profiles.profile_type` defaults 'guest', so existing profiles are unaffected.
- `hub_messages.visibility` defaults 'all', so existing messages remain visible to everyone.

---

## Data Model

### Host Model

A circle can have 0-N hosts (backwards compatible: existing circles have 0 explicit hosts and work exactly as before). Each host is a `hub_group_member` with `is_host = true`. Hosts have a label ("Chef", "Venue Partner", "Farm") and optional organization name.

The circle owner (the primary chef) is always a host. Co-hosts are added via invitation, which creates both:

1. A `hub_group_member` row with `is_host = true` and appropriate role ('admin' or 'chef')
2. An `event_collaborator` row if this is an event-linked circle and the co-host is a ChefFlow chef

### Task Model

Tasks belong to a circle. Any host can create tasks. Tasks can be assigned to any member (host or guest). Categories provide structure: menu, logistics, setup, supplies, cleanup, general. Status tracks completion. This replaces Google Docs checklists.

### Message Visibility

Messages have a `visibility` field: 'all' (default, everyone sees) or 'hosts_only' (only members with `is_host = true` see). This gives hosts a private back-channel without needing a separate group. The UI shows a toggle when composing: "Hosts only" vs "Everyone."

### External Partner Flow

An external partner (farmer, venue) is invited via email or shareable link. They get a `hub_guest_profile` with `profile_type = 'partner'` and `organization_name`. They join the circle as a member with `is_host = true`, `role = 'admin'`, and a descriptive `host_label`. They can post, create tasks, pin notes, and view the full event lifecycle. They do NOT need a ChefFlow account.

---

## Server Actions

| Action                                                        | Auth                                                       | Input                          | Output                           | Side Effects                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------ |
| `inviteCoHost(groupId, email, hostLabel, organization?)`      | `requireChef()`                                            | email, label, org name         | `{ success, memberId?, error? }` | Creates/finds profile, adds as host member, sends invite email, posts system message |
| `removeCoHost(groupId, memberId)`                             | `requireChef()` (owner only)                               | group + member IDs             | `{ success, error? }`            | Sets `is_host = false`, posts system message                                         |
| `updateHostInfo(groupId, memberId, label, organization)`      | `requireChef()`                                            | updated host info              | `{ success, error? }`            | Updates member row                                                                   |
| `getCircleHosts(groupId)`                                     | Circle member                                              | group ID                       | `Host[]`                         | None                                                                                 |
| `createTask(groupId, title, category, assignedTo?, dueDate?)` | Circle host                                                | task fields                    | `{ success, taskId?, error? }`   | Revalidates circle, posts system message if assigned                                 |
| `updateTask(taskId, updates)`                                 | Task creator or assignee                                   | partial task                   | `{ success, error? }`            | Revalidates circle                                                                   |
| `completeTask(taskId)`                                        | Any host                                                   | task ID                        | `{ success, error? }`            | Sets completed_at, posts system message                                              |
| `deleteTask(taskId)`                                          | Task creator or circle owner                               | task ID                        | `{ success, error? }`            | Soft removes                                                                         |
| `getCircleTasks(groupId, filter?)`                            | Circle member (hosts see all, guests see assigned-to-them) | group + optional status filter | `Task[]`                         | None                                                                                 |
| `postHostOnlyMessage(groupId, body, mediaUrls?)`              | Circle host                                                | message content                | `{ success, messageId? }`        | Creates message with `visibility = 'hosts_only'`                                     |

---

## UI / Component Spec

### 1. Circle Header (Extended)

**File:** `components/hub/circle-header.tsx` (modify)

Currently shows circle name + chef name. Extended to show all hosts:

```
Dinner at Green Acres Farm
Hosted by Chef David & Sarah (Green Acres Farm)
```

- Each host shown with their label and organization
- If 3+ hosts, show first two + "+N more" with tooltip
- Host avatars displayed in a stacked row

### 2. Host Management Panel

**File:** `components/hub/circle-host-panel.tsx` (new)

Accessible from circle settings (owner only). Shows:

- List of current hosts with label, organization, and role
- "Invite Co-Host" button: email input + host label dropdown (Chef, Venue, Farm Partner, Brand, Custom)
- Remove host action (with confirmation)
- Edit host label/organization inline

### 3. Task Board

**File:** `components/hub/circle-task-board.tsx` (new)

A tab within the circle view (alongside Chat, Menu, Members, etc.):

- **Layout:** Kanban-style columns: To Do | In Progress | Done
- **Task card:** Title, category badge, assignee avatar, due date
- **Create task:** Inline form at top of "To Do" column
- **Assign:** Dropdown of all circle members (hosts and guests)
- **Category filter:** Tabs or chips for menu/logistics/setup/supplies/cleanup/all

### States

- **Loading:** Skeleton cards in columns
- **Empty:** "No tasks yet. Start planning by adding your first task." with CTA button
- **Error:** `<DataError message="Could not load tasks" />`
- **Populated:** Kanban board with drag-to-reorder (within column, not cross-column drag for v1)

### 4. Host-Only Chat Toggle

**File:** `components/hub/message-composer.tsx` (modify)

When the current user is a host (`is_host = true`), the message composer shows a toggle:

```
[Everyone] | [Hosts Only]
```

- Default: "Everyone"
- "Hosts Only" messages render with a subtle badge/border (e.g., dashed border, lock icon) visible only to hosts
- Non-host members never see host-only messages in their feed

### 5. Guest-Facing Host Display

**File:** `app/(public)/hub/g/[token]/page.tsx` (modify)

The public circle page shows all hosts in the header area:

```
Your Dinner Circle
Hosted by Chef David Ferreira & Sarah Miller (Green Acres Farm)
[Chef avatar] [Partner avatar]
```

### 6. Event Collaborator Sync

When an `event_collaborator` is added/accepted on an event that has a linked circle:

- Auto-create hub_guest_profile for the collaborator chef (if not exists)
- Auto-add as `hub_group_member` with `is_host = true` and role based on collaborator role mapping:

| event_collaborator.role | hub_group_member.role | is_host |
| ----------------------- | --------------------- | ------- |
| primary                 | owner                 | true    |
| co_host                 | admin                 | true    |
| sous_chef               | chef                  | false   |
| observer                | viewer                | false   |

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partner invited by email but already has a hub profile     | Match by email_normalized, add as host to this circle. Don't create duplicate profile                                                             |
| Owner tries to remove themselves as host                   | Block. Owner is always a host. Show toast: "The circle owner cannot be removed as a host"                                                         |
| Co-host removed from event_collaborators                   | Sync: set `is_host = false` on their circle membership but don't remove them from the circle (they may still be a guest)                          |
| Two hosts post conflicting menu updates                    | Last-write-wins. Both posts appear in the timeline. Lifecycle hooks attribute to the acting chef                                                  |
| External partner has no email (in-person invite)           | Generate a shareable invite link (token-based, like existing circle join flow). Partner joins via link, creates profile on first visit            |
| Circle has no event linked (standalone)                    | Tasks and host management still work. Event-specific lifecycle hooks simply don't fire                                                            |
| Host-only message accidentally contains guest-visible info | No system enforcement (that's a human judgment call). The toggle is clear. If a host wants to share with everyone, they repost in "Everyone" mode |
| Partner leaves the circle                                  | `is_host` set to false, removed from host display. Their messages remain (attributed to their name)                                               |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/circles`, open an existing event circle
3. Open circle settings, verify "Hosts" section appears
4. Invite a co-host by email with label "Farm Partner" and org "Green Acres"
5. Verify system message posted to circle: "Sarah (Green Acres) joined as Farm Partner"
6. Verify circle header shows both hosts
7. Open Tasks tab, verify empty state
8. Create a task: "Source heirloom tomatoes" with category "Supplies", assign to the partner
9. Verify task appears in To Do column
10. Toggle message composer to "Hosts Only", send a message
11. Verify the message appears with host-only badge
12. Open the public circle page (`/hub/g/{token}`), verify both hosts displayed in header
13. Verify non-host members don't see the host-only message
14. Screenshot final state

---

## Out of Scope

- **Chef Collab Spaces integration** - the private chef-only workspace system is a separate P1 spec. This spec uses host-only messages as the lightweight back-channel
- **Notification preferences per-host** - existing member notification preferences (mute, digest mode, quiet hours) apply uniformly. Host-specific notification routing is future work
- **Cross-tenant event ownership transfer** - events remain single-tenant (one chef owns). Collaborators gain access via `event_collaborators`. Ownership transfer is a separate concern
- **Video/voice calls within circles** - external tool territory for now

---

---

## Cohosting Agreement Engine

> **Status:** IN SCOPE (promoted from out-of-scope 2026-05-26)
> **Source:** Real-world case study (Honey & Stem Farm dinner, Sep 2025) + chef industry conversations
> **Memory refs:** `project_cohosting_circle_case_study.md`, `project_cohosting_agreement_engine.md`

### Why This Exists

The biggest pain point in chef-venue collaborations is that compensation and responsibility division never gets formally discussed. It happens through word of mouth, assumptions, and one party deferring to whoever seems more experienced. From a real cohosted dinner (chef + farmer, 5-course, $155/ticket, 60/40 split), the revenue split was never formally agreed; it just happened because the farmer deferred to the chef's experience. Conversations with multiple chefs confirmed: "that's the first thing you should always discuss internally."

Without formal documentation there is zero credibility, zero fallback if someone is unhappy. "You signed this" is the foundation of professional collaboration. ChefFlow must formalize what currently lives in text threads and handshakes.

### The Cohosting Agreement

When a cohosting Dinner Circle creates an event where money is involved (ticket sales or any party receives compensation), ChefFlow presents a structured **Responsibility & Compensation Agreement** that all co-hosts must walk through and e-sign before tickets go live.

The agreement is:

1. A **Responsibility Checklist** covering the entire event lifecycle (before, during, after)
2. A **Compensation Structure** defining how money flows
3. A **Legal-grade document** with e-signatures from all parties

### Compensation Models

Four industry-standard models, configured FIRST when creating a cohosting event:

| Model                  | Description                                                                       | When Used                                    |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| **Venue sells 100%**   | Venue handles all ticket sales. Chef receives flat fee or percentage split.       | Most common when chef has no local following |
| **Both sell**          | Both parties sell tickets. Revenue pooled and split by agreed ratio (e.g., 60/40) | The default collaborative model              |
| **Chef sells 100%**    | Chef handles all sales. Venue receives flat venue fee.                            | Rare for farm dinners                        |
| **Fixed compensation** | Chef gets flat rate regardless of sales.                                          | Simplest; least aligned incentives           |

### Responsibility Checklist

The checklist IS the event roadmap. Not just pre-event planning; covers before, during, and after.

**Every checklist item has:**

- **Assignment:** Chef / Venue / Shared / N/A
- **Notes field:** Free-text where each party adds specifics (every venue is different, every chef has particular needs)
- **Status:** Not started / In progress / Done (tracked during event execution)

Default items work for ANY cohosting dinner circle. Users customize with notes, add custom items, remove irrelevant ones.

#### Category 1: Tickets & Revenue

- Ticket pricing
- Who sells tickets (venue / chef / both / platform)
- Revenue split model (percentage / fixed / per-ticket)
- Revenue split ratio and exact amounts
- Payment method and timing
- Refund policy ownership

#### Category 2: Ingredients & Sourcing

- Farm-sourced ingredients (farmer harvests/provides)
- Market-bought ingredients (who shops, who pays)
- Specialty items (butcher, fishmonger, forager)
- Ingredient list exchange (chef sends quantities, farmer confirms)
- Substitution authority (who decides alternatives)
- Harvest timing coordination

#### Category 3: Equipment & Serviceware

- Plates, bowls, serving platters
- Glasses (water, wine, cocktail)
- Silverware, napkins
- Cooking equipment (grills, burners, ovens)
- Prep equipment (cutting boards, blenders, processors)
- Serving equipment (chafing dishes, tea pots, boards)
- Tables, chairs, seating
- Linens, table cloths
- Rentals needed (who arranges, who pays)

#### Category 4: Venue & Setup

- Property preparation (mowing, cleaning, pathways)
- Table setup and decor
- Lighting (string lights, candles, lanterns)
- Weather contingency (tents, indoor backup)
- Parking arrangement
- Signage and wayfinding
- Heating/cooling (outdoor heaters, fans)
- Restroom access
- Power (extension cords, generators)

#### Category 5: Culinary Execution

- Menu design and finalization
- Prep (by course)
- Cooking (by course)
- Plating (by course)
- Service/running food (by course)
- Appetizers/nibbles/pre-dinner
- Dessert
- Staff/helpers needed

#### Category 6: Beverages

- Wine/beer sourcing
- Cocktail/mocktail creation
- Non-alcoholic beverages
- Who pays for beverages
- Included in ticket vs upcharge
- Bar setup and service

#### Category 7: Hospitality & Guest Experience

- Guest greeting and welcome
- Farm tour / venue tour
- Course introductions / storytelling
- Guest comfort (blankets, heaters, bug spray)
- Music/ambiance
- Post-dinner experience (fire pit, lounge)

#### Category 8: Marketing & Promotion

- Event flyer/graphic design
- Social media promotion
- Website listing
- Cross-promotion (tag each other)
- Photography during event
- Post-event content sharing

#### Category 9: Guest Management

- Guest communication (pre-event email, logistics)
- Dietary restrictions and allergies collection
- Headcount tracking and confirmation
- Special occasions (birthdays, etc.)
- Day-of guest questions

#### Category 10: Wrap-Up & Post-Event

- Clear table (dishes, glasses, decor)
- Wash dishes and serviceware
- Clean cooking area / outdoor kitchen
- Pack chef's personal equipment (knives, kit)
- Store or return venue equipment
- Dispose of trash and compost
- Clean restroom areas
- Break down tent / temporary structures
- Store tables and chairs
- Handle leftover food (who keeps what, plates for hosts)
- Secure venue (lock sheds, turn off lights, close gates)
- Return borrowed or rented items
- Thank-you messages to guests
- Share event photos between co-hosts
- Post-event social media (tagging, sharing)
- Collect reviews / feedback from guests
- Revenue reconciliation and payout
- Debrief between co-hosts (what worked, what to change)

### Agreement Document Structure

The completed checklist generates a formal document containing:

1. **Party identification:** Full names, contact info, roles (Chef / Venue / Farmer / etc.)
2. **Event details:** Date, location, expected headcount, ticket price
3. **Compensation structure:** Model, exact amounts or percentages, payment method, payment timeline
4. **Complete responsibility matrix:** Every checklist item with assignments and notes
5. **E-signatures from all parties**
6. **Date signed**
7. **Amendment history** (changes after signing require all parties to re-acknowledge)

### When Required vs Optional

| Scenario                                    | Agreement Level                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Tickets sold or compensation exchanged      | **MANDATORY.** Full agreement with e-signatures. Cannot launch ticket sales without it. |
| Friends hosting together, no money involved | **Optional.** Checklist available for planning but no legal gate.                       |

The trigger is simple: if the event has tickets or any party receives compensation, the agreement is mandatory.

### Default Templates

Pre-configured for common scenarios (pre-fill reasonable defaults, fully customizable):

| Template                 | Description                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Chef + Farm/Venue**    | The primary model. Farmer provides venue + ingredients, chef cooks. Based on real Honey & Stem case study. |
| **Chef + Private Host**  | Someone hiring a chef for their home dinner party.                                                         |
| **Chef + Chef**          | Two chefs collaborating on a multi-course event.                                                           |
| **Chef + Restaurant**    | Pop-up dinner at an existing restaurant venue.                                                             |
| **Chef + Event Planner** | Planner handles logistics/tickets, chef handles food.                                                      |

### Circle-Level vs Event-Level

The cohosting agreement lives INSIDE the Dinner Circle, not just the event. When the circle creates a new event, it inherits the circle's default agreement but can be customized per event. Recurring collaborations (e.g., monthly farm dinners) don't re-negotiate everything each time; they just adjust what changed.

- **First event in a circle:** Full walkthrough required
- **Subsequent events:** Previous agreement carries forward, only changes need acknowledgment

### Database Changes (Agreement)

```sql
-- Cohosting agreement per circle (or per event within circle)
CREATE TABLE hub_cohost_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  template_type TEXT NOT NULL DEFAULT 'chef_farm',
    -- 'chef_farm', 'chef_private_host', 'chef_chef', 'chef_restaurant', 'chef_planner', 'custom'
  compensation_model TEXT NOT NULL DEFAULT 'both_sell',
    -- 'venue_sells_all', 'both_sell', 'chef_sells_all', 'fixed_fee'
  compensation_details JSONB NOT NULL DEFAULT '{}',
    -- { splitRatio: { chef: 40, venue: 60 }, fixedFee: null, paymentMethod: 'venmo', paymentTiming: 'within_48h' }
  status TEXT NOT NULL DEFAULT 'draft',
    -- 'draft', 'pending_signatures', 'active', 'amended', 'voided'
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual checklist items within an agreement
CREATE TABLE hub_agreement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
    -- 'tickets_revenue', 'ingredients', 'equipment', 'venue_setup', 'culinary',
    -- 'beverages', 'hospitality', 'marketing', 'guest_management', 'wrap_up'
  title TEXT NOT NULL,
  assignment TEXT NOT NULL DEFAULT 'unassigned',
    -- 'chef', 'venue', 'shared', 'na', 'unassigned'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
    -- 'not_started', 'in_progress', 'done'
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT true,
    -- true = came from template, false = user-added custom item
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_agreement_items_agreement ON hub_agreement_items(agreement_id);
CREATE INDEX idx_hub_agreement_items_category ON hub_agreement_items(category);

-- E-signatures on agreements
CREATE TABLE hub_agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,
  signer_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
    -- 'chef', 'venue', 'farm_partner', 'brand', etc.
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  version INTEGER NOT NULL DEFAULT 1,
    -- incremented on amendment; re-signature required when version changes
  UNIQUE(agreement_id, signer_profile_id, version)
);

CREATE INDEX idx_hub_agreement_signatures_agreement ON hub_agreement_signatures(agreement_id);
```

### Server Actions (Agreement)

| Action                                             | Auth                         | Input               | Output                                | Side Effects                                                             |
| -------------------------------------------------- | ---------------------------- | ------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `createAgreement(groupId, eventId?, templateType)` | Circle host                  | template type       | `{ success, agreementId }`            | Creates agreement + default items from template                          |
| `updateAgreementItem(itemId, assignment, notes?)`  | Circle host                  | item updates        | `{ success }`                         | Revalidates. If agreement was signed, bumps version and voids signatures |
| `addCustomItem(agreementId, category, title)`      | Circle host                  | item fields         | `{ success, itemId }`                 | Adds with `is_default = false`                                           |
| `removeCustomItem(itemId)`                         | Item creator or circle owner | item ID             | `{ success }`                         | Only non-default items. Default items can only be set to N/A             |
| `updateCompensation(agreementId, model, details)`  | Circle host                  | compensation config | `{ success }`                         | Voids existing signatures if changed                                     |
| `signAgreement(agreementId)`                       | Circle host                  | none (uses session) | `{ success }`                         | Records signature with timestamp and IP                                  |
| `getAgreement(groupId, eventId?)`                  | Circle member                | IDs                 | `Agreement` with items and signatures | None                                                                     |
| `getAgreementDocument(agreementId)`                | Circle host                  | ID                  | Formatted PDF/HTML of full agreement  | None                                                                     |
| `completeAgreementItem(itemId)`                    | Assigned party               | item ID             | `{ success }`                         | Marks done with timestamp                                                |
| `voidAgreement(agreementId)`                       | Circle owner                 | ID                  | `{ success }`                         | Sets status 'voided', blocks ticket sales                                |

### UI Components (Agreement)

#### Agreement Setup Flow (New)

**File:** `components/hub/cohost-agreement-setup.tsx`

Wizard-style flow triggered when first co-host is added to a circle with an event:

1. **Step 1: Template** - Choose collaboration type (Chef+Farm, Chef+Chef, etc.)
2. **Step 2: Compensation** - Select model (venue sells / both sell / etc.), set split ratio, payment method, timing
3. **Step 3: Responsibility Walkthrough** - Category by category, assign each item. Each item shows assignment toggle (Chef / Venue / Shared / N/A) and expandable notes field
4. **Step 4: Review & Sign** - Full agreement summary. Both parties review and e-sign.

#### Agreement Tab in Circle View

**File:** `components/hub/circle-agreement-tab.tsx`

New tab alongside Chat, Tasks, Menu, Members:

- Shows current agreement status (draft / pending signatures / active)
- Compensation summary card at top
- Checklist grouped by category with assignment badges and status
- Notes expandable per item
- Progress bar showing completion during event execution
- "View Agreement Document" button generates formatted PDF/HTML

#### Ticket Gate

When a co-hosted event attempts to publish tickets for sale:

- Check if agreement exists and has status 'active' (all signatures collected)
- If not: block with message "All co-hosts must sign the collaboration agreement before tickets go live"
- Link to the agreement setup flow

### Real-World Case Study (Validation Data)

All of the above is validated against the Honey & Stem Farm dinner (Sep 26, 2025):

**Event:** 5-course farm-to-table dinner, Fryeburg ME
**Co-hosts:** Chef (David) + Farmer (Hannah, Honey and Stem Farm)
**Tickets:** $155/person, 13 heads, $2,015 gross
**Split:** 60% farm / 40% chef ($806), paid via Venmo in chunks
**Pain points this feature solves:**

1. Revenue split discussed informally, never documented
2. Headcount confusion (11 at table vs 13 eating)
3. Ingredient list coordination happened over text for weeks
4. Equipment inventory tracked in nobody's head
5. Last-minute allergy notification (morning of event)
6. Partner double-booked, no staffing visibility
7. No post-event documentation of what was agreed

The relationship continued: pork sourcing Oct 2025, planning 2 dinners for summer/fall 2026, with higher pricing and expanded ingredients (goat milk, cheese, ice cream). The agreement template would carry forward across events.

---

## Notes for Builder Agent

1. **Start with the migration.** Check `database/migrations/` for the highest timestamp and increment. All changes are additive.
2. **The existing `hub_group_members.role` field already supports 'chef' and 'admin'.** The new `is_host` boolean is orthogonal to role. A member can be role='admin' + is_host=true (co-host) or role='admin' + is_host=false (trusted guest with extra permissions).
3. **Message visibility filter is the simplest approach for host-only chat.** Don't create a separate group or channel. Just filter `WHERE visibility = 'all' OR (visibility = 'hosts_only' AND viewer.is_host = true)` in `getHubMessages()`.
4. **Task board is a new tab in the circle view.** Look at how the existing tabs (Chat, Menu, Members, etc.) are structured in `components/hub/circles-page-tabs.tsx` and follow the same pattern.
5. **External partner invitation mirrors the existing circle invite flow** in `lib/hub/group-actions.ts` (`joinHubGroup`). The difference is pre-creating the profile and setting `is_host = true`.
6. **Event collaborator sync should be a lifecycle hook**, not inline logic. Add it to `lib/hub/circle-lifecycle-hooks.ts` alongside the existing hooks. Fire it when `event_collaborators` status changes to 'accepted'.
7. **The public circle page** at `app/(public)/hub/g/[token]/page.tsx` already shows the chef name. Extending it to show all hosts is a small UI change, not a new page.
8. **Backwards compatibility is critical.** Every new column has a default. Every new table is additive. Existing single-chef circles must work exactly as before with zero changes to their flow.
9. **Reference the canonical definition** at `prompts/dinner-circles-canonical.md` for the product philosophy. Dinner Circles are "the default coordination layer." This spec extends that to multi-party coordination.
10. **`lib/collaboration/types.ts`** already defines `CollaboratorRole`, `CollaboratorStatus`, and `CollaboratorPermissions`. Reuse these types for the event collaborator sync, don't redefine them.
