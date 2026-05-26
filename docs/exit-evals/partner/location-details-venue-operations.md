# Exit Eval: Partner / LOCATION DETAILS & VENUE OPERATIONS

> Wave 5 | 7 scenarios | Role: PARTNER
> Status: `NEEDS-DEVELOPER-REVIEW`
> Date: 2026-05-25

---

## Scenario #18: Verify address or map pin

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner needs to confirm that the address stored in ChefFlow corresponds to the correct physical location. They want visual confirmation (a map pin) that clients/chefs will be directed to the right entrance, not a nearby building or wrong side of a complex.

**Context ChefFlow has:**

- Full address fields on `partner_locations` (address, city, state, zip)
- Geocoding infrastructure via Geocodio (`lib/geo/geocodio.ts`) with forward geocoding
- `LocationMap` component (`components/ui/location-map.tsx`) supporting Google Maps and OSM fallback
- `GeocodeAddressButton` component for events (`components/events/geocode-address-button.tsx`)
- Events table has `location_lat`/`location_lng` fields; partner_locations table does NOT have lat/lng fields

**Data source?** Yes. Geocodio API (free tier, 2,500/day) converts addresses to coordinates. Google Maps / OSM renders the pin. No partner visit to external maps needed for verification.

**Client-collaborative angle:** The partner IS the location expert here. The Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) already collects address and entry info from hosts. The partner portal could surface the same map preview so the partner verifies before the Circle sends guests to the wrong place.

**Physical reality:** Screen-based verification. Partner looks at map, confirms pin is on their building. Desktop or mobile, no physical constraints.

**Compounding:** High. Once geocoded and verified, that location never needs re-verification unless the address changes. Every future event at that venue benefits.

**Solution design:**

- Add `latitude`/`longitude` columns to `partner_locations` table
- Add map preview (using existing `LocationMap` component) to partner location detail page
- Auto-geocode on address save via the existing Geocodio integration
- Add "Pin correct?" confirmation toggle that marks the geocode as partner-verified
- Allow manual pin adjustment (drag-to-correct) for complex campuses

**Where it appears:**

- Partner location detail page (`app/(partner)/partner/locations/[id]/page.tsx`)
- Partner location change request form (after address edit, show preview)
- Chef-side partner location management

**What remains as permanent exit:**
Partner may still open Google Maps / Apple Maps to get Street View or satellite imagery for complex venues with multiple buildings. The pin verification itself becomes in-app.

**Priority:** High frequency (every new location) x Low effort (reuse existing geocoding + map components) = P1
**Spec needed?** No (straightforward extension of existing geocoding pattern)

---

## Scenario #19: Check parking/loading/access instructions

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why partner leaves:** The partner needs to communicate parking availability, loading dock access, gate codes, and entry instructions to the chef. Currently these details live in building portals, venue documents, Google Maps, or the partner's head. The chef calls or texts the partner to ask.

**Context ChefFlow has:**

- `clients` table has `access_instructions` and `parking_instructions` fields (schema lines 22932-22935)
- Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) has dedicated sections: `parking`, `building_gate_access`, `entry_instructions`, `elevator_loading_notes`, `arrival_contact`
- Venue scout call script (`lib/calling/call-scripts.ts`) explicitly collects parking and restrictions
- `partner_locations` table has `notes` field but no structured access/parking fields
- Client intelligence projection tracks `access_instructions` as a learnable field

**Data source?** No. This is experiential knowledge the partner holds (or their building management holds). Not an API.

**Client-collaborative angle:** The partner IS the client-collaborative source here. The Dinner Circle arrival guide already defines the data shape. The partner portal should let the partner fill in arrival guide sections for their location, which then pre-populate every event's Dinner Circle arrival guide at that venue.

**Physical reality:** Text entry at desk. Once recorded, this info serves the chef on day-of (potentially printed or voice-read via Remy). The capture moment is screen-based.

**Compounding:** Very high. Parking and access details for a venue almost never change. Captured once, they serve every future event at that location. The 50th event should have zero access-related questions.

**Solution design:**

- Add structured access fields to `partner_locations`: `parking_instructions`, `loading_instructions`, `access_code`, `access_instructions`, `building_entry_notes`
- Expose these fields in partner location detail page as a dedicated "Access & Arrival" section
- Pre-populate Dinner Circle arrival guide from partner location data when events are created at that venue
- Show last-verified date so chef knows if info is stale
- Partner can mark fields as "sensitive/chef-only" vs "share with guests"

**Where it appears:**

