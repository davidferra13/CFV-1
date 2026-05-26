# Exit Eval: Client / CALENDAR & SCHEDULING

> Wave 2 | 6 scenarios | Role: CLIENT
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #21: Check personal availability

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client needs to know if THEY are free on a proposed date. Their personal calendar (kids' soccer, work meetings, vacations) lives in Google Calendar, Apple Calendar, or Outlook. ChefFlow cannot own the client's life schedule.

**Context ChefFlow has:**

- Proposed event dates from chef
- Client's past event dates (pattern data)
- Existing booked ChefFlow events for this client

**Data source?** Yes, but client-owned (Google Calendar API, Apple Calendar). Unlike weather or pricing, these are private calendars requiring OAuth from the CLIENT, not the chef. Much higher friction to integrate.

**Client-collaborative angle:** Minimal. The client IS the authority on their own schedule. No Circle member can answer this for them. However, ChefFlow can reduce the need to check by presenting proposed dates clearly within the portal.

**Physical reality:** Screen-based. Client checks their phone calendar app quickly. This is a 5-second glance, not a workflow. Any ChefFlow solution must be faster than the existing habit (swipe to calendar app).

**Compounding:** Low. Each availability check is one-off. No long-term knowledge builds from a single "am I free Tuesday?" check.

**Solution design:**

- Show proposed dates prominently on the event detail page with day-of-week context
- Include "Add to Calendar" buttons (ALREADY BUILT: `components/events/calendar-add-buttons.tsx`) so accepted events show up in their calendar, preventing double-booking
- iCal feed subscription for clients (chef feed exists at `app/api/feeds/calendar/[token]/route.ts`, client equivalent not yet built) so ChefFlow events appear alongside personal events automatically
- Date-poll links (partially exists via `lib/dinner-circles/polls.ts`) where chef proposes 2-3 date options, client picks

**Where it appears:**

- Client event detail page (already shows `CalendarAddButtons` for paid/confirmed events)
- Client portal `/my-calendar` (built: `app/(client)/my-calendar/page.tsx`)
- Email confirmations (iCal attachments: `lib/email/ics-attachment.ts`)

**What remains as permanent exit:**
The client will always glance at their personal calendar to check conflicts before committing to a date. ChefFlow cannot and should not replicate the client's entire life schedule. The residual exit is a 5-second phone glance.

**Priority:** High frequency (every booking) x Low effort (already mostly built) = High value, low lift
**Spec needed?** No. Core infrastructure exists. Minor enhancement: client-facing iCal subscription feed.

---

## Scenario #22: Coordinate date with spouse/family/team

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable + Partially Reducible

**Why client leaves:** The client cannot commit to a date alone. Their spouse, co-host, assistant, or team must agree. The coordination happens via text threads, Slack, email, or shared family calendars. The decision is social and requires back-and-forth.

**Context ChefFlow has:**

- Proposed dates from chef
- Event details (occasion, menu, guest count, pricing)
- Client contact info
- Dinner Circle membership (co-hosts can be invited)

**Data source?** No. This is human coordination, not data lookup.

**Client-collaborative angle:** Strong. ChefFlow already has:

- Co-host invitations (`lib/circles/co-host-actions.ts` with `inviteCoHost`, `acceptCoHostInvitation`)
- Dinner Circle polls (`lib/dinner-circles/polls.ts` with `CreatePollSchema` supporting `arrival_window` type)
- Shareable proposal links (`lib/sharing/actions.ts`, `lib/discovery/action-shareable-link.ts`)

A date-poll link sent to stakeholders could collect preferences without requiring the client to relay information manually.

**Physical reality:** Text/screen. Client forwards a link to family group chat. Must work without login for recipients (existing pattern: public token pages).

**Compounding:** Medium. Household decision-makers are recurring participants. Knowing "spouse prefers Saturday evenings" compounds across bookings.

**Solution design:**

- Date-poll feature within Dinner Circles (poll type `arrival_window` already exists in schema)
- Shareable proposal links already built; add "share with spouse/team" CTA on proposal page
- Co-host access allows spouse to view event details and vote on dates without full account
- Store household scheduling preferences in client passport (`lib/clients/passport-actions.ts`)

**Where it appears:**

- Event proposal page (share button)
- Dinner Circle group view (`app/(public)/hub/g/[groupToken]/hub-group-view.tsx`)
- Client event detail page (invite co-host CTA)

**What remains as permanent exit:**
The actual human conversation ("honey, are you free the 15th?") remains external. ChefFlow reduces the information relay (no need to copy-paste event details into a text) but cannot replace the social negotiation.

**Priority:** High frequency (most events involve multiple decision-makers) x Medium effort (polls exist, needs date-specific poll type) = High value
**Spec needed?** No. Existing poll infrastructure + shareable links cover this. Add a "date preference" poll type to the existing poll schema.

---

## Scenario #23: Add event to personal calendar

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** After confirming a booking, the client needs a reminder in their own calendar system. They open Google Calendar or Apple Calendar to manually create an entry with the event date, time, and location.

**Context ChefFlow has:**

- Event date, time, location (complete)
- Occasion name
- Guest count
- Serve time
- Chef name

**Data source?** Yes. ChefFlow IS the data source. The external calendar is just the destination.

**Client-collaborative angle:** None needed. This is a pure data-push from ChefFlow to the client's calendar.

**Physical reality:** One-tap action. Client taps "Add to Calendar" and it appears in their phone calendar. Must be zero-friction.

**Compounding:** Low per event, but high in aggregate. If every event auto-appears in the client's calendar, deadline awareness improves across all bookings.

**Solution design:**

- "Add to Google Calendar" deep-link button: BUILT (`components/events/calendar-add-buttons.tsx`, uses Google Calendar URL scheme)
- "Download .ics" button for Apple/Outlook: BUILT (same component, hits `app/api/calendar/event/[id]/route.ts`)
- iCal attachment in confirmation emails: BUILT (`lib/email/ics-attachment.ts` with `buildIcsAttachment`)
- Event confirmed email includes `calendarUrl` prop: BUILT (`lib/email/templates/event-confirmed.tsx`)

**Where it appears:**

- Client event detail page: buttons shown for paid/confirmed/in_progress events (verified in `app/(client)/my-events/[id]/page.tsx` line 493-500)
- Email confirmations: iCal attachment auto-included

**What remains as permanent exit:**
Nothing. This exit is fully eliminated. The client never needs to manually create a calendar entry.

**Priority:** High frequency x Already built = DONE
**Spec needed?** No. Feature is complete and wired.

---

## Scenario #24: Track payment/menu/guest deadlines

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** The client sets calendar reminders or email flags to remember when payment is due, when they need to finalize their menu, or when the final guest count is needed. They leave because they do not trust they will be reminded at the right time.

**Context ChefFlow has:**

- Payment due dates (stored in events table: `payment_due_date`)
- Menu approval deadlines (stored: `menu_approval_deadline`)
- Contract deadlines (stored: `contract_deadline`)
- Event date (implicit countdown)
- Client notification preferences

**Data source?** Yes. ChefFlow owns all deadline data. The external calendar is redundant if ChefFlow proactively notifies.

**Client-collaborative angle:** Low. Deadlines are set by the chef; the client just needs to know when they arrive.

**Physical reality:** Push notifications, email reminders, and in-app deadline displays. Client should never need to think about when things are due; the system tells them.

**Compounding:** Medium. Deadline patterns (e.g., "payment always due 2 weeks before") build trust that the system handles it.

**Solution design:**

- Client calendar view shows deadlines: BUILT (`lib/calendar/client-calendar-actions.ts` returns `payment_due_date` and `menu_approval_deadline` as CalendarEvent items with type `deadline`)
- Payment reminder system: BUILT (`lib/finance/payment-reminder-actions.ts`)
- Lifecycle status notifications: BUILT (`lib/lifecycle/client-notifications.ts`)
- Client notifications page: BUILT (`app/(client)/my-notifications/page.tsx`)
- iCal feed with deadlines (not yet built for client; chef version exists)
- Email reminders for approaching deadlines: PARTIALLY BUILT (2-day event reminder template exists at `lib/email/templates/event-reminder-2d.tsx`)

**Where it appears:**

- `/my-calendar` page (deadlines rendered as amber dots)
- `/my-notifications` (notification bell and history)
- Email reminders (pre-event and payment approaching)
- Event detail page (journey stepper shows pending actions)

**What remains as permanent exit:**
If the client wants deadlines in their personal calendar alongside non-ChefFlow reminders, they still need an iCal subscription or manual add. A client-facing iCal feed (like the chef's at `/api/feeds/calendar/[token]`) including deadlines would fully eliminate this.

**Priority:** High frequency (every event has 2-3 deadlines) x Low remaining effort (most infrastructure built) = High value, very low remaining lift
**Spec needed?** No. Add `deadline` events to a client iCal feed endpoint. Small enhancement.

---

## Scenario #25: Find a date that fits venue availability

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The venue (rental space, private home with HOA rules, restaurant private room, hotel ballroom) has its own availability calendar that ChefFlow does not control. The client must check with the venue via email, phone, or the venue's booking portal before committing to a date.

**Context ChefFlow has:**

- Chef's availability (Google Calendar sync: `lib/scheduling/calendar-sync.ts`)
- Chef's blocked dates (iCal feed)
- Client's booked ChefFlow dates
- Venue details if previously stored (venue_details in events, `lib/events/venue-details-actions.ts`)

**Data source?** No. Venue calendars are fragmented (no universal API). Each venue has its own system: Peerspace, hotel portals, HOA rules, private rental sites. There is no data source to drink from.

**Client-collaborative angle:** Medium. The client often IS the venue owner (their home) or has direct access. When booking external venues, the venue's answer can be stored in ChefFlow event details for future reference.

**Physical reality:** Phone call or email to venue. Cannot be automated.

**Compounding:** High for repeat venues. If a client always hosts at the same venue, knowing its constraints (no Sunday events, only available after 5pm, no outdoor events in winter) compounds into venue profiles. Currently stored as `site_notes` in event records.

**Solution design:**

- Store venue availability windows when known (existing `site_notes` field, `venue_details` in events)
- Calendar entry actions already support venue-awareness (`lib/calendar/entry-actions.ts`)
- Allow client to note "venue confirmed for [date]" as part of booking flow
- Surface past venue bookings: "You hosted here on [dates] before"
- Venue profile with known constraints (no new table needed; use event venue_details pattern)

**Where it appears:**

- Event detail page (venue section)
- Booking flow (date selection step could show "previously used venues")
- Event notes

**What remains as permanent exit:**
The client will always need to contact the venue directly for availability. ChefFlow cannot replace Peerspace, hotel booking systems, or HOA calendars. This exit is permanent but can be shortened by remembering venue patterns.

**Priority:** Medium frequency (only events at external venues) x High effort (no universal API) = Low ROI for engineering, high for UX notes
**Spec needed?** No. Store venue constraints in existing fields. No new feature needed.

---

## Scenario #26: Reschedule with multiple stakeholders

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why client leaves:** When rescheduling, the client must coordinate across multiple parties: chef, venue, guests, staff, co-hosts, vendors. Each stakeholder has their own communication channel. The client becomes the relay point, emailing the venue, texting guests, calling the chef, messaging co-hosts.

**Context ChefFlow has:**

- Full reschedule workflow: BUILT (`lib/events/reschedule-actions.ts` with fee calculation, history tracking, and multi-party notifications)
- Reschedule modal UI: BUILT (`components/events/reschedule-event-modal.tsx`)
- Automated notifications to client, staff, and vendors on reschedule (lines 190-307 of `reschedule-actions.ts`)
- Google Calendar re-sync after reschedule (line 172-180 of same file)
- Reschedule email template: BUILT (`lib/email/templates/event-rescheduled.tsx`)
- Change request system from client side: BUILT (`lib/clients/change-request-actions.ts` with `date_change` request type)
- Event rescheduled email sent to client, all assigned staff, and all event vendors automatically

**Data source?** No. This is coordination, not data lookup. But ChefFlow already automates most of the notification fanout.

**Client-collaborative angle:** Strong. When the CLIENT initiates a reschedule:

- Change request workflow captures the request (`lib/clients/change-request-types.ts` includes `date_change`)
- Chef reviews and approves
- On approval, the system notifies all parties automatically
- Co-hosts in Dinner Circles get notified via circle messages

**Physical reality:** Mostly text/email. The coordination is asynchronous. ChefFlow's role: be the single point where the decision is logged and notifications fan out, so the client does not have to individually message everyone.

**Compounding:** Low per reschedule, but high for trust. If the client knows "I just tell ChefFlow the new date and everyone gets notified," they stop worrying about the coordination burden.

**Solution design:**

- Client-initiated reschedule request: BUILT (change request type `date_change`)
- Chef-side reschedule with automated multi-party notification: BUILT
- Staff notification on reschedule: BUILT (sends email to all assigned staff)
- Vendor notification on reschedule: BUILT (sends email to all event vendors)
- Google Calendar update on reschedule: BUILT (calls `syncEventToGoogleCalendar`)
- Status trail for all parties: reschedule history tracks `client_notified`, `staff_notified`, `vendor_notified`
- Guest notification on reschedule: NOT YET BUILT (guests in event_guests table are not yet emailed on reschedule)

**Where it appears:**

- Chef event detail page (reschedule modal)
- Client portal (change request submission)
- Email (all stakeholders receive rescheduled email)
- Reschedule history (visible in modal)

**What remains as permanent exit:**

- Venue coordination remains external (venue must confirm new date availability)
- Guest informal notification (some guests may not have ChefFlow accounts; SMS/text relay needed)
- External vendor systems that need manual rebooking (florist, rental company, etc.)

**Priority:** Medium frequency (reschedules are uncommon but painful) x Low remaining effort (core flow is built) = Medium value, needs guest notification gap closed
**Spec needed?** No. Add guest email notification to the existing reschedule fanout. Small enhancement to `sendRescheduleNotifications`.

---

## Batch Summary

| #   | Title                                    | Reclassified To                  | Spec Needed?       |
| --- | ---------------------------------------- | -------------------------------- | ------------------ |
| 21  | Check personal availability              | Permanent                        | No                 |
| 22  | Coordinate date with spouse/family/team  | Bridgeable + Partially Reducible | No                 |
| 23  | Add event to personal calendar           | Reducible                        | No (already built) |
| 24  | Track payment/menu/guest deadlines       | Reducible                        | No (mostly built)  |
| 25  | Find a date that fits venue availability | Permanent                        | No                 |
| 26  | Reschedule with multiple stakeholders    | Bridgeable                       | No                 |

## Key Findings

**Already fully built:**

- Scenario #23: Add-to-calendar buttons (Google + .ics), iCal email attachments, API endpoint

**Mostly built (small gaps):**

- Scenario #24: Client calendar shows deadlines, payment reminders fire, lifecycle notifications exist. Gap: client iCal subscription feed.
- Scenario #26: Full reschedule workflow with multi-party notifications. Gap: guest notification on reschedule.

**Infrastructure exists, needs wiring:**

- Scenario #22: Polls exist, co-hosts exist, shareable links exist. Needs "date preference" poll UX and share-with-spouse CTA.

**Permanently external:**

- Scenario #21: Client's personal calendar will always be checked externally (5-second glance).
- Scenario #25: Venue availability is fragmented, no universal API.

## Remaining Enhancements (ordered by effort)

1. Add guest email to reschedule notification fanout (tiny)
2. Add client-facing iCal subscription feed with deadlines (small)
3. Add "share with spouse" CTA on proposal page linking to co-host invite (small)
4. Add "date preference" poll type to Dinner Circle polls (medium)
