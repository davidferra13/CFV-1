# Spec: Homepage Availability and Booking-Timing Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** availability and booking timing discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Availability/timing should make discovery actionable, but it must be honest. If real availability is not known, copy must say "accepting inquiries" or "plan for" rather than "available."

Intent:

- Support this weekend, tonight, next week, holiday, and last-minute discovery.
- Distinguish real availability from planning intent.
- Avoid fake scheduling claims.

---

## What This Does

Create a rail for availability and booking timing:

- available this weekend
- book for tonight
- plan next week
- open dates near you
- last-minute friendly
- holiday availability
- accepting inquiries
- plan ahead

---

## Timing Classes

- **Immediate:** tonight, tomorrow, last minute.
- **Short-term:** this weekend, next week.
- **Future planning:** next month, holiday, special occasion.
- **Availability-backed:** real open slots if supported.
- **Inquiry-backed:** accepting inquiries but no guaranteed availability.

---

## Homepage Modules

### Immediate

Examples:

- Tonight
- Tomorrow
- Last-minute friendly

### Short-Term

Examples:

- This weekend
- Next week
- Open dates nearby

### Planning Ahead

Examples:

- Plan a holiday dinner
- Book next month
- Start early

### Availability Proof

Examples:

- Open dates visible
- Accepting inquiries
- Fast response chefs

### Timing Wildcard

Examples:

- This weekend's pick
- Last-minute idea
- Plan ahead pick

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `timingClass`
- `dateWindowStart`
- `dateWindowEnd`
- `availabilityBacked`
- `acceptingInquiriesBacked`
- `responseSpeedSignal`
- `locationRequired`
- `coverageScore`
- `confidenceScore`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- This Weekend
- Tonight
- Next Week
- Last-Minute Friendly
- Accepting Inquiries
- Holiday Planning
- Explore Dates

Rules:

- Do not claim availability unless backed by data.
- Use "plan" language for future or uncertain timing.
- Avoid urgent claims that route to empty results.

---

## Routing Rules

- Route to real public destinations with date/timing context.
- No automatic booking, inquiry, event, group, or planning creation.
- No private calendar, event, quote, invoice, or client data exposure.

---

## Acceptance Criteria

- Rail supports immediate, short-term, future planning, availability-backed, and inquiry-backed timing.
- Copy distinguishes real availability from planning intent.
- Tests cover availability truthfulness, date query context, routing, dedupe, hidden/dismissed behavior, and empty-result handling.

---

## Out Of Scope

- Calendar booking engine changes.
- Scheduling sync integrations.
- Booking write-path changes.
