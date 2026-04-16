# Ticketed Events & Multi-Channel Distribution

> **Status:** SPEC - Awaiting developer review
> **Driven by:** Real farm dinner co-hosting scenario (validated business need)
> **Principle:** ChefFlow is the hub. External platforms are distribution channels. Chef never leaves ChefFlow.
> **Scope:** ALL chefs benefit. Not co-host-specific unless marked.

---

## What Already Exists (Build On This)

| System              | File                                  | What It Does                                                                            |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| Stripe Checkout     | `lib/stripe/checkout.ts`              | Creates hosted checkout sessions for event payments                                     |
| Stripe Connect      | `lib/stripe/connect.ts`               | Express accounts - chefs receive payouts as connected accounts                          |
| Transfer Routing    | `lib/stripe/transfer-routing.ts`      | Platform fees, destination charges, payout recording                                    |
| Instant Book        | `lib/booking/instant-book-actions.ts` | Public (no auth), creates event + client + Stripe checkout. Deposits. Dietary intake.   |
| Event Share         | `lib/sharing/actions.ts`              | Shareable token links, RSVP, dietary/allergy collection, plus-ones, visibility controls |
| Hub Circles         | `lib/hub/group-actions.ts`            | Groups, messaging, polls, media, notes, dietary dashboard, member management            |
| RSVP -> Hub Sync    | `lib/hub/integration-actions.ts`      | Auto-creates hub profiles from RSVPs, auto-joins circles                                |
| Partner System      | `lib/partners/actions.ts`             | Venue/Airbnb/business partners with portal, locations, analytics                        |
| Event Collaboration | `lib/collaboration/actions.ts`        | co_host role, per-permission grants, revenue splits (chef-to-chef)                      |
| Campaigns           | `lib/campaigns/`                      | Email outreach, push dinners, social publishing                                         |
| Hub Guest Profiles  | `lib/hub/types.ts`                    | Persistent profiles with event history, dietary info, cross-event identity              |

---

## Phase 1: Native Ticket Sales (ChefFlow-Only)

### 1A. The Ticket Entity

**Decision:** A ticket is NOT a product projection (POS). It is a new entity tied to events.

**Why:** POS products are retail items sold at a register. Tickets are capacity-limited, event-bound, guest-linked purchases with dietary collection and circle auto-join. Different lifecycle, different concerns.

```
TABLE: event_tickets
  id              UUID PRIMARY KEY
  event_id        UUID NOT NULL REFERENCES events(id)
  tenant_id       UUID NOT NULL REFERENCES chefs(id)
  -- Buyer info (no auth required)
  buyer_name      TEXT NOT NULL
  buyer_email     TEXT NOT NULL
  buyer_phone     TEXT
  -- Ticket details
  ticket_type_id  UUID REFERENCES event_ticket_types(id)
  quantity        INT NOT NULL DEFAULT 1
  unit_price_cents INT NOT NULL
  total_cents     INT NOT NULL
  -- Payment
  stripe_checkout_session_id TEXT
  stripe_payment_intent_id   TEXT
  payment_status  TEXT NOT NULL DEFAULT 'pending'  -- pending | paid | refunded | cancelled
  -- Guest tracking
  guest_token     UUID NOT NULL DEFAULT gen_random_uuid()  -- self-service management
  hub_profile_id  UUID REFERENCES hub_guest_profiles(id)
  event_guest_id  UUID REFERENCES event_guests(id)
  -- Dietary (collected at purchase)
  dietary_restrictions TEXT[]
  allergies        TEXT[]
  plus_one_name    TEXT
  plus_one_dietary TEXT[]
  plus_one_allergies TEXT[]
  notes            TEXT
  -- Meta
  source          TEXT NOT NULL DEFAULT 'chefflow'  -- chefflow | eventbrite | facebook | groupon | walkin
  external_order_id TEXT  -- ID from external platform
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  cancelled_at    TIMESTAMPTZ
```

