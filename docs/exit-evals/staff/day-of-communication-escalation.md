# Staff Exit Eval: Day-of Communication & Escalation

> Wave 7 | Prompt 68 | Mode: Solo batch | Status: `NEEDS-DEVELOPER-REVIEW`
>
> Per `.planning/exit-eval-swarm-handoff.md` override: roadmap, runner, and standalone spec files were not updated. Spec needs are noted here only.

## Scenario #1: Call the chef from an event briefing

**Original classification:** Permanent
**Reclassified to:** Bridgeable | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** The staff member needs urgent voice confirmation while already executing the event: timing changed, a task is blocked, a guest or access issue appears, or the written briefing does not cover the exact situation. The operational need is fast judgment from the chef, not just access to a phone number.
**Context ChefFlow has:**

- Token briefing context: event occasion, date, serve time, arrival time, guest count, service style, role, station, task checklist, and shift hours.
- Event risk context: allergies, dietary restrictions, special requests, kitchen notes, site notes, access instructions, and location notes.
- Chef contact context: chef business name and phone number are loaded into the staff event view.
- Assignment context: role override, scheduled hours, assignment notes, and token-scoped assigned tasks.

**Data source?** No. The phone app is a live communication channel, not a data source.
**Client-collaborative angle:** Dinner Circle and client/household memory can remove many reasons for the call before the event: access instructions, parking, arrival rules, host preferences, dietary updates, and house-specific kitchen quirks.
**Physical reality:** Voice is correct for true urgency. Staff may be carrying trays, cooking, driving, or in a loud kitchen. ChefFlow should keep the call path large and obvious, then provide a one-tap post-call capture after the conversation.
**Compounding:** Medium. Individual calls are ephemeral, but call reasons compound into better event briefings, venue profiles, staff-safe instructions, and pre-service checklists.

**Solution design:**

- Keep the existing `tel:` call action in the token briefing.
- Add an optional post-call note prompt tied to event, staff member, assignment, and reason category.
- Let staff mark whether the call changed a task, access note, safety note, or timeline.
- Surface captured call outcomes in the chef event timeline and future staff briefings when staff-safe.

**Where it appears:**

- Token event briefing: `components/staff/staff-event-view.tsx`
- Staff token data/action layer: `lib/staff/staff-event-portal-actions.ts`
- Chef event timeline or staff panel as the return-path capture surface

**What remains as permanent exit:**
The actual voice call remains external. ChefFlow should not try to replace urgent human judgment.

**Priority:** High frequency x Low-to-medium effort = P1 bridge
**Spec needed?** No standalone spec; fold into staff communication bridge work.

## Scenario #2: Text the chef about a blocked task

**Original classification:** Reducible
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** The staff member cannot continue a task and needs the chef to unblock a decision: missing ingredient, unclear order, wrong station state, setup conflict, unavailable equipment, or timing conflict. Texting is used because the task card has status transitions but no blocked reason, comment, or chef notification path.
**Context ChefFlow has:**

- Staff task context: title, description, event, guest count, due date, due time, priority, status, notes, station, assigned staff member, and tenant.
- Staff can move tasks among To Do, In Progress, and Done.
- Staff actions are scoped by `requireStaff()`, `chef_id`, and assigned staff member.
- Event briefing token tasks can be completed, but not annotated with a blocker.

**Data source?** No. SMS/iMessage/WhatsApp are communication channels.
**Client-collaborative angle:** Some blockers originate from client-controlled facts: access, parking, late guest count changes, dietary surprises, house rules, or appliance availability. Circle intake can answer those before staff hits the blocked state.
**Physical reality:** Staff need a fast, mobile-first blocker control, not a long form. Large buttons, canned reasons, optional voice/photo note, and a clear "chef notified" state matter more than chat depth during service.
**Compounding:** High. Blocker reasons compound into better checklists, station prep, future venue instructions, and staffing playbooks.

**Solution design:**

- Add a task-level "Blocked" or "Need chef" action with reason chips and optional note.
- Notify the chef in the event/day-of surface and preserve the blocker on the task timeline.
- Let the chef resolve, clarify, or convert the blocker into a new task.
- Include fallback "call chef" for urgent blockers without losing the structured blocker record.

**Where it appears:**

- `/staff-tasks` and `components/staff/staff-task-status-board.tsx`
- Token event briefing task checklist in `components/staff/staff-event-view.tsx`
- Chef event ops/staff panel and task board return path

**What remains as permanent exit:**
Urgent or nuanced issues may still become phone calls, but routine blocked-task texts should disappear.

**Priority:** Very high frequency x Medium effort = P0/P1 reducible gap
**Spec needed?** Yes, as an event-scoped staff issue/blocker thread.

## Scenario #3: Send a photo of a station issue

