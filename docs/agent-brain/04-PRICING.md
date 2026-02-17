# Pricing Rules & Rate Card

This document is the **final authority on all pricing logic**. It defines the actual rates, when pricing may appear, how it must be presented, and what is forbidden.

---

## Rate Card

### Private Dinners — Couples (2 Guests)

| Courses | Per Person | Total |
|---------|-----------|-------|
| 3 | $200 | $400 |
| 4 | $250 | $500 |
| 5 | $300 | $600 |
| Large Tasting (8–15+) | Custom | Custom |

### Private Dinners — Groups (3+ Guests)

| Courses | Per Person |
|---------|-----------|
| 3 | $155 |
| 4 | $185 |
| 5 | $215 |
| Large Tasting (8–15+) | Custom |

### Weekly & Ongoing Services

| Service | Rate |
|---------|------|
| Standard cooking day | $400–$500/day |
| Commitment rate (5 consecutive days, same home) | $300–$350/day |
| Cook & Leave (2 meals, no service) | $150 total |

### Multi-Day Packages

| Package | Rate |
|---------|------|
| Two-Night Dinner for Two — both nights 3 courses | $700 |
| Two-Night Dinner for Two — both nights 4 courses | $900 |
| Two-Night Dinner for Two — both nights 5 courses | $1,100 |
| Mixed course option | $900 |

### Seasonal Offerings

| Service | Rate |
|---------|------|
| Summer Brick-Fired Pizza Experience | $150/person |

### Notes
- Food cost is billed separately at actual receipt cost — no markup
- Table setting and beverages are not included
- Pricing reflects planning, sourcing, cooking, and cleanup

---

## Holiday & Premium Date Pricing

### Tier 1 — Major Cooking Holidays (+40–50% premium)
Thanksgiving, Christmas Eve, Christmas Day, New Year's Eve, Valentine's Day

### Tier 2 — High-Demand Family Holidays (+25–35% premium)
Mother's Day, Father's Day, Easter, Fourth of July

### Tier 3 — Moderate-Demand Holidays (+15–25% premium)
Memorial Day, Labor Day, Halloween (dinner parties), Graduation weekends

---

## Deposit & Payment Terms

| Rule | Standard Bookings | Tier 1 Holidays |
|------|------------------|-----------------|
| Deposit to reserve date | 50% non-refundable | 50% non-refundable |
| Final balance due | 24 hours before service | 24 hours before service |

The deposit is applied toward the final balance. The date is **not held** without receipt of the deposit.

---

## Travel

- Local: Mileage at current IRS business rate, tolls and parking at cost
- Long-distance: Lodging provided by client or billed at cost, travel time quoted separately

---

## When Pricing Is Allowed

Pricing may appear in a client-facing email **only if ALL** of these are true:

1. **At least one** of:
   - Client explicitly asks for pricing, cost, quote, estimate, or budget
   - Client asks a question that cannot be answered without pricing
   - Client references prior pricing in their reply

2. **AND all** of:
   - The inquiry is classified as a legitimate private chef request
   - The service type is within scope
   - Guest count is known or bounded (exact number or stated range)
   - Date or date range is known
   - General location (city/town) is known

## When Pricing Is Forbidden

- Client has not asked for pricing
- Inquiry is still exploratory or vague
- Date is unknown or speculative
- The message could reasonably be answered without pricing
- Inquiry is at early discovery stage
- Client is still deciding whether they want the service at all
- Lifecycle state is Discovery (see `02-LIFECYCLE.md`)

**Default:** If pricing eligibility is unclear — do not include pricing. Ask one clarifying question instead. Pricing must never be used as a discovery shortcut.

---

## How Pricing Must Be Presented

### Required Components (When Pricing Is Allowed)
- Service fee (per-person or flat)
- Grocery model: "Groceries are billed at actual cost, based on real receipts"
- Deposit requirement: "A 50% non-refundable deposit locks the date"

### Format Rules
- Pricing must be written in **paragraph form** — conversational, not tabular
- Sound human, not like a proposal document
- Conditional language is preferred: "If you'd like to move forward..."

### Forbidden in Pricing Presentation
- Payment links (until Booking stage)
- Deposit demands (until Booking stage — may describe, not demand)
- Confirmation language ("your date is secured")
- Itemized math, formulas, or internal fee breakdowns
- "Lock in your date" / "Secure your spot" / "Limited availability"
- Bullets for pricing (use paragraphs)
- Full contracts or legal language

### Range-Based Pricing
When guest count is a range, present both ends:
> "For 2 people it looks like X, and for 6 it looks like Y."

---

## Pricing Compute Rules

All arithmetic must be deterministic — not estimated by the AI.

- Base service fees from the rate card above
- Holiday premiums applied mechanically based on date
- Deposits calculated as percentage of service fee
- Travel calculated from distance × IRS rate
- **Formula:** `Total = (Per Person Rate × Guest Count) + Travel Fees`
- Grocery costs are separate and estimated internally only — never quoted to client

The AI may prepare inputs and format outputs but must never calculate totals, apply percentages, or estimate premiums by itself. Pricing computation is handled by the codebase's deterministic pricing engine.

---

## Add-Ons & Adjustments

Additional charges may apply for:
- Additional courses beyond listed packages
- Extended service time
- Additional staff (server or assistant cook)
- Specialty sourcing requests
- Complex dietary requirements
- Early arrival or late departure

These are quoted separately, not included in standard rates.
