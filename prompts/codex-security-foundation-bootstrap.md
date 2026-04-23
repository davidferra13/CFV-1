# Codex Bootstrap Prompt: ChefFlow Security Foundation

Use this exact prompt in a fresh Codex context window:

```text
You are working in the ChefFlow repo at `C:\Users\david\Documents\CFv1`.

Your first mandatory step is to read and follow `CLAUDE.md` at the repo root. Do not proceed until you have read it. Treat it as the controlling project rulebook. In particular, respect its rules on testing your own work, preserving dirty git state, zero hallucination, additive-only migration safety, no fake success states, and updating project docs when behavior changes.

This repo is already large and partially hardened. The goal is not to write a generic security memo. The goal is to turn ChefFlow's actual codebase into a system that is materially harder to leak data from, misuse, or drift into unsafe patterns.

You must verify context from the codebase before acting.

## Mandatory startup reads

Read these first, in this order:

1. `CLAUDE.md`
2. `docs/security/README.md`
3. `docs/security/implementation-checklist.md`
4. `docs/research/supply-chain-audit.md`
5. `docs/ai-model-governance.md`
6. `docs/specs/system-integrity-question-set-battle-tested-seams.md`
7. `middleware.ts`
8. `lib/auth/route-policy.ts`
9. `lib/auth/get-user.ts`
10. `lib/api/auth-inventory.ts`
11. `tests/system-integrity/q6-server-action-auth.spec.ts`
12. `tests/system-integrity/q70-public-route-auth-inventory.spec.ts`
13. `tests/system-integrity/q87-server-action-auth-completeness.spec.ts`
14. `tests/coverage/06-api-routes.spec.ts`

After reading them, briefly summarize:
- the most important `CLAUDE.md` rules you must obey
- the current highest-risk security issues in this repo
- the existing security spine already present in code

## Mandatory repo-state checks

Before editing anything:

1. Run `git status --short`.
2. Assume the worktree is dirty.
3. Preserve unrelated user changes.
4. Do not revert anything you did not create.
5. If you find direct conflicts with your task, stop and explain the conflict clearly.

## Mission

Take ownership of ChefFlow's security foundation implementation and move it forward in real code, not just docs.

Your priority order is:

1. Stop live credential and secret exposure.
2. Harden identity, auth, tenant, and route boundaries.
3. Harden public, token, webhook, cron, and API surfaces.
4. Tighten data protection, retention, and deletion rules where code paths already exist.
5. Improve auditability, detection, and incident readiness.
6. Reduce supply-chain and dependency risk.
7. Keep AI privacy boundaries honest and enforced.

## What you must do

You are expected to do actual work in this session, not only analysis.

1. Audit the current state of the highest-risk area you choose.
2. Pick the highest-leverage safe slice you can complete now.
3. Implement it.
4. Add or update automated tests where a boundary is being hardened.
5. Verify your work yourself.
6. Update docs if behavior, policy, or operator workflow changed.

Bias toward real risk reduction over broad speculative planning.

## Strong candidate first tasks

Choose the highest-value task based on evidence, but bias toward one of these if the audit confirms it:

- remove or replace hardcoded credentials in scripts, tests, and example files
- tighten secret hygiene and CI secret-scan enforcement
- close auth-boundary gaps in server actions or API handlers
- inventory and harden public token routes with rate limiting
- harden webhook signature verification and replay safety
- harden cron secret enforcement and related tests
- add a durable breach/rotation runbook if the code path already exists but the docs are missing

Do not do a broad repo-wide rewrite if a smaller, higher-confidence slice can materially reduce risk now.

## Rules for implementation

- Read the current code before making assumptions.
- Follow existing auth and route-boundary patterns instead of inventing new ones.
- Treat `middleware.ts`, `lib/auth/route-policy.ts`, `lib/auth/get-user.ts`, `lib/api/auth-inventory.ts`, and the Q6/Q70/Q87 tests as the current boundary spine.
- Never accept tenant IDs from request bodies when session-derived context should be used.
- Never fake a success response, fake a security control, or document a guarantee the code does not enforce.
- Never add destructive migrations or destructive data operations without explicit approval and plain-language warning.
- If you touch public or operator-facing UI, comply with the project rules in `CLAUDE.md`.

## Required outputs

By the end of the session, produce all of the following:

1. A concise diagnosis of the current security state, with repo citations.
2. A clear statement of the slice you chose and why it is highest leverage.
3. Actual code and doc changes that improve the security posture.
4. Automated test changes if the slice touches a boundary that should be guarded against drift.
5. Verification results you ran yourself.
6. A short next-step list for the next agent, ordered by leverage.

## Definition of success for this session

At the end of the session, ChefFlow should be safer in a concrete, verifiable way.

That means:
- at least one meaningful risk is reduced in code, not just described
- the change matches existing project rules and patterns
- the change is verified by you
- future drift is less likely because tests, inventories, or docs were improved

Start now.

First read `CLAUDE.md`, then the required files above, then summarize the rules and current risks before you choose the implementation slice.
```

