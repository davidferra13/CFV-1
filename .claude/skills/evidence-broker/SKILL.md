---
name: evidence-broker
description: Map and label the evidence behind ChefFlow answers before making strategic, market, product, validation, launch, prioritization, or build recommendations. Use when an answer could mix real user evidence, codebase truth, persona simulation, public research, developer intent, stale docs, or inference, and when Codex must prevent simulated or weak evidence from sounding like validated fact.
---

# Evidence Broker

Use this skill before claims that could guide product direction, market conclusions, prioritization, or build decisions.

## Evidence Map

Check only sources relevant to the question:

- Real user evidence: notes, CRM, surveys, interviews, usage artifacts, support tickets.
- Codebase evidence: routes, components, server actions, tests, schemas, docs that match code.
- Persona evidence: stress tests, persona synthesis, persona queues, persona build plans.
- Public research: current external sources, browsed when time-sensitive or market-facing.
- Developer intent: explicit user direction from this session or durable docs.
- Inference: reasoned conclusion from verified evidence.
- Unknown: missing or unavailable proof.

## Confidence Rules

- Real user evidence can support validated product claims.
- Codebase evidence can support implementation truth, not market demand.
- Persona evidence can support hypotheses and gap discovery, not market proof.
- Public research can support market context, but not ChefFlow-specific demand without user evidence.
- Developer intent can justify a developer-directed build, but must be labeled as such.
- Inference must be called inference.

## Output

```text
EVIDENCE MAP

REAL USER EVIDENCE: [present | absent | not checked]
CODEBASE EVIDENCE: [present | absent | not checked]
PERSONA EVIDENCE: [present | absent | not checked]
PUBLIC MARKET EVIDENCE: [present | absent | not checked]
DEVELOPER INTENT: [present | absent]
INFERENCE: [what is inferred, if any]
UNKNOWN: [missing proof]
CONFIDENCE: [high | medium | low]
CLAIM ALLOWED: [validated | evidence-backed hypothesis | simulation-only hypothesis | implementation fact | unknown]
```

## Guardrails

- Do not hide missing evidence behind confident language.
- Do not display no evidence as a negative answer. Missing proof means unknown, not false.
- Do not recommend a new product surface from `persona-synthesis` alone unless the developer explicitly overrides validation.
- If sources conflict, use `evidence-integrity` before concluding.