```
TABLE: event_ticket_types
  id              UUID PRIMARY KEY
  event_id        UUID NOT NULL REFERENCES events(id)
  tenant_id       UUID NOT NULL REFERENCES chefs(id)
  name            TEXT NOT NULL           -- "General Admission", "VIP Wine Pairing", "Kids"
  description     TEXT
  price_cents     INT NOT NULL
  capacity        INT                     -- NULL = unlimited (uses event guest_count)
  sold_count      INT NOT NULL DEFAULT 0  -- Atomic counter (CAS guard on purchase)
  sort_order      INT NOT NULL DEFAULT 0
  is_active       BOOLEAN NOT NULL DEFAULT true
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Capacity enforcement:** `UPDATE event_ticket_types SET sold_count = sold_count + :qty WHERE id = :id AND sold_count + :qty <= capacity` - atomic, prevents overselling. If no ticket types defined, enforce against `events.guest_count`.

### 1B. Public Event Page

**Route:** `/e/[shareToken]` (reuses existing event_share_settings.share_token)

**What it shows:**

- Event name, date, time, approximate location (configurable visibility)
- Menu (if shared via existing visibility controls)
- Chef name + photo (if visible)
- Venue/partner info (if co-hosted)
- Ticket types with prices and remaining capacity
- "Get Tickets" button -> expands inline form
- Dietary/allergy collection built into purchase form
- Stripe Checkout for payment

**Purchase flow (zero auth, minimum friction):**

1. Guest lands on `/e/[shareToken]`
2. Sees event details + remaining capacity
3. Selects ticket type + quantity
4. Enters: name, email, dietary info (required), phone (optional)
5. Clicks "Get Tickets" -> Stripe Checkout Session created
6. Pays on Stripe hosted page
7. Stripe webhook fires `checkout.session.completed`
8. Server: creates `event_tickets` row (paid), creates/matches `hub_guest_profile`, creates `event_guests` row, auto-joins circle, sends confirmation email with guest token link
9. Guest lands on success page -> "Join the Dinner Circle" CTA

**SEO/Social:** Page includes Open Graph meta (title, description, image, date), JSON-LD Event structured data for Google. When shared on Instagram/Facebook, shows rich preview with event image, name, date, price range.

### 1C. Chef-Side Ticket Management

**Location:** Event detail page, new "Tickets" tab (alongside existing Money, Details, Menu tabs)

**What it shows:**

- Ticket types with capacity bars (sold/remaining)
- Guest list from ticket purchases (name, email, dietary, payment status, source channel)
- Total revenue from tickets
- Actions: create/edit ticket types, comp tickets (manual add, free), refund individual tickets, download guest list CSV, resend confirmation emails

**Ticket creation:** Chef creates event -> adds ticket types (name, price, capacity) -> enables "Public Tickets" toggle on event share settings -> share link appears.

### 1D. Capacity + Walk-Ins

**Online capacity:** Enforced by `sold_count` CAS guard on `event_ticket_types`. Two simultaneous buyers = one gets the last ticket, one gets "Sold Out."

**Walk-ins:** Chef/co-host uses event detail page "Add Walk-In" button. Creates ticket with `source: 'walkin'`, `payment_status: 'paid'` (cash/card at door). Updates sold_count. Optional: POS checkout for payment (bridges to existing commerce system).

**No-show tracking:** After event, chef can mark tickets as `attended` / `no_show` for future guest analytics.

---

## Phase 2: Multi-Channel Distribution

### The Distribution Layer

**Principle:** Anything a chef promotes gets full distributor backing. ChefFlow publishes once, syndicates everywhere.

```
TABLE: event_distribution
  id              UUID PRIMARY KEY
  event_id        UUID NOT NULL REFERENCES events(id)
  tenant_id       UUID NOT NULL REFERENCES chefs(id)
  platform        TEXT NOT NULL  -- eventbrite | facebook | google | groupon | instagram
  -- External IDs
  external_event_id   TEXT       -- Eventbrite event ID, Facebook event ID, etc.
  external_url        TEXT       -- Direct link to the listing
  -- Sync state
  sync_status     TEXT NOT NULL DEFAULT 'draft'  -- draft | published | synced | failed | archived
  last_synced_at  TIMESTAMPTZ
  sync_error      TEXT
  -- Config
  link_back_url   TEXT           -- URL on the listing that points back to /e/[shareToken]
  auto_sync       BOOLEAN NOT NULL DEFAULT true  -- Push updates when event changes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

### 2A. Eventbrite Integration

**API:** Eventbrite REST API v3 (free to use, Eventbrite charges per-ticket service fee to buyers)

**Auth:** OAuth2 - chef connects Eventbrite account once in Settings (like Stripe Connect onboarding)

**Push flow:**

