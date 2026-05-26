# Staff Exit Eval: Offline, Low-Signal & Device Boundaries

> Wave 7 | Prompt 76 | Mode: Solo batch | Status: `NEEDS-DEVELOPER-REVIEW`
>
> Per `.planning/exit-eval-swarm-handoff.md` override: roadmap, runner, and standalone spec files were not updated. Spec needs are noted here only.

## Scenario #50: Work in a kitchen with bad signal

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** The staff member needs operational continuity when the event kitchen, basement prep area, venue back hall, or service floor cannot reliably load ChefFlow. They are not leaving because they prefer paper; they are protecting the ability to see arrival details, allergies, tasks, station instructions, chef notes, and time logging while the web app may be unreachable.
**Context ChefFlow has:**

- Token briefing context from `/staff-portal/[id]`: event occasion, date, serve time, arrival time, guest count, service style, location, access instructions, kitchen notes, site notes, special requests, staff role, assigned station, tasks, scheduled hours, chef phone, and collaborators.
- Authenticated staff portal context from `app/(staff)`: dashboard, tasks, time, station, recipes, and schedule.
- Station execution context: station components, par, on-hand count, need-to-make, made quantity, waste fields, 86'd state, shift check-in, shift check-out, and handoff notes.
- Error and resilience primitives exist elsewhere: `components/offline/offline-provider.tsx`, `components/offline/offline-status-bar.tsx`, `lib/offline/*`, and `lib/pwa/offline-storage.ts`, but search evidence shows those are wired mainly to chef/admin surfaces, not the staff layout or token staff portal.
- Chef-side staff briefing already has copy and print affordances through `components/events/staff-briefing-panel.tsx`, but the staff token view itself does not expose a staff-owned cached or downloadable packet.

**Data source?** No. Paper, screenshots, and notes are continuity media, not external data sources. The missing source is ChefFlow's own last-known briefing and task state.
**Client-collaborative angle:** Dinner Circle and event setup can collect client-controlled low-signal facts before service: venue Wi-Fi name/password, cell dead zones, house access, kitchen location, parking/loading notes, concierge contact, and whether the team should bring printed packets.
**Physical reality:** Print and cached mobile view should be first-class. In a hot kitchen, staff need a one-page packet and a phone view that works after signal drops. Screens should be large, glanceable, and safe to use under stress; paper remains the fallback for true outage or dead battery.
**Compounding:** High. Venue signal reliability, Wi-Fi notes, print-needed flags, and kitchen dead-zone history compound across repeat venues and clients.

**Solution design:**

- Add a "Save offline packet" path for staff event briefings that stores the last loaded briefing, dietary alerts, tasks, access notes, and chef contact locally with a visible stale timestamp.
- Add chef-side and staff-side printable event packets that match the token briefing, not a separate manual document.
- Add a venue signal/readiness note to event setup and Dinner Circle collection so repeat venues can be flagged before staff arrive.
- Queue staff task/checklist updates made while offline and reconcile them when signal returns, with clear "pending sync" state.
- Show an offline status indicator inside the staff shell and token portal, not only in chef/admin surfaces.

**Where it appears:**

- `/staff-portal/[id]` and `components/staff/staff-event-view.tsx`
- `app/(staff)/layout.tsx`, `/staff-dashboard`, `/staff-tasks`, `/staff-station`, and `/staff-time`
- `components/events/staff-briefing-panel.tsx` as the existing print/copy precedent
- `components/offline/*`, `lib/offline/*`, and `lib/pwa/offline-storage.ts` as reusable resilience infrastructure

**What remains as permanent exit:**
Dead batteries, physically lost devices, venue Wi-Fi ownership, and true emergency backup paper remain outside the app. ChefFlow can make the planned packet and sync loop reliable, but it cannot remove the physical signal constraint.

**Priority:** High frequency x Medium-to-high effort = P1 staff resilience gap
**Spec needed?** Yes, as a staff offline event packet and queued execution spec.

## Scenario #51: Keep a copy of briefing on phone

**Original classification:** Bridgeable
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff take screenshots, copy text, save a note, or ask for a PDF because they do not trust that the token link will load at service time. The operational need is a guaranteed personal copy of the briefing, not an external app preference.
**Context ChefFlow has:**

