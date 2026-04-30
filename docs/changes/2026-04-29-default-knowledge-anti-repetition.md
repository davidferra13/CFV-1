# Default Knowledge Anti-Repetition Layer

- Date: 2026-04-29
- Route: `/settings/default-knowledge`
- Canonical owner: `components/settings/default-knowledge-client.tsx`

## What Changed

Default Knowledge now shows a coverage score, restatement detector, apply-defaults preview, contradiction review, source ledger, quick capture prompts, missing-default prompts, a per-surface application matrix, and test mode.

The analysis is centralized in `lib/chef/default-knowledge-analysis.ts` so the UI does not invent status. The page derives everything from `chef_preferences`, `chef_culinary_profiles`, and `remy_memories`.

## Why

The chef should not have to repeat durable preferences, business rules, client facts, or workflow expectations. If ChefFlow already knows something, the page should prove it. If it does not, the page should make the gap easy to capture.

## Verification

Focused unit coverage lives in `tests/unit/default-knowledge-analysis.test.ts`.