1. Chef enables "Distribute to Eventbrite" on event
2. ChefFlow calls `POST /organizations/{org_id}/events/` with event data
3. Creates ticket classes matching ChefFlow ticket types
4. Sets event description with link back to ChefFlow circle
5. Stores `external_event_id` and `external_url` in `event_distribution`

**Pull flow (webhook ingestion):**

1. Eventbrite webhook: `order.placed`
2. ChefFlow endpoint: `POST /api/webhooks/eventbrite`
3. Server: creates `event_tickets` row with `source: 'eventbrite'`, `external_order_id`
4. Creates/matches hub guest profile, joins circle, sends ChefFlow confirmation
5. Updates `sold_count` on ticket type

**Sync:** When chef updates event details (date, menu, description), auto-push changes to Eventbrite if `auto_sync` is true.

### 2B. Facebook Events Integration

**API:** Facebook Graph API - Events endpoint

**Auth:** Facebook Page token (chef connects Facebook Page in Settings)

**Push flow:**

1. Chef enables "Distribute to Facebook"
2. ChefFlow calls `POST /{page_id}/events` with event data
3. Event description includes ticket link back to `/e/[shareToken]`
4. Facebook events don't have native ticketing - the CTA is "Get Tickets" linking to ChefFlow

**Pull flow:** Facebook doesn't webhook ticket sales (it doesn't sell tickets). The Facebook listing is purely a marketing channel that drives traffic to ChefFlow's ticket page.

### 2C. Google Events (Search/Maps)

**Mechanism:** JSON-LD structured data on `/e/[shareToken]` (Phase 1B already includes this)

**No API needed.** Google crawls the public event page and shows it in search results and Maps. Free discovery.

**Enhancement:** Submit event sitemap via Google Search Console for faster indexing.

### 2D. Instagram

**Mechanism:** Not an API integration. ChefFlow generates:

- Shareable event card image (auto-generated from event data + menu + chef branding)
- Pre-formatted caption with ticket link
- Chef copies to Instagram (or uses later API integration via Facebook/Instagram Graph API)

**Future:** If chef connects Instagram Business account (via Facebook Page), auto-post event announcements.

### 2E. Groupon (Future - Requires Business Agreement)

**Mechanism:** Groupon requires a merchant agreement. Not API-first.

**What ChefFlow can do:** Generate a Groupon-compatible deal listing (description, terms, pricing), and provide a redemption flow (Groupon voucher code -> ChefFlow ticket creation).

**Parking this** until there's a real Groupon merchant relationship.

### 2F. Chef-Side Distribution Dashboard

**Location:** Event detail page, "Distribution" section within Tickets tab

**Shows:**

- Connected platforms (with status: connected/not connected)
- Per-platform: listing URL, sync status, tickets sold from this channel
- "Publish" / "Update" / "Unpublish" buttons per platform
- Total cross-channel metrics: tickets sold by source (pie chart)

---

## Phase 3: Co-Host Circle Admin [CO-HOST SPECIFIC]

### 3A. Partner-as-Circle-Admin Bridge

**Problem:** Venue partner exists in partner system. Circle admin exists in hub system. No bridge.

**Solution:** When a chef adds a partner as event collaborator (co_host role), auto-create or match a hub_guest_profile for the partner, add them to the event's circle as `admin` role.

**Implementation:**

1. Chef goes to event -> Collaborators -> adds partner as co_host
2. Server action: looks up partner's email -> finds/creates hub_guest_profile
3. Adds profile to circle as `role: 'admin'` with full permissions
4. Partner gets email: "You've been added as co-host for [Event]. Open your circle."
5. Partner accesses circle via profile token (no ChefFlow auth required - same as any hub member)

**What the co-host sees in the circle:**

- Full feed + messaging
- Member/guest list with dietary dashboard
- Ticket sales count + remaining capacity (read-only financial summary, not full P&L)
- Ability to: post, pin notes, manage members, invite guests
- Cannot: modify menu, change event details, process refunds (those stay chef-side)

### 3B. Ingredient Availability Board [CO-HOST SPECIFIC]

**What it is:** A shared checklist in the circle where the venue partner posts what's available. Chef references it when building the menu.

**Implementation:** Extend the existing pinned notes feature with a new note type: `ingredient_list`. Rendered as a checklist with items, quantities, and "in season" / "limited" / "abundant" tags. Only circle admins can edit. All members can view.

Not a new table - uses `hub_pinned_notes` with `color: 'green'` convention and structured JSON in `body` field for ingredient data.

