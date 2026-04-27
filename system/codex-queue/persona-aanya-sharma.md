# Codex Task: Persona Stress Test - Aanya Sharma

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Vendor Profile: "Aanya Sharma" - Owner/Director of Sourcing (Analyst)**

I’ve spent the last fifteen years building a network of small-batch producers across South Asia and the Middle East, making sure the integrity of every spice we handle is absolutely unimpeachable. My operation is built on trust—relationships are our most valuable commodity—but lately, that trust has been threatened by paperwork, regulatory headaches, and the sheer inefficiency of managing complex, multi-source supply chains.

### Business Reality

Right now:

- We manage sourcing from over 35 individual suppliers across four continents.
- Our team consists of 6 full-time employees: three importers, one logistics coordinator, and two administrative/compliance specialists.
- Our annual gross revenue has stabilized at $4.5 million, with 65% of that coming from high-volume regional restaurant clients in the Denver Metro area.
- Our sourcing model relies on seasonal, small-batch inputs, meaning inventory risk is high and fluctuating.
- We currently use a mix of QuickBooks for finance, Google Sheets for inventory tracking (which is terrible), and email/WhatsApp for supplier communication.
- We generate approximately 18-25 shipments per month, each requiring custom compliance checks for customs documentation.

### Primary Failure: Compliance Fragmentation and Source Verification

Our biggest pain point is the sheer fragmentation of our compliance and sourcing documentation. When a new shipment comes in—say, a specialty cardamom from Kerala—we need to track not just the Certificates of Origin, but also the unique lot number from the farm, the processing date, and the specific testing results for pesticides, which must align with the end-user's required authenticity certification (like organic or specific geographical designation). When we scaled up, we relied on filing cabinets and shared network drives, and now that a former partner has initiated a cease-and-desist order, we cannot instantly prove, digitally and verifiably, the full chain of custody for every single container. It costs us valuable time, potential fines, and frankly, it undermines the relationships we’ve built with the premium clientele who demand documented authenticity.

### Structural Issue: Decentralized Inventory and Shelf-Life Management

Our inventory management is completely decentralized across physical warehouse locations and outdated spreadsheets. We source materials with wildly different shelf lives—some dried chili powders are stable for years, but fresh saffron threads degrade rapidly and require specific climate control. Because we don't have a centralized, real-time view of inventory _by lot number and expiration date_, we frequently over-order some high-stability items while risking spoilage and write-offs on seasonal, perishable goods. This leads to unnecessary capital expenditure and requires my team to manually calculate the optimal order size, a task that is mathematically intensive and highly prone to human error.

### Structural Issue: Supplier Relationship History Tracking

Because we are relationship-first, the history of a supplier's performance is critical. It’s not just about the price; it’s about reliability, consistency, and ethical sourcing adherence. Currently, I track these details (e.g., "Supplier X was delayed 3 times last quarter," or "Supplier Y met organic certification 100% of the time") in a combination of my personal Notion database and sometimes just my memory. When an issue arises, I have to cross-reference multiple emails, phone calls, and spreadsheets to determine if the failure was due to them, or if it was a logistics breakdown. This lack of a unified, searchable 'Supplier Performance Ledger' means I can't make data-driven decisions on relationship continuance, forcing me to make decisions based on gut feeling rather than documented history.

### Structural Issue: Pricing Tier and Volume Scaling Analysis

Our pricing structure is incredibly complex, involving tiered bulk pricing based on volume _and_ the commodity type. A client might buy 500 lbs of cumin, but if they exceed 1,000 lbs, the unit cost drops 8%, but only if the purchase includes at least two other commodities from the same geographical region. Calculating the true cost-of-goods-sold (COGS) for large, custom bids is currently a manual, multi-spreadsheet exercise that takes an employee an entire afternoon. We are constantly losing potential large-scale institutional sales because the time required to generate a precise, accurate, and compliant quote is too high.

### Psychological Model

I optimize for: Proven traceability and the quantifiable reduction of risk factors.
I refuse to compromise on: The verifiable integrity of the product’s origin and the speed of data retrieval.
I avoid: Manual data aggregation, unstructured data, and systems that require me to "trust" the data without providing a clear audit trail.
I evaluate tools by: Their ability to synthesize complex, disparate data streams (compliance, inventory, financials, supplier history) into a single, actionable dashboard.

### Pass / Fail Conditions

For this system to work for me, it must:

1.  Allow for rapid, granular input of multi-level sourcing data (Farm Lot ID -> Processor Lot ID -> Shipment Lot ID) to verify end-to-end compliance.
2.  Automatically flag inventory approaching critical shelf-life thresholds based on specific, customizable commodity expiry profiles.
3.  Provide a centralized, searchable dashboard tracking supplier performance metrics (delivery delay count, quality failure count, certification adherence score) tied directly to invoicing.
4.  Handle dynamic, multi-variable pricing models that adjust the final COGS calculation based on specified volume and commodity relationships.
5.  Integrate with common accounting software (e.g., QuickBooks) for automated ledger posting directly from finalized invoices.
6.  Support the simultaneous management of multiple regulatory documentation types (e.g., Phytosanitary Certificate, Certificate of Origin, COA) and link them directly to the corresponding inventory lot.
7.  Provide a single, auditable export function that can generate a full compliance package for any given product batch, suitable for legal or customs review.

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

Create file: `docs/stress-tests/persona-aanya-sharma-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Aanya Sharma

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

| #             | Label        | Type   | Date       | Score       | Method           | Report                                                 | Key Finding    |
| ------------- | ------------ | ------ | ---------- | ----------- | ---------------- | ------------------------------------------------------ | -------------- |
| {next_number} | Aanya Sharma | Vendor | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-aanya-sharma-2026-04-27.md` | {one sentence} |

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

codex/persona-aanya-sharma

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

- [ ] Report exists at `docs/stress-tests/persona-aanya-sharma-2026-04-27.md`
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
