# Engagement Lifecycle States

Every client engagement exists in exactly one state at a time. This document defines what is known, what is locked, what is allowed, and what is forbidden at each state.

---

## How This Maps to the Codebase

The codebase uses three separate FSMs for granular state tracking:

- **Inquiry FSM**: `new → awaiting_client → awaiting_chef → quoted → confirmed → declined → expired`
- **Quote FSM**: `draft → sent → accepted → rejected → expired`
- **Event FSM**: `draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled`

The lifecycle states below describe the **full engagement arc** — from the moment an email arrives to the final archive. Each state maps to one or more codebase states.

---

## State 0 — INBOUND_SIGNAL

**Codebase mapping:** Gmail sync receives email, classification pending.

An inbound message has been received. No validation has occurred.

| Known | Unknown |
|-------|---------|
| Source (email, platform, referral) | Whether it's a real inquiry |
| Raw message text | All logistics |
| Timestamp | Client identity |

**Allowed:** Read message, classify, ask clarifying questions, discard.
**Forbidden:** Pricing, availability confirmation, date holds, menu discussion.

**Exit → State 1:** Message is classified as a legitimate service inquiry.

---

## State 1 — QUALIFIED_INQUIRY

**Codebase mapping:** Inquiry status = `new`

The message is a legitimate request for private chef services.

| Known | Still Needed |
|-------|-------------|
| Event date or range | Exact date |
| Approximate guest count | Full address |
| City or location | Start time |
| Type of service | Dietary details |

**Allowed:** Confirm availability in principle, explain process at high level, collect missing discovery data, begin menu thinking (chef-driven direction).
**Forbidden:** Pricing, menu specifics, date holds.

**Exit → State 2:** Client confirms interest and all non-financial discovery data is captured.

---

## State 2 — DISCOVERY_COMPLETE

**Codebase mapping:** Inquiry status = `awaiting_chef` (all data collected, chef preparing response)

All non-financial requirements needed for accurate pricing are captured.

| Known | Locked |
|-------|--------|
| Final event date | Discovery data (unless client changes scope) |
| Guest count range | |
| Exact location | |
| Kitchen access constraints | |
| Timeline expectations | |
| Dietary restrictions / allergies | |

**Allowed:** Prepare pricing internally, frame service scope, begin menu development.
**Forbidden:** Sending proposals, requesting deposits.

**Exit → State 3:** Internal readiness to present pricing, and client has expressed interest in receiving it.

---

## State 3 — PRICING_PRESENTED

**Codebase mapping:** Inquiry status = `quoted`, Quote status = `sent`

Client has been presented with pricing information.

| Known | Locked |
|-------|--------|
| All discovery inputs | Pricing structure |
| Applicable pricing rules | Service category |
| Quote delivered | |

**Allowed:** Present pricing, explain deposit/grocery model/payment structure, clarify questions.
**Forbidden:** Date holds, menu locking, assuming commitment.

**Exit → State 4:** Client accepts pricing and requests to proceed.

---

## State 4 — TERMS_ACCEPTED

**Codebase mapping:** Quote status = `accepted`

Client has agreed to scope, pricing, and terms.

| Known | Locked |
|-------|--------|
| Full scope | Terms |
| Pricing | Scope |
| Payment schedule | |
| Cancellation policy | |

**Allowed:** Request deposit, soft-hold date.
**Forbidden:** Menu planning beyond direction, grocery planning.

**Exit → State 5:** Deposit received.

---

## State 5 — BOOKED

**Codebase mapping:** Event status = `paid` or `confirmed`

The engagement is officially booked. Deposit received.

| Known | Locked |
|-------|--------|
| Client details | Date |
| Date, location, guest count | Client |
| Deposit received | Base scope |

**Allowed:** Menu discussion, allergy finalization, logistics planning.
**Forbidden:** Scope expansion without change request.

**Exit → State 6:** Menu direction approved by client.

---

## State 6 — MENU_LOCKED

**Codebase mapping:** Event status = `confirmed`, menu attached and approved

Food decisions are finalized.

| Known | Locked |
|-------|--------|
| Final menu | Menu |
| Final allergies | Guest count |
| Final guest count (or change rules) | |

**Allowed:** Grocery planning, prep planning, timeline building, document generation.
**Forbidden:** Menu changes outside change rules.

**Exit → State 7:** Grocery plan finalized and execution plan complete.

---

## State 7 — EXECUTION_READY

**Codebase mapping:** Event status = `confirmed`, all prep tasks complete

All operational variables are resolved. The three printed sheets are generated.

| Known | Locked |
|-------|--------|
| Shopping completed | All major variables |
| Prep plan finalized | |
| Arrival time confirmed | |
| Kitchen access plan confirmed | |

**Allowed:** Execute service.

**Exit → State 8:** Service day arrives.

---

## State 8 — IN_PROGRESS

**Codebase mapping:** Event status = `in_progress`

Service is being executed. No phone, no app — the chef is cooking. Everything operational was printed beforehand.

---

## State 9 — SERVICE_COMPLETE

**Codebase mapping:** Event status = `completed` (but closure tasks still open)

Service has been executed. Post-event cascade begins.

**Allowed:** Invoice reconciliation, balance request, receipt upload, follow-up message, AAR.
**Forbidden:** Retroactive scope changes.

**Exit → State 10:** All closure tasks complete.

---

## State 10 — CLOSED

**Codebase mapping:** Event status = `completed`, all `event_closure_tasks` marked done

| Required for closure |
|---------------------|
| Final payment received and recorded |
| Receipts uploaded and approved |
| Tip recorded separately |
| Follow-up message sent |
| After Action Review filed |
| Client record updated |
| Kitchen cleaned, equipment packed |
| No open loops remain |

**Exit → Archive:** Terminal state. Historical record locked.

---

## Exception Route — CHANGE_REQUEST

A change request (guest count, menu, timeline, location) routes the engagement backward to the last affected state, requires re-approval, then proceeds forward again.

No change request may bypass required states.

---

## Global Rules

1. An engagement occupies exactly one state at a time
2. States progress sequentially unless routed backward by a change request
3. If the current state is ambiguous, default to the earliest applicable state
4. Every state change is logged in the immutable audit trail
5. The codebase's FSM transitions enforce these rules at the database level
