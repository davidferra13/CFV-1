# Codex Task: Persona Stress Test - Will Allen

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Vendor Profile: "Will Allen" - Local Farm Supplier (Seasonal Produce Expert)**

I run a micro-farm specializing in heirloom and ultra-local produce, focusing on the aesthetic quality and peak flavor that high-end chefs demand. I don't just grow food; I cultivate specific ingredients for the seasonal cycle. My reputation hinges entirely on the perfect ripeness and presentation of my harvests. I serve a handful of highly selective, quality-focused restaurants and catering companies that value provenance over volume.

### Business Reality

Right now:

- I fulfill approximately 15-20 chef orders per week, plus 3-5 specialized event rentals (e.g., floral accents, specialty herbs) per month.
- My wholesale pricing is highly variable, ranging from $18 to $45 per pound, depending on the harvest and market demand. I require a 50% deposit on all orders exceeding $500, with the remaining balance due upon delivery, payable via check or credit card.
- My inventory is critically seasonal; I can supply hyper-local lettuces and specialty microgreens year-round, but items like heirloom tomatoes and specific squash varieties are only available for a 6-week window each year. Quality and peak freshness are my primary constraints.
- I operate out of a small, refrigerated packing shed located in the Sonoma Valley, which limits my ability to handle massive volume, but ensures the cold chain is maintained.
- My current ordering and communication setup is a chaotic mix: chefs send texts about last-minute changes, I manage the primary list on a shared Google Sheet, and the final invoices are printed and mailed out at the end of the month.

---

### Primary Failure: Mismanaging the Unpredictable Harvest Cycle

My biggest operational pain point is the inherent unpredictability of the harvest. I cannot guarantee a specific weight or quantity of a particular item until I physically pick it. This means that if a chef places a confirmed order for, say, 50 lbs of Fingerboard Cucumbers, and the morning dew was heavy, I might only yield 35 lbs. Because I am a small, high-quality supplier, my clients operate on a "must-have" basis; they cannot easily pivot to a standard substitute. When I under-deliver, it directly impacts their menu integrity, leading to rushed, sometimes frustrated, phone calls and a potential loss of trust. This constant, unpredictable shortfall forces me to over-communicate and dedicate valuable time simply managing expectations, rather than growing food.

---

### Structural Issue: The Lack of Real-Time Yield Forecasting

The moment a chef confirms an order for a seasonal crop, they expect a commitment. Right now, if I anticipate a massive yield of specialty radishes, I have to call or text each client individually to give a rough estimate (e.g., "Expect 60-80 lbs"). This manual, fragmented process is impossible to scale or track. If the weather changes, I have to send out a mass communication effort that is often ignored or misunderstood. This lack of a centralized, dynamic way to communicate _potential_ inventory changes forces me to either over-promise (leading to disappointment) or under-promise (leading to lost sales).

---

### Structural Issue: Non-Standardized Order Modification

Chefs rarely order exactly what they need. They order "a handful of greens," or "enough specialty herbs for the tasting menu." When they need to change an order—for instance, swapping 10 lbs of greens for 5 lbs of specialty basil—they usually send a picture and a text message. I then have to manually cross-reference that text against the Google Sheet, calculate the new cost (which might change the total order value significantly), and then adjust the physical packing list. This process is prone to human error, especially when dealing with multiple, overlapping, and highly nuanced ingredient substitutions that don't fit standard categories.

---

### Structural Issue: Invoice Reconciliation Chaos

My clients often use different payment methods, and the invoicing process is a nightmare. One restaurant pays with a corporate card, another pays via check (which takes 7-10 days to clear), and a third pays with a direct bank transfer. I have to manually log these payments, reconcile them against the original order sheet, and then track which deposits were received versus which final payments are pending. This manual reconciliation process takes me half a day every week and dramatically increases the risk of billing errors or delayed invoicing, which strains my cash flow.

---

### Structural Issue: Limited Visibility into Ingredient Usage and Recipes

Because I am so specialized, my clients often want to know how to best utilize my unique harvest. They frequently call or email asking, "What do you suggest using these microgreens with?" or "What is the best way to preserve this specific varietal of squash?" This is valuable market feedback, but I have no system to document these usage suggestions or link them back to the specific ingredient and the client who suggested them. This knowledge is currently stored in my personal memory and my messy email drafts.

---

### Structural Issue: Tracking Specific Harvest Provenance

Some of my premium clients require documentation showing exactly where, when, and by whom a specific batch of produce was harvested (provenance). This is critical for their high-end marketing and compliance. Right now, this is handled by a handwritten note on the delivery manifest, which gets lost, photocopied, or illegible. If I have to recall the exact harvest details for a special event six months later, I have no reliable, digital record to pull up.

---

### Psychological Model

I optimize for: **Quality and aesthetic integrity.** If the process adds complexity or risk that might compromise the freshness or presentation of the ingredients, I will reject it immediately.
I refuse to compromise on: **The accurate, immediate communication of seasonal constraints.** If the system suggests I can guarantee something that is physically impossible or highly unlikely right now, I will abandon it.
I avoid: **Overly complex, multi-step digital processes.** If I have to spend more than three minutes learning a new interface just to place an order or check a price, I will default back to a simple phone call or text.
I evaluate tools by: **How easily they allow me to update real-time, variable inventory data.** The tool must be flexible enough to handle a massive swing in supply without breaking the order sheet.

