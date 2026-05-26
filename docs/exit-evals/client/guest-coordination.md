# Exit Eval: Client / Guest Coordination

> Wave 2 | 8 scenarios | Role: CLIENT
> Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #52: Collect guest names

**Original classification:** Reducible with import and guest add flow
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Host already has guest names in a text thread, email, or spreadsheet. They leave to assemble the list before entering it into ChefFlow. The operational need is converting scattered social confirmations into a structured list for the chef.

**Context ChefFlow has:**

- Event date, location, occasion
- Client identity and contact info
- Guest count from booking (approximate)
- Existing event_guests table with RSVP tracking
- Event share tokens for no-login guest intake

**Data source?** No. Guest names come from the client's social network, not an API.

**Client-collaborative angle:** The guest portal already lets guests self-register via share token links. The Dinner Circle (hub groups) can also collect attendees. The gap is importing bulk names the host already has (paste from contacts, text thread, or spreadsheet).

**Physical reality:** Screen-based. Mobile-friendly add flow matters since hosts often assemble lists from their phone contacts.

**Compounding:** Medium. Guest names can link to future events, building a host's recurring guest list that auto-suggests on future bookings.

**Solution design:**

- Bulk guest add (paste names/emails from clipboard)
- Contact import from phone (native share target / CSV upload)
- Auto-suggest from past event guests when creating new events
- Client portal guest management page (already exists at `/my-events/[id]/guests`)

**Where it appears:**

- `/my-events/[id]/guests` (client guest management, already built)
- Event share link flow (guest self-registers via `/event/[eventId]/guest/[secureToken]`)
- Dinner Circle group membership

**What remains as permanent exit:**
Gathering initial confirmations from friends via text/group chat that they plan to come. Social coordination happens socially.

**Priority:** High frequency x Low effort = High priority (partial infrastructure exists)
**Spec needed?** No (bulk import is the only gap; core flow is built)

---

## Scenario #53: Collect RSVPs

**Original classification:** Bridgeable with RSVP link sync or guest import
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** If the client is already using Evite, Paperless Post, or Partiful for invitations, RSVPs live on that platform. The client leaves ChefFlow to check who has responded. The operational need is getting a confirmed headcount for menu planning and costing.

**Context ChefFlow has:**

- Full RSVP system: `event_guests` table with rsvp_status enum (pending, attending, declined, maybe)
- `event_shares` table with tokenized share links, visibility controls, expiration
- `event_rsvp_summary` aggregate view (attending_count, declined_count, maybe_count, pending_count, plus_one_count)
- RSVP reminder cron job (`/api/scheduled/rsvp-reminders`) with configurable cadences (7d, 3d, 24h, deadline)
- Advanced share settings: rsvp_deadline_at, reminders_enabled, reminder_schedule, enforce_capacity, waitlist_enabled
- Guest self-RSVP via `/event/[eventId]/guest/[secureToken]` (no login required)
- Client can view RSVP status in `/my-events/[id]/guests`

**Data source?** No. RSVPs come from humans deciding whether to attend.

**Client-collaborative angle:** The entire system is client-collaborative. Client creates share link, shares with guests. Guests RSVP without accounts. RSVP counts flow back to chef automatically. Reminder emails go to pending guests on schedule.

**Physical reality:** Screen-based. Mobile share (native share API) for sending links is critical.

**Compounding:** Medium. Guest RSVP patterns (who always attends, who flakes) could inform future event planning.

**Solution design:**

- Already built: tokenized guest RSVP portal, share links, reminders, deadline enforcement
- Gap: import RSVPs from external invitation platforms (Evite, Partiful webhook/CSV)
- Gap: "RSVP link" that is a single-click yes/no (instead of full portal form)

**Where it appears:**

- `/event/[eventId]/guest/[secureToken]` (public guest portal, built)
- `/my-events/[id]/guests` (client RSVP status view, built)
- `/api/scheduled/rsvp-reminders` (automated reminders, built)
- Chef event detail (RSVP summary, built)

**What remains as permanent exit:**
When invitation platform (Evite, Partiful) is already established and guests already respond there. ChefFlow will not replace dedicated invitation platforms.

