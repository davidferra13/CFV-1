# Exit Eval: Chef / PEOPLE & DELEGATION

> **Wave 1** | 7 scenarios | Evaluated: 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)
> **Evaluator:** Claude (exit-eval skill, rubric v1)

---

## Scenario #65: Coordinate with client's household staff (house manager, nanny, PA)

**Original classification:** Permanent exit (store household contacts on client profile)
**Reclassified to:** Reducible + Client-Collaborative

**Why chef leaves:** The chef needs operational info (dietary changes, schedule shifts, access codes, kid pickup times, last-minute guest additions) that flows through household staff rather than the client directly. The chef is not leaving to "call someone"; they are leaving because the information pipeline runs through a person ChefFlow does not know about.

**Context ChefFlow has:**

- Client profile with `partnerName`, `children`, `familyNotes`, `houseRules`, `accessInstructions`, `gateCode`, `wifiPassword`
- `household_members` table linking clients to households with relationship types
- Event date/time/location, guest count, dietary restrictions, allergies
- Dinner Circle (event-scoped) for client communication
- Communication pipeline (`lib/communication/pipeline.ts`) with thread keys by email/phone

**Data source?** No. This is interpersonal coordination, not a database lookup.

**Client-collaborative angle:** High. The client can designate household staff contacts during Circle onboarding. The nanny, PA, or house manager could be added as Circle members (role: `delegate`) with scoped visibility. Dietary info, schedule changes, and access updates flow directly into ChefFlow without chef intervention.

**Physical reality:** Phone/text is natural for quick coordination. But structured info (allergies per child, schedule grid, access codes) benefits from form-based collection via Circle portal. Chef needs glanceable household contact card on event day (print-friendly or large-text).

**Compounding:** High. Household staff stay stable across dozens of events. Capture the nanny's name, the PA's scheduling style, the house manager's contact once; serve that intelligence for every future event at that client's home.

**Solution design:**

- Add "Household Contacts" section to client profile (name, role, phone, email, notes per contact)
- Allow household contacts to join the client's Dinner Circle as `delegate` role members
- Circle onboarding prompt: "Does anyone else help coordinate your events? (house manager, nanny, assistant)"
- Pre-event briefing card shows household contacts with roles and last-contact notes
- Communication pipeline auto-recognizes household contact emails/phones and links to client thread

**Where it appears:**

- Client profile > Household section
- Event detail > Pre-service briefing card
- Dinner Circle member list (delegate role)
- Morning briefing (if household contact sent a message)

**What remains as permanent exit:**
Actual phone calls/texts to household staff for real-time coordination on event day (running late, gate code changed 5 min ago). Voice communication is inherently external.

**Priority:** High frequency (every recurring client with staff) x Medium effort (schema exists, Circle exists, need wiring) = HIGH
**Spec needed?** Yes (household-contact-circle-integration.md)

---

## Scenario #66: Hire/coordinate photographer for events

**Original classification:** Permanent exit (store photographer contacts per event)
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to browse photographer portfolios, negotiate rates, confirm availability for a specific date, and coordinate shot lists. The hiring decision requires visual portfolio review that ChefFlow cannot replicate. Ongoing coordination (arrival time, what to capture, plating moments) is operational.

**Context ChefFlow has:**

- Event date, time, location, occasion, menu items, plating style
- Exit-link #46 in registry: `mailto:{photographerEmail}?subject=Photography+{eventDate}&body={eventBrief}`
- Trusted staff roster (`lib/business-ops/staff-roster-actions.ts`) with role types (no dedicated "photographer" role but could use "other")
- Vendor coordination logging (`lib/vendors/vendor-coordination-actions.ts`) for tracking contact status

**Data source?** No. Photographer selection is creative/subjective (portfolio browsing).

**Client-collaborative angle:** Medium. Client sometimes requests a specific photographer or has a preferred one. Circle could collect "Do you want event photography?" and "Preferred photographer?" during event setup.