- Partner location detail page (new "Access & Arrival" section)
- Dinner Circle arrival guide (auto-populated from location)
- Chef event detail ops tab (location access summary)
- Chef-side venue scout call script (pre-filled context)

**What remains as permanent exit:**
If the building management changes codes or rules, the partner may need to check their building portal first. But they only leave to learn the new info, then return to update ChefFlow.

**Priority:** Very high frequency (every event at partner venues) x Medium effort (new fields + arrival guide wiring) = P1
**Spec needed?** Yes (complex enough for standalone: structured fields, arrival guide integration, sensitivity controls)

---

## Scenario #20: Confirm venue capacity with official docs

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner needs to confirm the legal/operational maximum guest count for their venue. This number may come from fire marshal documents, venue contracts, insurance policies, or internal ops sheets. It is a legal/safety ceiling, not just a marketing number.

**Context ChefFlow has:**

- `partner_locations.max_guest_count` field already exists in schema
- Partner can propose max guest count updates via change request form
- Events have `guest_count` field; the system could warn when exceeding venue capacity
- No distinction between "marketing capacity" and "legal maximum"

**Data source?** No. The authoritative source is a physical document (fire marshal certificate, venue contract). This cannot be API-sourced.

**Client-collaborative angle:** Minimal. The partner is the authority on their own venue capacity. The chef needs to trust the number.

**Physical reality:** Partner reviews their own docs (PDF, paper certificate). Then enters the number into ChefFlow. The verification is external; the storage is in-app.

**Compounding:** High. Capacity rarely changes. Once recorded with a source note, it serves every future booking decision at that venue.

**Solution design:**

- Add `capacity_source_note` field to partner_locations (e.g., "Fire marshal cert, updated Jan 2026")
- Add `capacity_verified_at` timestamp
- Allow separate "indoor" and "outdoor" capacity if relevant
- Show capacity warning on chef-side when event guest count approaches or exceeds venue max
- Display the source note so chef knows confidence level

**Where it appears:**

- Partner location detail page (capacity section with source note)
- Partner location change request form (already has max_guest_count)
- Chef event creation (capacity warning if exceeding venue max)

**What remains as permanent exit:**
The partner will always leave to retrieve the actual fire marshal document or contract when capacity is disputed or changes. ChefFlow stores the outcome, not the source document (though document upload would further reduce this).

**Priority:** Medium frequency (once per venue, occasionally updated) x Low effort (add 2-3 fields) = P2
**Spec needed?** No (simple field additions)

---

## Scenario #21: Update room availability or blackout dates

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner manages their venue's booking calendar on Airbnb, VRBO, Peerspace, hotel PMS, or an internal event calendar. ChefFlow does not own or sync the venue's availability. The partner goes to those systems to block dates, check availability, or manage rate seasons.

**Context ChefFlow has:**

- Events table with `event_date` and `partner_location_id` linking events to venues
- Partner portal shows event history for their locations
- No availability calendar, blackout date system, or external calendar sync for partner locations
- iCal integration exists for chef scheduling (`lib/availability/ical-actions.ts`) but not for partner venues

**Data source?** Partially. Airbnb/VRBO/Peerspace calendars can export iCal feeds (read-only). ChefFlow could import these to show venue availability without the partner visiting those platforms. But the partner still WRITES availability on those platforms.

**Client-collaborative angle:** Minimal. The partner is the availability authority.

**Physical reality:** Screen-based calendar management. The partner uses Airbnb/PMS interfaces they already know.

**Compounding:** Low per-update, but the pattern repeats constantly. Having a read-only availability view in ChefFlow saves the chef from asking "is venue X available on date Y?"

**Solution design:**

- Add optional `availability_calendar_url` (iCal feed) field to partner_locations
- Add `availability_notes` text field for manual blackout notes (e.g., "Closed Dec 24-Jan 2 every year")
- Display imported calendar events as "blocked" dates on chef-side venue selection
- Show last-synced timestamp so staleness is visible
- Link out cleanly to partner's booking platform for management

**Where it appears:**

- Partner location detail page (new "Availability" section with notes + calendar URL)
- Chef event creation (venue availability indicator when selecting partner location)
- Chef calendar view (optional overlay of venue availability)

**What remains as permanent exit:**
The partner will always manage their booking calendar on Airbnb/VRBO/PMS. ChefFlow reads; they write. The exit for calendar management is permanent. The exit for "is venue available?" checking becomes reducible if iCal import works.

**Priority:** Medium frequency (ongoing for active venues) x Medium effort (iCal import, UI) = P2
**Spec needed?** No (iCal pattern already exists in chef scheduling)