**Priority:** High frequency x Low effort = High priority (90% built; external import is the gap)
**Spec needed?** No (system is comprehensive; external sync is nice-to-have)

---

## Scenario #54: Collect dietary restrictions

**Original classification:** Reducible with dietary-confirm links and reminders
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Host needs to ask guests about allergies and dietary needs. They typically text each guest or use a Google Form. The operational need is getting structured dietary data to the chef for safe menu planning.

**Context ChefFlow has:**

- `event_guests` table with `dietary_restrictions` (text array), `allergies` (text array), `allergy_severity`, `spice_tolerance`, `dietary_confirmed_at`, `dietary_confirmed_via`
- Dedicated dietary confirmation page: `/dietary-confirm/[token]` (public, no auth)
- `dietary_outreach` table tracking sent/opened/responded status with unique tokens and 14-day expiry
- `sendDietaryOutreach()` server action sends individual emails to all guests
- Guest portal collects dietary info during RSVP (`dietary_items` schema with severity levels)
- `dietary_confirmations` table for chef acknowledgment of dietary data
- Client-side `getDietaryReminderStatus()` checking for guests missing dietary info within 7 days of event
- RSVP dietary rollup view aggregating all restrictions and allergies

**Data source?** No. Dietary information comes from each individual guest.

**Client-collaborative angle:** Fully collaborative. Guests provide their own dietary data via tokenized links. Chef sends dietary outreach emails. Data flows: guest -> ChefFlow -> chef. Host does not need to relay.

**Physical reality:** Screen-based. Simple mobile-friendly form for guests. Severity levels (preference vs life-threatening) critical for safety.

**Compounding:** High. Dietary info persists across events. A repeat guest's allergies are known forever. Guest preferences compound into reliable safety profiles.

**Solution design:**

- Already built: tokenized dietary confirm pages, outreach email system, severity tracking
- Already built: dietary rollup aggregation for chef menu planning
- Already built: client-side dietary reminder for events within 7 days
- Gap: auto-send dietary confirmation links when guest is added (currently manual trigger)
- Gap: dietary info from previous events auto-populates for returning guests

**Where it appears:**

- `/dietary-confirm/[token]` (public guest dietary form, built)
- Guest portal RSVP flow (dietary items collected inline, built)
- Chef event detail dietary section (rollup, built)
- Client `/my-events/[id]/guests` (dietary status visible, built)

**What remains as permanent exit:**
Nothing material. The system handles dietary collection end-to-end. Only edge case: guests who refuse to click links and insist on texting their host.

**Priority:** High frequency x Already built = Maintenance only
**Spec needed?** No (fully built)

---

## Scenario #55: Chase missing guest responses

**Original classification:** Bridgeable with reminder templates and status list
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Some guests ignore the RSVP link. Host resorts to texting/calling them individually to get an answer. The operational need is converting "pending" RSVPs into confirmed yes/no before the chef's deadline.

**Context ChefFlow has:**

- RSVP status tracking per guest (pending/attending/declined/maybe)
- Automated RSVP reminder cron (`/api/scheduled/rsvp-reminders`) with configurable cadences: 7d, 3d, 24h, deadline
- `rsvp_reminder_log` table preventing duplicate sends
- `rsvp_deadline_at` on event shares enabling hard deadlines
- Resend guest portal link action (`lib/sharing/guest-resend-actions.ts`)
- Draft segment message action targeting "pending" guests specifically
- Capacity enforcement and waitlist when enabled

**Data source?** No. This is social pressure, not data.

**Client-collaborative angle:** The reminder system automates the chase. ChefFlow sends reminders at scheduled intervals. The client sees who is still pending and can manually resend. The social pressure of a deadline drives responses.

**Physical reality:** Screen-based. Client needs a clear "who hasn't responded" list with one-tap resend. Chef benefits from a "confirm final count" deadline that auto-reminds.

**Compounding:** Low. Each event's chase is independent. Slight compounding from learning which guests are habitually late responders.

**Solution design:**

