---
name: market-research-router
description: Route ChefFlow market research, user segment, buyer, persona, audience, vendor, chef, client, staff, guest, public buyer, competitor, or demand questions to the right evidence sources and audience lenses. Use when Codex needs to decide who "market research" is calling on, whether to consider chefs, clients, vendors, staff, guests, public buyers, developers, or operators, and whether the answer may rely on real evidence, persona simulation, public research, or developer intent.
---

# Market Research Router

Use this skill when the user asks whether a ChefFlow idea is wanted, who it serves, or what audience should be consulted.

## Audience Selection

Choose only the relevant lenses:

- `chef`: solo private chefs, meal prep chefs, catering chefs, estate chefs, teaching chefs, pop-up chefs.
- `client`: home hosts, recurring households, corporate planners, wedding clients, vacation rental hosts.
- `guest`: dietary-restricted guests, attendees, VIPs, children, plus-ones.
- `vendor`: farms, purveyors, rental providers, specialty suppliers, bakeries, fishmongers, butchers.
- `staff`: sous chefs, prep cooks, servers, bartenders, event captains, delivery helpers.
- `partner`: venues, planners, referral partners, farms, collaborators, photographers.
- `public`: searchers, local food buyers, press, followers, gift buyers.
- `developer-operator`: code maintainers, David as operator, internal agents, host and infrastructure needs.

Use the developer-operator lens only for implementation feasibility, operational risk, developer workflow, internal tooling, maintainability, or system design. Do not use it as a proxy for customer demand.

## Evidence Ladder

Classify the strongest available evidence before making a claim:

1. `real-user`: direct feedback, interviews, support notes, usage data, CRM notes, survey responses.
2. `launched-survey`: survey launched and analyzed.
3. `dogfood`: current app walked through as a real workflow.
4. `codebase`: verified implementation or absence in code.
5. `persona-synthesis`: persona stress tests or synthesized persona gaps.
6. `public-market`: current external sources, only after browsing when needed.
7. `developer-intent`: David explicitly wants it.
8. `no-evidence`: no credible support yet.

## Routing

- If real feedback or survey evidence is required, use `validation-gate`.
- If persona evidence is useful but not decisive, use `persona-stress-test`, `persona-inbox`, or `findings-triage`.
- If external market facts may have changed or recommendations affect spend or strategy, use web research with current sources.
- If the question is about existing ChefFlow capability, use `research` or direct code inspection.
- If the output should become a build task, use `evidence-broker` before `builder`.

## Output

```text
MARKET RESEARCH ROUTE

QUESTION: [optimized question]
AUDIENCE LENSES: [selected lenses]
EXCLUDED LENSES: [lenses intentionally not used]
STRONGEST EVIDENCE: [classification]
MISSING EVIDENCE: [what would make this real validation]
NEXT SKILL: [skill]
CLAIM LIMIT: [validated claim | evidence-backed hypothesis | simulation-only hypothesis | unknown]
```

## Guardrails

- Never imply Codex contacted real people unless the user provided actual interview, survey, CRM, or usage artifacts.
- Never merge chefs, clients, guests, vendors, and staff into "users" when their incentives differ.
- Never let a persona-generated gap become a build task without codebase validation and validation-gate classification.
