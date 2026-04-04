# Research: Employees / Contractors / Admin / Manager Workflow Reality

> **Date:** 2026-04-04
> **Question:** How do the non-chef people in a catering operation actually work, and what does ChefFlow need to support them?
> **Status:** complete

---

## Origin Context

ChefFlow currently treats "staff" as a roster attached to events. This research examines the full reality of how contracted kitchen staff, admins, and catering managers operate day-to-day, to identify where ChefFlow's staff module matches real workflows and where it falls short.

---

## Summary

A private chef business typically runs with two to eight people in rotation: the lead chef, one to three kitchen or service staff hired per event (almost always 1099 contractors), and, in larger operations, a booking admin who handles calendar, invoices, and communications. Full-time W-2 staff are rare below the $500K/year revenue mark. The operational pain is concentrated at three moments: before the event (getting the right people confirmed and briefed), during the event (role clarity and real-time adjustments), and after (logging hours and calculating pay for taxes).

---

## Employee / Contractor Reality

### How Contracted Staff Receive Work Assignments

In the private chef and boutique catering world, most staff coordination still happens through:

1. **Text message or group chat (iMessage, WhatsApp)** for small operations. A chef texts "Are you available Saturday the 12th? Dinner for 8, 6 PM. $X." The reply is a thumbs-up or a conflict explanation.
2. **Shift-invitation apps (Workstaff, Quickstaff, When I Work)** for medium operations. Staff get email or push notifications, accept/decline in-app, and manager sees real-time roster fill.
3. **Verbal + printed run sheet** for day-of coordination.

The transition from group text to a platform tool typically happens when a chef has six or more recurring contractors and starts losing track of who confirmed what. Below that threshold, the overhead of a platform often outweighs the benefit.

### What Staff Actually Need Before an Event

Industry standard event briefings cover seven categories:

| Category      | Contents                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Call time     | Specific arrival time, not serve time. Industry practice: staff arrive 90-120 minutes before first course     |
| Location      | Full address, parking instructions, staff entrance (separate from client entrance in many residential events) |
| Dress code    | Color, style (black and white is most common), shoe type (non-slip), hair requirements                        |
| Menu          | Full dish list with course order, plating description, key dietary flags                                      |
| Guest notes   | Guest count, VIPs, known allergies, client preferences (e.g., "client prefers quiet service, no small talk")  |
| Role clarity  | Who does what (server vs. runner vs. bartender), who is point of contact, escalation path                     |
| Kitchen notes | Oven access, refrigerator space, plating surfaces, parking for a van if shopping                              |

The briefing does not need to be long. Industry practitioners note that a 10-minute pre-event rundown prevents hours of confusion. The document form of this is the "event run sheet" or "call sheet."

### W-2 vs. 1099: What Actually Happens

**Private chef operations almost universally use 1099 contractors** for kitchen and service staff. The practical reasons:

- Work is episodic (one to four events per month per person), not continuous
- Staff often work for multiple chefs simultaneously
- Chefs cannot afford payroll taxes on staff who work four Saturdays a year

**The legal reality creates significant risk.** The IRS and DOL use a behavioral control test: if you dictate when, how, and where a worker performs tasks, they are likely an employee regardless of how you label them. For catering:

- Telling a server exactly how to plate each dish = behavioral control = W-2 territory
- Hiring a server to "provide silver service for a 3-hour dinner" = contractor
- The distinction is blurry and often violated unknowingly

**The $600 threshold for 1099-NEC filing** is well-known in the industry. Contractors paid less than $600/year in total across all events do not require a 1099 form, but many chefs still collect W-9s from everyone as a best practice.

**W-9 collection and file management is a consistent pain point.** Chefs collect paper W-9s, lose them, re-request them, or forget entirely until January when 1099s are due.

### Hour Logging and Availability

- Most contracted staff do not have a formal way to log hours. Hours are typically agreed in advance ("You're scheduled for 6 hours") and paid flat unless overtime is verbally negotiated.
- Clock-in/clock-out is unusual for independent contractors in private chef work. It is more common in catering companies that process payroll.
- **Availability submission** is the biggest coordination friction. Chefs have to manually check who is available for each date. Tools that let contractors mark their own availability grids dramatically reduce this back-and-forth.

---

## Admin Reality

### What "Admin" Means in a Small Operation

In a solo or small private chef business, the lead chef is also the admin. In a two-to-three person operation, one person (often a partner, part-time assistant, or VA) takes on:

- **Inquiry triage:** reading new inquiries, logging details, sending initial responses
- **Quote and invoice management:** creating and sending quotes, following up on unpaid invoices, logging payments received
- **Calendar coordination:** blocking dates, confirming staff, avoiding double-booking
- **Procurement admin:** sending vendor orders, logging receipts, reconciling food cost invoices
- **Client record maintenance:** updating allergy notes, past event history, preference files

Industry data suggests small catering operations spend up to 15 hours per week on admin tasks that could be partially automated. The highest-cost admin errors are:

| Error                       | Real-world consequence                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Double-booking a date       | Chef commits to two events, must cancel one, risks reputation and may owe a refund |
| Wrong address sent to staff | Staff arrives at wrong location, event starts late or fails                        |
| Missed invoice follow-up    | Client pays 60+ days late or disputes amount                                       |
| Unpaid invoice not flagged  | Chef discovers $2,000 outstanding three months later at tax time                   |
| Lost W-9                    | Cannot file 1099 in January, may face IRS penalty                                  |

### Time Distribution Weekly (estimated, solo operator)

Based on catering coordinator job descriptions and industry sources:

- Inquiry response and client communication: 3-5 hours
- Quote and contract work: 2-3 hours
- Scheduling and staff coordination: 2-3 hours
- Financial admin (invoices, expenses, reconciliation): 3-4 hours
- Vendor ordering and receipt logging: 1-2 hours
- Miscellaneous (travel planning, supply orders, misc client requests): 1-2 hours

Total: 12-19 hours per week on admin for a chef doing 6-10 events per month.

---

## Manager Reality

### Catering Manager Coordination (Multi-Event / Larger Operations)

In operations running multiple simultaneous events (rare for a solo private chef, but common as the business scales to a team), a catering manager:

- Builds and owns the event run sheet (timeline with 15-minute buffer blocks between major transitions)
- Runs the pre-event staff briefing (verbal, 10-15 minutes before arrival)
- Manages real-time staffing adjustments during the event (pulling a server from setup to cocktail if guest flow exceeds forecast)
- Is the single point of contact for the venue, the client, and the kitchen
- Handles visible problems immediately (spilled drinks, line too long, food quality issue) because speed of response signals operational competence to the client

**The escalation structure** that works in catering operations:

- Front-line staff solve simple issues independently
- Mid-level issues go to the service captain or lead server
- Critical issues reach the chef/manager

### Real-Time Communication During Events

This is a persistent industry problem. Tools used in the field:

- **Walkie-talkies / radio earpieces** in high-end or large events
- **Group text threads** for smaller operations
- **WhatsApp during event** (common in boutique catering)
- No formalized in-platform solution is dominant at the small/medium level

The biggest real-time failures: kitchen not knowing that the program is running 20 minutes long, which delays course pacing; server not knowing about a late-arriving VIP; staff unaware of a last-minute allergy disclosure.

---

## Breakpoints

These are the moments where the current system breaks down for operators in this persona group:

