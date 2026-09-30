# Capability Proof Loop

Status: in-progress
Date: 2026-09-17

## Objective

ChefFlow's capability registry must describe demonstrated workflow coverage, not optimistic implementation status. A capability is not complete merely because code exists, a test file exists, or a registry row says VERIFIED.

North star: **Can a chef operate their entire working day from ChefFlow without needing to think about or manually switch between a stack of other applications?**

## Proof contract

Each capability may have one canonical receipt at `.agents/capability-proofs/<capability-id>.json`.

A receipt must identify the capability and verifier, record a verification timestamp, and contain non-empty implementation, test, and runtime evidence groups. Every evidence item uses a repository-relative path plus the exact SHA-256 of the file that was verified.

The receipt also records one concrete stack-elimination scenario:

- the chef job that was exercised;
- whether that scenario completed inside ChefFlow;
- every external application the operator still had to switch to.

## Derived states

- `MISSING`: no receipt exists.
- `INVALID`: receipt identity/schema/path safety is invalid.
- `STALE`: an evidence file disappeared, stopped being a regular file, or no longer matches its recorded hash.
- `INCOMPLETE`: evidence is current but the demonstrated workflow still leaves ChefFlow, or the capability remains `LAUNCH_ONLY` debt.
- `VERIFIED`: implementation, tests, runtime evidence, and the stack-elimination scenario are current and complete.

## Safety properties

- Receipt paths may not escape the repository.
- Symlinks do not count as proof evidence.
- Registry source rows are not mutated by verification; completion is derived during audit.
- `LAUNCH_ONLY` can never be promoted to complete by a receipt. It remains explicit product debt until ChefFlow owns, integrates, or aggregates the underlying chef job.
- Heuristic repo/test discovery remains useful for finding likely implementation work, but never proves completion.

## Audit behavior

`npm run audit:capabilities` evaluates every receipt, applies only valid proof to a derived registry view, reports proof-state counts, and selects the first remaining capability from the existing priority/backlog rules. This turns the registry into a deterministic build queue without allowing false completion.

## Acceptance tests

1. Missing proof fails closed.
2. Malformed receipts, identity mismatches, and unsafe paths are invalid.
3. Changed or missing evidence becomes stale.
4. External app switches keep a capability incomplete.
5. Complete current proof derives VERIFIED without mutating the canonical registry row.
6. `LAUNCH_ONLY` remains debt even if presented with an otherwise valid or manually forged VERIFIED evaluation.
7. Receipt loading uses the canonical proof directory.
8. Existing capability-registry contract tests continue to pass.
9. Full typecheck passes.
10. Capability audit reports zero false promotions before real proof receipts are created.
11. Production build and applicable release gates must pass before this spec moves to complete.

## 2026-09-27 delivery checkpoint

This task continues the existing registry and receipt path. The main checkout's dirty navigation, archetype, and other unrelated changes remain in their original worktree. This isolated worktree adopts the existing Today dashboard and mobile readiness draft plus its test, and owns the proof validator, claim gate, release-runner wiring, and focused tests. The original dirty files remain untouched.

A receipt now records the exact build and commit, a time-bounded observation, both phone and desktop steps, the chef task, external switches, and before/after phone taps. Hashes validate current files but do not promote a claim by themselves. Promotion requires the established full release runner to query the canonical production build identity and replay the named Playwright chef task on phone and desktop. A dirty release tree, unreachable production, missing commit identity, mismatched build, skipped test, or replay failure blocks the claim. Missing proof for an open capability remains open; missing proof for a declared complete capability blocks release.

The current production build-version route exposes only a build ID, not a commit. The documented production domain returned HTTP 530 during this check, and the documented Docker deploy references a Dockerfile absent from this checkout. Until production mapping and revision identity are repaired and an authorized chef session permits a real task replay, no ChefFlow capability receives VERIFIED from this checkpoint.

Chosen workflow: Today → next dinner → readiness (prep, groceries, timeline, packing). It is a daily, time-sensitive private-chef task and the existing main checkout already contains an uncommitted implementation. Local /dashboard currently redirects to sign-in without a chef session. Its phone path, task completion, and remaining external steps are open evidence, not inferred successes.

## Verification and release hold (2026-09-27)

- Focused proof, release-runner, and Today source-contract tests: 13 pass.
- App typecheck: pass after adopting the existing transport request typing fix.
- Capability gate: pass with one honestly incomplete Today receipt and 83 missing receipts; no false promotion.
- Regression firewall: fail. Wiring audit has zero weak/orphan routes; chef-nav audit reports seven unresolved /studio links; persona gate reports four delivery-logistics failures; canonical runtime verification rejects port 3100 because that server belongs to the preserved main checkout.
- Local /dashboard is auth protected (307 to sign-in); no authorized chef session or phone task completion was observed.
- Production domain returns HTTP 530. The documented Docker deploy script references a missing Dockerfile, and /api/build-version in source exposes buildId without commit revision. Production release identity and behavior are not established. No LIVE claim or VERIFIED capability follows from this checkpoint.