I think like a farmer: I am highly responsive to immediate environmental changes, and I am skeptical of anything that suggests perfect, unchanging predictability. My decision-making is driven by the immediate reality of the field and the integrity of the product.

---

### Pass / Fail Conditions

For this system to work for me, it must:

1.  The system must allow me to input a variable, dynamic inventory count (e.g., "Today's yield of tomatoes: 45-60 lbs") and automatically flag orders that exceed that predicted range.
2.  The system must allow me to link a specific ingredient batch to a documented harvest date, location, and quality notes (provenance tracking).
3.  The system must support complex, fractional pricing structures (e.g., $X per pound, minimum 5 lbs, plus a $Y event setup fee).
4.  The system must facilitate real-time, multi-party communication regarding order modifications (e.g., a chef texting a change that immediately updates the shared order sheet and flags the change for my approval).
5.  The system must generate consolidated, customizable invoices that accurately track multiple, mixed payment types (check, card, transfer) against the original order total.
6.  The system must allow me to create and store detailed ingredient usage notes and suggested recipes, linking that knowledge back to the specific ingredient and client who provided the feedback.
7.  The system must provide a simple, dedicated module for scheduling and managing small, non-food related event rentals (e.g., special harvest baskets, display crates) separate from the food orders.

## Persona Type: Vendor

## Instructions

### Step 1: Evaluate (READ ONLY - do not change any files yet)

Read these files to understand what ChefFlow currently offers:

- `docs/product-blueprint.md` (feature list and status)
- `docs/app-complete-audit.md` (every UI element that exists)
- `docs/service-lifecycle-blueprint.md` (the engagement model)
- `lib/billing/feature-classification.ts` (free vs paid features)

Based on the persona description, identify:

1. Which ChefFlow features this persona would use
2. Which features are missing or partially built for this persona
3. Which gaps are QUICK WINS (< 20 lines changed, existing files only)

### Step 2: Write the Report

Create file: `docs/stress-tests/persona-will-allen-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Will Allen

## Generated: 2026-04-27

## Type: Vendor

## Persona Summary

[2-3 sentence summary of who this person is and what they need]

## Capability Fit (rate each as SUPPORTED / PARTIAL / MISSING)

[List each relevant ChefFlow feature area and rate it]

## Top 5 Gaps

[The 5 most important things ChefFlow cannot do for this persona]
[For each: what's missing, which file would need to change, effort estimate]

## Quick Wins Found

[Changes under 20 lines that would improve the experience]
[For each: exact file, what to change, why]

## Score: X/100

[Workflow Coverage, Data Model Fit, UX Alignment, Financial Accuracy]
[Weighted final score with 1-sentence justification]

## Verdict

[2 sentences: would this persona succeed on ChefFlow today?]

### Step 3: Apply ONLY Quick Wins (if any)

Rules for code changes:

- ONLY changes under 20 lines in a SINGLE EXISTING file
- NEVER create new files (except the report)
- NEVER modify database schemas or migrations
- NEVER modify auth, layout, or routing
- NEVER modify lib/billing/ or payment code
- ONLY modify: UI text, default values, empty states, labels, placeholder text, tooltips
- If unsure whether a change is safe: DO NOT MAKE IT. Document it in the report instead.

### Step 4: Update the Registry

Append one row to the table in `docs/stress-tests/REGISTRY.md` under "## Persona Registry":

| #             | Label      | Type   | Date       | Score       | Method           | Report                                               | Key Finding    |
| ------------- | ---------- | ------ | ---------- | ----------- | ---------------- | ---------------------------------------------------- | -------------- |
| {next_number} | Will Allen | Vendor | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-will-allen-2026-04-27.md` | {one sentence} |

## Scope

Only modify files within:

- docs/stress-tests/ (reports and registry)
- app/(chef)/ (UI text/labels only, no logic)
- app/(client)/ (UI text/labels only, no logic)
- app/(public)/ (UI text/labels only, no logic)
- components/ (UI text/labels only, no logic)

Do NOT modify:

- database/ (no migrations, no schema changes)
- lib/auth/ (no auth changes)
- lib/billing/ (no payment changes)
- lib/db/ (no database logic)
- lib/ai/ (no AI changes)
- app/(chef)/layout.tsx (no layout gates)
- Any server action file (no business logic)
- devtools/ (no self-modification)
- .claude/ (no skill/agent changes)

## Branch

codex/persona-will-allen

## Guardrails

These rules are mandatory. Violating any of them makes the task a failure.

- All monetary amounts in integer cents, never floats
- Every database query must be tenant-scoped
- No em dashes anywhere
- "OpenClaw" must never appear in UI text
- No @ts-nocheck in any new file
- No DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE
- Wrap side effects in try/catch
- Use only existing component variants: Button (primary/secondary/danger/ghost), Badge (default/success/warning/error/info)
- AI must never generate recipes
- No forced onboarding gates

## Acceptance Criteria

- [ ] Report exists at `docs/stress-tests/persona-will-allen-2026-04-27.md`
- [ ] Report follows the exact structure above
- [ ] Registry row added to `docs/stress-tests/REGISTRY.md`
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No files modified outside scope directories
- [ ] No code changes over 20 lines in any single file
- [ ] No new files created (except the report)

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
