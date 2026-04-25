# Digital Twin Simulation Protocol

> **Status:** ready
> **Created:** 2026-04-24
> **Purpose:** Claude Code operates ChefFlow as Chef Bob using real dinner data to find every gap, bug, and friction point before the developer has to discover them himself.

---

## What This Is

The developer is a working private chef with real dinners coming up (late April through June). Instead of manually testing ChefFlow by operating it himself, Claude Code operates ChefFlow as "Chef Bob" using real-world dinner data the developer provides.

**This is not QA. This is operational simulation.** Claude uses the product exactly as a real chef would: no DB shortcuts, no direct SQL, no cheat codes. Everything through the UI via Playwright.

**The developer's only job:** answer questions when Claude asks. Provide raw data (text transcripts, menu ideas, client details). Review field reports. Decide what to build.

---

## Goals

1. Validate a chef can run real dinners end-to-end in ChefFlow
2. Discover gaps, broken flows, and missing features through actual use
3. Identify UX friction that only surfaces during real operation
4. Produce a prioritized build spec from simulation findings
5. Surface integration opportunities (SMS intake, email parsing, etc.)

## Non-Goals

- Building or fixing things during simulation (document only, never fix mid-run)
- Performance testing, security testing, or infrastructure testing
- Testing features that require real external services (Stripe charges, real email delivery)

---

## Existing Infrastructure

### Accounts (Already Created)

| Account     | Email                       | Password              | Role                    |
| ----------- | --------------------------- | --------------------- | ----------------------- |
| Chef Bob    | `chef-bob@chefflow.test`    | `ChefBobFlow!2026`    | Chef (primary operator) |
| Joy         | `emma@northandpine.co`      | `E2eClientTest!2026`  | Client (returning)      |
| Demo Client | `demo-client@chefflow.test` | `DemoClientFlow!2026` | Client (secondary)      |

**Auth endpoint:** `POST http://localhost:3000/api/e2e/auth` with `{ "email": "...", "password": "..." }`

**Existing agent prompts:** `docs/prompts/chef-bob-agent.md` and `docs/prompts/client-joy-agent.md` contain detailed persona and workflow specs. Read them for persona context but follow THIS protocol for execution.

### Tools

- **Playwright MCP** for all browser interaction
- **qa-tester agent** for structured test execution
- **Screenshot capability** at every step
- **Production build** on `localhost:3000` (NEVER use dev server 3100)

---

## Rules of Engagement

1. **UI only.** Every action goes through the browser via Playwright. No direct DB queries, no server action calls, no API shortcuts.
2. **Document, don't fix.** If something breaks, write it down and move on. Never fix bugs during simulation.
3. **No fabricating data.** When you need information, ask the developer. They have real answers.
4. **Stub recipes are OK.** Create minimal recipes to unblock menu building. Mark them `[STUB]` in the description. Developer will replace with real recipes later.
5. **Client switching is OK.** When a flow requires client action (approve quote, respond to message), switch to a test client account and perform the minimum required action.
6. **Screenshot everything.** Every significant screen, every error, every confusing moment. Save to `docs/simulation-reports/screenshots/`.
7. **Non-persistence.** All test data is disposable. Never hardcode into product code.
8. **No cheat codes.** If a feature doesn't work without direct DB access, that's a finding.
9. **Real behavior only.** Navigate like a real user. Click links, use the sidebar, follow the flows. Don't type URLs unless a real user would.

---

## Execution Structure

### Three Dinners, Three Sessions

Each dinner is a separate Claude Code session. This prevents context overflow and keeps reports focused.

| Dinner | Client Profile            | Acquisition Path                     | Target Date                    |
| ------ | ------------------------- | ------------------------------------ | ------------------------------ |
| 1      | Returning client (direct) | Someone who has used Chef Bob before | April 30 - May 3 (unconfirmed) |
| 2      | Referral client           | "My friend used your service"        | May (TBD)                      |
| 3      | New inbound client        | Found via website/text/cold outreach | June (TBD)                     |

The developer will provide real-world details for each dinner at the start of each session.

---

## Phase 0: Setup (Run Once)

**Goal:** Make Chef Bob a real, operational chef account with enough data to run dinners.

### 0.1 Environment Check

- [ ] Production build running on `localhost:3000`
- [ ] Playwright MCP responding
- [ ] Sign in as Chef Bob via auth endpoint; verify dashboard loads
- [ ] Sign in as Joy via auth endpoint; verify client portal loads

### 0.2 Chef Bob Profile Configuration

Sign in as Chef Bob. Navigate every settings page and configure:

- [ ] Display name, bio (short stub)
- [ ] Location: Haverhill, MA / Northeast MA / Southern NH
- [ ] Service types: private dinner parties, intimate gatherings, meal prep
- [ ] Booking page: set up slug, headline, pricing display
- [ ] Communication templates: create 2-3 (inquiry response, booking confirmation, follow-up)
- [ ] Any other settings that seem required for normal operation
- **ASK DEVELOPER:** pricing model (per-head, flat rate, ranges), typical price points, deposit policy

### 0.3 Stub Recipe Creation

Create 8-10 minimal recipes to enable menu building:

- 3 appetizers, 4 mains, 2 desserts, 1 side/salad
- Each needs: name, category, at least 3-4 ingredients with rough quantities
- Mark all with `[STUB]` in description
- These are temporary; developer will replace with real recipes later
- Use the recipe creation form (`/recipes/new`), not brain dump

### 0.4 Verify Client Accounts

- [ ] Joy exists and can sign in
- [ ] Demo Client exists and can sign in
- [ ] Create one additional test client via booking form submission if needed (for the "new inbound" scenario)
- Record all working credentials in setup report

### 0.5 Baseline Smoke Test

As Chef Bob:

- [ ] Can navigate dashboard, sidebar works
- [ ] Can view recipes list
- [ ] Can create a new event (create one, verify it appears, then delete it or leave as draft)
- [ ] Can view clients list, open Joy's detail page
- [ ] Can access financial pages

As Joy:

- [ ] Can view client portal
- [ ] Can see "my events" (even if empty)

### 0.6 Setup Report

Write to `docs/simulation-reports/phase-0-setup.md`:

- All account credentials verified
- Profile configuration completed (or what's missing)
- Recipes created (list them)
- Any issues discovered during setup
- Questions for developer

---

## Phase 1: Dinner Simulation (Run Once Per Dinner)

### Step 1: Data Intake (Interactive)

Ask the developer:

```
Ready to simulate Dinner [N]. Dump everything you have:

1. How did this client reach you? (text, email, call, referral, repeat?)
2. Raw transcript of initial contact (copy-paste texts/emails if you have them)
3. Client name (or alias)
4. Date and flexibility (confirmed? range? TBD?)
5. Location (your place? theirs? venue?)
6. Headcount (confirmed? estimated?)
7. Dietary restrictions or preferences mentioned
8. Budget discussed? Price quoted?
9. Menu ideas or requests
10. Any special circumstances (occasion, co-host, group dynamics, "pick 4 from 20")
11. What stage is this dinner at RIGHT NOW in real life?
12. Anything else I should know?

Raw is fine. Don't organize it. I'll structure it in ChefFlow.
```

### Step 2: Lead Intake

Enter this lead through ChefFlow's actual intake path:

- **If returning client:** find existing client record, create event from their profile
- **If referral:** how does a referred client enter ChefFlow? Use that path
- **If new inbound:** use the booking form or inquiry submission, whichever matches how they actually reached out
- **If there's no intake path for how they reached out:** this is finding GAP-001. Note it. Use the closest available path.

### Step 3: Client Record

- Open client detail page
- Enter all known details from the data dump
- Test: can Chef Bob record everything the developer told him about this client?
- Note any fields that are missing, confusing, or irrelevant

### Step 4: Event Creation

- Create the event with all known details
- Handle ambiguity naturally:
  - Unconfirmed date: does ChefFlow handle "sometime April 30 - May 3"?
  - Estimated headcount: can you say "6-8 people"?
  - TBD location: can you leave it blank and fill in later?
- Does the event creation wizard guide Bob through the right questions?

### Step 5: Menu Building

- Build a menu matching what the developer described
- If "20 courses pick 4": can ChefFlow handle group menu selection? Tasting menu format?
- If recipes don't exist for the dishes needed: create stubs, note this
- Does the menu flow from recipes to courses to event assignment feel natural?

### Step 6: Costing and Pricing

- Cost out the event using the menu
- Do ingredient costs populate? From where?
- Can Bob set a per-head price and see margins?
- Does the quote builder pre-fill from the event?
- Generate a quote

### Step 7: Client Communication

- Send the quote/proposal to the client
- What does the client receive? (email? portal notification? nothing?)
- Switch to client account: view the quote as the client
- Can the client respond, ask questions, accept?
- Switch back to Chef Bob: handle the client response

### Step 8: Event Progression

Walk the event through the FSM:

- draft -> proposed -> accepted -> paid -> confirmed
- At each transition: what triggers it? What changes in the UI? What notifications fire?
- Record a payment (or simulate deposit)
- Note any states that feel redundant or confusing

### Step 9: Execution Readiness

From Chef Bob's perspective on event day:

- Can he see everything needed to execute?
- Shopping list generated?
- Prep timeline visible?
- Equipment checklist?
- Client address and access details?
- Could a chef actually walk into a kitchen with just this screen?

### Step 10: Close-Out (If Time Permits)

- Walk through event completion
- Log tip, expenses, mileage
- After-action review
- Does the profit summary look right?

---

## Field Report Format

After each dinner simulation, write to `docs/simulation-reports/dinner-[N]-field-report.md`:

```markdown
# Dinner [N] Field Report: [Client Alias] - [Target Date]

## Scenario

[2-3 sentences: what this dinner is, how client reached out, key parameters]

## Data Provided by Developer

[Summary of raw data received]

## Lifecycle Scorecard

| Stage                | Status                    | Notes |
| -------------------- | ------------------------- | ----- |
| Lead intake          | pass/fail/partial         |       |
| Client record        | pass/fail/partial         |       |
| Event creation       | pass/fail/partial         |       |
| Menu building        | pass/fail/partial         |       |
| Costing              | pass/fail/partial         |       |
| Quoting              | pass/fail/partial         |       |
| Client communication | pass/fail/partial         |       |
| Client response      | pass/fail/partial         |       |
| Event progression    | pass/fail/partial         |       |
| Execution readiness  | pass/fail/partial         |       |
| Close-out            | pass/fail/partial/skipped |       |

## What Worked

- [GOOD-N]: [feature/flow] - [what happened, why it's good]

## Bugs Found

- [BUG-N]: [description]
  - Steps to reproduce: [exact clicks]
  - Expected: [what should happen]
  - Actual: [what happened]
  - Screenshot: [path if captured]
  - Severity: critical / major / minor
  - Codebase hint: [file/component if identifiable]

## Missing Features (Gaps)

- [GAP-N]: [what I tried to do that has no path]
  - Real-world context: [why a chef needs this]
  - Suggested approach: [one-line idea]
  - Priority: P0 (blocker) / P1 (important) / P2 (nice-to-have)

## UX Friction

- [UX-N]: [works but awkward/confusing]
  - Current behavior: [how it works now]
  - Better behavior: [how it should work]

## Integration Gaps

- [INT-N]: [external system that should connect but doesn't]
  - Example: "Client texted me about a dinner. No way to get that into ChefFlow without typing everything manually."

## Dinner Circle / Group Dynamics

- [DC-N]: [anything related to group coordination, shared menus, guest communication]

## Questions Asked to Developer

| Question | Answer | Impact on Simulation |
| -------- | ------ | -------------------- |
|          |        |                      |

## Key Insight

[One paragraph: the single most important thing this dinner simulation revealed about ChefFlow's readiness]
```

---

## Phase 2: Synthesis (Run Once After All 3 Dinners)

Read all three field reports. Compile into `docs/simulation-reports/synthesis-and-build-spec.md`:

```markdown
# Digital Twin Simulation: Synthesis Report

## Executive Summary

[3-5 sentences: overall ChefFlow readiness for real dinner operations]

## By the Numbers

- Total findings: [N]
- Bugs: [N] (critical: N, major: N, minor: N)
- Missing features: [N] (P0: N, P1: N, P2: N)
- UX friction: [N]
- Integration gaps: [N]

## Pattern Analysis

[Recurring themes across all 3 dinners. What keeps breaking? What keeps working?]

## Critical Path

[What MUST work for a chef to use ChefFlow for real dinners? Is it working?]

## Prioritized Build Spec

### P0: Blockers (fix before developer's first real dinner)

1. [Finding ID]: [description] - [suggested fix]

### P1: Important (fix within 2 weeks)

1. [Finding ID]: [description] - [suggested fix]

### P2: Polish (fix when possible)

1. [Finding ID]: [description] - [suggested fix]

### P3: Future (integration opportunities, new features)

1. [Finding ID]: [description] - [suggested approach]

## Recommended Build Order

[Numbered list: what to build first, second, third, based on impact and dependencies]
```

---

## Appendix: What Simulation Will NOT Cover

- Real Stripe payments (use simulation/test mode)
- Real email delivery (document what WOULD be sent)
- Mobile/PWA experience (desktop Playwright only)
- Multi-chef scenarios (single chef account)
- Long-term data patterns (single-session per dinner)
- Performance under concurrent load

These are noted so the developer knows simulation coverage boundaries.

---

## Appendix: Developer Interaction Protocol

The simulation agent will ask the developer questions during execution. Expected interaction pattern:

**Agent asks:** structured questions with numbered options when possible
**Developer responds:** raw, unstructured, real-world answers
**Agent never:** asks the same question twice, asks for data it can infer, waits for permission on routine operations

If the developer says "just make something up for now," create plausible stub data and mark it `[STUB]` in the field report.

If the developer provides data that contradicts what's in ChefFlow, trust the developer (they know the real-world state). Note the discrepancy.
