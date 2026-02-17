# Pricing Engine & Auto-Client Creation — Reflection

**Date:** 2026-02-17
**Scope:** Two foundational features that unblock the AI correspondence pipeline

---

## What Changed

### 1. Deterministic Pricing Engine — `lib/pricing/compute.ts`

Created a pure-function pricing engine that computes exact pricing from the rate card. No AI, no estimation — just David's actual rates as code.

**What it does:**
- `computePricing(input)` — Takes service type, guest count, course count, event date, and distance. Returns a full `PricingBreakdown` with every line item in cents.
- `generateQuoteFromPricing(input)` — Produces a quote-ready object that can be passed directly to `createQuote()`.
- `formatPricingForEmail(pricing)` — Generates human-readable pricing text for the AI to use in email drafts.
- `detectHoliday(date)` — Identifies Tier 1/2/3 holidays including floating holidays (Thanksgiving, Easter, Mother's Day, etc.) using the Anonymous Gregorian algorithm for Easter.

**Rate card encoded:**
- Couples (2 guests): $200/$250/$300 per person for 3/4/5 courses
- Groups (3+): $155/$185/$215 per person for 3/4/5 courses
- Multi-night packages: $700–$1,100
- Weekly: $300–$500/day depending on commitment
- Pizza experience: $150/person
- Holiday premiums: Tier 1 (+45%), Tier 2 (+30%), Tier 3 (+20%)
- Deposit: 50% non-refundable
- Travel: IRS mileage rate ($0.70/mile)
- Grocery estimate: $30–$50/guest (internal only, never shown to client)

**Why this matters:**
The AI brain docs (`04-PRICING.md`) explicitly state: "All arithmetic must be deterministic. NEVER calculate totals, apply percentages, or estimate premiums." This engine is the deterministic compute layer that the AI references instead of guessing.

### 2. Auto-Client Creation — `lib/clients/actions.ts` + `lib/gmail/sync.ts`

**New function: `createClientFromLead(tenantId, lead)`**
- Creates a client record from lead data (name, email, phone, dietary restrictions)
- Idempotent: returns existing client if email already exists in tenant
- Uses admin Supabase client (no auth session required) for automated pipelines
- Does NOT require the invitation flow — creates the record directly

**Gmail sync pipeline updated:**
- When a new inquiry email arrives and no client exists for that sender, the system now auto-creates a client record
- The inquiry is linked to the new client via `client_id`
- Original lead data is still preserved in `unknown_fields` for audit trail
- Non-fatal: if client creation fails, inquiry still gets created (just without client link)

**What this unblocks:**
- Repeat client detection in the AI correspondence engine (checks prior events by client_id)
- Client portal access for future interactions
- Event linking when inquiry converts to event
- Client profile visible in `/clients` list immediately
- Referral cross-referencing (future)

### 3. Fixed `types/database.ts`

Removed debug output (`Initialising login role...`) from line 1 of the generated types file. This was causing TS1434 errors on every type check. Pre-existing issue, not related to our work.

---

## How These Connect to the System

```
Email arrives
  → Gmail sync parses inquiry
  → Auto-creates client record (NEW)          ← lib/clients/actions.ts
  → Links client to inquiry
  → AI correspondence engine detects lifecycle state
  → Pricing engine computes exact pricing (NEW) ← lib/pricing/compute.ts
  → AI drafts response using rate card values
  → Chef reviews and approves
```

The pricing engine and auto-client creation close two gaps in the Stage 1 → Stage 4 pipeline. The AI brain now has the intelligence (agent-brain docs), the pricing engine gives it deterministic numbers, and auto-client creation ensures every inquiry has a proper client record from day one.

---

## What's Next

Remaining gaps from the dinner walkthrough:

1. **Outbound Gmail send** — The approved response needs to reach Gmail
2. **Notification system** — Alert chef when new inquiry arrives
3. **Tentative schedule holds** — Inquiry dates visible on calendar
4. **Thread-aware email view** — Conversation history in UI
5. **Auto follow-up scheduling** — 48hr timer on awaiting_client
6. **Payment link in booking emails** — Stripe link auto-included