**Physical reality:** Portfolio browsing is inherently screen-based (Instagram/website). Coordination on event day is text/call. Shot list could be a printable card.

**Compounding:** Medium. A chef builds a stable of 2-3 trusted photographers over time. Storing contact, rate, style notes, and past event photos attributed to them builds a reusable roster.

**Solution design:**

- Add "photographer" to `StaffRole` enum in trusted staff roster (or use existing "other" with a tag)
- Event-level "vendors needed" checklist (photographer, florist, rentals) that triggers exit-link or contact from roster
- Vendor coordination log entry auto-created when photographer assigned to event
- Pre-event briefing includes photographer name, arrival time, shot list preferences
- Client Circle question: "Would you like event photography?"

**Where it appears:**

- Event detail > Vendors/Services tab
- Trusted staff roster (photographer entries)
- Pre-event checklist (photographer confirmed? y/n)
- Exit-link fires if no stored photographer (Google search for local event photographers)

**What remains as permanent exit:**
Portfolio browsing, initial hiring negotiation, Instagram DM discovery of new photographers. These are creative/marketplace activities outside ChefFlow's domain.

**Priority:** Low-medium frequency (not every event needs photos) x Low effort (roster + exit-link already exist) = MEDIUM
**Spec needed?** No (use existing roster + vendor coordination; add "photographer" role)

---

## Scenario #67: Communicate with commissary kitchen landlord

**Original classification:** Permanent exit (store commissary details)
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to book kitchen time, handle rent/billing, report maintenance issues, or coordinate schedule changes with the commissary landlord. This is a landlord-tenant relationship with booking logistics.

**Context ChefFlow has:**

- `kitchen_rentals` table: facility name, address, rental date, start/end time, hours booked, cost, purpose, event linkage, booking confirmation, notes
- `business_locations` table with `locationType = 'commissary'` option
- External contacts settings: `commissaryUrl` field on chefs table
- Exit-link #45: "Book commissary time" using `{commissaryUrl}`
- Events linked to kitchen rentals via `eventId` FK

**Data source?** Partially. Commissary portals (if they exist) are booking systems. Many commissaries are informal (text the landlord). Not a clean API.

**Client-collaborative angle:** None. This is chef-to-landlord, no client involvement.

**Physical reality:** Phone/text for informal commissaries. Portal login for commercial shared kitchens. Calendar-based (need to see availability).

**Compounding:** High. Commissary relationship is long-term (years). Booking patterns, preferred time slots, landlord contact info, rate history, maintenance log all compound.

**Solution design:**