1. **Staff availability confirmation loop.** Chef texts five people, gets three yeses, two no responses, one maybe. No record anywhere.
2. **Pre-event briefing delivery.** Briefing is in the chef's head or a notes doc. Staff might get a text the night before. Nothing is standardized or tracked.
3. **No formal acknowledgment of briefing.** Staff receive info but there is no confirmation that they read it. Day-of surprises (wrong dress, didn't know about the nut allergy) trace back to this.
4. **Hours-to-pay calculation is manual.** Chef knows the hours from memory or a text thread, then calculates pay manually, then Venmos or writes a check.
5. **W-9 and 1099 workflow is almost entirely unmanaged.** Most small operators fall behind until January and scramble.
6. **No "event packet" for staff.** Each event requires the chef to re-communicate the same categories of information in an ad-hoc way. There is no standard structure staff can expect.
7. **No real-time coordination channel within the platform.** During an event, nothing connects the chef and staff digitally in a work context.

---

## ChefFlow Match Analysis

### What ChefFlow Already Has (Strong)

| Real-world need                         | ChefFlow coverage                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff roster with roles and rates       | `/staff` with role labels, hourly rate, status (active/inactive)                                                                                            |
| Per-staff portal login                  | "Create Login" flow on `/staff/[id]`, separate `(staff)` route group                                                                                        |
| Staff can see their schedule            | `/staff-schedule` (read-only, upcoming and past)                                                                                                            |
| Staff can see their tasks               | `/staff-tasks` with completion checkboxes and accountability logging                                                                                        |
| Staff can see station recipes           | `/staff-recipes` (read-only)                                                                                                                                |
| Availability grid (chef view)           | `/staff/availability` - 7-day grid, click to toggle                                                                                                         |
| Staff scheduling (assignment to events) | `/staff/schedule` with StaffScheduler component                                                                                                             |
| Clock in/out (chef-managed)             | `/staff/clock` with real-time elapsed time                                                                                                                  |
| Time tracking (staff self-service)      | `/staff-time` in staff portal                                                                                                                               |
| Performance tracking                    | `/staff/performance` with on-time rate, cancellations, avg rating                                                                                           |
| Labor cost analytics                    | `/staff/labor` with revenue vs. labor cost chart                                                                                                            |
| Onboarding checklist                    | W-9 collected, background check, food handler cert, NDA, COC - tracked per staff member                                                                     |
| Contractor service agreements           | `contractor_service_agreements` table, tracked in staff detail                                                                                              |
| 1099 tax report generation              | `generate1099Report()` in `lib/staff/tax-report-actions.ts`, respects $600 threshold                                                                        |
| Staff briefing document                 | `generateStaffBriefing()` in `lib/staff/briefing-actions.ts` - compiles event date, arrival time, address, menu, dietary flags, kitchen notes, staff roster |
| AI staff briefing (event detail)        | AI-generated briefing document accessible from event ops panel                                                                                              |

### What ChefFlow Is Missing or Underdeveloped (Gaps)

| Real-world need                                   | ChefFlow gap                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staff shift invitation with accept/decline**    | Staff are assigned by the chef. There is no invite-and-confirm flow where the staff member accepts or declines a shift. Chef has no confirmation record.                                                      |
| **Staff-side availability self-reporting**        | Staff portal (`/staff-dashboard`, `/staff-tasks`, `/staff-schedule`) has no availability submission. Only the chef can toggle availability on the `/staff/availability` grid.                                 |
| **Briefing delivery and read acknowledgment**     | The briefing is generated but there is no send-to-staff mechanism, no delivery record, and no read confirmation.                                                                                              |
| **Pre-event event packet / call sheet for staff** | Staff portal does not show an event briefing document or event-specific notes. Staff see assignments on `/staff-schedule` but only date, time, and hours - no address, dress code, menu, allergy notes.       |
| **Real-time in-event communication**              | No in-platform messaging or broadcast channel between chef and staff during an event.                                                                                                                         |
| **Staff-submitted hour logs**                     | Staff can clock in/out via `/staff-time` but the clock interface is tied to the `TimeTracker` component. It is unclear whether staff can log hours for events that have already passed (retroactive logging). |
| **Pay stub / earnings view for staff**            | Staff portal has no earnings history or payment confirmation page. Staff cannot see what they were paid per event.                                                                                            |
| **Staff-side W-9 submission**                     | W-9 status is tracked in the onboarding checklist, but there is no mechanism for staff to upload their own W-9 through the portal. Chef must mark it manually.                                                |
| **Admin role / delegated access**                 | ChefFlow is chef-only or staff-only. There is no "admin" or "booking coordinator" account type that can manage inquiries, send quotes, and view financials without being the lead chef.                       |
| **Contractor invoice submission**                 | No mechanism for contractors to submit their own invoices for shifts worked. This is a standard feature of platforms like Workstaff and Armada.                                                               |
| **Multi-event manager view**                      | No "cross-event staff command" view showing which staff are assigned to which events across the week, with gaps visible at a glance for a manager overseeing multiple events.                                 |

---

## Gaps and Unknowns

1. **How many ChefFlow users have more than three staff members?** The staff portal is relatively feature-complete, but if most solo chefs have zero or one assistant, the portal may be solving a problem that does not yet exist for most users.
2. **Is staff portal actually used?** The portal requires creating a login per staff member and distributing credentials. Adoption friction at this step likely means most staff features are invisible to staff.
3. **Does the briefing ever reach staff?** The `generateStaffBriefing()` action produces structured data. How does the chef actually get it to staff? There is no send button, no email, no share link. It may exist only as a printable document or on-screen view.
4. **W-2 compliance risk:** ChefFlow's framing treats all staff as contractors (W-9 collection, 1099 report). This is probably accurate for the target user base, but ChefFlow does not surface any guidance around misclassification risk, which is a real legal exposure for catering businesses.

---

## Recommendations

These are ranked by leverage against the breakpoints identified above.

**Priority 1 - Staff event packet in portal** (highest leverage, low complexity)

Staff currently see an assignment on `/staff-schedule` with a date, time, and hour count. They need: address, call time (arrival time, not serve time), dress code, their specific role, menu summary, and any allergy flags. The data already exists in `generateStaffBriefing()`. The gap is surfacing it in the staff portal, per-event.

**Priority 2 - Shift invite and confirm flow** (medium complexity, high operational value)

Replace or supplement chef-side assignment with an invite step. Staff member receives an assignment notification through the portal or by email. They confirm or decline. Chef sees confirmation status on the schedule view. This closes the "did they actually see it and agree?" loop that currently lives in text threads.

**Priority 3 - Staff-side availability submission**

Staff can currently be marked available by the chef. They cannot submit their own availability from the portal. Adding a self-serve availability calendar to the staff portal would reduce the scheduling coordination back-and-forth that currently happens via text. This is a standard feature of every staffing platform reviewed.

**Priority 4 - Briefing delivery mechanism**

`generateStaffBriefing()` needs a delivery path. Minimum viable: a share link that generates a read-only page with the briefing (no auth required, token-gated). Better: a "Send to all staff" button that emails the briefing to each assigned staff member.

**Priority 5 - Staff earnings view in portal**

Staff should be able to see their pay history per event. This is particularly important for 1099 contractors who need this data for their own tax filing. It also builds trust.

**Lower priority - Admin role type**

A delegated admin account (same access as chef minus financial write operations, or fully scoped by the chef) would require a meaningful auth change. The use case is real but it may only apply to operations above a certain scale. Defer until there is evidence from real users.

**Do not build - Real-time in-event communication**

In-platform messaging during an event is a product direction decision, not a feature gap. The operational reality is that chefs use their phones (text/call) during events and are unlikely to switch to an in-app channel for real-time coordination. The engineering cost is high, adoption is uncertain. The better investment is ensuring the pre-event briefing is complete so real-time coordination needs are minimized.
