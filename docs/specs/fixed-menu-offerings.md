# Spec: Fixed Menu Offerings

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** menu-proposal-sets.md
> **Estimated complexity:** medium (10-12 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Lets a chef publish set menus as bookable products. Instead of "contact me and we'll figure out a menu," the client sees "Summer Garden ($85/head), Tuscan Feast ($110/head), Chef's Tasting ($150/head)" and picks one. Selecting an offering pre-fills an event with the menu attached and drops the client into the normal booking flow.

This turns showcase menus (gallery items) into storefront items (purchasable products). Think prix-fixe options at a restaurant, not a custom proposal.

---

## Why It Matters

1. **Reduces friction for new clients.** Browsing real menus with real prices converts faster than "contact me."
2. **Eliminates repetitive quoting.** Chef stops re-explaining the same 5 menus. Set it once, book it forever.
3. **Enables pop-ups and ticketed events.** The menu IS the product. Client buys a ticket to a specific menu.
4. **Powers "the usual" for recurring clients.** One tap to rebook their favorite menu from last time.
5. **Unlocks passive income.** Chef can share a link, client books while chef sleeps.

---

## The Problem Today

- `is_showcase` = gallery display. Clients see the menu but cannot act on it.
- `is_template` = internal chef reuse. Clients never see these.
- `price_per_person_cents` exists on menus but is never exposed publicly as a bookable price.
- Public profile shows showcase menus as read-only cards. No "Book This" button.
- Booking flow (`/api/book`) requires the client to describe their event from scratch; it cannot pre-attach a menu.
- No seasonal rotation, no availability rules, no guest-count constraints on offerings.

---

## How It Works

### Chef Side (Storefront Management)

1. Chef navigates to **Menus > Offerings** (new tab alongside Templates, Showcases).
2. Marks any menu as an offering: flips `is_offering = true`, fills metadata (price, guest range, seasons, lead time).
3. Offerings page shows all active offerings with toggle switches, drag-to-reorder, and quick-edit pricing.
4. Chef can schedule seasonal rotation: "Tuscan Feast active March-October, Holiday Feast active November-December."
5. Each offering gets a shareable direct link: `/chef/{slug}/menu/{offeringSlug}`.

### Client Side (Catalog + Booking)

1. Client visits chef's public profile. Below the bio, a **"Book a Menu"** section shows active offerings as cards.
2. Each card: menu name, price/head, course count, dietary highlights, hero photo, "Book This" CTA.
3. Clicking "Book This" opens a booking form pre-filled with the menu. Client provides: date, guest count, location, contact info.
4. System validates guest count against offering's min/max, date against lead time, and season against availability.
5. Submission creates an event (status: `draft`) with the offering's menu duplicated and attached.
6. Chef gets notified. Normal event lifecycle begins (quote confirmation, contract, etc.).

### Returning Client ("The Usual")

1. Authenticated client visiting the chef profile sees a "Your Past Selections" section above the public catalog.
2. Shows their previously booked offerings with a "Rebook" shortcut.
3. Rebook pre-fills everything from the last event (except date/guest count, which they update).

---

## Files to Create

| File                                                    | Purpose                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `lib/menus/offering-actions.ts`                         | Server actions: toggleOffering, updateOfferingMeta, getOfferingsByChef, getPublicOfferings, reorderOfferings |
| `lib/menus/offering-types.ts`                           | TypeScript types: OfferingMeta, PublicOffering, OfferingBookingPayload                                       |
| `lib/menus/offering-validation.ts`                      | Zod schemas for offering metadata and booking payload                                                        |
| `app/(chef)/menus/offerings/page.tsx`                   | Chef's offering management page                                                                              |
| `components/menus/offering-card.tsx`                    | Reusable offering card (used in both chef admin and public catalog)                                          |
| `components/menus/offering-editor-modal.tsx`            | Modal for editing offering metadata (price, guests, seasons, lead time)                                      |
| `components/public/menu-offering-catalog.tsx`           | Public-facing offering catalog grid for chef profile                                                         |
| `components/public/book-offering-form.tsx`              | Booking form triggered by "Book This" CTA                                                                    |
| `app/(public)/chef/[slug]/menu/[offeringSlug]/page.tsx` | Direct-link landing page for a single offering                                                               |
| `lib/menus/offering-analytics.ts`                       | Track views, clicks, conversions per offering                                                                |

## Files to Modify

| File                                   | Change                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `lib/db/schema/schema.ts`              | Add `menu_offerings` table                                                  |
| `app/(public)/chef/[slug]/page.tsx`    | Import and render `<MenuOfferingCatalog>` below showcases                   |
| `lib/public/chef-profile-readiness.ts` | Add `getPublicOfferings()` query                                            |
| `lib/menus/actions.ts`                 | Add `is_offering` awareness to duplicate/archive flows                      |
| `app/(chef)/menus/page.tsx`            | Add "Offerings" tab to menu navigation                                      |
| `lib/events/create-actions.ts`         | Accept optional `offeringId` to pre-attach menu on event creation           |
| `lib/notifications/channel-router.ts`  | New notification type: `offering_booked`                                    |
| `lib/booking/match-chefs.ts`           | Awareness that offering bookings skip chef-matching (chef already selected) |

---

## Database Changes

### New table: `menu_offerings`

```sql
CREATE TABLE menu_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,

  -- Pricing
  price_per_head_cents INTEGER NOT NULL,
  min_guests INTEGER NOT NULL DEFAULT 2,
  max_guests INTEGER NOT NULL DEFAULT 20,

  -- Availability
  available_seasons TEXT[] NOT NULL DEFAULT ARRAY['all_season'],
  available_days_of_week INTEGER[] DEFAULT NULL,  -- NULL = all days, [0-6] = specific days
  booking_lead_time_days INTEGER NOT NULL DEFAULT 7,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Display
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tagline TEXT,  -- short selling line: "A sun-drenched Italian evening"
  hero_image_url TEXT,

  -- Tracking
  view_count INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  last_booked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_menu_offerings_tenant_active
  ON menu_offerings(tenant_id) WHERE active = true AND archived_at IS NULL;
CREATE INDEX idx_menu_offerings_menu
  ON menu_offerings(menu_id);
CREATE INDEX idx_menu_offerings_season
  ON menu_offerings USING GIN(available_seasons);
```

### New table: `offering_bookings` (analytics + "the usual" feature)

```sql
CREATE TABLE offering_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES menu_offerings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guest_count INTEGER NOT NULL,
  price_per_head_cents INTEGER NOT NULL,  -- snapshot at time of booking
  total_cents INTEGER NOT NULL,

  UNIQUE(event_id)  -- one offering per event
);

CREATE INDEX idx_offering_bookings_client
  ON offering_bookings(client_id, booked_at DESC);
CREATE INDEX idx_offering_bookings_offering
  ON offering_bookings(offering_id, booked_at DESC);
```

### Migration file

`database/migrations/XXXXXX_add_menu_offerings.sql` (timestamp to be determined at build time).

---

## State Machine / Rules

### Offering Lifecycle

```
inactive -> active -> archived
              |
              v
           active (seasonal rotation: auto-deactivate/reactivate based on current date + available_seasons)
```

### Booking Validation Rules

1. **Guest count:** `min_guests <= requested_guests <= max_guests`. Reject with message: "This menu serves 4-12 guests."
2. **Lead time:** `event_date - today >= booking_lead_time_days`. Reject with: "This menu requires at least 7 days notice."
3. **Season:** Current month maps to season. If offering's `available_seasons` does not include current season, hide from catalog (do not reject; just don't show).
4. **Day of week:** If `available_days_of_week` is set and requested date's day is not in array, reject with: "This menu is only available on Fridays and Saturdays."
5. **Active:** Only `active = true AND archived_at IS NULL` offerings appear publicly.
6. **Menu integrity:** If the source menu is deleted or archived, the offering auto-deactivates. Chef gets notified.