---

## Priority Order (What Ships First)

| Priority | Feature                               | Effort | Impact  | Benefits                                   |
| -------- | ------------------------------------- | ------ | ------- | ------------------------------------------ |
| **P0**   | Public event page (`/e/[shareToken]`) | Medium | Highest | ALL chefs - shareable, discoverable events |
| **P0**   | Ticket types + purchase flow (Stripe) | Medium | Highest | ALL chefs - sell seats to any event        |
| **P0**   | Capacity enforcement                  | Small  | High    | ALL chefs - prevents overselling           |
| **P1**   | Chef ticket management tab            | Medium | High    | ALL chefs - see sales, manage guests       |
| **P1**   | Walk-in ticket creation               | Small  | Medium  | ALL chefs doing in-person events           |
| **P1**   | Auto-join circle on purchase          | Small  | High    | ALL circle users                           |
| **P2**   | Eventbrite syndication                | Large  | High    | Chefs who want wider reach                 |
| **P2**   | Facebook Events syndication           | Medium | Medium  | Chefs with Facebook Pages                  |
| **P2**   | Google Events structured data         | Small  | Medium  | ALL chefs (SEO, free)                      |
| **P2**   | Instagram event card generator        | Small  | Medium  | ALL chefs                                  |
| **P3**   | Partner circle admin bridge           | Medium | Medium  | Co-hosted events only                      |
| **P3**   | Ingredient availability board         | Small  | Low     | Co-hosted events only                      |
| **P3**   | Past guest notification system        | Medium | High    | ALL chefs with recurring events            |

---

## Q40 Answer: The 3 Highest-Leverage Features

1. **Public event page with Stripe ticket purchase** (P0) - Every chef, every event. Shareable URL that converts to paid seats. Uses existing Stripe infrastructure.

2. **Multi-channel distribution** (P2, but Google/SEO portion is P0) - JSON-LD on the public page is nearly free and gives Google Events visibility immediately. Eventbrite integration follows.

3. **Past guest notifications for new events** (P3 but high leverage) - Hub profiles already persist. A "notify past guests about this event" button on the ticket management tab reuses existing email infrastructure + hub guest profiles. Turns one-time diners into repeat attendees.

---

## Questions Answered By This Spec

From the co-hosting question set:

| Q#  | Answer                                                                                        |
| --- | --------------------------------------------------------------------------------------------- |
| Q9  | Ticket = new entity (`event_tickets`), not POS product or payment-gated RSVP                  |
| Q10 | Public page at `/e/[shareToken]` (reuses existing share tokens)                               |
| Q11 | `sold_count` on ticket_types is source of truth. `guest_count` on events updated on purchase. |
| Q12 | Yes, multiple ticket types per event via `event_ticket_types`                                 |
| Q13 | Chef's Stripe Connect account (existing infrastructure). Platform fee via transfer routing.   |
| Q18 | Canonical URL is `/e/[shareToken]`. Works without circle membership. Shows all event info.    |
| Q19 | Zero-auth: name + email + dietary + Stripe. 2 screens max.                                    |
| Q20 | Auto: hub profile created, circle joined, confirmation email with guest token, dietary saved  |
| Q21 | Guest token for self-service (same pattern as RSVP). Token-based, no login.                   |
| Q27 | Distribution layer pushes to Eventbrite/Facebook/Google. All link back to `/e/[shareToken]`.  |
| Q29 | Route: `/e/[shareToken]`. OG meta + JSON-LD for social/SEO.                                   |
| Q36 | Walk-in button on event detail page. Creates ticket with `source: 'walkin'`.                  |
| Q37 | CAS guard: `SET sold_count = sold_count + qty WHERE sold_count + qty <= capacity`             |
| Q38 | Dietary collected at ticket purchase. Flows into same hub dietary dashboard.                  |

---

## Open Questions (Need Developer Input)

1. **Stripe fees on tickets:** Does the buyer pay Stripe's ~2.9% + 30c, or does the chef absorb it? (Eventbrite passes fees to buyers by default.)
2. **Refund policy:** Full refund up to X days before event? Partial? No refunds? Per-event configurable?
3. **Eventbrite account:** Do you have one? Want to set one up for the farm dinner?
4. **Facebook Page:** Do you have a Facebook Business Page for your chef business?
5. **Ticket email template:** What should the confirmation email say? Include a QR code / guest token link?
