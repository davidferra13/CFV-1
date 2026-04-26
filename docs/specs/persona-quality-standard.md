# Persona Quality Standard

> Defines what makes a valid persona for the ChefFlow gap analysis pipeline.
> Every auto-generated and manually written persona must pass this standard.

---

## Who This Is For

- **Ollama** uses this to generate personas
- **Ollama** uses this to validate generated personas before they enter the pipeline
- **You** use this when writing manual personas
- **The pipeline** rejects anything that fails the rubric

---

## The Template

Every persona MUST contain these sections. Order matters. First person voice.

### 1. Identity Header (required)

```
**Chef Profile: "{Name}" — {Role/Specialty} ({2-3 word business model descriptor})**
```

Must include:

- **Full name** (real celebrity OR fictional but grounded)
- **Specific role** (not just "chef" - what KIND of chef/operator)
- **Business model in parentheses** (how they make money)

Examples:

- `"Marcus Samuelsson" — Multi-Concept Restaurant Operator (Brand + Scale + Culture)`
- `"Elena Voss" — Personal Chef for Ultra-High-Net-Worth Families (Privacy + Precision + Travel)`

### 2. Business Reality (required)

What they actually do day to day. Concrete numbers. No vague hand-waving.

MUST include:

- **How many active clients/events/locations** (specific number)
- **Revenue model** (per-event, retainer, salary, ticket sales, etc.)
- **Team size** (solo, 2-3 assistants, full brigade, subcontractors)
- **Geographic scope** (single city, regional, national, international)
- **Tech comfort** (uses spreadsheets, uses nothing, tried X and hated it, etc.)

Example:

```
Right now:
* I manage **4 private clients** on monthly retainers ($3,500-$8,000/mo each)
* I work **solo** with a part-time prep cook 2 days/week
* All clients are within 30 miles of Austin, TX
* I track everything in Notes app and a paper planner
* I tried a meal planning app once. Lasted 2 weeks.
```

### 3. Primary Failure (required)

The ONE biggest operational problem. Not a feature request. A real business pain point that costs them time, money, reputation, or sanity.

Must be:

- **Specific to their business model** (not generic "I need better scheduling")
- **Described as a consequence** (what happens because this doesn't exist)
- **Connected to real stakes** (money lost, clients lost, reputation risk, burnout)

### 4. Structural Issues (required, minimum 3)

Additional operational gaps BEYOND the primary failure. Each one must:

- Name the specific problem
- Describe what they do instead (the workaround)
- State what breaks because of the workaround

### 5. Psychological Model (required)

How this person thinks and makes decisions. Not personality fluff. Operational psychology.

Must include:

- **What they optimize for** (control, creativity, speed, relationships, money, reputation)
- **What they refuse to compromise on** (the non-negotiable)
- **What they avoid** (tech they hate, processes they skip, tasks they procrastinate)
- **How they evaluate tools** (first impression matters, needs to see ROI in a week, will only adopt if a peer recommends it, etc.)

### 6. Pass/Fail Conditions (required)

Concrete, testable statements about what the system must do for this persona.

- Minimum **5 pass conditions**
- Each must be specific enough to verify against the actual codebase
- Written as: "The system must [verb] [specific thing]" not "The system should support [vague category]"

---

## Quality Rubric

### PASS criteria (ALL must be true)

1. **Grounded identity**: You could Google this person (if celebrity) or picture them sitting across from you (if fictional). They feel like someone who exists.

2. **Specific numbers**: Client count, revenue range, team size, event frequency. No "several clients" or "various events."

3. **Real workarounds**: Every gap describes what they actually do today without the system. Paper planners, text messages, spreadsheets, memory, nothing. If there's no workaround described, the gap is hypothetical.

4. **No contradictions**: A gluten-free specialist doesn't need help finding gluten recipes. A solo operator doesn't have "team management gaps." A tech-averse chef doesn't complain about API integrations.

5. **Business model diversity**: The persona represents a business model that differs meaningfully from the last 5 personas processed. (Enforced at batch level, not individual.)

6. **Food industry grounding**: Every problem described is a real problem in the food service industry. Not software problems dressed up in chef language.

7. **Minimum 3 structural issues**: Primary failure alone is not enough depth to surface meaningful gaps.

8. **Testable pass/fail conditions**: Each condition can be checked against the codebase. "The system must allow me to..." not "The system should feel intuitive."

### FAIL criteria (ANY triggers rejection)

1. **Vague identity**: "A chef who does catering" with no name, no specifics, no personality.

2. **No numbers anywhere**: Everything is "some clients," "a few events," "occasionally."

3. **Generic pain points**: "I need better organization" or "scheduling is hard" without explaining WHY and WHAT SPECIFICALLY.

4. **Internal contradictions**: Business model doesn't match the gaps described.

5. **Fantasy operations**: Revenue or scale that doesn't exist in the real food industry. A solo private chef doing 200 events a month. A food truck with 50 employees.

6. **Software wishlisting**: Gaps that read like feature requests ("I want a drag-and-drop calendar") instead of business problems ("I double-book myself because I can't see all my commitments in one place").

7. **Copy-paste structure with different names**: Same gaps, same language, different character name. This produces zero new signal.

8. **Missing required sections**: Any of the 6 template sections absent or empty.

---

## Celebrity Seed Strategy

For auto-generation, use real public figures as seeds. This works because:

- Models have deep training data on their businesses, cuisines, philosophies
- Produces naturally diverse personas (Ramsay's empire vs. Alice Waters' farm-to-table vs. Roy Choi's food trucks)
- Grounds the persona in real operational constraints, not imagination
- Prevents the "bland mid-range caterer" failure mode

### Rules for celebrity seeds:

1. **Only use widely known public figures** in the food industry
2. **Adapt, don't copy**: Use their real business model and philosophy as a foundation, but the persona should represent their operational reality, not their media personality
3. **Include non-obvious operators**: Not just TV chefs. Include restaurateurs, caterers, food truck operators, meal prep businesses, culinary educators, food scientists, event producers
4. **Geographic diversity**: Not all NYC/LA. Include operators from rural areas, small cities, international contexts
5. **Scale diversity**: Solo operators through multi-unit empires
6. **Cuisine diversity**: Not all Western fine dining

### Starter seed categories:

| Category                        | Example Seeds                             | Why They're Useful                                             |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Multi-unit empire               | Gordon Ramsay, Jose Andres                | Tests scale, delegation, multi-location ops                    |
| Farm-to-table purist            | Alice Waters, Dan Barber                  | Tests sourcing, seasonality, supplier relationships            |
| Street food / trucks            | Roy Choi, the Halal Guys founders         | Tests high-volume, low-margin, mobile ops                      |
| Private/personal chef           | (fictional, based on real archetypes)     | Tests 1:1 client management, discretion, scheduling            |
| Catering operator               | (fictional, based on real archetypes)     | Tests large-event logistics, staffing, costing                 |
| Culinary educator               | Jacques Pepin, Samin Nosrat               | Tests recipe documentation, curriculum, student management     |
| Cannabis culinary               | (fictional, based on emerging industry)   | Tests compliance, dosing, guest safety                         |
| Meal prep / subscription        | (fictional, based on real businesses)     | Tests batch production, delivery, recurring clients            |
| Pop-up / supper club            | (fictional, based on real scene)          | Tests ephemeral events, waitlists, controlled access           |
| Medical/dietary specialist      | (fictional, based on real need)           | Tests constraint enforcement, compliance, health outcomes      |
| Pastry / bakery                 | Dominique Ansel, Christina Tosi           | Tests production scheduling, perishability, retail + wholesale |
| Disaster relief / institutional | Jose Andres (WCK), school lunch operators | Tests massive scale, nutrition requirements, cost constraints  |

---

## Validator Behavior

When the pipeline generates or receives a persona:

1. **Check all 6 required sections exist** (reject if missing)
2. **Check for specific numbers** in Business Reality section (reject if none)
3. **Check for at least 3 structural issues** (reject if fewer)
4. **Check for at least 5 pass/fail conditions** (reject if fewer)
5. **Check pass/fail conditions are testable** (flag if vague)
6. **Check against last 10 processed personas for duplicate gap patterns** (flag if >70% overlap)
7. **Score confidence 0-100** on how grounded/realistic the persona feels

Rejected personas go to `Chef Flow Personas/Failed/` with the rejection reason appended.

---

## What This Does NOT Define

- How to analyze a persona against the codebase (that's the analyzer's job)
- How to batch or synthesize results (that's the synthesis layer's job)
- What to build from the gaps (that's Claude/Codex's job)

This document ONLY defines: what is a valid input to the pipeline.