---

## Scenario #22: Coordinate location change approval

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** After submitting a location change request, the partner may need to explain context or negotiate with the chef about why the change matters. Currently this coordination happens via email or text because the change request system only has a single `partner_note` field and the chef can add a `review_note`, but there is no back-and-forth threading.

**Context ChefFlow has:**

- Full `partner_location_change_requests` system already built (table, actions, UI)
- Partner submits changes with `partner_note`; chef reviews with `review_note`
- Status tracking: pending/approved/rejected with timestamps
- Review history displayed on partner location detail page
- Chef sees requested_payload diff and can approve/reject
- No threaded conversation or follow-up questions on a request

**Data source?** No. This is human coordination, not an external data source.

**Client-collaborative angle:** The partner and chef are collaborating directly. The system should facilitate their dialogue without forcing them to email.

**Physical reality:** Text-based messaging. No physical constraints.

**Compounding:** Medium. The communication pattern repeats with every change request, but individual conversations are one-off.

**Solution design:**

- Add comment thread to `partner_location_change_requests` (simple comments table or JSONB array)
- Allow chef to ask follow-up questions on a pending request before approving/rejecting
- Allow partner to respond within the request context
- Show notification badge when the other party has responded
- Eliminate the need to leave ChefFlow for "why did you reject this?" conversations

**Where it appears:**

- Partner location detail page (comment thread on pending/past requests)
- Chef partner management page (comment thread on review UI)
- Notifications (new comment on your change request)

**What remains as permanent exit:**
Complex negotiations about venue identity, branding disagreements, or multi-party decisions may still happen over phone/email. Simple clarifications stay in-app.

**Priority:** Medium frequency (every rejected/questioned request) x Low effort (simple comments) = P2
**Spec needed?** No (standard comment thread pattern)

---

## Scenario #23: Provide new location photos

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The partner wants to add or update photos for their venue listing. Currently, the chef-side can add images via `addPartnerImageForTenant()` (`lib/partners/store.ts`) which takes an `image_url`. The partner portal displays photos but has no upload capability. Partners must email/text/Drive-share photos to the chef, who then adds them.

**Context ChefFlow has:**

- `partner_images` table with fields: id, image_url, caption, season, display_order, location_id
- Chef-side image management: add, remove, reorder (`lib/partners/store.ts`)
- Local file storage system (`lib/storage/index.ts`) with upload/download/signed-URL support
- Multiple photo upload patterns exist: recipe photos (`components/recipes/recipe-photo-upload.tsx`), event photos (`lib/events/photo-actions.ts`), dish photos (`lib/dishes/photo-actions.ts`), client photos (`lib/clients/photo-actions.ts`)
- Partner location detail page already renders the photo gallery
- No partner-side upload UI exists

**Data source?** No. Photos come from the partner's camera/phone/cloud.

**Client-collaborative angle:** The partner IS the source of venue photos. They know their space best.

**Physical reality:** Partner takes photos on phone, uploads from gallery. Standard mobile/desktop file upload.

**Compounding:** High. Location photos rarely change (seasonal updates, renovations). Once uploaded and approved, they serve every future event listing and public showcase.

**Solution design:**

- Add photo upload component to partner location detail page (reuse existing upload patterns)
- Partner-uploaded photos go into a "pending approval" state (new field: `status: 'pending' | 'approved' | 'rejected'`)
- Chef reviews and approves/rejects partner photos from their partner management page
- Allow partner to add caption and season tag on upload
- Show pending/approved/rejected status on partner's photo gallery

**Where it appears:**

- Partner location detail page (new "Add Photos" button in gallery section)
- Chef partner/location management (photo approval queue)
- Public partner showcase (only approved photos display)

**What remains as permanent exit:**
Photo editing (cropping, color correction, retouching) remains external. ChefFlow stores and displays; it does not edit media.

**Priority:** High frequency (every new venue, seasonal updates) x Medium effort (upload UI + approval flow) = P1
**Spec needed?** Yes (approval workflow, storage integration, status lifecycle)

---

## Scenario #24: Handle venue maintenance or closures

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** The venue has a maintenance issue (kitchen renovation, water damage, HVAC failure) or is temporarily closing. The partner manages this through their property management system, contractors, and internal communications. ChefFlow needs to know about it to protect upcoming events.

**Context ChefFlow has:**

- `partner_locations.is_active` boolean (can deactivate a location)
- Event queries filter by `partner_location_id` and could show warnings
- No temporary closure concept (only permanent active/inactive toggle)
- No maintenance notes or affected-event flagging
- Chef event detail shows partner location but no health/status indicator

