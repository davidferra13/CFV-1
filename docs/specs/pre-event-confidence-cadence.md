# Pre-Event Confidence Cadence

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** Inquiry-to-Booking Orchestration (trigger engine)

---

## Problem Statement

The orchestration spec solves inquiry-to-deposit (Days 1-5). But events are often booked months in advance. Between deposit and event day, the client enters a communication dead zone. The same anxiety returns: "Do I still have a chef? Is this actually happening?"

A wealthy, organized client who booked 4 months out needs periodic, low-effort reassurance that their event is on track, without having to chase the chef.

---

## Solution: Automated Confidence Cadence

A series of proactive, chef-approved status updates sent to the client at milestone intervals between deposit and event day. The chef does nothing manually; the system generates and sends these based on lifecycle state.

### Cadence Timeline

| Timing               | Message                                                                                                                       | Portal Update                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Deposit confirmed    | "You're booked! Here's your event portal link. Your chef will begin planning closer to the date."                             | Event status: Confirmed                     |
| 30 days before event | "Your event is 30 days away. [Chef] is beginning menu preparation. Any dietary updates? Reply here or update in your portal." | Countdown visible                           |
| 14 days before event | "Two weeks out. Menu is [locked/in progress]. Guest count: [N]. Anything to update?"                                          | Menu status shown                           |
| 7 days before event  | "One week to go. [Chef] is sourcing ingredients this week. Here's your final menu."                                           | Final menu displayed, prep timeline visible |
| 3 days before event  | "Almost here! [Chef] begins prep on [date]. Arrival time: [time]. Any last questions?"                                        | Prep timeline active                        |
| 1 day before event   | "Tomorrow's the day. [Chef] arrives at [time] at [location]. Everything is set."                                              | Day-of checklist visible                    |
| Event day (morning)  | "Today! [Chef] is preparing for your [occasion]. Enjoy your evening."                                                         | Live status (if live tracker enabled)       |

### Configuration

- Chef can customize message templates (tone, detail level) per cadence point
- Chef can disable individual cadence points
- System skips cadence messages if chef has manually communicated within the window (no double-messaging)
- All messages include one-tap portal link
- Client can reply directly (routed to chef's inbox)

### Files Likely Touched

- `lib/lifecycle/confidence-cadence.ts` (new, cadence rule engine)
- `lib/lifecycle/trigger-engine.ts` (register cadence triggers on deposit confirmation)
- `lib/email/templates/confidence-cadence.tsx` (new template with dynamic content slots)
- `lib/communication/cadence-scheduler.ts` (new, schedules future sends based on event date)
- `app/(chef)/settings/communication/page.tsx` (cadence template customization)
- `components/client-portal/event-countdown.tsx` (new or enhance existing)

### What This Does NOT Cover

- SMS/push notifications (future channel, email-only for V1)
- Chef-to-client chat during cadence windows (existing chat system handles this)
- Cancellation communications (handled by existing event FSM transitions)

---

## Verification

- [ ] Deposit confirmation triggers cadence schedule creation
- [ ] Each cadence email fires at correct interval before event
- [ ] Messages skip if chef communicated manually within window
- [ ] Client can reply to cadence email and it routes to chef
- [ ] Portal shows countdown and stage-appropriate content at each interval
- [ ] Chef can customize/disable individual cadence points in settings
