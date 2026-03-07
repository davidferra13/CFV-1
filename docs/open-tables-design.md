# Open Tables - Social Dining Discovery

> Design document for ChefFlow's social dining discovery feature.
> Status: DESIGN PHASE (no code written yet)

---

## What This Is

Open Tables lets clients make their upcoming dinner party _discoverable_ to other people in the chef's network. Two groups who'd never meet otherwise can find each other through the chef and combine into one bigger, better dinner party.

**The elevator pitch:** "Ever wish you could expand your dinner party circle? Open Tables connects like-minded foodies through your chef. Keep your table private, or open it up and meet new people who love great food as much as you do."

**What this is NOT:**

- Not a social media feed (no followers, no likes, no profiles)
- Not a public marketplace (only visible within one chef's client network)
- Not forced on anyone (private by default, always)

---

## Why This Matters (Business Case)

For the chef:

- Every open table is passive lead generation. Clients recruit clients.
- A 4-person booking becomes an 8-person booking with zero extra marketing.
- The chef becomes a social connector, not just a cook. That deepens loyalty.
- Natural referral engine: "I met the best people at a dinner through Chef David."

For clients:

- Groups of women who'd love to meet another group of women for dinner have no way to find each other today. This gives them that.
- Halloween party needs more people? Open the table.
- New to an area and want to meet people over food? Browse open tables.
- The chef vouches for everyone. It's not strangers from the internet; it's the chef's people.

---

## Core Principles (Non-Negotiable)

### 1. Private by default. Always.

Every event starts private. Going visible is a deliberate, conscious choice that requires action. There is no "default public" setting, no nudging, no dark patterns.

### 2. Unanimous consent.

If a table has 6 guests, all 6 must opt in before the table becomes visible. One "no" keeps the whole table private. No pressure, no guilt, no "majority rules."

### 3. The chef approves every match.

When someone requests to join an open table, the chef reviews it first. The chef knows their clients. They know who'd vibe together and who wouldn't. The chef is the trust anchor, not an algorithm.

### 4. Controlled disclosure.

What's visible on an open table is curated and limited:

- Occasion/theme ("Halloween Dinner", "Girls' Night", "Sunday Supper")
- General area (neighborhood or city, never exact address)
- Group size and how many seats are open
- Vibe tags (casual, upscale, family-friendly, 21+, etc.)
- Dietary theme if relevant ("vegan-friendly", "allergy-conscious")

What is NEVER visible:

- Names of anyone at the table
- Exact address or location
- Contact information
- Budget or pricing
- Dietary details of specific guests
- Any personal information

### 5. Graceful onboarding.

The concept must be introduced so naturally that people think "oh, that's cool" instead of "that's weird." The onboarding leads with relatable scenarios, not mechanics.

---

## Architectural Decisions (Confirmed)

### 1. Every client gets a dinner circle automatically

When a client is created in ChefFlow, a `hub_group` is automatically created for them. This is their dinner circle. It's private by default, always. No one opts into having a circle; they have one from the moment they become a client.

The circle is the social container for everything: their events, their guests, their group chat. It exists whether or not they ever use Open Tables.

### 2. Open Tables is a settings toggle, not a per-event action

Discoverability is controlled from the client's settings page, not per-event. One toggle determines whether their dinner circle is visible to other foodies in their chef's network.

This is simpler and more intuitive than per-event visibility. The client thinks "am I the kind of person who wants to meet new people through food?" not "should this specific Thursday dinner be public?"

### 3. The toggle has weight (not a casual flip)

The Open Tables toggle in settings is NOT like other toggles. It must:

- **Look different visually.** Different background on the settings row, slightly larger, maybe an icon that signals "this one matters." It stands apart from "enable email notifications" or "dark mode."
- **Require confirmation.** When the client flips it ON, the switch does NOT just toggle. Instead, a confirmation panel slides open (or a focused modal) that explains exactly what's about to happen:

```
"Make your dinner circle discoverable?"

Other foodies in your chef's network will be able to see
that your circle exists. They can request to join, but your
chef reviews every request before anyone is introduced.

WHAT PEOPLE WILL SEE:
- Your circle's name and vibe
- General area (neighborhood, never your address)
- That seats are available

WHAT STAYS PRIVATE:
- Your name and contact info
- Your exact location
- Your dietary details and budget

[Keep Private]  (prominent, default)
[Go Discoverable]  (secondary, requires intentional click)
```

- **"Keep Private" is the prominent button.** Going discoverable requires deliberate effort, not a careless tap. The default action is always privacy.
- **Toggling OFF is instant.** No confirmation needed to go back to private. Privacy is never gated behind a dialog.

### 4. Consent still applies (unanimous)

Even after a client toggles their circle to discoverable, if there are other members in their circle (guests from past events, friends they've added), those members must consent before the circle actually appears in discovery. The toggle sets the client's _intent_; unanimous consent makes it _real_.

---

## Existing Hub Infrastructure (What We Build On)

The Hub system already provides most of the social foundation. Open Tables builds on these existing tables:

| Existing Table             | How Open Tables Uses It                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `hub_guest_profiles`       | Cross-tenant guest identity. Requesters get/have a profile. Link-based auth (no login needed).                                            |
| `hub_groups`               | An "Open Table" IS a hub_group with `visibility = 'public'` bound to an event. Groups already have themes, emoji, tokens, member invites. |
| `hub_group_members`        | Tracks who's at the table. Roles (owner/admin/member) already exist.                                                                      |
| `hub_group_events`         | Links groups to events. Already supports multi-event groups (dinner clubs).                                                               |
| `hub_guest_friends`        | Friend connections. Discovery can prioritize tables where friends-of-friends are members.                                                 |
| `hub_chef_recommendations` | Chef can recommend open tables to specific friends.                                                                                       |
| `hub_share_cards`          | After a combined dinner, guests can create shareable snapshots.                                                                           |
| `hub_messages`             | Group chat within the table.                                                                                                              |
| `hub_polls`                | "What cuisine should we do?" polls within the group.                                                                                      |
| `hub_availability`         | "When works for everyone?" scheduling.                                                                                                    |
| `event_shares`             | Granular visibility controls (8 toggles: show_date_time, show_location, show_menu, etc.)                                                  |
| `event_themes`             | Visual themes for the table card.                                                                                                         |

**An Open Table = a `hub_group` where:**

- `visibility = 'public'` (discoverable)
- `event_id` is set (bound to a real upcoming event)
- `tenant_id` is set (scoped to one chef)
- Additional Open Tables metadata is stored (display area, vibe, open seats, consent status)

---

## Data Model (Minimal Additions)

Because the Hub handles groups, members, messaging, and identity, we only need **3 new things**:

### 1. New columns on `hub_groups` (for Open Table metadata)

```sql
-- Open Tables discovery metadata on hub_groups
-- Only populated when a group is being used as an Open Table

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS is_open_table BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS display_area TEXT;          -- "Back Bay", "Cambridge"
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS display_vibe TEXT[];        -- ['casual', 'upscale', '21+']
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS dietary_theme TEXT[];       -- ['vegan-friendly', 'allergy-conscious']
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS open_seats INTEGER;         -- seats available for discovery
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS max_group_size INTEGER;     -- max joining group size
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;     -- auto-close before event
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS chef_approval_required BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending'
  CHECK (consent_status IS NULL OR consent_status IN ('pending', 'ready', 'blocked'));
  -- pending = waiting for consents, ready = all consented, blocked = someone declined

CREATE INDEX IF NOT EXISTS idx_hub_groups_open_table
  ON hub_groups(is_open_table, visibility) WHERE is_open_table = true;

COMMENT ON COLUMN hub_groups.is_open_table IS 'True when this group is being used for Open Tables discovery';
COMMENT ON COLUMN hub_groups.display_area IS 'Neighborhood/city shown on discovery card (never exact address)';
COMMENT ON COLUMN hub_groups.consent_status IS 'Unanimous consent: pending/ready/blocked. Table only visible when ready.';
```

### 2. New table: Consent tracking

```sql
-- Every person at the table must opt in before the table goes visible.
-- One "no" keeps everything private.

CREATE TABLE IF NOT EXISTS open_table_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Consent state
  consented BOOLEAN,                   -- null = not yet asked, true = yes, false = no
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,             -- if they change their mind

  -- Context
  requested_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ot_consents_group ON open_table_consents(group_id);
CREATE INDEX IF NOT EXISTS idx_ot_consents_profile ON open_table_consents(profile_id);

-- RLS
ALTER TABLE open_table_consents ENABLE ROW LEVEL SECURITY;

-- Service role manages all writes
CREATE POLICY "ot_consents_service_all" ON open_table_consents
  FOR ALL USING (auth.role() = 'service_role');

-- Profiles can read their own consents
CREATE POLICY "ot_consents_select_own" ON open_table_consents
  FOR SELECT USING (true);  -- App layer filters by profile_token

COMMENT ON TABLE open_table_consents IS 'Unanimous consent for Open Tables. Table cannot go visible until all members consent.';
```

### 3. New table: Join requests

```sql
-- When someone wants to join an open table, the chef reviews it first.

CREATE TABLE IF NOT EXISTS open_table_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Who's requesting (uses hub_guest_profiles for identity)
  requester_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  group_size INTEGER DEFAULT 1 NOT NULL,
  message TEXT,                        -- "We're a group of 4, love Italian food!"

  -- Dietary/safety (required for chef to evaluate)
  dietary_restrictions TEXT[],
  allergies TEXT[],

  -- Status
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn', 'expired')),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,                    -- chef's internal note
  decline_message TEXT,                -- shown to requester if declined

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ot_requests_group ON open_table_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_ot_requests_status ON open_table_requests(status);
CREATE INDEX IF NOT EXISTS idx_ot_requests_tenant ON open_table_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ot_requests_requester ON open_table_requests(requester_profile_id);

-- RLS
ALTER TABLE open_table_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ot_requests_service_all" ON open_table_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Chefs can read requests for their tenant
CREATE POLICY "ot_requests_chef_read" ON open_table_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

COMMENT ON TABLE open_table_requests IS 'Join requests for open tables. Chef approves/declines every one.';
```

### 4. Onboarding tracking (on hub_guest_profiles)

```sql
-- Track who's seen the Open Tables intro
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_intro_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_interested BOOLEAN;  -- null = undecided
ALTER TABLE hub_guest_profiles ADD COLUMN IF NOT EXISTS open_tables_notify BOOLEAN NOT NULL DEFAULT false;
```

**Total new schema:** 2 new tables + ~12 new columns on existing tables. The Hub does the heavy lifting.

---

## The Onboarding Flow

This is where the feature lives or dies. People's first reaction to "share your dinner with strangers" is suspicion. The onboarding must reframe that instantly.

### When does the client first see Open Tables?

**Trigger:** After a client books their first (or any) event, they see a soft introduction on the event confirmation page. Not before. You don't pitch social dining to someone who hasn't even booked yet.

### The Introduction (3 steps, skippable)

**Step 1: The Story**

> "Your chef connects people who love great food. Sometimes the best dinner parties happen when two groups come together."
>
> A simple illustration: two small tables merging into one big, lively table.

**Step 2: The Scenario**

> "Imagine you're hosting a Halloween dinner for 6. Another group of 4 is looking for the same thing. Your chef knows you'd love each other. Open Tables makes that introduction happen."
>
> Show a mock "open table" card: "Halloween Dinner - Back Bay - 6 guests - 4 open seats"

**Step 3: The Control**

> "You're always in control. Your table is private unless you choose otherwise. If you open it, you pick exactly what people see. And your chef approves every match before anyone meets."
>
> Show the privacy controls: toggle for visibility, checkboxes for what's shared, "your chef reviews every request."

**Final CTA:** "Got it! Keep my table private for now." (default, prominent) / "This sounds fun, I want to learn more" (secondary)

No pressure. No "you're missing out." Just information and choice.

### For Returning Clients

After the initial onboarding, the option appears as a quiet toggle on the event detail page: "Open this table to other guests?" with a small info icon that re-explains the concept. Not in their face, but always available.

---

## User Flows

### Flow 1: Host Opens Their Table

1. Client views their upcoming event in the client portal
2. They see the Open Tables intro (first time) or the quiet toggle (returning)
3. Client taps "Open this table"
4. **System creates a `hub_group`** (or uses existing one if the event already has a group) with:
   - `is_open_table = true`
   - `visibility = 'public'` (but NOT yet discoverable, see consent)
   - `consent_status = 'pending'`
   - `event_id` linked to the event
   - `tenant_id` set to the chef
5. Form appears for display metadata:
   - **Title:** "What should we call this dinner?" (pre-filled with occasion)
   - **Area:** Auto-filled from event city, editable to neighborhood
   - **Vibe:** Multi-select tags
   - **Description:** Optional, max 200 chars
   - **Open seats:** "How many extra guests would you welcome?"
   - **Auto-close date:** Default 3 days before event
6. If there are other group members, consent requests are sent
7. Table goes discoverable ONLY when `consent_status = 'ready'`
8. Chef gets notified

### Flow 2: Someone Discovers and Requests to Join

1. Client browses "Open Tables" in their portal
2. They see cards showing only: title, area, date, seats, vibe, dietary theme
3. They tap a card, then "Request to Join"
4. Form collects: group size, message, dietary needs
5. System creates/links their `hub_guest_profile` and an `open_table_request`
6. Chef reviews in their dashboard
7. **Approve:** requester's profile gets added as `hub_group_member` (role: 'member'), chef updates the event (guest count, dietary merge, re-quote if needed)
8. **Decline:** requester gets a kind message via the app

### Flow 3: Chef as Matchmaker (Proactive)

1. Chef sees two separate bookings that might pair well
2. Chef sends a suggestion to both clients: "I have another group who'd be perfect for your dinner"
3. Both say yes, chef merges them
4. This flow exists today organically. Open Tables makes it systematic and visible.

### Flow 4: Consent Flow (Critical Path)

1. Host opens their table
2. System checks: are there other `hub_group_members` on this group?
3. If yes: each member gets a notification:
   > "[Host] would like to open your upcoming dinner to new guests. Other foodies could request to join. Your name and personal info are never shared."
   > [Yes, I'm in] [No thanks]
4. `open_table_consents` row created for each member
5. Table stays invisible until ALL consent: `consent_status = 'ready'`
6. If anyone says no: `consent_status = 'blocked'`. Host sees "Not everyone is comfortable with this right now." No names revealed.
7. Anyone can revoke at any time. Table immediately becomes invisible.

---

## Discovery Page Design

### Client Portal View

A new section in the client portal: "Open Tables"

**Layout:** Card grid. Each card shows only curated info:

```
+------------------------------------------+
|  Halloween Dinner                        |
|  Back Bay, Boston  -  Oct 28             |
|                                          |
|  6 guests  -  4 open seats               |
|  casual  -  21+  -  vegan-friendly       |
|                                          |
|  "Looking for fun people who love        |
|   spooky food and good wine!"            |
|                                          |
|  [Request to Join]                       |
+------------------------------------------+
```

**Filters:**

- Date range
- Area/neighborhood
- Vibe tags
- Group size (how many seats you need)
- Dietary compatibility

### Public/Embed View (Phase 3)

Open tables browsable on the chef's public page. New clients discover the chef through open tables. But Phase 1 is within the existing client network only.

---

## How It Connects to Existing Hub Features

Once a table is open and people join, all the existing Hub social tools become available:

| Hub Feature                                           | Open Tables Use                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| **Group Chat** (`hub_messages`)                       | Host and new guests can introduce themselves before the dinner        |
| **Polls** (`hub_polls`)                               | "Red or white wine?" "Outdoor or indoor seating?"                     |
| **Availability** (`hub_availability`)                 | If the date isn't locked, groups can coordinate                       |
| **Themes** (`event_themes`)                           | Visual identity for the open table card                               |
| **Share Cards** (`hub_share_cards`)                   | After the dinner, guests create shareable snapshots of the experience |
| **Friend Connections** (`hub_guest_friends`)          | Guests who hit it off can connect for future dinners                  |
| **Chef Recommendations** (`hub_chef_recommendations`) | Guests can recommend the chef to their friends                        |

This is the real power. Open Tables isn't just about filling seats. It's the entry point into the Hub's social ecosystem. One combined dinner leads to friend connections, share cards, chef recommendations, and future group dinners. The flywheel spins.

---

## Tier Assignment

**Tier: Pro** (not part of the irreducible core)

**Module:** `social-dining` (new module)

**Gating:**

- Server actions: `await requirePro('social-dining')`
- Pages: `<UpgradeGate featureSlug="social-dining">`
- Nav items: `module: 'social-dining'`

**Admin bypass:** Standard (admins always have access)

---

## Privacy Architecture

**Data classification:** Open Tables display metadata is intentionally public within the chef's network. The underlying event data remains fully private.

**What's public (when a table is open and consent_status = 'ready'):**

- `hub_groups.name` (display title)
- `hub_groups.display_area` (neighborhood, never exact address)
- `hub_groups.display_vibe`, `hub_groups.dietary_theme`
- `hub_groups.open_seats`
- `events.event_date` (date only, not exact time)
- `hub_groups.emoji`, theme colors

**What is NEVER public:**

- Client names, emails, phones (hub_guest_profiles data stays private)
- Exact address (events.location_address never exposed)
- Budget, pricing, quote details
- Individual dietary restrictions or allergies
- Messages between chef and client
- Any PII

**Consent revocation:** Immediate. If any participant revokes, `consent_status` flips to `'blocked'` and the table disappears from discovery in the same request. No delay, no confirmation dialog.

---

## Notification Strategy

| Event                                  | Who's Notified         | Channel                       |
| -------------------------------------- | ---------------------- | ----------------------------- |
| Host opens table                       | Chef                   | In-app + email                |
| Consent requested                      | Each group member      | In-app + email                |
| All consents received, table goes live | Host + Chef            | In-app                        |
| Someone declined consent               | Host (no names)        | In-app                        |
| Join request received                  | Chef                   | In-app + email                |
| Request approved                       | Requester + Host       | In-app + email                |
| Request declined                       | Requester              | In-app + email (kind message) |
| Table closed/full                      | All pending requesters | In-app                        |
| Consent revoked, table hidden          | Host + Chef            | In-app                        |

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- Migration: new columns on `hub_groups` + `open_table_consents` + `open_table_requests`
- Server actions: open table, set metadata, submit/review join requests
- Consent flow: request, track, enforce unanimous
- Discovery page: browse open tables (client portal only)
- Chef dashboard: view open tables, review requests
- Onboarding: 3-step intro for first-time viewers
- Pro module + gating

### Phase 2: Social Layer

- Group chat activation for open tables (Hub messaging already exists)
- Friend connections after combined dinners
- Share cards for post-dinner sharing
- Chef matchmaker suggestions (proactive matching UI)
- Remy integration ("Show me open tables", "Open my dinner")

### Phase 3: Public Discovery

- Embed/public page for browsable open tables
- New client acquisition through open tables
- Chef public page: "Browse upcoming dinners"

---

## Edge Cases

| Situation                                  | Behavior                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Event gets cancelled                       | Open table auto-closes, `open_table_requests` all set to 'expired', requesters notified |
| Host removes a guest after table is open   | Their consent row deleted, re-evaluate `consent_status`                                 |
| Event date passes                          | Table auto-closes (closes_at or event_date check)                                       |
| Chef declines all requests                 | Table stays open until close date or host closes it                                     |
| Guest who consented cancels attendance     | Consent row removed, open_seats increases, `consent_status` re-evaluated                |
| Requester is already a client of this chef | Their hub_guest_profile.client_id is set, pre-fill info                                 |
| Requester is brand new                     | New hub_guest_profile created. On approval, chef creates client record via normal flow  |
| Group already exists for event             | Use existing group, just add Open Tables metadata                                       |
| Multiple chefs (future)                    | Tables scoped to one chef. Cross-chef discovery is Phase 4+ if ever                     |

---

## Language Guide (Tone)

**Words to use:**

- "Open table" (not "public event" or "shared dinner")
- "Discover" (not "browse" or "search")
- "Join the table" (not "attend" or "RSVP")
- "Your chef" (not "the platform" or "the system")
- "Foodies" (not "users" or "members")
- "Expand your circle" (not "meet strangers")

**Words to avoid:**

- "Stranger" (always "new friends" or "other foodies")
- "Public" (use "open" or "discoverable")
- "Share" when referring to personal info (use "your info stays private")
- "Algorithm" or "matching" (use "your chef connects" or "curated by your chef")
- "Social network" (this is a dinner table, not a platform)

---

## Open Questions (For Developer Review)

1. **Naming:** "Open Tables" feels right but want to confirm. Other options: "The Guest List", "Dinner Discovery", "Expand the Table"
2. **Should the host see who's requesting before the chef approves?** Current design says no (chef filters first). But some hosts might want input.
3. **Should there be a rating/feedback system after a combined dinner?** Could help the chef know if matches worked, but might feel transactional.
4. **Cost splitting:** When a group joins, does the chef re-quote the whole event? Per-person pricing? This affects the financial model.
5. **Max capacity:** Should the chef set a per-event max for open tables, or is the existing guest_count constraint (max 200) enough?
6. **Cross-chef discovery (long term):** Should a guest who books with Chef A ever see open tables from Chef B? Current design says no (one chef's network only). But the Hub's cross-tenant architecture could support it eventually.

---

_This document will be updated as design decisions are made. No code will be written until the developer reviews and approves the approach._
