# Codex Task: Persona Stress Test - Woody

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Guest Profile: "Woody" Harrelson - High-Profile Talent (Dietary Restriction)**

I spend a significant amount of my time traveling for film projects, which means my dining experiences are rarely predictable. When I do attend private events—whether it’s a small dinner with collaborators or a larger fundraiser—the food has to be perfect, and more importantly, it has to be safe. I don't just have preferences; I have serious, documented allergies and complex dietary needs that require constant, flawless attention. I need to be able to relax and enjoy the people and the moment, not worry about cross-contamination or digestive issues.

### Business Reality

Right now:

- I attend **4-6** private dining, farm dinner, or ticketed events per quarter.
- My typical event spend is high; I anticipate needing accommodation and travel budgeted at least **$4,500** per major event, plus the actual event ticket/dinner cost, which is often **$150–$300** per person.
- I have multiple severe allergies (gluten, dairy, tree nuts) and require a strict, low-FODMAP diet, which must be communicated at every touchpoint.
- I am currently booked for a private film dinner at the Hauser & Wirth gallery in NYC on November 15th, with a headcount of 8, and I need specialized gluten-free, nut-free accommodations confirmed well in advance.
- My current communication setup is a chaotic mix: confirmation emails, follow-up texts from the planner, a separate dietary survey link that often expires, and sometimes nothing at all until the week of the event.

---

### Primary Failure: The Last-Minute Dietary Failure

The biggest operational problem is the breakdown of the dietary confirmation loop. If the kitchen staff or the event coordinator assumes my needs based only on a survey I filled out six months ago, or if they fail to re-confirm my specific restrictions 72 hours out, the entire experience is ruined. Getting sick, or even just having to visibly point out a mistake at a high-end event, costs me far more than just a meal—it costs my professional reputation, my comfort, and the trust I place in the venue. This failure creates immediate, high-stress anxiety that overshadows the entire purpose of the event.

---

### Structural Issue: Conflicting Confirmation Channels

I am constantly receiving confirmation details through 3-4 different channels (the initial email invite, the ticketing platform, the accommodation link, and a separate dietary questionnaire). I have to manually track which piece of information is the most current and authoritative. This requires me to maintain a separate spreadsheet or use multiple tabs open on my phone just to ensure the single source of truth for my dietary needs and seating is consistent. What breaks is when the physical menu or the day-of staff doesn't reflect the _most recent_ dietary confirmation I provided, forcing me to question the reliability of the entire system.

---

### Structural Issue: Menu Visibility and Allergen Clarity

The menus I receive are often beautiful, but they are terrible for me. They list ingredients, but they don't list _cross-contamination risk_ or _prepared options_. If the menu simply says "Bread Service," I don't know if that bread was baked on the same rack as the gluten-containing bread. I have to verbally ask the same question repeatedly—"Is this completely separate?"—to three different people (the server, the planner, the chef). What breaks is when the menu presentation is aspirational and beautiful, but functionally impossible for someone with severe, complex restrictions, forcing me to rely on verbal confirmation that is easily forgotten or misinterpreted.

---

### Structural Issue: The "Last-Minute Guest Change" Panic

If a guest needs to change their dietary requirement (for example, changing from GF to needing a specific vegan protein source), the current process is highly manual. I'm told to email the planner, who then has to manually update a spreadsheet, which then has to be forwarded to the kitchen manager. This delay creates a massive window of vulnerability. If the system doesn't provide an immediate, visible way to update my profile and have that change cascade instantly to the menu build, the entire food prep process is compromised.

---

### Structural Issue: Pre-Event Accommodation and Dietary Integration

My stay and my event dinner are often hosted at different locations (e.g., a hotel booking, followed by a restaurant booking). I need the system to confirm that the dietary requirements I listed for the _event_ are also acknowledged and accounted for by the _accommodation_ staff, particularly if the hotel has a private dining space. Currently, I have to call two separate departments (Hotel Concierge and Event Planner) to ensure my needs are recognized across the entire itinerary, creating unnecessary friction and making me feel like I am managing multiple, disconnected operations.

---

### Psychological Model

I optimize for: Absolute certainty and professional reliability. My time is valuable, and my physical well-being is non-negotiable.
I refuse to compromise on: The accurate, documented, and confirmed handling of my severe allergies and dietary needs.
I avoid: Having to repeat myself, dealing with ambiguous communication, or having to manually reconcile information from multiple sources.
I evaluate tools by: How quickly they can provide a single, definitive source of truth for all my dietary and attendance details, reducing my cognitive load to zero.

I think in terms of risk mitigation. I don't care about the flashiest features; I care about the robust, invisible processes that guarantee safety and accuracy. If I feel like I am doing the heavy lifting of coordinating my own safety, I assume the system is broken.

---

### Pass / Fail Conditions

For this system to work for me, it must:

1. The system must allow me to input, update, and view my severe allergies and dietary restrictions in one central profile that automatically cascades to the menu and staffing checklists.
2. The system must provide a clear, automated confirmation flow that alerts me (and the venue) 72 hours before the event if any mandatory piece of information (like my dietary needs) is missing or outdated.
3. The system must display the final, confirmed menu and highlight specific allergen-safe substitutions that have been pre-vetted by the kitchen, rather than just listing general ingredients.
4. The system must allow me to view my full event itinerary (including accommodation and event location) and confirm that my dietary needs are acknowledged by all associated service providers simultaneously.
5. The system must provide a single, dedicated, and easy-to-access communication channel for me to make real-time adjustments to my attendance or dietary needs, which are then immediately visible to the event planner and kitchen staff.
6. The system must generate a concise, physical, and digital summary card for the serving staff containing my full name, my specific allergies, and the approved safe menu options, ensuring no verbal communication is needed.
7. The system must provide a clear timeline of who (Planner, Chef, Catering Manager) is responsible for verifying my dietary needs at each stage of the process (booking, prep, service).

## Persona Type: Guest

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

Create file: `docs/stress-tests/persona-woody-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Woody

## Generated: 2026-04-27

## Type: Guest

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

| #             | Label | Type  | Date       | Score       | Method           | Report                                          | Key Finding    |
| ------------- | ----- | ----- | ---------- | ----------- | ---------------- | ----------------------------------------------- | -------------- |
| {next_number} | Woody | Guest | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-woody-2026-04-27.md` | {one sentence} |

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

codex/persona-woody

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

- [ ] Report exists at `docs/stress-tests/persona-woody-2026-04-27.md`
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