- The token briefing has the exact staff-safe event payload needed for a phone copy: date, timing, guest count, location, access notes, kitchen/site notes, special requests, dietary alerts, tasks, scheduled hours, role, station, chef contact, and collaborators.
- Chef-side `StaffBriefingPanel` can generate a one-page briefing, copy it as text, and call `window.print()`.
- `generateStaffBriefingTemplate` creates a deterministic staff briefing document from ChefFlow data, including service protocol, menu, allergen alerts, timings, dress code, and cleanup.
- Public staff token metadata is `robots: { index: false, follow: false, nocache: true }`, so the route is intentionally not a durable browser cache.
- The token portal currently shows the live briefing but does not expose "download", "save to phone", "print", or "last saved" controls for staff.

**Data source?** No. Screenshots, PDFs, and notes are user-created copies of ChefFlow data. ChefFlow should generate the copy itself.
**Client-collaborative angle:** Clients can improve the quality of the saved briefing by confirming access, household rules, guest count, dietary updates, and kitchen constraints through Dinner Circle before the packet is generated.
**Physical reality:** A phone copy is natural for arrival and service, but it needs a printable counterpart for kitchens where phones stay in pockets. The staff copy should be readable offline, show safety alerts first, and avoid requiring pinch-zoom.
**Compounding:** Medium. Each saved packet is event-specific, but the packet format, client/venue collection, and staff trust compound over time.

**Solution design:**

- Add "Save to phone" on the token briefing that creates a local offline copy with event name, generated time, and stale warning.
- Add a staff-safe downloadable/printable packet using the same structured data as the token briefing.
- Add a chef-visible "packet generated/saved" status so the chef knows whether staff opened and preserved the briefing before service.
- Keep the live token link as the source of truth, but make the saved packet explicitly read-only and refreshable when signal exists.

**Where it appears:**

- `/staff-portal/[id]`
- `components/staff/staff-event-view.tsx`
- `lib/staff/staff-event-portal-actions.ts`
- `components/events/staff-briefing-panel.tsx`
- `lib/templates/staff-briefing.ts`

**What remains as permanent exit:**
The operating system may still store a PDF or cached file in Files/Downloads/Photos. That is acceptable as long as ChefFlow generates and labels the packet instead of forcing staff to screenshot the app.

**Priority:** High frequency x Medium effort = P1 reducible trust gap
**Spec needed?** Yes, fold into the staff offline packet spec.

## Scenario #52: Use shared kiosk or kitchen device

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff use a kitchen tablet, POS/kiosk, printed clipboard, or another person's phone because the normal staff portal assumes an individual authenticated session or a personal token link. The operational need is shared-device execution with attribution, privacy, idle reset, and fast switching between staff members.
**Context ChefFlow has:**

- Authenticated staff routes are individual and guarded by `requireStaff()` in the staff layout and staff server actions.
- Tokenized staff event briefings work without full login, but they are link-based per staff/event and do not provide shared-device staff switching.
- ChefFlow already has kiosk infrastructure: `/kiosk`, device tokens in `lib/devices/token.ts`, staff PIN entry in `components/kiosk/staff-pin-entry.tsx`, PIN verification in `app/api/kiosk/verify-pin/route.ts`, session creation, failed-PIN rate limiting, heartbeat, idle reset, and manual staff switching.
- Existing kiosk flows appear oriented around inquiry/order register work, not staff task, station, time, or event briefing execution.
- Staff PINs are tenant-scoped and active-staff scoped through `validateStaffPin`, which is a strong foundation for staff attribution on shared devices.

**Data source?** No. The external device is an interaction mode and identity boundary, not a data source.
**Client-collaborative angle:** Mostly none. Clients may provide the physical venue device or Wi-Fi, but staff identity, task attribution, and privacy are chef/staff operations.
**Physical reality:** A shared kitchen device needs large buttons, quick PIN unlock, clear current-staff identity, automatic lock on idle/tab hidden, no exposure of chef-private data, and a workflow that tolerates gloves, water, heat, and shoulder-surfing.
**Compounding:** Medium. Once a trusted kitchen-device model exists, the same PIN/session/idle policy can support many events and recurring prep sites.

