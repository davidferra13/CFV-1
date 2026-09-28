# Simulation Forge review and release checkpoint

State: **BLOCKED for ChefFlow release**. The Forge developer tooling is validated on a clean review branch, but no ChefFlow production route, payment flow, customer interaction, app server or deployed revision was changed.

## Exact main-based review branch

- Branch `feat/simulation-forge-review-20260928` began at `origin/main e944ed554897ddb0d7686b38312c7e28083a3e71`. Eight task-owned Forge commits were applied; last tested code SHA was `8fcdaa2c61bff0694ad63a397acaf7623b015fb0`.
- Relative to main, the diff contains only `tools/simulation-forge/**`, `docs/simulation-forge/**`, and the targeted `scripts/regression-firewall.mjs` hook. The foreign persona gate and order-operations subsystem were excluded.
- Focused tests on this exact code revision passed **106/106**, including ChefFlow's unchanged event FSM and capacity-model tests. `node --import tsx tools/simulation-forge/cli.mjs release` exercised **25 bounded cases with zero invariant violations**, including retained ChefFlow booking and marketplace counterexamples and a WeatherHQ portability fixture.
- The three ChefFlow slices are recommendation replay (including the actual homepage candidate source offline), a synthetic booking funnel, and a synthetic marketplace twin. Booking uses a modeled private inquiry transition map and unchanged real event FSM; its deposit acknowledgment is expressly synthetic. Marketplace invokes unchanged real capacity functions; its supply, prices and demand are synthetic. This is not evidence of live booking or real customer behavior.
- `npm run verify:chef-nav` **failed on this review branch**: seven advertised routes have no page: `/studio`, `/studio/analytics`, `/studio/branding`, `/studio/domain`, `/studio/media`, `/studio/pages`, `/studio/seo`. Their hrefs are present in `origin/main:components/navigation/nav-config.tsx`; `origin/main` has no corresponding Studio pages. The Forge diff touches neither navigation nor routes.
- Full `npm run regression:firewall -- --skip-runtime` has **not** run on this review branch. Headroom check showed 28.9 GB free RAM but 90% CPU load (84% on retry), so repeating a long whole-app typecheck then was inappropriate. No review-branch full-gate result or typecheck result is claimed.
- `lib/order-operations/adapters/transport.ts` is absent from `origin/main`; a narrow transport typing repair belongs with that separate order-operations feature and was not carried into this branch.

## GitHub CI hook and existing PR baseline

The existing `Critical Tests` job in `.github/workflows/ci.yml` now invokes the bounded `node --import tsx tools/simulation-forge/cli.mjs release` command after `npm ci --legacy-peer-deps` and before the unchanged `npm run test:critical` step. It reuses the same Node 20 runner and installed dependencies; a failed Forge release command fails that job. The last local release proof for unchanged Forge code is 25 cases with zero violations at `8fcdaa2c61bff0694ad63a397acaf7623b015fb0`. The workflow and this document changed since that proof; the new GitHub Actions run is the verification for this CI wiring.

[PR CI run #1295](https://github.com/davidferra13/CFV-1/actions/runs/36379554855) on prehook commit `8834ba08687d4484977471ff061f84b0d34ef4d5` failed in existing steps: the route policy gate reports public routes `/dfpc` and `/hermes` uncovered; the unit test script passed a literal `tests/unit/**/*.test.ts` glob to Node; the critical test script passed a literal `tests/unit/ledger.*.test.ts` glob; and the dependency audit failed with 84 reported vulnerabilities (6 low, 51 moderate, 22 high, 5 critical). Build and smoke jobs were skipped. This run predates the Forge CI hook and proves nothing about the new step. ChefFlow release remains blocked; no unrelated route, test-script, or dependency changes are included here.

## Historical source-worktree evidence

The original isolated source branch `feat/simulation-forge-codex-20260928` began at `422605dd004b584c459692dcd4726b6322d23fc4`. Its earlier `regression:firewall -- --skip-runtime` took 380.37 seconds and exited 1: seven Studio links failed navigation audit, wiring passed with 982 routes and zero weak/orphan routes, its persona gate and Forge gate ran, and its then-untyped order-operations transport produced TypeScript errors before timeout. This is **historical source-branch evidence**, not a full-gate or transport finding on the current main-based review branch. The source's disappearing nightshift worktree incident is recorded in the reuse audit; all later work used named isolated worktrees.

The permanent evidence files retain their original source commits, run IDs, actors, seeds, trajectories, observations and scores. Run IDs gained commit, evaluator, configuration and budget identity in the later marketplace slice; older evidence keeps the older run-ID format.

Next release action: the ChefFlow nav owner must resolve the seven actual Studio destinations without placeholders, then run the full native firewall on the exact integration revision when machine headroom permits. Product integration and live behavior verification remain separate work after that gate. No PR merge or deployment has occurred.
