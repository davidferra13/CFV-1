# Discovery & Menu-First Framework

This document governs how the system handles the discovery phase — from first contact through pricing readiness. The core principle: **the chef leads, the client adjusts.**

---

## Core Operating Principle

> When enough information exists to make a reasonable decision, the chef must make it.

Clients should never feel like they need to design the menu, approve every step, or that progress is waiting on them unnecessarily. The chef sets direction first. Clients correct if needed.

### The Critical Distinction: Asking vs. Confirming

**Avoid:**
- "Could you tell me if you prefer..."
- "Let me know what you'd like..."
- "Once you decide, I can start..."

**Use:**
- "I'll plan for..."
- "I've got you down for..."
- "Unless you'd like something different..."

---

## Service Type Classification

Classify the service type before making pricing or tone decisions.

| Type | Signals | Notes |
|------|---------|-------|
| **Private Dinner** (default) | Seated, multi-course | Most common. Default to this unless stated otherwise. |
| **Casual / Family-Style** | Shared plates, fewer courses | |
| **Celebration Dinner** | Anniversary, birthday, proposal | Higher expectations, slower pacing. Affects tone, not upselling. |
| **Group / Event** | Larger counts, bachelorette, retreat | May trigger different pricing but never labeled as such to client. |
| **Weekly / Ongoing** | Recurring cooking, meal prep | Different pricing model entirely. |
| **Invalid** | Restaurant reservations, catering drop-off | Politely redirect or decline. |

**Rule:** Over-classifying too early is forbidden. Internal labels never appear in client communication.

---

## Data Collection by Stage

### What to Request at Each Stage

#### Discovery (First Contact)

**Required (blocking — must know to advance):**
- Event date or date range
- Guest count or range
- City or town

**Optional (non-blocking — accept if offered):**
- General preferences
- Allergies
- Occasion context

**Forbidden to request:**
- Full street address
- Start time
- Detailed logistics
- Pricing, deposits, contracts

#### Pricing Stage

**Required:**
- Guest count (exact or tight range)
- Date or date range
- City/town
- Course count or permission to propose one

**Optional:**
- Budget framing (only if client introduces it)
- Additional preferences

**Forbidden to request:**
- Full address
- Start time
- Contracts or signatures

#### Booking Stage

**Required:**
- Specific event date
- Full street address
- Service start time
- Final guest count
- Deposit payment

**Forbidden to request:** Nothing — all logistics now allowed.

---

## Early Menu Commitment

Menu thinking begins **immediately** — not after every logistical detail is confirmed. Missing logistics (exact date, address, start time) must not block menu thinking.

### When to Commit to Menu Direction

As soon as the client provides any usable food information:

1. Acknowledge it
2. Lock in a default direction
3. State that menu planning has begun

**Examples:**
- "I'll plan a chef-driven seasonal menu."
- "I've got you down for no allergies and will keep things on the lighter side."
- "I'll take the lead on the menu unless you'd like something specific."

### Optional Follow-Up (Maximum One)

You may ask at most one optional follow-up, and only if it materially improves direction:
- "I'll plan something lighter and seasonal unless you'd prefer richer dishes."
- "I'll keep this fully chef-driven unless there's something specific you want me to know."

If enough direction already exists — ask nothing.

### Whimsical Moments

If the client mentions a birthday, surprise, anniversary, or celebration:
- Use slightly warmer, more playful language
- Ask one optional joy-forward question: "Does she have a favorite dessert?" or "Any flavors she really loves?"
- One question only. Never block progress. Menu + booking continue.

---

## Parallel Progression

Menu planning and logistics gathering happen in parallel, not sequentially.

```
Menu direction ──────► Menu development ──────► Menu lock
         ↕                    ↕
Logistics gathering ──► Pricing ──► Booking
```

Menu planning is **never blocked** by missing logistics. A grocery list skeleton can exist with TBD quantities. A prep concept can form before guest count is final.

---

## Internal Data Tracking

At every stage, the system tracks:

| Category | Status Options |
|----------|---------------|
| Known | Data confirmed by client |
| Missing — Blocking | Prevents advancement to next stage |
| Missing — Non-Blocking | Would be nice, not required yet |
| Not Yet Requested (By Design) | Forbidden at current stage |

**Rules:**
- Never invent or infer missing information
- If client volunteers future-stage data, record it but don't expand on it
- Only one item should appear as "Next Unblock" — the single most important missing piece

---

## What Happens Automatically When an Inquiry Arrives

The system should perform this cascade without chef intervention:

1. **Parse & extract** — AI identifies all available fields from the message
2. **Classify** — Service type determination
3. **Create inquiry record** — Status `new`, all extracted fields populated
4. **Create lead profile** — Client record from available data (name, email, phone)
5. **Detect lifecycle state** — Map to State 0 or State 1
6. **Check calendar** — Flag conflicts or availability for the requested date
7. **Score priority** — Time pressure, blocking status, revenue potential
8. **Surface to queue** — "Respond to new inquiry" with SLA timer
9. **Draft response** — AI generates a Discovery-stage response following all rules
10. **Place tentative hold** — Requested date marked as potential on schedule
11. **Notify chef** — Alert that a new inquiry needs review

The chef then reviews the draft, edits if needed, and approves for send.
