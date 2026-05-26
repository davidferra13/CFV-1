# Staff / Schedule, Availability & Swaps Exit Eval

Mode: Solo. Every scenario is marked NEEDS-DEVELOPER-REVIEW.

Evidence basis: `docs/research/staff-exit-points-analysis.md`, `docs/research/staff-never-leaves-analysis.md`, `.claude/skills/exit-eval/SKILL.md`, `app/(staff)/staff-schedule/page.tsx`, `app/(staff)/staff-dashboard/page.tsx`, `lib/staff/staff-portal-actions.ts`, `app/(chef)/staff/schedule/page.tsx`, `components/staffing/StaffScheduler.tsx`, `components/staffing/staff-schedule-board.tsx`, `lib/staff/staffing-actions.ts`, `app/(chef)/staff/availability/page.tsx`, `components/staff/availability-grid.tsx`, `lib/staff/availability-actions.ts`, `lib/staff/staff-scheduling-actions.ts`, `database/migrations/20260331000038_staff_shift_scheduling.sql`, `database/migrations/20260401000045_staff_scheduling.sql`, `lib/notifications/triggers.ts`, `lib/discovery/registries/staff-rail-registry.ts`, and staff portal tests.

## Scenario #22: Compare ChefFlow schedule to personal calendar

**Original classification:** Reducible
**Reclassified to:** Partially Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff are deciding whether ChefFlow assignments collide with their real life: another catering gig, school pickup, commute window, recurring job, or personal appointment. The operational need is not "look at Google Calendar"; it is "can I safely commit to this shift and remember it in the calendar I actually live in?"
**Context ChefFlow has:**

- Staff-specific assignments from `lib/staff/staff-portal-actions.ts:getMyAssignments()`.
- Event date, serve time, departure time, assignment status, role override, scheduled hours, and actual hours displayed in `app/(staff)/staff-schedule/page.tsx`.
- A staff dashboard count/list of upcoming assignments from `app/(staff)/staff-dashboard/page.tsx`.
- Chef-side schedule board data, conflict checks, assignment status, and availability context from `lib/staff/staffing-actions.ts:getStaffSchedulerData()` and `scheduleStaffMemberWithConflictCheck()`.
- Existing public calendar export patterns in `app/(public)/e/[shareToken]/public-event-view.tsx` for Google Calendar and `.ics` download.

**Data source?** Yes, but personally controlled. ChefFlow is the source of assignment data; Google/Apple/Outlook is both the staff member's private conflict source and destination calendar. ChefFlow should publish calendar data and optionally read free/busy only with explicit staff consent.
**Client-collaborative angle:** Low. Clients do not know staff personal conflicts. The client-facing angle is only downstream confidence that the event is staffed.
**Physical reality:** This is a phone/lock-screen workflow. Staff need a one-tap add-to-calendar, a subscribed feed, and glanceable assignment cards, not a dense scheduling UI while they are working.
**Compounding:** Medium. A feed/subscription compounds because every future assignment appears automatically, but each personal conflict is still one-off and privacy-controlled.

**Solution design:**

- Add per-assignment "Add to calendar" actions on `/staff-schedule`, using event name, date, arrival/serve/departure times, location, and staff notes.
- Add a private staff iCal feed that publishes only that staff member's assignments, protected by revocable token and tenant/staff scoping.
- Add optional Google/Apple/Outlook free-busy connection for staff who want ChefFlow to flag conflicts before they text the chef.
- Show calendar-sync state and last export/sync status on `/staff-schedule` so staff know whether their outside calendar is current.
- Fix/audit the dashboard upcoming assignment read path so it consistently uses `event.event_date` rather than any stale `event.date` shape.

**Where it appears:**

- `/staff-schedule`
- `/staff-dashboard`
- Tokenized `/staff-portal/[id]` event briefing for one-off contractors
- Chef-side `/staff/schedule` as conflict intelligence, not staff-private calendar details

**What remains as permanent exit:**
Staff may still keep their personal calendar as the authoritative place for non-ChefFlow commitments. ChefFlow should not ingest private calendar details unless the staff member explicitly connects free/busy access.

**Priority:** High frequency x medium effort = P1
**Spec needed?** yes - schedule self-service/calendar sync bundle; no standalone spec created per handoff override

## Scenario #23: Request a shift change

**Original classification:** Reducible
**Reclassified to:** Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to tell the chef "I cannot work this exact assignment as scheduled" and propose a workable change before the chef relies on the old roster. The operational action is a structured exception request with reason, preferred replacement time, urgency, and acknowledgement trail.
**Context ChefFlow has:**

