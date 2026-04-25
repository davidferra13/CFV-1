# Codex Task: Persona Build Follow-Up - Kai Donovan

## Objective

Use the completed persona stress-test report to build one focused, user-visible improvement for this persona.

This is the second-stage execution task. The first persona agent already wrote the report; this agent is expected to modify product code.

## Inputs

- Persona report: `docs/stress-tests/persona-kai-donovan-2026-04-25.md`
- Original persona task: `system/codex-queue/persona-kai-donovan.md`
- Product blueprint: `docs/product-blueprint.md`
- App inventory: `docs/app-complete-audit.md`

## Build Policy

1. Read the report's Top 5 Gaps and Quick Wins.
2. Pick the highest-leverage coherent slice that can be built safely in this repo now.
3. Prefer real product behavior over copy-only changes.
4. If the top gap requires unavailable external providers, credentials, or broad new infrastructure, implement the nearest honest enabling layer using existing data and UI patterns.
5. Stop after one vertical slice. Do not try to solve every persona gap in one task.

## Guardrails

- Preserve existing user changes. Do not revert unrelated work.
- Keep data tenant-scoped.
- Store money in integer cents.
- Do not add fake real-time claims. If data is stale, estimated, or provider-limited, show that clearly.
- Do not create destructive migrations.
- Do not alter billing or auth unless the report's chosen slice absolutely requires it.
- No @ts-nocheck.

## Expected Output

- Product code changes for one build slice.
- Focused validation, typecheck, or route/component verification when practical.
- A short "Build Follow-Up" note appended to `docs/stress-tests/persona-kai-donovan-2026-04-25.md` summarizing what was built and what remains.

## Branch

codex/persona-build-kai-donovan
