# Codex Task: Persona Stress Test - Aurelia Vance

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Client Profile: "Aurelia Vance" - Luxury Event Curator (Visionary)**

I run a highly specialized catering service dedicated exclusively to premium real estate open houses in the greater Seattle area. My clients expect an experience that is both impeccable and seamless; the food needs to elevate the property's perceived value without breaking the budget. I thrive on the intersection of design and dining, constantly pushing the boundaries of what temporary, luxury catering can be.

### Business Reality

Right now:

- **Events per month:** 3–5 (with 2 dedicated to my new market expansion).
- **Team size:** 8 core staff (2 Sous Chefs, 3 Prep/Line Staff, 3 Logistics/Service).
- **Revenue:** $20,000 average per event (premium tier).
- **Geographic scope:** Currently focused on Queen Anne and Capitol Hill, but aggressively expanding into Bellevue and Redmond.
- **Current tools used:** Google Sheets (for inventory and headcount), Slack (for daily comms), QuickBooks Online (for invoicing), and a shared Dropbox folder (for inspiration/menus).

### Primary Failure: Predictive Inventory Waste

The moment I expand into new geographic zones, my inventory forecasting collapses. Currently, I rely on manually correlating historical event data (attendance estimates, time of day, property type) within a chaotic Google Sheet. For my new Bellevue clients, where properties tend to be larger and more formal than my existing Queen Anne base, I can't predict the necessary scale or the necessary variety of specialized, perishable items like imported goat cheese or microgreens. Because I over-order ingredients for the new markets, I accumulate $1,500–$3,000 worth of spoilage per month, plus the labor hours spent cleaning up excess waste, which erodes my margins before I even arrive on site.

### Structural Issue: Cross-Market Compliance Drift

As I move from my established, West Seattle base to the more regulated, corporate-heavy environments of Bellevue, my operational checklists are falling apart. I have separate, paper-based checklists for every different municipality—one for allergen handling in Queen Anne, another for specific vendor load-in requirements in Capitol Hill, and yet another draft I keep updating for Redmond. This creates "compliance drift." When a site manager calls me and asks about the specific fire marshal permits needed for a high-rise load-in in a new area, I have to manually check three different, conflicting documents, leading to delays and the potential for costly, last-minute service interruptions.

### Structural Issue: Labor Assignment Bottlenecks

Our most significant bottleneck isn't the cooking; it's the transition between the prep kitchen and the service window. I currently manage staffing by sending out group texts and updating a shared Google Sheet that nobody ever keeps current. When I need a specialized service staff (e.g., someone who can elegantly plate canapés versus someone who can manage a buffet flow), I assign them based on who is physically available that morning. This "nearest available" model means I often send a generalist when I desperately need a specialist, leading to wasted time, slowed service, and, crucially, a visibly disjointed guest experience.

### Structural Issue: Inspiration-to-Action Lag

My entire brand relies on being innovative; I am paid to anticipate trends. However, gathering inspiration from new property architecture, local art installations, or emerging culinary styles—which are my competitive differentiators—is a completely manual, scattered process. I collect mood boards and vendor contacts in a haphazard mix of email threads, Pinterest boards, and physical notebooks. The effort to synthesize this raw, qualitative data into a concrete, actionable, and executable menu plan for a specific time slot is immense. It wastes my time, which is my most expensive resource.

### Psychological Model

I optimize for: **Elegant Efficiency.** I want to feel like I am magically producing a high-end, bespoke experience with minimal visible effort.
I refuse to compromise on: **The Wow Factor.** If the food or the service feels generic, I fail. The presentation must tell a story that matches the property's narrative.
I avoid: **The "Almost There" Feeling.** I hate inefficient friction, whether it's a slow load-in or a cumbersome piece of software. If the workflow requires multiple logins or manual copy-pasting, I will ditch it immediately.
I evaluate tools by: **Scalable Adaptability.** Does this tool allow me to maintain quality while I physically move my operation from the PNW to the entire Pacific Seaboard? Can it handle complex, multi-variable data sets without needing a full-time data analyst?

### Pass / Fail Conditions

For this system to work for me, it must:

1.  Integrate multi-source, variable input data (e.g., property photos, calendar dates, local regulations) to generate a comprehensive, predictive inventory manifest.
2.  Automatically flag or alert me when predicted ingredient spoilage exceeds a specific cost threshold based on historical waste patterns and current event metrics.
3.  Maintain a centralized, editable repository of compliance data (permits, local vendor requirements, safety protocols) that is instantly filterable by new ZIP codes or municipal zones.
4.  Support the creation of complex, shifting labor matrices that assign specialized roles (e.g., "artisan plating specialist," "high-volume flow manager") rather than just headcount.
5.  Provide a dynamic content hub where I can upload qualitative data (mood boards, market research, vendor inspiration) and have it systematically mapped against menu structure suggestions.
6.  Be accessible and functional via a tablet or mobile interface in a high-pressure, non-traditional office environment (i.e., a bustling house with limited power).
7.  Allow for rapid, segmented revenue tracking that can differentiate between the revenue generated from my established market vs. the revenue generated from my new expansion market.

## Persona Type: Client

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

Create file: `docs/stress-tests/persona-aurelia-vance-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Aurelia Vance

## Generated: 2026-04-27

## Type: Client

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

| #             | Label         | Type   | Date       | Score       | Method           | Report                                                  | Key Finding    |
| ------------- | ------------- | ------ | ---------- | ----------- | ---------------- | ------------------------------------------------------- | -------------- |
| {next_number} | Aurelia Vance | Client | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-aurelia-vance-2026-04-27.md` | {one sentence} |

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

codex/persona-aurelia-vance

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

- [ ] Report exists at `docs/stress-tests/persona-aurelia-vance-2026-04-27.md`
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