### Offering vs. Showcase vs. Template

| Property               | Template | Showcase        | Offering             |
| ---------------------- | -------- | --------------- | -------------------- |
| Visible to clients     | No       | Yes (read-only) | Yes (bookable)       |
| Has pricing            | Optional | No              | Required             |
| Has availability rules | No       | No              | Yes                  |
| Creates events         | No       | No              | Yes                  |
| Reusable internally    | Yes      | No              | Yes (via duplicate)  |
| `is_template`          | true     | false           | false                |
| `is_showcase`          | false    | true            | true (also showcase) |
| `menu_offerings` row   | No       | No              | Yes                  |

An offering is always also a showcase (visible on profile). Setting `is_offering` implies `is_showcase = true`.

---

## Edge Cases

1. **Chef changes menu after client books.** The booking duplicates the menu at booking time. Original menu edits do not affect booked events.
2. **Chef deletes the source menu.** Offering auto-deactivates. Existing booked events keep their duplicated menus.
3. **Client requests guest count outside range.** Form shows min/max upfront. Submit button disabled if out of range. Server validates too.
4. **No offerings active.** "Book a Menu" section hidden entirely from public profile. No empty state.
5. **All offerings seasonal and none active now.** Section hidden. Optionally show "Seasonal menus return in [month]" teaser if chef enables it.
6. **Client books same offering twice.** Allowed. Creates separate events. "The usual" section just shows the offering once with "Booked 3 times" badge.
7. **Offering price conflicts with event quote.** Offering price is the starting point. Chef can adjust the event quote during normal lifecycle (add travel fee, adjust for guest count, etc.). The offering price is not a contract; it's a published rate.
8. **Pop-up/ticketed event offering.** Works identically: offering price = ticket price. Integration with ticketed-events spec (separate) handles payment collection. This spec handles the catalog/selection flow only.
9. **Multiple offerings from same menu.** Allowed. Example: same "Tuscan Feast" menu offered at $85/head (weekday) and $110/head (weekend) as two separate offerings with different `available_days_of_week`.
10. **Slug collision.** Enforce unique per tenant. Auto-generate from menu name, allow chef override. Reject duplicates at save time.
11. **Concurrent booking race condition.** No capacity limit on offerings (chef manages their own calendar). Two clients can book the same offering for the same date; chef resolves via normal event management.
12. **Returning client not authenticated.** "Your Past Selections" section only shown to authenticated clients. Unauthenticated clients see only the public catalog.

---

## Definition of Done

- [ ] `menu_offerings` and `offering_bookings` tables created via migration
- [ ] Chef can mark any menu as an offering with pricing, guest range, seasons, and lead time
- [ ] Chef's Offerings page lists all offerings with active/inactive toggles and drag-to-reorder
- [ ] Public chef profile shows active offerings as bookable cards with price, courses, dietary info
- [ ] "Book This" flow collects date, guest count, location, contact info and creates a draft event with menu attached
- [ ] Validation enforces guest range, lead time, season, and day-of-week rules
- [ ] Direct link `/chef/{slug}/menu/{offeringSlug}` renders offering detail page with booking CTA
- [ ] Returning authenticated clients see "Your Past Selections" section with rebook shortcut
- [ ] Offering auto-deactivates when source menu is deleted/archived
- [ ] `offering_booked` notification fires to chef on new booking
- [ ] Analytics tracked: view_count increments on page load, booking_count increments on successful booking
- [ ] Existing showcase behavior unchanged (offerings are a superset of showcases)
- [ ] Health checks pass: `tsc --noEmit --skipLibCheck` and `next build --no-lint` exit 0
- [ ] Integration with proposal sets: chef can include offerings as options when sending a proposal (depends on menu-proposal-sets.md)
