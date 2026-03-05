# Developer Readiness Playbook

Last updated: 2026-03-05

## Goal

Teach the developer to explain ChefFlow clearly under pressure.

Every answer should cover three layers:

1. What it does (plain English)
2. How it works (technical truth)
3. How we prove it (tests, logs, or reports)

## Core Skeptic Questions (Must Answer Without Guessing)

1. What is ChefFlow in one sentence?
2. What stack powers it (frontend, backend, auth, DB, tests)?
3. How do roles and permissions work?
4. How do we enforce tenant isolation?
5. How do payments and ledger correctness work?
6. What is the release gate before beta?
7. How do we catch production failures fast?
8. What known risks exist right now?
9. What is rollback if deploy breaks?
10. What objective evidence proves quality today?

## Minimum Truth Pack (Know These Paths)

- `scripts/verify-release.mjs`
- `docs/beta-proof-pack-readiness-2026-03-05.md`
- `docs/deployment-readiness-roadmap.md`
- `docs/deployment-evaluation-hierarchy.md`
- `docs/deployment-hardening-master-todo.md`

## Release-Gate Command

```bash
npm run verify:release
```

What this proves:

- Secrets scan passes
- Typecheck passes
- Lint passes
- Critical tests pass
- Unit tests pass
- Production build succeeds
- Smoke release tests pass

## High-Pressure Answer Template

Use this exact structure when challenged:

1. Statement: one sentence answer.
2. Mechanism: where in the code this is enforced.
3. Evidence: latest run/report proving it.
4. Known risk: what is still open and owner/next action.

## Daily 15-Minute Training Loop

1. Pick 3 skeptic questions.
2. Answer each in writing (max 6 lines each).
3. Verify each answer against code/docs.
4. Re-run one proof command (or read latest artifact).
5. Tighten weak wording to be specific and measurable.

## Beta Conversation Guardrails

- Never bluff.
- Never say "it should work" without evidence.
- Use exact file paths and exact command names.
- State known gaps before someone else finds them.
- Separate "passed gate" from "known runtime risks."

## Current Evidence Anchor

Start every beta conversation from:

- `docs/beta-proof-pack-readiness-2026-03-05.md`

That document is the current source for:

- What passed
- What was fixed
- What is still risky
- What to do next