- Assignment identity, staff member, event id, status, role, scheduled hours, and notes in `event_staff_assignments`.
- Staff-facing read-only schedule rows in `app/(staff)/staff-schedule/page.tsx`.
- Chef-side assignment creation/removal and conflict checking in `lib/staff/actions.ts` and `lib/staff/staffing-actions.ts`.
- Chef-side event staffing route at `app/(chef)/events/[id]/staff/page.tsx`, including conflict summaries and the assignment panel.
- Notifications infrastructure has staff/task notification types, but `lib/notifications/triggers.ts:notifyScheduleChange()` currently notifies the chef so they can communicate to staff, not a staff-originated change request loop.

**Data source?** No. The external tool is a communication channel because the staff member is creating new state, not retrieving static data.
**Client-collaborative angle:** Low. The client generally should not participate in staff change mechanics. A calm client-facing readiness signal could update only after chef approval if staffing readiness changes.
**Physical reality:** Mobile-first quick action. Staff need a small form they can submit before a shift, with canned reasons and optional note. For urgent same-day changes, a call/text fallback still matters.
**Compounding:** Medium. Individual requests are one-off, but patterns across recurring availability, reliability, and late-change history become useful staffing intelligence.

**Solution design:**

- Add "Request change" on each upcoming assignment in `/staff-schedule`.
- Capture requested time/date change, reason, urgency, optional note, and whether the staff member can still work the original shift if denied.
- Route requests to chef-side `/events/[id]/staff` and `/staff/schedule` with approve, deny, and ask-for-more-info actions.
- Preserve a request history on the assignment so status is not lost in text messages.
- Notify the staff member when the request is approved/denied and update the assignment card in place.

**Where it appears:**

- `/staff-schedule`
- `/staff-dashboard` upcoming assignment card
- Chef-side `/events/[id]/staff`
- Chef-side `/staff/schedule`

**What remains as permanent exit:**
Last-minute emergencies may still require a phone call. ChefFlow's job is to keep the structured request and decision record after the human escalation.

**Priority:** High frequency x medium effort = P1
**Spec needed?** yes - schedule self-service/change request bundle; no standalone spec created per handoff override

## Scenario #24: Find someone to cover a shift

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff are trying to protect the event by finding a qualified replacement without forcing the chef to discover the gap too late. The operational need is coverage: who is available, qualified for the role, not already assigned, willing to take it, and approved by the chef.
**Context ChefFlow has:**

- Staff roster, roles, hourly rates, active status, and phones from `lib/staff/actions.ts:listStaffMembers()`.
- Existing event assignments and conflict checks through `event_staff_assignments`, `checkAssignmentConflict()`, and `eventsOverlapInTime()`.
- Chef-side availability grid and assignment UI in `/staff/availability` and `/staff/schedule`.
- `database/migrations/20260331000038_staff_shift_scheduling.sql` defines `shift_swap_requests` and `scheduled_shifts` statuses including `swap_requested` and `covered`, but current app search shows no wired staff-facing swap request flow using that table.
- `lib/discovery/registries/staff-rail-registry.ts` already models `staff.shift_coverage_request` and `staff.shift_swap_request` as staff rail concepts, but the operational route/action appears aspirational.

**Data source?** No. Availability data helps, but the external trip is negotiation and approval across people.
**Client-collaborative angle:** Low for the actual swap. A client-facing event readiness surface might only show "staffing confirmed" after the chef approves coverage.
**Physical reality:** Mobile-first and time-sensitive. A staff member may be in transit or mid-shift, so the request must be short, with large approve/claim/decline controls for candidates and a clear emergency-call fallback.
**Compounding:** High. Coverage history teaches reliability, role fit, who covers whom, and which shifts are hard to staff.

**Solution design:**

- Add a "Need cover" action on assigned upcoming shifts in `/staff-schedule`.
- Generate a chef-approved coverage request with role, time, event context, urgency, and eligible candidates from staff availability/conflict checks.
- Let eligible staff claim interest in-app; chef approves the final replacement before the original assignment changes.
- Use `shift_swap_requests` or a reconciled event-assignment equivalent as the durable request object, instead of leaving coverage in group chat.
- Capture outcomes: covered, denied, expired, emergency handled by chef, or no coverage found.

**Where it appears:**

- `/staff-schedule`
- Staff rail item for coverage/swap requests
- Chef-side `/staff/schedule`
- Chef-side `/events/[id]/staff`
- `/staff/availability` as candidate intelligence