**Data source?** No. Maintenance status comes from the partner's operational reality (contractors, property management systems, physical inspection).

**Client-collaborative angle:** Minimal for the maintenance itself, but the CHEF needs to know immediately. The partner alerting ChefFlow prevents the chef from booking or confirming events at a closed venue.

**Physical reality:** Partner discovers issue in physical world, then needs a fast way to flag it digitally. Mobile-first: quick status toggle or note, not a long form.

**Compounding:** Medium. Individual maintenance events are one-off, but the pattern of needing to communicate venue status repeats. Historical closure records help the chef assess venue reliability.

**Solution design:**

- Add `temporary_closure` fields to partner_locations: `closure_reason`, `closure_start`, `closure_end`, `closure_note`
- Add quick "Flag Issue" button on partner location detail (mobile-friendly, one-tap to mark closure)
- Auto-flag affected events (events at this location between closure_start and closure_end)
- Notify chef when partner flags a closure affecting upcoming events
- Show closure history for venue reliability tracking
- Distinguish between "temporarily closed" and "permanently deactivated"

**Where it appears:**

- Partner location detail page (new "Venue Status" section with quick flag)
- Chef calendar/events (warning badge on affected events)
- Chef partner management (closure alerts)
- Notifications (partner flagged venue issue)

**What remains as permanent exit:**
The partner will always manage the actual maintenance (calling contractors, coordinating property management, handling insurance claims) externally. ChefFlow captures the status and protects the schedule; it does not manage the repair.

**Priority:** Low frequency (rare per venue) x Medium effort (new fields, notification wiring, event flagging) = P3
**Spec needed?** No (standard status fields + notification pattern)

---

## Batch Summary

| #   | Title                                      | Reclassified To                  | Spec Needed? |
| --- | ------------------------------------------ | -------------------------------- | ------------ |
| 18  | Verify address or map pin                  | Partially Reducible              | No           |
| 19  | Check parking/loading/access instructions  | Reducible + Client-Collaborative | Yes          |
| 20  | Confirm venue capacity with official docs  | Partially Reducible              | No           |
| 21  | Update room availability or blackout dates | Bridgeable                       | No           |
| 22  | Coordinate location change approval        | Reducible                        | No           |
| 23  | Provide new location photos                | Reducible                        | Yes          |
| 24  | Handle venue maintenance or closures       | Bridgeable                       | No           |

---

## Codebase Evidence Summary

| File                                            | Relevance                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `app/(partner)/partner/locations/[id]/page.tsx` | Partner location detail page (primary surface for all 7 scenarios) |
| `lib/partners/portal-actions.ts`                | Partner portal server actions (location read/write/change-request) |
| `lib/partners/location-change-requests.ts`      | Change request schema, validation, diff detection                  |
| `lib/partners/store.ts`                         | Chef-side partner location and image management                    |
| `lib/dinner-circles/arrival-guide.ts`           | Arrival guide sections (parking, access, entry, loading)           |
| `lib/geo/geocodio.ts`                           | Geocoding API integration (address to lat/lng)                     |
| `components/ui/location-map.tsx`                | Map display component (Google Maps + OSM fallback)                 |
| `components/events/geocode-address-button.tsx`  | Existing geocode button pattern                                    |
| `lib/storage/index.ts`                          | Local file storage (upload/download/signed URLs)                   |
| `lib/calling/call-scripts.ts`                   | Venue scout script (parking/access collection)                     |
| `lib/db/schema/schema.ts:1920-1959`             | partner_locations table schema                                     |

---

## Key Findings

1. **Partner locations have no lat/lng**: The `partner_locations` table lacks coordinates, unlike the `events` table. Geocoding infrastructure exists but is not wired to partner locations.

2. **Arrival guide is the perfect target for parking/access**: `lib/dinner-circles/arrival-guide.ts` already defines structured sections for parking, building access, entry instructions, elevator/loading, and house rules. The partner location should be the canonical source that pre-fills these sections.

3. **Photo upload pattern exists everywhere except partner portal**: Recipe, event, dish, client photo uploads all exist. The partner portal only displays photos added by the chef. Adding partner-side upload with approval is a well-understood pattern.

4. **Change request system is robust but lacks threading**: The existing `partner_location_change_requests` system handles proposals, diffs, approval/rejection, and review notes. Missing: back-and-forth comments for clarification.

5. **No temporary closure concept**: The only venue status is `is_active` (permanent). No way to mark "closed for 2 weeks for renovation" without fully deactivating.
