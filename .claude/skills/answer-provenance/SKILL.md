---
name: answer-provenance
description: Label ChefFlow strategic, product, market, research, validation, launch, prioritization, or architecture answers with where each conclusion came from. Use when Codex must distinguish codebase verified facts, real user evidence, persona simulation, public market research, developer intent, inference, unknowns, and unsupported claims.
---

# Answer Provenance

Use this skill at the end of strategic or research answers so the user can see what the answer is standing on.

## Labels

Use these exact labels:

- `CODEBASE VERIFIED`: confirmed by repository files, tests, schemas, or runtime output.
- `REAL USER EVIDENCE`: backed by actual user feedback, survey results, CRM notes, interviews, or usage data.
- `PERSONA SIMULATION`: produced by persona stress tests, persona synthesis, or simulated workflow analysis.
- `PUBLIC MARKET RESEARCH`: backed by current external sources.
- `DEVELOPER INTENT`: directed by David or durable project guidance.
- `INFERENCE`: reasoned from verified facts but not directly observed.
- `UNKNOWN`: missing, inaccessible, stale, or conflicting evidence.

## Output Pattern

Append a compact provenance block when the answer could guide product direction:

```text
PROVENANCE

- CODEBASE VERIFIED: [claims]
- REAL USER EVIDENCE: [claims or none found]
- PERSONA SIMULATION: [claims or not used]
- PUBLIC MARKET RESEARCH: [claims or not used]
- DEVELOPER INTENT: [claims]
- INFERENCE: [claims]
- UNKNOWN: [open gaps]
```

## Guardrails

- Do not label a claim as real user evidence unless the artifact is actual user evidence.
- Do not use persona simulation as a substitute for validation.
- Do not bury unknowns in prose. Put them in `UNKNOWN`.
- If provenance would be mostly `UNKNOWN`, recommend validation or research before a build.