**Solution design:**

- Add a staff-kiosk mode that uses existing device token and staff PIN sessions to access staff-safe event briefing, station clipboard, tasks, and clock controls.
- Make every mutation carry staff member, device, event/station, and session attribution.
- Add immediate "switch staff" and idle lock controls, preserving the existing kiosk idle reset and heartbeat behavior.
- Limit shared-device surfaces to event-safe execution data and avoid exposing full staff schedule, pay, or personal account settings.
- Provide printable clipboard fallback for stations where even a kiosk device is impractical.

**Where it appears:**

- `/kiosk` and `components/kiosk/staff-pin-entry.tsx`
- `app/api/kiosk/verify-pin/route.ts`
- `lib/devices/token.ts`
- `components/kiosk/idle-reset-provider.tsx`
- `components/kiosk/heartbeat-provider.tsx`
- Future staff-kiosk routes for `/staff-portal/[id]`, `/staff-station`, `/staff-tasks`, and `/staff-time` equivalents

**What remains as permanent exit:**
Physical shared hardware, device management, charging, MDM/browser lockdown, and venue-owned equipment remain outside ChefFlow. ChefFlow can own identity, workflow, and attribution once the device is available.

**Priority:** Medium frequency x High effort = P2/P3 shared-device bridge
**Spec needed?** Yes, as a staff kiosk execution mode spec.

## Scenario #53: Enter data while hands are dirty

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff switch to voice dictation, paper marks, a coworker, or memory because touch input is wrong in the moment. They may need to mark a task done, log waste, update on-hand count, clock in/out, check out a station, or leave a handoff note while handling food, gloves, oil, heat, water, or service items.
**Context ChefFlow has:**

- Token briefing tasks can be toggled and hours can be submitted from `components/staff/staff-event-view.tsx`.
- `/staff-tasks` supports status moves with optimistic UI and rollback through `components/staff/staff-task-status-board.tsx`.
- `/staff-station` exposes station clipboard fields for on-hand, waste quantity, waste reason, notes, and shift check-in/check-out.
- `StaffClipboardView` currently uses table rows, small number inputs, select fields, and text inputs, which are precise but not hands-dirty friendly.
- `TimeTracker` uses selects and buttons for clocking in/out; it does not have offline queueing or voice capture.
- Reusable draft/offline primitives exist in `lib/offline/use-offline-form.ts`, `lib/offline/offline-action.ts`, and `lib/offline/use-idempotent-mutation.ts`, but staff station/task/time components do not appear to use them.

**Data source?** No. Voice, paper, and coworker entry are input methods, not external sources. ChefFlow should support the capture method or provide a deliberate cleanup queue.
**Client-collaborative angle:** Usually none at the capture moment. Client and Dinner Circle data can reduce some mid-service ambiguity, but dirty-hands entry is staff execution reality.
**Physical reality:** This is a prime physical-world constraint. Large tap targets, one-tap status chips, voice notes, "mark now, clean up later", glove-safe controls, and printed station sheets matter more than dense forms. Loud kitchens mean voice should be optional, not the only solution.
**Compounding:** Medium. Individual dirty-hands entries are event-specific, but reason categories, station shortcuts, common waste patterns, and post-shift cleanup habits compound into better station design.

**Solution design:**

- Add a "service mode" staff UI with large controls for task done, blocked, waste, 86'd, and shift check-out.
- Add voice note capture or OS dictation-compatible note fields for station and task updates, with review before final save when needed.
- Add quick increment/decrement controls for common station quantities instead of only typed number inputs.
- Allow "capture now, reconcile later" pending entries with staff/device/event attribution and clear sync/review status.
- Keep printable station sheets for kitchens where any device use is physically unsafe.

**Where it appears:**

- `/staff-station`
- `components/staff/staff-clipboard-view.tsx`
- `components/staff/staff-shift-controls.tsx`
- `/staff-tasks` and `components/staff/staff-task-status-board.tsx`
- `/staff-time` and `components/staffing/TimeTracker.tsx`
- `lib/offline/*` as reusable queue/draft infrastructure