**Original classification:** Reducible
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Text alone is insufficient. The staff member needs to show the chef a station problem: poor plating, wrong prep state, damaged smallware, contamination, low quantity, failed setup, or questionable quality. They leave to camera roll, SMS, or WhatsApp because station clipboard notes have no attachment path.
**Context ChefFlow has:**

- Staff station context: selected station, clipboard date, station components, menu item context, par level, on-hand quantity, need-to-make, made quantity, waste quantity, waste reason, 86'd state, and notes.
- Staff can check in/out of a station shift and add handoff notes.
- Clipboard updates are staff-authenticated and tenant-scoped.
- Waste reasons already include contamination, quality issue, dropped, expired, over-production, and other.

**Data source?** No. The camera is an evidence-capture tool, not a source ChefFlow can query.
**Client-collaborative angle:** Usually none for station execution. Indirectly, client dietary/access context can explain why an issue is urgent, but the station photo is staff/chef operational evidence.
**Physical reality:** Photo capture must be one-handed and fast, with upload resilience for low-signal kitchens. Staff should not be asked to write a long report before taking the picture.
**Compounding:** High. Station issue photos become evidence for training, prep planning, quality control, equipment replacement, and future staffing.

**Solution design:**

- Add photo attachments to station clipboard entries and shift handoff notes.
- Attach photos to a structured issue category: quality, contamination, equipment, missing item, plating, other.
- Show thumbnails to the chef in event ops/station view with timestamp, staff member, station, and component.
- Preserve photos in post-event learning only when chef approves them for longer-term memory.

**Where it appears:**

- `/staff-station`
- `components/staff/staff-clipboard-view.tsx`
- `lib/staff/staff-portal-actions.ts`
- Chef station/event ops issue review surface

**What remains as permanent exit:**
Native camera capture may still be the device-level interface, but sending the photo through external messaging should disappear.

**Priority:** High frequency x Medium effort = P1
**Spec needed?** Yes, as staff station evidence attachments.

## Scenario #4: Ask another staffer for help

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** A staff member needs nearby help, coverage, or handoff from another crew member: "can you run this tray," "cover bar for five minutes," "help me reset station," or "who owns this task?" Today the product shows some collaborator information, but not an in-app staff-to-staff crew coordination path.
**Context ChefFlow has:**

- Staff identity, role, active status, assigned tasks, assigned stations, and event assignments.
- Token briefings expose event details and a collaborator list, but the implementation currently reads `event_collaborators` chefs rather than a full staff crew thread.
- Staff activity can be derived from task completion, clipboard edits, and check-ins.
- Station shift check-in/check-out exists with handoff notes.

**Data source?** No. This is human coordination.
**Client-collaborative angle:** Minimal. The client may know household staff or house rules, but staff-to-staff help is internal crew execution.
**Physical reality:** In-person calling across the room will remain common. The app should support quick mention/handoff for non-immediate help and preserve accountability when a handoff affects work.
**Compounding:** Medium. Patterns of repeated help requests identify bad station design, understaffed windows, training gaps, or recurring physical bottlenecks.

**Solution design:**

- Add an event crew view that shows staff assigned to the same event, roles, station, and current check-in/task state.
- Add lightweight "ask for help" or mention-based handoff tied to a task/station.
- Let staff accept/decline a handoff and preserve the result in the event timeline.
- Keep direct in-person/phone escalation available for urgent physical moments.

**Where it appears:**

- Token event briefing crew section
- `/staff-station` shift handoff area
- `/staff-tasks` task card handoff action
- Chef event staff panel

**What remains as permanent exit:**
Immediate physical help often happens verbally or in person. ChefFlow can reduce context loss, not replace every shout across the kitchen.

**Priority:** Medium frequency x Medium effort = P2
**Spec needed?** Yes, likely merged with staff issue/blocker thread and event crew presence.

## Scenario #5: Escalate a safety incident

**Original classification:** Permanent
**Reclassified to:** Permanent | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** A safety incident requires immediate human escalation: allergic reaction, injury, contamination, fire, equipment failure, property damage, or near miss. The operational need is protecting people first, then documenting what happened.
**Context ChefFlow has:**

- Token briefing dietary alerts appear first and distinguish allergies from dietary restrictions.
- Chef-side incident documentation exists for incident date/time, type, description, parties involved, immediate action, follow-ups, resolution, and documents.
- API v2 safety incident routes exist for authenticated safety read/write scopes.
- Staff portal currently has no staff-facing incident report or emergency escalation surface.

**Data source?** No. Emergency services, chef calls, first aid, and in-person response are physical/human boundaries.
**Client-collaborative angle:** Guests or clients may know allergy details, medication, emergency contact, or what happened. Dinner Circle/guest profile can collect some health/dietary context before the incident, but cannot replace emergency response.
**Physical reality:** The interface must not slow down response. It should expose emergency contacts and chef call first, then support after-action logging when the immediate danger is controlled.
**Compounding:** High for prevention, low for the individual emergency. Incident records compound into better safety training, allergen handling, equipment checks, and insurance/legal documentation.