**What remains as permanent exit:**
For same-day gaps, staff or chef may still call people directly. ChefFlow should turn that external chase into a logged coverage request with final approved assignment.

**Priority:** Medium-high frequency x high effort = P2
**Spec needed?** yes - coverage/swap workflow; no standalone spec created per handoff override

## Scenario #25: Tell chef weekly availability

**Original classification:** Reducible
**Reclassified to:** Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff are trying to prevent bad assignments before they happen by telling the chef when they can usually work. The operational need is standing availability plus exceptions, not another spreadsheet or weekly text thread.
**Context ChefFlow has:**

- A `staff_availability` table with date/range usage in `lib/staff/availability-actions.ts` and recurring/date-specific fields in `lib/staff/staff-scheduling-actions.ts`.
- Chef-side `/staff/availability` page and `components/staff/availability-grid.tsx`, where chefs can toggle availability for staff.
- A richer `components/staff/staff-availability-manager.tsx` that can edit recurring weekly availability and date overrides, but it is chef-oriented and calls `requireChef()` actions.
- Staff protected paths in `lib/auth/route-policy.ts` include `/staff-dashboard`, `/staff-recipes`, `/staff-schedule`, `/staff-station`, `/staff-tasks`, and `/staff-time`, but no staff-owned availability route.
- Chef-side schedule board uses availability as staffing context but no staff self-submission path is visible.

**Data source?** No. The staff member is the source of truth. ChefFlow already has the persistence model but needs the staff-facing intake and approval/update contract.
**Client-collaborative angle:** None directly. Clients do not know contractor availability. The downstream benefit is fewer staffing churn messages before client events.
**Physical reality:** This should be a quick mobile weekly grid with recurring defaults and date exceptions. It should not require a spreadsheet, desktop admin UI, or chef-side impersonation.
**Compounding:** High. Availability compounds across every future event and reduces bad assignments before they happen.

**Solution design:**

- Add staff-owned availability submission inside `/staff-schedule` or a new staff-protected availability tab.
- Support recurring weekly availability, date-specific exceptions, notes, effective date, and "available with constraints" windows.
- Decide developer-reviewed policy for whether staff edits are immediately active or submitted for chef review.
- Reuse `staff_availability` carefully, reconciling current `chef_id`/`tenant_id`, `date`/`specific_date`, and `is_available`/`available` variants before adding staff writes.
- Surface pending/last-updated availability to chefs in `/staff/availability` and `/staff/schedule`.

**Where it appears:**

- `/staff-schedule` availability tab or new staff-owned route
- `/staff-dashboard` quick status card
- Chef-side `/staff/availability`
- Chef-side `/staff/schedule`

**What remains as permanent exit:**
Negotiated edge cases may still require conversation, such as "I can do service but not prep." The baseline weekly availability and exceptions should not require text, email, or spreadsheets.

**Priority:** High frequency x medium effort = P1
**Spec needed?** yes - staff availability self-service; no standalone spec created per handoff override

## Scenario #26: Track personal reminders for arrival time

**Original classification:** Reducible
**Reclassified to:** Partially Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff are preventing a missed or late arrival. The operational question is "when do I need to leave, show up, and switch into event mode?" They leave because their phone reminders/calendar are more trusted than a web page they may not keep open.
**Context ChefFlow has:**

- Event date, serve time, arrival time, guest count, location, and access notes in tokenized staff event briefing via `lib/staff/staff-event-portal-actions.ts` and `components/staff/staff-event-view.tsx`.
- `/staff-schedule` displays event date, serve/departure time, role, scheduled hours, actual hours, and status.
- `/staff-dashboard` shows Today/Tomorrow task and upcoming assignment summaries.
- Task notifications to staff exist for assigned tasks through `lib/tasks/actions.ts` and `lib/notifications/triggers.ts:notifyTaskAssigned()`.
- Notification type config includes schedule and staff assignment categories, but the inspected schedule-change trigger notifies the chef, and no staff arrival-reminder preference or delivery flow was visible.

**Data source?** No. The external tool is a reminder/notification destination. ChefFlow owns the assignment timing; the phone OS/calendar owns lock-screen delivery.
**Client-collaborative angle:** Low. The client can provide access/parking data through event context, but not the staff member's reminder preference.
**Physical reality:** Lock-screen notification, calendar alert, SMS/push, or printed day sheet beats an in-app-only reminder. Staff may be driving, carrying gear, or in a low-signal prep space.
**Compounding:** Low-medium. Reminder preferences compound, but each arrival reminder is event-specific.