- Already built: automated RSVP reminders at 7d/3d/24h/deadline cadences
- Already built: segment messaging for pending guests
- Already built: resend portal link for individual guests
- Gap: "one-click nudge" from client's guest list view (quick resend for all pending)
- Gap: social visibility ("3 of your 8 guests haven't responded yet" nudge to client)

**Where it appears:**

- `/my-events/[id]/guests` (pending status visible, built)
- Automated email system (reminders sent, built)
- Chef event overview (pending count visible, built)

**What remains as permanent exit:**
The actual phone call or text to a close friend who ignores emails. Social relationships sometimes require personal follow-up that no software replaces.

**Priority:** High frequency x Low effort = High priority (mostly built; client-side nudge UX is the gap)
**Spec needed?** No (infrastructure complete; UX polish item)

---

## Scenario #56: Share event details with guests

**Original classification:** Bridgeable with no-login guest portal
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Guests need to know when, where, what to wear, parking, and what to expect. Client usually texts a group chat or sends an email with all details. The operational need is getting logistics information to attendees without the host playing telephone.

**Context ChefFlow has:**

- Full guest portal: `/event/[eventId]/guest/[secureToken]` (no login, tokenized)
- Portal shows: event title, date, time (serve + arrival), location (address, city, state, zip, notes), host name, host message, service style
- "Before You Arrive" section: parking info, dress code, what to expect, arrival instructions, custom message from host
- Visibility settings per event share (show_date_time, show_location, show_occasion, show_menu, show_dietary_info, show_guest_list, show_chef_name)
- Menu display in portal (courses, dishes, dietary tags, allergen flags) when `menuFinalized` and `show_menu` enabled
- Guest list visibility option (other guests can see who's attending)
- Guest documents section for published materials

**Data source?** No. Event details are already in ChefFlow.

**Client-collaborative angle:** Client creates share link with chosen visibility settings. Guests access the portal to see all details. Chef can publish menu, parking, dress code, arrival instructions. Everything is in one link guests bookmark.

**Physical reality:** Mobile-friendly guest portal. Guests check it on their phone before leaving for the event. Large text, clear location with map link potential.

**Compounding:** Medium. Venue-specific details (parking, access) compound for repeat venues.

**Solution design:**

- Already built: comprehensive guest portal with event details, menu, parking, dress code, arrival instructions
- Already built: configurable visibility settings per share link
- Already built: "Before You Arrive" section with pre-event content
- Gap: one-tap "copy event details" as formatted text for pasting into group chat
- Gap: Google Maps deep link from address

**Where it appears:**

- `/event/[eventId]/guest/[secureToken]` (public guest portal, built)
- Client `/my-events/[id]` share link generation (built)
- Chef event settings for visibility/pre-event content (built)

**What remains as permanent exit:**
Guests who are not tech-savvy and need a direct text with the address. Host will always have some guests who prefer the personal message over a link.

**Priority:** High frequency x Already built = Maintenance only
**Spec needed?** No (fully built)

---

## Scenario #57: Ask guests to pay their share

**Original classification:** Reducible with split links and contribution status
**Reclassified to:** Reducible

**Why client leaves:** Group events often split cost. Host currently uses Venmo request, Splitwise, or Cash App to collect from each guest. The operational need is distributing the financial burden fairly and tracking who has paid.

**Context ChefFlow has:**

- Split billing system: `split_billing` field on events (array of client_id/percentage/amount_cents)
- `generateSplitShareToken()` / `generateClientSplitShareToken()` for shareable payment links
- Public split page: `/split/[token]` showing event name, guest count, per-person breakdown
- `SplitBreakdownView` component showing cost allocation
- Client split page: `/my-events/[id]/split` with share button (uses native share API on mobile)
- `ShareSplitButton` component for one-tap sharing
- Chef split billing page: `/events/[id]/split-billing`
- Payment splitting logic in `lib/payments/payment-splitting.ts`

**Data source?** No. Payment is a human action. Split calculation is math ChefFlow can do.

**Client-collaborative angle:** Host generates a split link, shares with guests. Guests see what they owe. The gap is actual payment collection within ChefFlow (currently shows breakdown but guests still pay externally via Venmo/etc).

**Physical reality:** Mobile-first. Quick share to group chat. Clear "you owe $X" per person.

**Compounding:** Low. Each event's split is independent. Slight compounding from knowing group payment patterns.

**Solution design:**

- Already built: split share token generation and public breakdown page
- Already built: native share API integration for mobile
- Already built: per-person cost calculation
- Gap: in-app payment collection per guest (Stripe payment links per split participant)
- Gap: payment status tracking (who paid, who hasn't)
- Gap: automatic reminder for unpaid guests

**Where it appears:**

- `/split/[token]` (public split view, built)
- `/my-events/[id]/split` (client split page, built)
- `/events/[id]/split-billing` (chef configuration, built)

**What remains as permanent exit:**
Guests who insist on paying via Venmo, Cash App, or cash. Payment preference is personal and ChefFlow cannot force a payment rail.

**Priority:** High frequency x Medium effort = High priority (structure built; payment collection is the gap)
**Spec needed?** Yes (in-app guest payment collection with status tracking)

---

## Scenario #58: Handle guest changes day-of

**Original classification:** Reducible with mobile guest count change tools
**Reclassified to:** Reducible

**Why client leaves:** A guest cancels last-minute, or an unexpected plus-one shows up. Host texts chef in a rush. The operational need is updating the headcount and communicating the impact (pricing, portions) immediately.

**Context ChefFlow has:**

- Full guest count change workflow: `requestClientGuestCountChange()` with policy evaluation
- `GuestCountChangePolicy` type evaluating whether changes are allowed (deadline-based, pending-request-aware)
- `calculateGuestCountPricing()` computing price impact, surcharges
- `ClientGuestCountChangeCenter` giving clients policy, pending request, and history
- Automatic chat message posted to chef when client requests a change
- Chef notification with price impact details
- Chef review/approve/reject workflow via `reviewGuestCountChange()`
- Client notification on decision
- Automatic event guest_count and quoted_price update on approval
- Guest list management actions (add/remove guests from client side)
- Configurable deadline via `has_guest_count_deadline` and `guest_count_deadline_days`

**Data source?** No. Last-minute changes are real-time human decisions.

**Client-collaborative angle:** Client submits change through portal. Chef gets instant notification. Price impact calculated automatically. Decision communicated back. No texting needed.

**Physical reality:** Mobile-critical. Day-of changes happen on the phone, often while getting ready or hosting. Must be fast, simple, one-screen.

**Compounding:** Low. Each day-of change is unique. Slight pattern recognition (certain clients always add last-minute).

**Solution design:**

- Already built: full client guest count change request workflow with policy enforcement
- Already built: price impact calculation and chef notification
- Already built: chef approve/reject with automatic event update
- Already built: deadline-based policy (can block changes too close to event if chef configures)
- Gap: day-of mode that auto-approves small changes (e.g., +/- 1 guest within tolerance)
- Gap: push notification to chef (currently in-app notification + chat message)

**Where it appears:**

- `/my-events/[id]#booking-change-center` (client change request, built)
- `/events/[id]?tab=money` (chef review, built)
- Chat thread (automated messages, built)
- Notification system (built)

**What remains as permanent exit:**
Truly urgent situations where the client calls the chef directly (medical emergency, venue issue). Voice communication for crisis moments.

**Priority:** High frequency x Already built = Maintenance only
**Spec needed?** No (comprehensively built)

---

## Scenario #59: Share parking/directions to guests

**Original classification:** Bridgeable with event detail copy blocks and map links
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Guests need to know where to park, which entrance to use, and how to get there. Client currently texts a Google Maps link or parking instructions to each guest or the group chat. The operational need is getting logistics info to attendees.

**Context ChefFlow has:**

- Guest portal "Before You Arrive" section showing parking_info, arrival_instructions
- Event location stored: address, city, state, zip, notes
- `getPreEventContent()` serving parking, dress code, what to expect, arrival instructions, custom message
- Visibility settings controlling what guests see
- Pre-event content configurable by chef and/or host

**Data source?** Partially. Google Maps can provide directions (external link). Parking info is venue-specific knowledge from the host.

**Client-collaborative angle:** Host knows their own parking situation (garage code, street parking rules, which entrance). They enter it once in event details. Every guest sees it in the portal automatically. No need to text each person individually.

**Physical reality:** Mobile-critical. Guests check directions on their phone while driving/navigating. Deep links to Google Maps/Apple Maps from the address are essential.

**Compounding:** High. Venue parking info is reusable across all events at the same location. Once a host enters their home parking instructions, they never need to repeat it.

**Solution design:**

- Already built: parking info field in guest portal "Before You Arrive" section
- Already built: arrival instructions field
- Already built: event address display in portal
- Gap: deep link to Google Maps / Apple Maps from address
- Gap: venue profile that auto-fills parking/access for repeat locations
- Gap: copy-to-clipboard of formatted directions for sharing via text

**Where it appears:**

- `/event/[eventId]/guest/[secureToken]` "Before You Arrive" section (built)
- Chef/host event setup (parking_info field, built)

**What remains as permanent exit:**
Real-time navigation (Google Maps/Waze for turn-by-turn). ChefFlow will never replace a maps app for active navigation.

**Priority:** Medium frequency x Low effort = Medium priority (mostly built; map links and venue memory are gaps)
**Spec needed?** No (small UX enhancements, not spec-worthy)

---

## Batch Summary

| #   | Title                              | Reclassified To                  | Spec Needed? |
| --- | ---------------------------------- | -------------------------------- | ------------ |
| 52  | Collect guest names                | Reducible + Client-Collaborative | No           |
| 53  | Collect RSVPs                      | Reducible + Client-Collaborative | No           |
| 54  | Collect dietary restrictions       | Reducible + Client-Collaborative | No           |
| 55  | Chase missing guest responses      | Reducible + Client-Collaborative | No           |
| 56  | Share event details with guests    | Reducible + Client-Collaborative | No           |
| 57  | Ask guests to pay their share      | Reducible                        | Yes          |
| 58  | Handle guest changes day-of        | Reducible                        | No           |
| 59  | Share parking/directions to guests | Reducible + Client-Collaborative | No           |

---

## Key Finding

This is ChefFlow's strongest category. 7 of 8 scenarios are already substantially built. The guest coordination infrastructure (tokenized portals, RSVP system, dietary outreach, guest count change workflow, split billing, pre-event content) is comprehensive and production-ready. The only meaningful gap is **in-app guest payment collection** (scenario #57), where the split breakdown exists but actual money movement still happens externally.

---

## Evidence Files Referenced

| File                                                                 | What It Proves                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| `database/migrations/20260221000001_layer_7_guest_rsvp.sql`          | event_guests, event_shares, RSVP system schema            |
| `database/migrations/20260330000084_dietary_confirmations.sql`       | Chef dietary acknowledgment system                        |
| `database/migrations/20260517300002_dietary_outreach.sql`            | Per-guest dietary email outreach with tokens              |
| `lib/sharing/actions.ts`                                             | Full RSVP submission, share link management, guest portal |
| `lib/dietary-outreach/actions.ts`                                    | Dietary confirmation email pipeline                       |
| `lib/guests/count-changes.ts`                                        | Client guest count change request/review workflow         |
| `lib/events/client-guest-actions.ts`                                 | Client-side guest add/remove, dietary rollup              |
| `lib/events/client-dietary-reminder-actions.ts`                      | Client dietary reminder status checks                     |
| `lib/payments/split-share-actions.ts`                                | Split share token generation                              |
| `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx` | Guest portal with RSVP, dietary, parking, menu            |
| `app/(public)/dietary-confirm/[token]/page.tsx`                      | Public dietary confirmation form                          |
| `app/(public)/split/[token]/page.tsx`                                | Public split cost breakdown page                          |
| `app/(client)/my-events/[id]/guests/guests-client.tsx`               | Client guest management UI                                |
| `app/(client)/my-events/[id]/split/client-split-client.tsx`          | Client split share with native share API                  |
| `app/api/scheduled/rsvp-reminders/route.ts`                          | Automated RSVP reminder cron                              |