**What remains as permanent exit:**
Some moments should remain analog or delegated: active plating, raw-protein handling, dish pit work, or any condition where touching a device is unsafe. ChefFlow should make the cleanup path structured rather than pretending every kitchen action happens on-screen.

**Priority:** High frequency x Medium-to-high effort = P1/P2 physical-execution gap
**Spec needed?** Yes, as staff service-mode capture and post-shift cleanup.

## Scenario #54: Continue after app error

**Original classification:** Reducible
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why staff leaves:** Staff text the chef, ask a coworker, fall back to paper, or guess from memory because an error page or failed save has destroyed operational trust. The problem is not only that the UI crashed; it is that the staff member no longer knows whether the briefing, task, time entry, or station update is safe to rely on.
**Context ChefFlow has:**

- Staff route group has a dedicated `app/(staff)/error.tsx` boundary with `Try Again`, error reporting, digest display, and chunk-load recovery through `useChunkErrorRecovery`.
- Public route group has `app/(public)/error.tsx`, so token staff portal failures get a retry/report path before global failure.
- Global error boundaries in `app/error.tsx` and `app/global-error.tsx` report client errors and clear stale chunks/caches for chunk-load problems.
- `components/feedback/error-report-button.tsx` preserves error context for report submission.
- Staff action components often show local errors and rollback: task toggles rollback, task status board rolls back on failed status update, station clipboard shows save errors, and time tracker shows clock errors.
- What is missing is operational fallback: cached last briefing, stale-but-readable staff packet, pending save queue, explicit "your last action did/did not save", and a direct return path to the affected event/station/task.

**Data source?** No. Error recovery is an app resilience problem. External texting/paper is a human fallback when ChefFlow cannot prove continuity.
**Client-collaborative angle:** Low. Dinner Circle can improve the quality of pre-event data, but error recovery is staff/chef operational resilience. Client access notes and dietary confirmations become more valuable if they are included in the cached packet.
**Physical reality:** During service, staff need the fastest safe recovery: retry, continue from last saved packet, call chef, or write a paper note for later reconciliation. A generic error card is not enough if it does not preserve the work context.
**Compounding:** High. Error categories, failed routes, failed staff actions, and recovery outcomes can compound into product reliability work and better finish gates for staff-critical surfaces.

**Solution design:**

- Add route-aware recovery to staff errors: return to last staff route, event token, station, or task after retry instead of generic home fallback.
- Cache the last successful token briefing and staff station/task snapshot so an error can show "continue with last saved packet" with stale timestamp.
- Add save-state badges for staff mutations: saved, saving, queued offline, failed, and retry available.
- Attach error reports to role, route, token/station/event context, and recent action type without exposing sensitive data.
- Provide a "call chef" fallback from staff-critical error states when the user is inside an active event or token briefing.

**Where it appears:**

- `app/(staff)/error.tsx`
- `app/(public)/error.tsx`
- `app/error.tsx` and `app/global-error.tsx`
- `components/feedback/error-report-button.tsx`
- `components/staff/staff-event-view.tsx`
- `components/staff/staff-clipboard-view.tsx`
- `components/staff/staff-task-status-board.tsx`
- `components/staffing/TimeTracker.tsx`

**What remains as permanent exit:**
Catastrophic device failure, browser corruption, dead battery, and full network loss may still require paper, phone, or human escalation. ChefFlow's job is to make those rare and to preserve context when staff return.

**Priority:** High severity x Medium-to-high effort = P1 resilience gap
**Spec needed?** Yes, as staff runtime recovery and last-known-context fallback.

## Batch Summary

| #   | Title                              | Reclassified To                              | Spec Needed? |
| --- | ---------------------------------- | -------------------------------------------- | ------------ |
| 50  | Work in a kitchen with bad signal  | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
| 51  | Keep a copy of briefing on phone   | Reducible (NEEDS-DEVELOPER-REVIEW)           | yes          |
| 52  | Use shared kiosk or kitchen device | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
| 53  | Enter data while hands are dirty   | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
| 54  | Continue after app error           | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
