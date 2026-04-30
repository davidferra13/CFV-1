---
name: research-brief-generator
description: Generate a ChefFlow research brief from any question before research, validation, product strategy, market analysis, or agent-routing work. Use when Codex needs a deterministic packet containing optimized question, audience lenses, evidence threshold, selected skills, source plan, stop conditions, answer format, and provenance labels.
---

# Research Brief Generator

Use this skill when the next step should be a structured research packet rather than an immediate answer.

## Deterministic Tool

Prefer the local tool:

```powershell
node devtools/research-brief-generator.mjs --prompt "question here"
```

Use `--write` to persist the brief under `system/agent-reports/research-briefs/`.

Related tools:

- `node devtools/evidence-source-index.mjs --query "real user"` lists canonical evidence locations and claim limits.
- `node devtools/research-brief-to-report.mjs --brief path --write` turns a brief into a research report scaffold without inventing findings.
- `node devtools/question-outcome-scorer.mjs --brief path --answer path` checks whether a final answer respected provenance, audience, and evidence constraints.

## Brief Requirements

Every brief must include:

- Original question.
- Optimized question.
- Primary skill.
- Sidecar skills.
- Audience lenses.
- Evidence threshold.
- Required sources.
- Stop conditions.
- Output format.
- Provenance labels.
- Claim limit.
- Evidence source index entries when relevant.

## Routing Rules

- Market questions require `market-research-router` and `evidence-broker`.
- Product priority questions require `validation-gate` and usually `findings-triage`.
- Code truth questions require code or docs inspection and may use `research`.
- Agent behavior questions require `skill-garden` or `heal-skill`.
- Launch readiness questions require `validation-gate` and `evidence-integrity`.

## Guardrails

- A brief is not a conclusion. It is the execution plan for a conclusion.
- Do not skip evidence labels.
- Do not route to all skills. Route to the smallest useful set.