**Solution design:**

- Add a staff-visible emergency/safety card in event briefing and `/staff-station`.
- Keep call/emergency instructions first; do not force form completion during the incident.
- Add a post-incident staff report with type, immediate action, parties involved, optional photo, and chef notification.
- Route staff reports into the existing chef incident log for review and completion.

**Where it appears:**

- Token event briefing dietary/safety area
- `/staff-station` and `/staff-dashboard` day-of rail
- Chef compliance incidents: `app/(chef)/settings/compliance/incidents`
- Safety actions/API: `lib/safety/incident-actions.ts`, `app/api/v2/safety/incidents/route.ts`

**What remains as permanent exit:**
Emergency calls, first aid, in-person intervention, and legal/medical escalation remain outside ChefFlow.

**Priority:** Low-to-medium frequency x High severity x Medium effort = P0 safety bridge
**Spec needed?** Yes, as staff safety escalation and incident-intake bridge.

## Scenario #6: Resolve an access or building issue

**Original classification:** Permanent
**Reclassified to:** Bridgeable | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff are at the door, loading dock, concierge desk, garage, elevator, or service entrance and cannot get in or unload. They need a gate code, building contact, host confirmation, parking/loading instruction, or human approval from security/concierge.
**Context ChefFlow has:**

- Staff token briefing already shows event address, location notes, access instructions, kitchen notes, and site notes.
- Client/address surfaces can store access instructions, parking, and kitchen notes.
- Dinner Circle arrival guide supports host-authored address, parking, building access, arrival timing, accessibility, dropoff, house rules, visibility, and chef-relevant flags.
- Staff event view already links out to Google Maps for the event address.

**Data source?** Partially. The client/host is often the source of truth for codes and building rules; the building/concierge is a human-controlled external system.
**Client-collaborative angle:** Strong. Dinner Circle should collect and maintain host-authored access instructions before day-of: gate codes, service elevator, parking, loading, concierge name, pets, stairs, and host backup contact.
**Physical reality:** This happens while carrying equipment or food, often outside or in a loading zone. The staff view needs large, offline-friendly instructions and a single "access problem" escalation.
**Compounding:** High. Venue/client access memory compounds across repeat events and eliminates future arrival texts.

**Solution design:**

- Add an "Access problem" action to staff briefing that packages event, address, arrival time, and current access notes for chef/host escalation.
- Add staff feedback after resolution: wrong code, no parking, locked entrance, concierge issue, elevator/loading problem.
- Feed resolved access facts back into client/venue memory after chef review.
- Make access notes printable/downloadable for low-signal arrival.

**Where it appears:**

- Token event briefing location card
- Dinner Circle arrival guide
- Client household/access memory
- Chef event briefing and event staff panel

**What remains as permanent exit:**
Actual building entry, concierge/security decisions, locked doors, and phone calls to on-site humans remain external.

**Priority:** Medium-to-high frequency x Medium effort = P1
**Spec needed?** Yes, as access-problem bridge and host/client access memory loop.

## Scenario #7: Ask for clarification on chef notes

**Original classification:** Reducible
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff can read assignment notes, kitchen notes, site notes, task descriptions, and station notes, but they cannot ask a structured question tied to the exact note. They leave to phone/text because the ambiguity has no in-app reply path.
**Context ChefFlow has:**

- Assignment notes are loaded into the token briefing as "Chef Notes for You."
- Staff task cards show descriptions and notes.
- Station clipboard entries expose component notes and editable staff notes.
- Event briefing includes special requests, kitchen notes, site notes, location notes, dietary alerts, and access instructions.

**Data source?** No. Clarification is human communication about ChefFlow-owned instructions.
**Client-collaborative angle:** Sometimes. If the ambiguous note concerns house rules, access, guest preference, allergies, seating, or timing, Dinner Circle or client/guest portal can collect a clearer answer before staff asks.
**Physical reality:** Clarification should be short and contextual: quote the note, ask the question, optionally voice-dictate, and notify the chef. Staff should not have to rebuild context in a message.
**Compounding:** High. Repeated clarifications expose ambiguous chef note patterns and should improve future templates, staff-safe briefing language, and pre-service checklists.

**Solution design:**

- Add "Ask about this" on chef notes, task notes, and station notes.
- Pre-attach source note, event, staff member, station/task, and timestamp.
- Let the chef answer once and optionally convert the answer into a staff-safe briefing update.
- Track unresolved questions in the staff and chef day-of surfaces.

**Where it appears:**

- Token event briefing notes sections
- `/staff-tasks` task cards
- `/staff-station` notes cells and shift handoff
- Chef event/staff panel

