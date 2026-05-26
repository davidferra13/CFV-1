# Exit Scenario Stress Test Prompt

> Paste this into a fresh session to continue systematic evaluation of all 95 exit scenarios.

---

## PROMPT

You are working on ChefFlow, a chef operations platform. We identified 95 scenarios where a chef leaves ChefFlow to use an external tool. These are cataloged in `docs/research/chef-exit-points-analysis.md`.

We stress-tested scenario #58 (weather for outdoor events) and discovered a foundational insight: many scenarios originally classified as "bridgeable" (smooth the round-trip) are actually **reducible** (eliminate the exit entirely) because:

1. ChefFlow already has the context (event date, location, client, ingredients, recipes, prices)
2. The external tool is just a data source, not a platform
3. The data is free or cheap
4. The data is static or slow-changing
5. The chef only needs a slice of the external tool, not the whole thing

This produced the **"source it, don't link it"** principle: when ChefFlow already has the context and the external tool is just serving data, ChefFlow should drink from that data source directly and present exactly what the chef needs, scoped to their events/clients/recipes. The external tool becomes a SOURCE, not a DESTINATION.

### The Weather Exemplar

Scenario #58 (check weather for outdoor events) was stress-tested into a full spec (`docs/specs/event-weather-intelligence.md`). Key design decisions:

- **Three-tier progressive disclosure:** Tier 1 = quiet glance on event card ("72F, rain after 4pm"). Tier 2 = hourly breakdown scoped to event time window. Tier 3 = deep tabs (pollen, UV, air quality). No bombardment. Everything tucked behind progressive taps.
- **Temporal coverage:** Future events get forecasts, today gets live data, past events show historical actuals (chef learns patterns across seasons).
- **Dual-surface (chef + client):** Weather appears on chef's event detail AND on the client's Dinner Circle header. Client sees "Saturday: 74F, clear skies, sunset at 8:12pm" and never sends the "what's the weather?" text. Remy includes weather naturally in confirmation emails. This is the God-Tier pattern: things that DISAPPEAR from the chef's inbox because the system answered the question before the client asked it.
- **Chef-appropriate language:** "Rain starts around 4pm" not "Precipitation probability exceeds 60% at 1600."

### What was already reclassified (19 scenarios)

Read `docs/specs/exit-scenario-reclassification-sprint.md` for the full list. These 19 were identified as immediately actionable. Priority order by pain-frequency vs effort:

1. #74 Recipe scaling (pure math, per menu)
2. #75 Unit conversion (pure math, per recipe)
3. #23 Food safety reference (static data)
4. #72 Calendar sync (iCal feed, daily pain)
5. #58 Weather widget (free API, full spec written)
6. #22 Nutritional info (USDA data, existing JSON)
7. #24 Substitution engine (data already in substitutions.json)
8. #7 Margin modeler (PIE infrastructure exists)
9. #38 Payment status (Stripe integration exists)
10. #73 Mileage tracking (distance calculation)
    11-17: Nearby stores, seasonal availability, day map, timezone math, prep timeline, waitlist, recurring events

### Your task

Continue the stress test across ALL remaining scenarios (76 not yet evaluated). For each:

**Step 1: Apply the 5-question rubric**

1. What context does ChefFlow already have?
2. Is the external tool just a data source?
3. Is the data free or cheap?
4. Is the data static or slow-changing?
5. Would a chef need the FULL external tool, or just a slice?

**Step 2: Reclassify if warranted**

- If answers point to "source it": reclassify Bridgeable -> Reducible. Write a spec sketch (problem, data source, where it appears, progressive disclosure tiers, chef language, done-when).
- If partially reducible: identify what ChefFlow absorbs vs. what stays external.
- If truly permanent: confirm it. But still apply the Rich Data Interchange mandate (below).

**Step 3: Apply the dual-surface test (from weather exemplar)**
For every scenario, ask: "Does the CLIENT benefit from seeing this too?" If yes, it belongs on Dinner Circles, portal, or Remy emails. Every piece of intelligence on a client surface is one fewer text the chef has to answer.

**Step 4: Apply the Rich Data Interchange mandate**
Even for permanent exits, ChefFlow must:

- **Outbound:** Pre-load the exit with context (deep link with address, pre-composed message, clipboard-ready data). Chef never manually assembles the exit.
- **Inbound:** When chef returns, ChefFlow has a place to store what was learned (venue notes, vendor contact, price found, call summary). No data loss on the round-trip.
- **Shared:** When data leaves ChefFlow (share, export, link), it carries FULL structured context. Not bare links. Rich preview cards, formatted text bodies, Open Graph meta tags.

### Evaluation rubric per scenario

For each of the 95 scenarios, produce:

| Field                  | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| #                      | Scenario number                                                      |
| Current classification | Permanent / Reducible / Bridgeable                                   |
| Reclassification       | Same / Bridgeable->Reducible / Bridgeable->Partially Reducible       |
| Context ChefFlow has   | What data we already know                                            |
| External tool's role   | Data source / Platform / Communication channel / Creative tool       |
| Data cost              | Free / Cheap API / Expensive / N/A                                   |
| Data volatility        | Static / Slow-changing / Real-time / N/A                             |
| Chef needs full tool?  | Yes (permanent) / No, just a slice (reducible)                       |
| Client-facing?         | Does the client benefit from seeing this on their Circle/portal?     |
| Outbound handoff       | How ChefFlow pre-loads the exit (deep link, pre-composed text, etc.) |
| Inbound capture        | How ChefFlow stores what chef learned on the trip                    |
| Priority               | Pain frequency x effort = priority rank                              |
| Spec sketch            | 2-3 sentence build description if reducible                          |

### Philosophical guardrails

- **It's okay that the chef leaves.** Extremely practical. We just set them up for 100% success on the round-trip.
- **The exit isn't the failure.** The failure is: can't find way back, loses context, can't store what was learned, had to manually assemble the exit.
- **100% success = every exit is a round-trip with no data loss and no cognitive load.**
- **Progressive disclosure always.** Show everything, but tab it. Default view is quiet. Deep data is one tap away. Weird stuff most chefs rarely check is two taps away. Never bombard.
- **Chef language, not engineer language.** "Rain starts around 4pm" not "Precipitation probability exceeds 60%."
- **Measure by what DISAPPEARS.** Success metric is not "chef found data faster." It's "that text message / Google search / spreadsheet session never happened."

### Reference files

- `docs/research/chef-exit-points-analysis.md` (all 95 scenarios)
- `docs/specs/event-weather-intelligence.md` (exemplar spec from stress test)
- `docs/specs/exit-scenario-reclassification-sprint.md` (19 already reclassified)
- `docs/specs/zero-friction-exit-handoffs.md` (companion handoff spec)
- `docs/research/chef-never-leaves-analysis.md` (353 workflows that stay in-app)
- Memory: `project_rich_data_interchange.md` (foundational sharing mandate)

### Output format

Produce the evaluation as a single markdown file at `docs/specs/exit-scenario-full-evaluation.md`. Group by category (same 17 categories as the original analysis). Include the rubric table for every scenario. End with:

1. Updated reclassification counts
2. Revised priority list (all actionable scenarios ranked)
3. "Next 10 to build" recommendation based on pain-frequency x effort x client-impact