- `business_locations` entry (type: commissary) with landlord contact fields (name, phone, email)
- Kitchen rental calendar view showing booked vs available slots (chef's own bookings)
- Exit-link to commissary portal pre-filled or one-click from calendar
- Vendor coordination log for landlord communications (maintenance requests, schedule changes)
- Expense auto-categorization: kitchen rental costs tagged to commissary location

**Where it appears:**

- Business Ops > Locations (commissary entry with contact info)
- Calendar view (kitchen rental blocks visible alongside events)
- Exit-link on event detail when event is linked to a commissary rental
- Finance > Expenses (commissary category auto-tagged)

**What remains as permanent exit:**
Actual booking on landlord's system (if they use one), rent payments, maintenance requests. The communication itself is external (phone/email/portal).

**Priority:** Medium frequency (weekly for active meal prep chefs) x Low effort (tables exist, exit-link exists) = MEDIUM
**Spec needed?** No (kitchen_rentals + business_locations + exit-link already cover storage; enhance with landlord contact fields on business_locations)

---

## Scenario #68: Manage cleaning crew / dishwashers for large events

**Original classification:** Permanent exit (track trusted staff roster)
**Reclassified to:** Partially Reducible

**Why chef leaves:** Large events (20+ guests) need extra hands for cleanup. The chef texts/calls trusted dishwashers or uses staffing apps to book cleaning crew for a specific date. Coordination includes arrival time, rate, duration, and post-event payment.

**Context ChefFlow has:**

- Full staff management system: `lib/staff/` (18+ action files)
- `staff_members` table with roles including `dishwasher`
- `event_staff_assignments` table linking staff to events with `rate_override_cents`, `actual_hours`, `pay_amount_cents`
- Trusted staff roster (`lib/business-ops/staff-roster-actions.ts`) with `dishwasher` role, reliability rating, hourly/day rate, certifications
- Staff scheduling, availability grid, conflict checking (`checkAssignmentConflict`)
- Staff briefing generator (`lib/staff/briefing-actions.ts`)
- Tip splitting (`lib/staff/tip-actions.ts`)
- Labor cost tracking per event (`lib/staff/labor-dashboard-actions.ts`)
- Crew Circle auto-creation on staff assignment (`addStaffToCrewCircle`)

**Data source?** No. This is coordination with humans.

**Client-collaborative angle:** Low. Client rarely cares who washes dishes. But client's cleanup expectations (`cleanupExpectations` field on client profile) inform whether crew is needed.

**Physical reality:** Text message to confirm availability is the natural channel. On event day, crew needs arrival time and address (staff briefing covers this).

**Compounding:** High. The same 3-5 dishwashers/cleaners get called repeatedly. Reliability rating, rate history, availability patterns all compound. A chef who has worked with someone 20 times should never re-explain the workflow.

**Solution design:**

- Already largely built. Trusted roster > promote to staff > assign to event > briefing > labor tracking > tip split.
- Gap: no automated "availability check" (bulk text trusted dishwashers "Available Dec 15, 6-10pm, $25/hr?")
- Gap: no "suggest crew" based on event size + past assignments
- Add: Event size trigger ("20+ guests: consider adding cleaning crew") on event creation
- Add: Quick-assign from roster with one-tap "text to confirm" exit-link

**Where it appears:**

- Event detail > Staff tab (assign dishwashers/cleaners)
- Trusted staff roster (dishwasher filter)
- Staff briefing (auto-generated for crew)
- Event labor cost card
- Morning briefing (crew confirmed for today's event?)

**What remains as permanent exit:**
The actual text/call to confirm availability and negotiate ("Can you do Saturday 6-10?"). ChefFlow can pre-compose the message but the human confirmation loop is external.

**Priority:** High frequency (every large event) x Low effort (system 90% built) = HIGH (finish last 10%)
**Spec needed?** No (staff system is comprehensive; needs crew suggestion logic and availability-check exit-link)

---

## Scenario #69: Coordinate with delivery drivers (meal prep clients)

**Original classification:** Permanent exit (log delivery contacts per client)
**Reclassified to:** Bridgeable

**Why chef leaves:** Recurring meal prep clients need reliable delivery. The chef coordinates routes, timing, special instructions (leave at door, ring bell, fridge access) with drivers. This is a logistics relationship that repeats weekly.

**Context ChefFlow has:**

- Trusted staff roster with `driver` role (existing enum value)
- Client address, access instructions, gate code
- Event system (meal prep deliveries could be events)
- Staff assignment and scheduling system
- Communication pipeline for logging contacts
- No dedicated delivery route/logistics module

**Data source?** No. Coordination with human drivers. Delivery apps (DoorDash, Uber) are potential platforms but most private chefs use personal drivers or themselves.

**Client-collaborative angle:** Medium. Client provides delivery preferences (time window, access method, special instructions). Circle could collect: "Preferred delivery window?", "Leave at door or hand-deliver?", "Any access codes for delivery?"

**Physical reality:** Text is primary (quick "on my way" / "delivered" confirmations). Route optimization is a screen task but usually simple (3-5 stops). Driver needs address list with notes (printable).

**Compounding:** High. Same driver, same route, same clients weekly. Delivery preferences, access codes, timing windows are stable data that should never be re-communicated.

**Solution design:**

- Trusted roster entry for drivers (already supported via `driver` role)
- Per-client "delivery preferences" section (time window, access method, instructions)
- Delivery route view: date, clients in delivery order, addresses, notes (printable)
- Driver briefing: one-page with all stops, client names, access codes, special instructions
- Exit-link: text driver with today's route summary (pre-composed)

**Where it appears:**

- Client profile > Delivery Preferences section
- Meal prep calendar > Delivery day view
- Trusted staff roster (driver filter)
- Printable delivery route sheet
- Exit-link for "text driver" with route summary

**What remains as permanent exit:**
Real-time coordination on delivery day (traffic delays, client not home, access issue). Voice/text communication with the driver in the moment is inherently external.

**Priority:** Medium frequency (meal prep chefs only, but weekly when active) x Medium effort (needs delivery route module) = MEDIUM
**Spec needed?** Yes (meal-prep-delivery-route-system.md) if meal prep is a supported archetype

---

## Scenario #70: Talk to accountant/bookkeeper (non-tax)

**Original classification:** Permanent exit (export financial summaries on demand)
**Reclassified to:** Bridgeable

**Why chef leaves:** Monthly reconciliation, expense categorization questions, payroll clarification, cash flow planning. The chef needs to share financial data with their accountant and discuss it. The conversation itself is external but the data preparation is ChefFlow's job.

**Context ChefFlow has:**

- Full financial reporting: profit/loss (`lib/finance/profit-loss-report-actions.ts`), ledger entries, expense tracking
- CSV export for ledger transactions (`lib/finance/export-actions.ts`)
- Tax package generation (`lib/finance/tax-package.ts`) with gross revenue, expenses by category, quarterly estimates, mileage
- CPA export readiness (`lib/finance/cpa-export-actions.ts`)
- External contacts: `accountantEmail` stored on chef profile
- Exit-links #69 and #70: "Email tax package to accountant" and "Email accountant" with pre-filled mailto
- Staff labor costs, tip tracking, 1099 contractor management

**Data source?** No. This is a professional advisory relationship.

**Client-collaborative angle:** None. Chef-to-accountant only.

**Physical reality:** Email with attachments is the standard channel. Monthly summary PDF or CSV attached. Screen-based (reviewing numbers before sending).

**Compounding:** Medium. The accountant relationship is stable, but each month's data is unique. What compounds: accountant's preferred format, categorization conventions, timing expectations.

**Solution design:**

- Monthly financial snapshot: auto-generated summary (revenue, expenses, net, outstanding invoices) ready to email
- One-click "Send to accountant" with summary PDF + CSV attachments (pre-composed mailto already exists)
- Accountant preferences stored: preferred format (PDF/CSV/both), preferred schedule (1st of month), category mapping notes
- Pre-compose email body: "Hi [accountant name], attached is [month] summary. [revenue] revenue, [expenses] expenses, [net] net. [open items count] outstanding invoices."
- Track "last sent to accountant" date; nudge if overdue

**Where it appears:**

- Finance dashboard > "Send to Accountant" button
- Settings > External Contacts (accountant email, already built)
- Exit-link in finance section (pre-composed email with data)
- Monthly task reminder in morning briefing

**What remains as permanent exit:**
The actual conversation: discussing categorization questions, cash flow advice, payroll decisions. Professional advisory cannot be automated.

**Priority:** Medium frequency (monthly) x Low effort (exports + mailto exist, need packaging) = MEDIUM
**Spec needed?** No (enhance existing finance export with "accountant package" preset and reminder)

---

## Scenario #71: Deal with health inspector

**Original classification:** Permanent exit (store inspection records + dates)
**Reclassified to:** Bridgeable

**Why chef leaves:** Scheduled or surprise inspections require documentation: food safety logs, temperature records, cleaning schedules, certifications, employee health policies. Post-inspection, the chef may need to submit corrective actions via a government portal.

**Context ChefFlow has:**

- Compliance system: `lib/compliance/certification-actions.ts` with cert types including `health_permit`, `food_handler`, `servsafe`, `business_license`
- Certification tracking: type, issuer, cert number, issued/expires dates, status (active/expiring_soon/expired/pending_renewal)
- Required cert alerts (missing required certs flagged)
- Staff certifications: `has_food_handler_cert`, `has_servsafe` on trusted roster
- Exit-link #65: "Schedule health inspection" (Google search for county health department)
- HACCP/food safety could be logged per event
- Business locations with commissary type

**Data source?** Partially. Health department portals are government systems with inspection schedules. Not API-accessible. But inspection history, corrective actions, and documentation are internal records.

**Client-collaborative angle:** None. This is chef-to-government.

**Physical reality:** Inspector visits in person. Chef needs printed documentation on-hand: certifications, temperature logs, cleaning schedules, employee health attestations. Digital is backup; print is primary for the inspection itself.

**Compounding:** High. Inspection history, corrective action log, recurring compliance items, and documentation templates compound over years. A chef with 5 years of clean inspection records has proof of sustained compliance.

**Solution design:**

- Inspection log: date, inspector name, score/result, findings, corrective actions required, deadline, resolved date
- Print-ready "inspection binder": all certifications, staff food handler certs, temperature log, cleaning schedule (single PDF)
- Compliance calendar: next inspection due date, cert renewal dates, permit expiration alerts
- Corrective action tracker: finding, due date, evidence uploaded, resolved status
- Exit-link to government portal for scheduling or submitting documentation

**Where it appears:**

- Business Ops > Compliance (inspection history + cert dashboard)
- Calendar (inspection due dates, cert renewals)
- Print action: "Generate Inspection Binder" (one-click PDF)
- Morning briefing alert: "Health permit expires in 30 days"
- Exit-link for government portal (already exists as #65)

**What remains as permanent exit:**
The actual inspection (in-person), government portal submissions, scheduling via phone/portal. Government systems are not integratable.

**Priority:** Low frequency (1-2x per year) x Medium effort (compliance system exists, needs inspection log + print binder) = LOW-MEDIUM
**Spec needed?** No (extend existing compliance module with inspection log and printable binder)

---

## Batch Summary

| #   | Title                                                | Reclassified To                  | Spec Needed?                        |
| --- | ---------------------------------------------------- | -------------------------------- | ----------------------------------- |
| 65  | Coordinate with client's household staff             | Reducible + Client-Collaborative | Yes                                 |
| 66  | Hire/coordinate photographer for events              | Bridgeable                       | No                                  |
| 67  | Communicate with commissary kitchen landlord         | Bridgeable                       | No                                  |
| 68  | Manage cleaning crew / dishwashers for large events  | Partially Reducible              | No                                  |
| 69  | Coordinate with delivery drivers (meal prep clients) | Bridgeable                       | Yes (if meal prep archetype active) |
| 70  | Talk to accountant/bookkeeper (non-tax)              | Bridgeable                       | No                                  |
| 71  | Deal with health inspector                           | Bridgeable                       | No                                  |

---

## Key Findings

**Strongest existing coverage:** Scenario #68 (cleaning crew/dishwashers). The staff management system is 90% complete for this use case. Trusted roster, event assignment, briefings, labor tracking, tip splitting, crew circles all exist.

**Biggest gap:** Scenario #65 (household staff). ChefFlow has household_members table and client profile fields, but no way for household staff (nanny, PA, house manager) to participate in event coordination via Circles. This is the highest-value build because it eliminates an entire communication layer.

**Pattern:** 5 of 7 scenarios are Bridgeable (chef will always leave for the actual communication, but ChefFlow can prepare context out and capture intel back). The exit-link system already covers most of these. The wins are in packaging (accountant summary), print (inspection binder), and pre-composition (delivery route, staff availability check).

**All scenarios marked:** `NEEDS-DEVELOPER-REVIEW`
