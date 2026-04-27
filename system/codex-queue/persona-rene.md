# Codex Task: Persona Stress Test - Rene

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Staff Profile: "Rene" - Prep Kitchen Assistant (Foraging Specialist)**

I am the person responsible for translating the day’s wild bounty into usable components. My role is less about cooking and more about high-volume, specialized prep: cleaning, preserving, and preparing ingredients that arrive unpredictably. I work directly with the raw material, making me the critical link between the source and the final dish.

### Business Reality

Right now:

- I work an average of **5** shifts per week, covering both prep days (Monday-Thursday) and service days (Friday-Sunday).
- My pay is an hourly rate of **$25-$30**, plus a volatile bonus structure based on the successful utilization of specialized, high-cost ingredients (e.g., wild truffle, seasonal coastal harvests).
- I am a certified food handler and have specialized training in wild ingredient identification and preservation techniques (pickling, drying, smoking). My availability is often constrained by my need to participate in early-morning sourcing trips.
- My scope is highly specialized, focusing on the immediate prep and breakdown of seasonal, foraged, and regional ingredients, often requiring dedicated cold storage and specialized processing stations.
- My current briefing and scheduling setup is a chaotic mix: a shared Google Sheet for macro-scheduling, text message updates from the Head Chef regarding last-minute ingredient arrivals, and printed, hand-written prep lists that are almost always outdated by the time I get to the kitchen.

---

### Primary Failure: Inaccurate Ingredient Handoff and Prep List Drift

The single biggest operational problem is the gap between the sourced ingredient and the actual prep list. Because my ingredients are hyper-seasonal and unpredictable (e.g., "we found 12 kg of coastal algae today, but only 5 kg of mushrooms"), the prep list changes hourly. This means I often spend time cleaning, sorting, and prepping materials that are suddenly deemed unusable or are superseded by a last-minute discovery. This leads to significant labor waste, lost prep time, and stress, because I cannot efficiently transition from receiving, to processing, to organized storage, without manual intervention. It costs us not just labor hours, but the potential for dishes that could have been executed smoothly.

---

### Structural Issue: Volatile Ingredient Manifesting

The problem is that the ingredient manifest (what we _should_ have) is separate from the sourcing manifest (what we _actually_ have). Our current workaround is the Head Chef manually updating a shared Google Sheet, which is immediately outdated when the sourcing team arrives. When the actual ingredient list is received, I must manually cross-reference it against the prep list, often leading to redundant prep or the failure to prep crucial components because the manifest was never updated.

### Structural Issue: Multi-System Scheduling Chaos

The scheduling is managed via a separate HR platform, but the actual _role_ and _task_ assignments (e.g., "Today, focus entirely on cleaning and prepping the smoked roots," vs. "Today, assist with the dry goods and mise en place") are communicated via text message. This forces me to constantly switch mental gears and track conflicting instructions, making it impossible to plan my workflow or manage my physical time within the prep area.

### Structural Issue: Lack of Prep-to-Service Workflow Linkage

My prep work is highly specialized and directly feeds specific service menus. Currently, the connection between a prep task (e.g., "pickle the sea beans") and the specific service booking or menu item it supports is purely mental and documented on sticky notes. When a service changes its menu or capacity (e.g., dropping from 80 covers to 40 covers), I have no way of knowing which prep tasks are now redundant, leading to unnecessary labor or incomplete components.

### Structural Issue: Disjointed Storage and Inventory Tracking

Because my ingredients are unique and highly perishable (e.g., delicate root vegetables, delicate algae), they require specific storage conditions (e.g., 0°C, vacuum sealed, labeled by date and source). Currently, I use physical tags and color-coded bins, and when a Prep List changes, I have no digital way to track which batch of ingredient was used, how much is left, or if it needs to be prioritized for use before it spoils.

---

### Psychological Model

I optimize for: Efficiency in the raw material pipeline—getting from wild harvest to usable component with minimal loss and maximum speed.
I refuse to compromise on: The integrity of the ingredient data—if the source, date, and handling notes aren't recorded immediately, the ingredient loses its value.
I avoid: Spreadsheets that require constant manual updating or any system that forces me to input data I don't have immediate access to.
I evaluate tools by: How quickly they can consolidate volatile data points (source, quantity, task, expiry) into a single, actionable workflow, minimizing clicks.

I think like a quality control specialist mixed with a logistics manager. My decision-making is driven by resource scarcity—both time and material. I need the system to anticipate the _next_ necessary step, not just list all the current tasks.

---

### Pass / Fail Conditions

For this system to work for me, it must:

1.  The system must dynamically accept ingredient inputs (via photo/text) from the sourcing team and instantly update the prep list and inventory count.
2.  The system must allow me to assign specific prep tasks to specific, time-sensitive ingredients, flagging components that are approaching their optimal use date.
3.  The system must link prep tasks directly to menu items and service bookings, automatically calculating necessary prep quantities based on projected covers.
4.  The system must provide a clear, single-source-of-truth schedule that combines my assigned role, the required prep tasks, and the actual ingredients I need to access.
5.  The system must facilitate the creation of temporary, highly specific ingredient manifests that can be instantly updated and archived, proving the source and quantity of raw materials used for costing.
6.  The system must allow me to categorize and track specialized storage requirements (e.g., "Deep Freeze," "Humidity Controlled," "Dry Shelf") for accurate inventory management.
7.  The system must provide a digital checklist for the completion of prep steps, allowing me to sign off on the readiness of a component for the service kitchen, reducing verbal handoffs.

## Persona Type: Staff

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

Create file: `docs/stress-tests/persona-rene-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Rene

## Generated: 2026-04-27

## Type: Staff

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

| #             | Label | Type  | Date       | Score       | Method           | Report                                         | Key Finding    |
| ------------- | ----- | ----- | ---------- | ----------- | ---------------- | ---------------------------------------------- | -------------- |
| {next_number} | Rene  | Staff | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-rene-2026-04-27.md` | {one sentence} |

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

codex/persona-rene

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

- [ ] Report exists at `docs/stress-tests/persona-rene-2026-04-27.md`
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
