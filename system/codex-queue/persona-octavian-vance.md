# Codex Task: Persona Stress Test - Octavian Vance

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Public Profile: "Octavian Vance" - Food Journalist (Infiltrator)**

I live for the story—the quiet narrative that unfolds when high-end gastronomy meets intimate setting. My current project is deep into Chicago's emerging private dining scene, and honestly, I thrive on the logistical messiness of being _inside_ the action. I don't just write about amazing food; I need to experience the operation, from the prep list chaos to the plating drama, to really understand the friction points. My job demands access, and that access requires me to be an expert observer, which means I have to be incredibly self-sufficient and resource-minded.

### Business Reality

Right now:

- I cover 15-20 distinct private dining events per month across multiple neighborhoods (West Loop, River North, Fulton Market).
- My team is three people: myself (The Lead Researcher/Photographer), one dedicated Photo Assistant, and one Freelance Content Coordinator.
- My operational budget for equipment and minor logistics is about $3,500 monthly, which has been tight due to equipment rental costs.
- My geographic scope is intensely focused on high-density, upscale Chicago neighborhoods, requiring constant travel.
- I currently use Google Drive for all assets, Dropbox for backups, Trello for basic scheduling, and a mix of Excel and Notion for recipe/menu analysis.
- I use dedicated local storage drives (ruggedized models) for RAW photo dumps, which I manually transfer and categorize nightly.

### Primary Failure: Asset Management and Access Control

The biggest operational headache is managing the delicate flow of physical assets and permissions. When I'm deep in a kitchen, the chef's private notes, the seasonal prep list, and the finalized plating diagram are all scattered across paper, emails, and sticky notes. If I need to reference a specific allergy detail or a bespoke menu modification from last week's setup, I have to stop the flow, track down the right person, and rummage through files. This constant interruption is costly; it burns valuable time (time I could spend photographing or interviewing) and it creates a high risk of miscommunication. Once I'm in a private space, I need everything consolidated and instantly searchable, otherwise the entire narrative piece stalls.

### Structural Issue: Decentralized Communication & Approval Workflow

My team is spread out—I’m sometimes at a restaurant, the Coordinator is at a remote co-working space, and the Photo Assistant is sometimes pre-staging equipment. All approvals, from the final photo gallery selection to the draft quote needing a fact-check on the wine pairing, happen via email chains or WhatsApp threads. This creates an approval bottleneck that slows down my turnaround dramatically. If I get a draft piece out, I need immediate, structured feedback from multiple stakeholders (the editor, the chef, the food critic contact) and I can't afford to wait 48 hours for consolidated sign-off.

### Structural Issue: Workflow Scalability and Hand-Offs

Scaling from solo to a team of three has revealed fundamental weaknesses in how we manage the transition between tasks. When I move from "interviewing the Head Chef" to "photographing the final dish" to "writing the accompanying captions," the process of documenting _what happened_ and _why_ it mattered is completely manual. We are failing at systematic hand-offs. The Photo Assistant takes hundreds of shots, but linking those shots back to specific menu items, specific conversation points, or specific staff members requires me to manually tag everything afterward. This is incredibly redundant and makes quality control unpredictable.

### Structural Issue: Inventory and Equipment Tracking

Since my work involves highly specialized, rented equipment—everything from macro lenses and specialized lighting setups to unique audio recorders—tracking its deployment, condition, and return logistics is a nightmare. We are relying on physical checklists and shared spreadsheets. This system is prone to human error, especially when multiple people are dropping things off or picking things up in a high-stress, fast-moving environment like a professional kitchen. Losing track of even one key piece of gear means massive delays and unexpected replacement fees.

### Psychological Model

I optimize for: Contextual depth and immediate utility. If a system adds friction to the story-gathering process, it's useless. I need to see how the tool enhances the _narrative_ experience.
I refuse to compromise on: The ability to quickly pivot and switch focus (e.g., from logistics check to deep interview). The workflow must feel seamless, regardless of the physical location.
I avoid: Overly complex enterprise setups or tools that require too much upfront data entry that doesn't directly contribute to the final output.
I evaluate tools by: Their ability to integrate into an existing, mobile, high-pressure environment and minimize the 'context switch' friction.

### Pass / Fail Conditions

For this system to work for me, it must:

1.  Allow for real-time, geo-stamped photo and text annotation directly linked to a specific operational detail (e.g., "the way the garnish was placed").
2.  Serve as a single source of truth for all project assets, accessible securely on a mobile device, regardless of Chicago location.
3.  Automatically manage multi-stakeholder sign-off workflows, clearly documenting who saw what and when, without relying on email threads.
4.  Provide structured, easily adjustable inventory tracking for both physical and digital assets (e.g., tracking a specific lens serial number or a specific draft menu).
5.  Support highly customized, modular project templates that can be saved and redeployed for repeatable, complex assignments (e.g., "Private Dining Review Template").
6.  Maintain strict version control for text and images, making it simple to revert to previous states without losing progress.
7.  Require minimal manual setup and learn a core set of core functions within the first 15 minutes of use.

## Persona Type: Public

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

Create file: `docs/stress-tests/persona-octavian-vance-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Octavian Vance

## Generated: 2026-04-27

## Type: Public

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

| #             | Label          | Type   | Date       | Score       | Method           | Report                                                   | Key Finding    |
| ------------- | -------------- | ------ | ---------- | ----------- | ---------------- | -------------------------------------------------------- | -------------- |
| {next_number} | Octavian Vance | Public | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-octavian-vance-2026-04-27.md` | {one sentence} |

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

codex/persona-octavian-vance

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

- [ ] Report exists at `docs/stress-tests/persona-octavian-vance-2026-04-27.md`
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
