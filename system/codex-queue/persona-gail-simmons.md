# Codex Task: Persona Stress Test - Gail Simmons

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Staff Profile: "Gail Simmons" - Event Service Captain (High-End Coordinator)**

I am the point person for the entire guest experience, from the moment the first vendor arrives until the last piece of china is cleared. I don't just manage the food; I manage the flow, the timing, the atmosphere, and the staff execution. My role is to ensure that every single guest, regardless of the size of the event—be it a 150-person gala or a 300-person corporate launch—experiences a flawless, seamless service that matches the client's budget and reputation. I am responsible for the entire staff deployment and quality control.

### Business Reality

Right now:

- I work 4 to 5 shifts per week, covering large-scale, high-stakes events that range from 150 to 300 guests.
- My pay is hourly, but my assignment details often require me to work 10-12 hour shifts with minimal guaranteed breaks, and I am responsible for managing 15-25 service staff members (servers, runners, captains).
- I am the lead captain for the event, requiring specialized training in high-volume service flow and client-facing crisis management. My uniform is a specific, branded service jacket that must be pristine.
- My scope is massive, covering multiple distinct zones within a single venue (e.g., the main ballroom, the cocktail hour patio, and the designated buffet line area).
- My current briefing and scheduling setup is a chaotic mix: I receive the master schedule in a shared Google Sheet, receive last-minute staffing swaps via text message from the Banquet Manager, and get detailed setup notes printed on 3-page, single-use physical planners that are often lost or illegible.

---

### Primary Failure: Communication Silos During Handoffs

The single biggest operational pain point is the lack of a single, real-time source of truth for status updates and handoffs. Because the schedule, the inventory count, the specific menu modifications for VIPs, and the staff deployment list are all scattered across Google Sheets, text chains, and physical binders, critical information is inevitably lost or delayed. For example, if the Executive Chef modifies the appetizer plating 30 minutes before service due to a supply issue, I won't know until a server tells me, potentially causing a service delay of 15 minutes and forcing a costly, visible scramble. This fragmentation leads to service inconsistency and directly impacts the client's perception of our professionalism, potentially costing us repeat business and requiring expensive, last-minute manual fixes.

---

### Structural Issue: Dynamic Staff Deployment Tracking

We currently use a combination of whiteboard markers and paper sign-in sheets to track who is assigned to which station (e.g., Station 1: Salad Service, Station 2: Wine Service). If one staff member calls out 2 hours before the shift, the Banquet Manager texts me, and I have to manually call the reserve list, cross-reference their skills, and then assign them. This is inefficient and error-prone. I need to know instantly, on a single platform, which staff members are qualified for specific tasks (e.g., "Wine Service Certified") and who is currently clocked in and available for reassignment.

---

### Structural Issue: Real-Time Menu/Ingredient Modification Tracking

If the Head Chef needs to swap out a key ingredient—for instance, changing the salmon preparation from lemon-dill to maple-mustard—I cannot track that change effectively. The change is communicated verbally or via a rapid-fire email, and the staff roster/menu guide is not updated until hours later. This forces me to constantly interrupt the service flow to correct servers, leading to confusion, incorrect garnishing, and wasted prep time because the team is working off outdated standards.

---

### Structural Issue: Event-Specific Service Checklist Generation

Every client has unique requirements—Client A requires 80% biodegradable plateware; Client B requires a specific wine pairing list printed in Italian; Client C requires the dessert service to be paced exactly 15 minutes after the main course clears. I currently have to take a master template and manually delete/add/rewrite items on a separate document for every single event, making it incredibly difficult to audit or ensure I haven't missed a critical compliance step (like mandatory allergy warning placement) specific to that event's setup.

---

### Structural Issue: Equipment and Venue Handoff Management

The transition between prep, service, and cleanup is a logistical nightmare. The cleaning crew needs to know exactly which kitchen stations (e.g., the main prep sink, the hot line station) are operational, which are temporarily out of commission, and what specific items need to be cleared _after_ service. Currently, we rely on a physical walkthrough checklist that is easily lost or requires 15 minutes of managerial time to review, creating delays in the crucial cleanup handoff and impacting the ability to prepare the space for the next client.

---

### Psychological Model

I optimize for: Flawless timing and seamless transitions between service phases (e.g., cocktail to seated dinner).
I refuse to compromise on: Guest experience consistency; if the client sees a glitch, I will feel the pressure.
I avoid: Any process that requires me to switch between more than three different digital interfaces or that requires reading a physical, handwritten note.
I evaluate tools by: How quickly they allow me to communicate a critical, time-sensitive change to 20+ people simultaneously, and how reliable they are under extreme, high-stress volume.

I think in terms of workflows, dependencies, and failure points. My decisions are always weighted by potential visibility and the cost of error. If a process adds friction or requires me to manage manual data transfer, it is a point of failure.

---

### Pass / Fail Conditions

For this system to work for me, it must:

1. The system must generate a real-time, interactive staff roster that shows immediate availability, current assignment (e.g., "Station 3: Hot Line"), and certified skills (e.g., "Wine Service").
2. The system must allow the Banquet Manager to push mandatory, time-sensitive updates (e.g., "Menu change: Salmon is now maple-mustard") directly to all assigned staff devices with an acknowledgment confirmation.
3. The system must house a client-specific event checklist that dynamically builds from a master template and allows managers to check off compliance items (e.g., "Biodegradable plateware confirmed") and assign ownership.
4. The system must provide a clear, digital handoff status report for the entire venue, detailing which specific kitchen zones (e.g., Prep Sink 1, Expo Line) are cleared, sanitized, and ready for the next client booking.
5. The system must allow me to schedule and adjust staff shifts (e.g., 12 staff members) for multiple different roles across a 10-hour window, and automatically flag any scheduling overlap or skill mismatch before the shift begins.
6. The system must house the official, approved version of all recipes and service standards, ensuring that when an ingredient or preparation method changes, the entire staff resource automatically updates the relevant menu details.
7. The system must allow me to create and distribute a comprehensive, multi-day event run-of-show document that can be edited collaboratively by the Chef, the Sales Manager, and the Operations Lead, with version control visible to all parties.

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

Create file: `docs/stress-tests/persona-gail-simmons-2026-04-27.md`

The report MUST follow this exact structure:

# Persona Stress Test: Gail Simmons

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
| {next_number} | Gail Simmons | Staff | 2026-04-27 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-gail-simmons-2026-04-27.md` | {one sentence} |

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

codex/persona-gail-simmons

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

- [ ] Report exists at `docs/stress-tests/persona-gail-simmons-2026-04-27.md`
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