**What remains as permanent exit:**
Urgent or nuanced clarification may still become a call, but ordinary "what does this mean?" texts should disappear.

**Priority:** High frequency x Low-to-medium effort = P0/P1
**Spec needed?** Yes, merge with staff issue/question thread.

## Scenario #8: Report being late or unavailable

**Original classification:** Reducible
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff know they are running late, sick, delayed by transit, or unavailable, but the staff schedule is read-only and availability is chef-managed. They leave to text/call because there is no staff-side lateness, absence, or replacement request flow.
**Context ChefFlow has:**

- Staff schedule shows upcoming and past assignments, event date, serve/departure times, role, scheduled hours, actual hours, and assignment status.
- Staff availability records and grids exist, but actions are chef-gated with `requireChef()`.
- Staff time and station check-in/check-out exist, so ChefFlow can distinguish "has not checked in yet" from "checked in and active."
- Chef-side staffing/scheduling actions already know assignments, availability, status, and event context.

**Data source?** No. This is staff self-reporting, with optional external calendar/transit context.
**Client-collaborative angle:** Mostly none. Client only matters if lateness affects arrival/service expectations; the chef should decide what client-facing version is shared.
**Physical reality:** The flow must be faster than a text: "Running late," ETA, reason, can still work yes/no, replacement needed yes/no. Voice/call remains fallback when service is at risk.
**Compounding:** High. Late/unavailable patterns inform reliability scoring, scheduling, backup staffing, and realistic call times.

**Solution design:**

- Add "Report late/unavailable" from schedule, token briefing, and staff dashboard.
- Capture ETA, reason, whether staff can still work, whether coverage is needed, and optional note.
- Notify the chef immediately and update assignment status/history.
- If coverage is needed, trigger chef-approved cover request or backup staff suggestion.

**Where it appears:**

- `/staff-schedule`
- `/staff-dashboard`
- Token event briefing
- Chef staff schedule/live staffing views

**What remains as permanent exit:**
True emergencies, no-show recovery, and urgent phone calls still require external human escalation.

**Priority:** High frequency x Medium effort = P1
**Spec needed?** Yes, as staff availability/lateness/change request workflow.

## Batch Summary

| #   | Title                                | Reclassified To     | Spec Needed? |
| --- | ------------------------------------ | ------------------- | ------------ |
| 1   | Call the chef from an event briefing | Bridgeable          | No           |
| 2   | Text the chef about a blocked task   | Reducible           | Yes          |
| 3   | Send a photo of a station issue      | Reducible           | Yes          |
| 4   | Ask another staffer for help         | Partially Reducible | Yes          |
| 5   | Escalate a safety incident           | Permanent           | Yes          |
| 6   | Resolve an access or building issue  | Bridgeable          | Yes          |
| 7   | Ask for clarification on chef notes  | Reducible           | Yes          |
| 8   | Report being late or unavailable     | Reducible           | Yes          |

All scenarios are marked `NEEDS-DEVELOPER-REVIEW` because this evaluation was run in solo mode without developer/chef operational input.

Standalone specs that appear warranted, but were not created per handoff override:

- Staff issue/blocker/question thread covering scenarios #2, #4, and #7.
- Staff station evidence attachments covering scenario #3.
- Staff safety escalation and incident-intake bridge covering scenario #5.
- Access-problem bridge and host/client access memory loop covering scenario #6.
- Staff lateness/unavailability/change request workflow covering scenario #8.

## Evidence Sources

- `docs/exit-evals/prompts/68-staff-day-of-communication-escalation.md`
- `.claude/skills/exit-eval/SKILL.md`
- `docs/research/staff-exit-points-analysis.md`
- `docs/research/staff-never-leaves-analysis.md`
- `components/staff/staff-event-view.tsx`
- `lib/staff/staff-event-portal-actions.ts`
- `app/(public)/staff-portal/[id]/page.tsx`
- `app/(staff)/layout.tsx`
- `app/(staff)/staff-tasks/page.tsx`
- `components/staff/staff-task-status-board.tsx`
- `app/(staff)/staff-station/page.tsx`
- `components/staff/staff-clipboard-view.tsx`
- `components/staff/staff-shift-controls.tsx`
- `app/(staff)/staff-schedule/page.tsx`
- `lib/staff/staff-portal-actions.ts`
- `lib/staff/availability-actions.ts`
- `app/(chef)/staff/availability/page.tsx`
- `lib/safety/incident-actions.ts`
- `app/api/v2/safety/incidents/route.ts`
- `app/(chef)/settings/compliance/incidents/page.tsx`
- `components/safety/incident-form.tsx`
- `components/dinner-circles/arrival-guide.tsx`
- `components/clients/address-manager.tsx`
- `components/clients/client-household-panel.tsx`