**Solution design:**

- Add per-staff reminder preferences: calendar event, push/email/SMS if configured, and lead times such as 24h, 2h, leave-by, or arrival-time.
- Generate assignment-specific reminders from event arrival/serve/departure times and location.
- Provide "Add reminder" and "Add to calendar" on `/staff-schedule` and token event briefings.
- Show reminder armed/delivered state on the assignment card so staff do not duplicate it manually.
- Keep offline-friendly arrival details in the event packet so reminder taps land on useful context.

**Where it appears:**

- `/staff-schedule`
- `/staff-dashboard`
- Tokenized `/staff-portal/[id]`
- Staff notification preferences or account settings

**What remains as permanent exit:**
The phone OS or personal calendar remains the final reminder surface. ChefFlow should create and audit the reminder, not replace lock-screen notifications.

**Priority:** Medium frequency x medium effort = P2
**Spec needed?** yes - can bundle with staff calendar/reminder sync; no standalone spec created per handoff override

## Scenario #27: Ask whether assignment was confirmed

**Original classification:** Reducible
**Reclassified to:** Reducible - NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need confidence that the chef still expects them and that the assignment is final enough to block time, travel, or decline other work. The operational need is acknowledgement and commitment state, not a text that says "am I still on?"
**Context ChefFlow has:**

- `event_staff_assignments.status` supports `scheduled`, `confirmed`, `completed`, and `no_show`.
- `app/(staff)/staff-schedule/page.tsx` already renders status badges for staff.
- `app/(staff)/staff-dashboard/page.tsx` renders upcoming assignment status badges.
- `lib/staff/actions.ts:assignStaffToEvent()` creates assignments as `scheduled`, and `recordStaffHours()` moves them to `completed`; no inspected staff-side "confirm assignment" action exists.
- Chef-side event staffing route can display assignments and conflict warnings, but staff confirmation is not exposed as a staff-owned action.
- Staff never-leaves analysis confirms staff can see assignment status in-app, but the exit analysis correctly notes that confirmation action is not exposed from staff schedule.

**Data source?** No. ChefFlow already owns the status field. The missing piece is a trusted action and notification loop.
**Client-collaborative angle:** Low. Client should not confirm staff. A client-facing readiness signal may benefit after staff confirmation is complete, but not during the staff/chef handshake.
**Physical reality:** One-tap mobile confirmation. Staff need to acknowledge with a large obvious action, maybe with "I have a question" beside it for exceptions.
**Compounding:** Medium. Confirmation history becomes reliability intelligence and reduces repeated "still on?" texts across events.

**Solution design:**

- Add "Confirm assignment" on each scheduled upcoming assignment in `/staff-schedule` and relevant dashboard cards.
- Add server action that verifies `requireStaff()`, tenant scope, assignment ownership, and allowed status transition from `scheduled` to `confirmed`.
- Notify the chef when a staff member confirms or declines/flags a conflict.
- Show confirmation timestamp and current status to both staff and chef.
- Add a clear "Question / cannot confirm" branch that creates a structured change request instead of forcing text.

**Where it appears:**

- `/staff-schedule`
- `/staff-dashboard`
- Chef-side `/events/[id]/staff`
- Chef-side `/staff/schedule`
- Staff rail schedule alerts

**What remains as permanent exit:**
If the assignment details are wrong or ambiguous, staff may still need a voice call. The normal "am I confirmed?" check should disappear.

**Priority:** High frequency x low-medium effort = P0
**Spec needed?** yes - assignment confirmation/change request bundle; no standalone spec created per handoff override

## Batch Summary

| #   | Title                                          | Reclassified To                              | Spec Needed? |
| --- | ---------------------------------------------- | -------------------------------------------- | ------------ |
| 22  | Compare ChefFlow schedule to personal calendar | Partially Reducible - NEEDS-DEVELOPER-REVIEW | yes          |
| 23  | Request a shift change                         | Reducible - NEEDS-DEVELOPER-REVIEW           | yes          |
| 24  | Find someone to cover a shift                  | Partially Reducible - NEEDS-DEVELOPER-REVIEW | yes          |
| 25  | Tell chef weekly availability                  | Reducible - NEEDS-DEVELOPER-REVIEW           | yes          |
| 26  | Track personal reminders for arrival time      | Partially Reducible - NEEDS-DEVELOPER-REVIEW | yes          |
| 27  | Ask whether assignment was confirmed           | Reducible - NEEDS-DEVELOPER-REVIEW           | yes          |
