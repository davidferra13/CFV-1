# Codex Task: Persona Stress Test - Elara Moreno

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Staff Profile: "Elara Moreno" - Food Photographer (Archivist)**

I live for the moment the perfect shot is captured—that ephemeral glow on the steam, the precise angle of a stacked charcuterie board. While I thrive on the creative chaos of an emerging concept, my process is secretly governed by an obsessive need for structure. I treat every event like an archaeological dig: beautiful, complicated, and requiring meticulous documentation. Right now, I'm facing my biggest professional test yet—the kind of six-figure event that determines if I'm a hired hand or a true creative partner. I need the entire culinary process, from initial plating to final service, to be mapped out so that my creative needs don't bleed into the operational chaos.

### Business Reality

Right now:

- Minimum 4 events per month, ranging from high-end private dinners to commercial product launches.
- My core team is 1 (me) plus 2 freelance styling/plating assistants.
- Average event revenue is $8,000 - $15,000, with a recent client pushing me into the six-figure range.
- Geographically focused on the Austin food scene, but expanding to corporate venues across the Austin metro area.
- Current tools include Google Sheets (for basic shot lists), Trello (for asset tracking), and a mix of proprietary DSLR gear and portable LED panels.

### Primary Failure: Pre-Service Throughput Management

My biggest headache is the plating timeline. When I get the initial concept, I’ll meticulously plan the shots—the macro views, the wide glamour shots, the dramatic overhead—and then I hand that timeline over to the kitchen. What breaks is the disconnect between my required _shot window_ and the kitchen's _production window_. I can’t force a chef to wait for me to adjust a lighting reflector, nor can I stand there setting up a specialized backdrop while the pastry station is actively making final components. My current workaround is physically taping timelines to the back of the venue restroom door, but that’s inefficient, impossible to update in real time, and often completely ignored when the adrenaline hits. This lack of synced scheduling costs me precious shots, and worse, it risks making the entire plating process feel rushed and uninspired.

### Structural Issue: Lighting and Setup Conflict

We have absolutely no systematic way to manage my physical setup requirements relative to the kitchen schedule. I need specific time blocks to build and test lighting setups—moving stands, diffusion screens, specialized reflectors—which can take 45 minutes to an hour. My current system is using email chains and text messages with the Venue Manager. This breaks down because the venue itself is a shared space; I might reserve the corner of the back room, only to find that the florist needs that exact space for their floral design team at the same time. I need a single, dynamic spatial planner that shows when certain areas are blocked off by other departments, so I can schedule my setup time realistically and non-invasively.

### Structural Issue: Service Flow Interference

The most terrifying thing is the actual service period. I need to capture the _action_ of the food—a wine pour, the final dusting of paprika, the server placing the plate—but I cannot be the bottleneck. My current workaround is having a dedicated "spotter" who tracks my shot list and buzzes me when the perfect moment occurs. But that spotter is constantly overwhelmed because they don't know the plating schedule, or which dish is coming out next. If the schedule changes by even 15 minutes, the spotter is flying blind, and I lose the narrative flow of the service itself.

### Structural Issue: Asset and Ingredient Tracking

I am often responsible for styling multiple dishes that use the same core ingredients (e.g., different preparations of heirloom tomatoes). Currently, I track ingredients using a binder and manually checking off boxes. When the plating team runs out of one specific garnish (say, micro-basil), nobody knows until I ask, which breaks the flow. I need a real-time inventory counter tied to the plating station that alerts the assistant _before_ the item is exhausted, linking the inventory to the recipe sheet I'm using for the shot list.

### Psychological Model

I optimize for: Fluidity and detail. My workflow must transition seamlessly from highly controlled, meticulous setup (the organization) to spontaneous, creative capture (the chaos).
I refuse to compromise on: The integrity of the light, or the integrity of the moment. If I can't control the lighting setup and the timing of the shot, the final product feels cheap and uncurated.
I avoid: Being yelled at or being told to "just wing it." I thrive on knowing the choreography minutes before the curtain rises.
I evaluate tools by: How quickly they can provide a comprehensive, interdepartmental view of time, space, and resources without needing constant human intervention.

### Pass / Fail Conditions

For this system to work for me, it must:

1.  Allow dynamic drag-and-drop scheduling that integrates prep time, setup time, and service timelines simultaneously.
2.  Provide a visual floor plan view that marks areas as occupied or available in real-time based on scheduled department usage.
3.  Function as a master communication hub that sends granular, targeted alerts (e.g., "Plating: Dish X, Station 3, Ready in 5 minutes") rather than general notifications.
4.  Integrate a quantifiable, real-time inventory tracker for styled ingredients directly into the workflow timeline.
5.  Allow me to upload detailed, multi-layered shot lists that dictate not just the photo, but the precise physical setup needed (lighting, backdrop, props).
6.  Generate automated, printable, and digitally shareable "Run Sheets" that can be instantly sent to every department head (Pastry, Garde Manger, Service) and automatically update when timings shift.
7.  Be accessible and usable on a variety of devices (tablet, phone) without requiring complex technical setup or extensive training time.

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

Create file: `docs/stress-tests/persona-elara-moreno-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Elara Moreno

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

| #             | Label        | Type  | Date       | Score       | Method           | Report                                                 | Key Finding    |
| ------------- | ------------ | ----- | ---------- | ----------- | ---------------- | ------------------------------------------------------ | -------------- |
| {next_number} | Elara Moreno | Staff | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-elara-moreno-2026-04-27.md` | {one sentence} |

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

codex/persona-elara-moreno

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

- [ ] Report exists at `docs/stress-tests/persona-elara-moreno-2026-04-27.md`
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
