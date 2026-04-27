# Codex Task: Persona Stress Test - Genevieve Chen

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Partner Profile: "Genevieve Chen" - Venue Owner (The Curator)**

I’ve spent a decade building my reputation on absolute reliability and flawless execution, so my venue, The Copper Spoon, isn't just a space—it's a statement. I pride myself on being the person who anticipates the problems before they even exist. My concern isn't just keeping the kitchen running; it’s keeping the entire ecosystem running smoothly, which, frankly, is proving much harder now that I have people working with me.

### Business Reality

Right now:

- We host an average of 14 private catering events a month.
- Our team size is three people: myself, a sous chef, and one prep cook.
- Our quarterly revenue sits between $350,000 and $375,000, with the bulk coming from high-end corporate functions.
- We service clients across three neighborhoods: River North, Fulton Market, and the West Loop.
- We currently manage inventory using a mix of Google Sheets and QuickBooks, which are never speaking to each other.
- Booking confirmations and vendor invoices are handled through separate email threads, leading to lost receipts and version control nightmares.

### Primary Failure: Vendor Compliance and Onboarding

The most stressful part of my week is managing the constant variability of our outside partners. Every single event requires external vendors—florists, specialized liquor distributors, specialty bakers. Because we are in such a desirable, high-traffic area, the city has extremely strict rules regarding noise, access, and cleanup deposits, and if any vendor—and I mean _any_ vendor—violates the noise ordinance or leaves debris, I am personally held accountable. Last month, a cake supplier used an unapproved generator that kicked on during setup, causing a massive headache and a $400 fine that was deducted from our cleanup deposit. My current workaround is having a printed "Vendor Rules Checklist" that I manually walk through with every single person, which is exhausting, time-consuming, and frankly, I know I’m forgetting steps.

### Structural Issue: Access and Resource Allocation

Our facility lease comes with ridiculously restrictive rules about kitchen access and utility usage. We have a fixed, small, prepaid deposit for utilities and cleanup, and if we exceed the parameters (e.g., over-washing, excessive specialized equipment usage), we face immediate fines or loss of access for the day. Right now, I have to manually track every single item—from the number of sheet trays used to the total cubic footage of waste generated—and cross-reference that against the lease agreement and the day's booking sheet. This is a terrifying, linear, physical accounting task that breaks down the moment I have to focus on the guest list.

### Structural Issue: Cross-Team Communication

My biggest pain point is the handoff process. When I’m in charge, I know exactly who is prepping what, where it needs to be, and when it needs to be out. Now that we have three people, communication is brittle. The sous chef and the prep cook are operating with different understandings of the day's menu adjustments, and I’ve noticed three separate instances this month where a dish was prepped using the wrong protein or the incorrect plating temperature because the notes written on the whiteboard were ambiguous or incomplete. I spend too much time policing basic information flow rather than overseeing quality control.

### Structural Issue: Contractual Oversight

Our relationship with key suppliers—like the exclusive coffee roast we must use, or the liquor house that gives us bulk discounts—is managed through a patchwork of email attachments, signed paper contracts, and personal phone calls. There is no centralized record of who signed off on what, the precise terms of our partnership, or when renewal penalties kick in. We had a minor issue last month where I had to dig through emails for twenty minutes just to confirm the exact terms of our discount tier because someone had started a conversation with an outdated contract version.

### Psychological Model

I optimize for: Predictability and Reputation. If I can predict the logistical needs of a venue and keep the operation running flawlessly, my reputation grows, and the revenue increases.
I refuse to compromise on: Compliance. The moment we cross a municipal line or violate a vendor agreement, my professional integrity is at stake.
I avoid: Ambiguity. Anything that requires me to stop, think, and manually check two different sources of truth is a complete waste of my time.
I evaluate tools by: How much _less_ stressful they make me feel. If it requires me to learn a complex system just to manage a single deposit limit, it's too much effort.

### Pass / Fail Conditions

For this system to work for me, it must:

1.  Require minimal manual input for resource tracking, specifically tying usage (e.g., specialized equipment, waste volume) directly to a centralized, auditable ledger.
2.  Automate the cross-referencing of external vendor activity (noise, clean-up times) against known local ordinance parameters and our active facility permits.
3.  Provide a single, real-time view of all team assignments and ingredient statuses, with automated alerts if a scheduled handoff is missed or if a key ingredient is depleted below a set minimum.
4.  Digitize and manage all vendor and supplier contracts, providing immediate alerts 90 and 30 days before renewal deadlines or compliance changes.
5.  Allow me to set mandatory "compliance gates" for external partners, ensuring no booking can proceed without verifiable digital proof of adherence to specific rules (e.g., insurance upload, final site walkthrough confirmation).
6.  Consolidate all financial data related to venue operations—deposits, fines, revenue, and vendor invoices—into one dashboard view, eliminating the need to switch between QuickBooks, Google Sheets, and email threads.
7.  Offer tiered access controls that allow my three employees to only see the information and tasks relevant to their immediate role, minimizing the chance of them accidentally or intentionally crossing operational boundaries.

## Persona Type: Partner

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

Create file: `docs/stress-tests/persona-genevieve-chen-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Genevieve Chen

## Generated: 2026-04-27

## Type: Partner

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

| #             | Label          | Type    | Date       | Score       | Method           | Report                                                   | Key Finding    |
| ------------- | -------------- | ------- | ---------- | ----------- | ---------------- | -------------------------------------------------------- | -------------- |
| {next_number} | Genevieve Chen | Partner | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-genevieve-chen-2026-04-27.md` | {one sentence} |

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

codex/persona-genevieve-chen

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

- [ ] Report exists at `docs/stress-tests/persona-genevieve-chen-2026-04-27.md`
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
