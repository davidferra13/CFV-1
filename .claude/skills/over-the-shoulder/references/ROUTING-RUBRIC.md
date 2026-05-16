# Routing Rubric

Use this rubric to select lenses without flooding the answer.

## Default Behavior

The agent owns classification. The user should not need to name the category, company, or lens. Infer the category from the full context first, then route.

Use user-specified lenses as overrides only when the user names them. If the user gives no lenses, do not ask them to choose unless the available context is too thin to distinguish between materially different outputs.

## Context Signals

Classify from these signals before scoring lenses:

- Conversation: latest request, earlier feature discussion, named pain points, desired outcome.
- Repo context: relevant route, component, server action, API, docs, queue item, tests, screenshots.
- Product domain: chef, client, marketplace, event, recipe, menu, vendor, pricing, payment, tax, dashboard, mobile, AI, reliability.
- Artifact type: idea, PRD, queue item, code, screenshot, runtime bug, design, architecture, research, proof pack.
- Risk type: money, auth, tenant data, compliance, trust, safety, runtime reliability, visual quality, mobile usability.

If multiple categories apply, select one primary category and at most two secondary categories.

## Lens Score

Start at 0 for each candidate lens.

- +3 direct domain match.
- +2 workflow match.
- +2 user explicitly named the lens.
- +2 ChefFlow-native lens for chef, food, hospitality, client, pricing, event, or ops work.
- +1 visual, mobile, or UX relevance.
- +1 reliability, security, finance, or compliance relevance.
- +1 available cached source card.
- -2 inspirational only, no concrete artifact or method.
- -2 redundant with a stronger selected lens.
- -3 likely to create noise for this pass.

Select the highest-scoring non-redundant set:

- 3 lenses for quick pass.
- 5 lenses for normal pass.
- 7 lenses for deep pass.
- 10+ only when the user explicitly asks for a full council.

## Required Selection Explanation

For each selected lens, state:

- Why this lens changes the work.
- Which public source or cached source card supports it.
- What mimic move it contributes.

For each tempting skipped lens, state:

- Why it is not useful enough for this pass.
- What condition would make it relevant later.

## ChefFlow Priority Order

For ChefFlow work, route in this order unless the user names another lens:

1. Domain match: private chef, restaurant, event, hospitality, food ops.
2. Business workflow: finance, documents, scheduling, clientflow, contracts.
3. Surface quality: mobile, visual polish, dashboard density, accessibility.
4. Runtime quality: reliability, observability, security, tenant/auth constraints.
5. AI quality: evals, human-in-loop, model behavior, agent workflows.
6. General inspiration: big-tech or mission-critical lenses only when they produce a concrete artifact.

## Anti-Noise Tests

Before selecting a lens, ask:

- Would this lens change the acceptance criteria?
- Would it change the UI or workflow structure?
- Would it change the data model or state machine?
- Would it change the verification plan?
- Would it catch a serious failure mode?

If all answers are no, skip it.
