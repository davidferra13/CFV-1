# Simulation Forge milestone 1: reuse audit and decisions

Source checkout: `feat/simulation-forge-codex-20260928` from ChefFlow commit `422605dd004b584c459692dcd4726b6322d23fc4`.
Audit date: 2026-09-28 UTC. This is a bounded code and document audit, not a live verification of every Pi store or historical database.

## Existing work and classification

| Evidence | Classification | Decision |
| --- | --- | --- |
| `Chef Flow Personas/Completed/{Chef,Client,Guest,Partner,Public,Staff,Vendor}` | 314 domain-persona files (225, 16, 17, 10, 16, 17, 13); valuable descriptive intelligence and pass/fail conditions | Preserve intact. Adapt one Public persona to structured actor fixture; do not mass-generate or rewrite corpus. |
| `Chef Flow Personas/Uncompleted` | 155 queued files (64, 50, 7, 8, 6, 14, 6), not release proof | Preserve intact and avoid file moves or side effects. |
| `devtools/persona-pipeline-core.mjs` (1305 lines), `persona-to-codex.mjs`, `persona-regression-guard.mjs` | Existing file-based generation, validation, scoring, and task routing | Reuse as ChefFlow domain input, not generic runner. Existing scoring is not a full event trajectory/replay engine. |
| `lib/discovery/discovery-rail-scoring.ts`, `lib/discovery/discovery-preference-ranking.ts` | Pure production domain scoring and interaction signal code | Call the unchanged real scorer through the ChefFlow adapter. Keep domain policy in adapter. |
| `lib/discovery/user-scroll-signals.ts` | Authenticated user signal ingestion with DB dependency | Keep ChefFlow-specific; fixture supplies explicitly synthetic signal data offline. |
| `docs/simulation-history.md` | Many historical run summaries with changing pass rates, including zero; lacks normalized complete trajectories and seeds in the summary | Preserve as historical evidence. It is not enough to recreate those runs without their source fixtures. |
| `docs/openclaw-data-pipeline.md`, `docs/research/openclaw-failure-modes-and-safeguards.md` | Descriptions of Pi SQLite/price and ingredient corpora, scraper/sync architecture and known partial-sync risk | Preserve. These are data pipelines, not simulated-user infrastructure. The documented catalog quantities are historical claims, not a current count from the live Pi. |
| `docs/research/openclaw-database-catalog.md` | Proposed 30-database roadmap with explicitly unbuilt cartridges | Separate proposals from deployed data; never count proposed databases as recovered corpora. |
| Existing `scripts/regression-firewall.mjs` | Automatic release-path gate; the original source worktree also had a persona gate that main lacks | Add the small deterministic Forge gate independently on the main-based review branch, with no second app server or import of the foreign persona gate. |
| Other `feat/simulation-forge-m1-20260927` worktree with untracked discovery runner | Possibly active foreign work | Read only. No edit, delete, or merge without owner coordination. |

The prior persona pipeline can generate many reports, but the evidence seen does not establish replayable event trajectories, bounded resource use, seeded comparisons, or minimum counterexamples. Historical volume and resource pressure were reported by David; no live OpenClaw workers, Pi network settings, databases, or schedulers were touched during this audit. The nightshift worktree erased newly written task files during this run; implementation moved to a named isolated worktree without changing that scheduler.

## Minimal architecture decision

`core.mjs` defines a product-neutral scenario contract and an adapter with `step` and `evaluate` methods. It records ordered inputs, transitions, tool calls, messages, decisions, observations and scores, seeded run identity, source kind, actors, product version, commit, and timestamps. The evaluator keeps observed output apart from scores. Product-specific eligibility stays in `adapters.mjs`; ChefFlow's existing scorer remains the actual ranking engine. WeatherHQ is a portability fixture, not an integrated WeatherHQ release.

`runScenario`, `replay`, `mutate`, `minimize`, `cluster`, and `compare` are bounded and local. This milestone uses one synchronous worker; replay caps runs/time and checks free RAM. No background service, database, new paid API, outbound network, or Supabase dependency is introduced. Product runtime never imports Forge. Evidence is written only by an explicit `prove` command. Future long-running population work needs real disk/CPU/queue budgets, checkpoints and cancellation before it may run continuously.

## External engines: scoped decision, no new dependency today

| Capability | Current primary source | Decision for this milestone |
| --- | --- | --- |
| Simulated user tasks | [Sierra tau2/τ³-bench](https://github.com/sierra-research/tau2-bench) | Wrap later for multi-turn dialogue. Python 3.12+ environment makes it excessive for a pure offline TypeScript scorer fixture. |
| Population modeling | [Mesa](https://github.com/mesa/mesa) | Defer a Mesa wrapper for larger agent populations. The new tiny offline ChefFlow marketplace twin reuses real capacity functions and bounded TypeScript fixtures; a Python dependency adds little for three chefs and two to four synthetic requests. |
| Property-based/shrinking | [Hypothesis 6.168.2 (MPL-2.0, Python ≥3.10)](https://pypi.org/project/hypothesis/) and [fast-check v4.10.2 (MIT)](https://github.com/dubzzz/fast-check/releases) | Adopt fast-check 4.x for future TS state-model shrinkage: its [compatibility table](https://github.com/dubzzz/fast-check) supports Node 20, while future 5.x requires Node ≥22.12. Current bounded deletion minimizer demonstrates the interface, not a replacement for mature shrinkers. |
| Stateful API fuzzing | [Schemathesis](https://github.com/schemathesis/schemathesis) | Wrap for API contracts in a later slice. No live API is called here. |
| Browser agent environments | [BrowserGym](https://github.com/ServiceNow/BrowserGym) | Wrap only for UI tasks. This is an offline scorer test. |
| Agent/LLM evaluation | [Promptfoo](https://github.com/promptfoo/promptfoo) and [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) | Wrap when evaluating prompts/tools/agents. This milestone uses deterministic assertions and no LLM grader. |

These are candidate engines, not installed dependencies. Exact package versions and transitive licenses need lockfile review at adoption time. Cross-product orchestration remains ours; specialized engines may be plugged in by a later adapter.

## First scenario and honest evidence boundary

The ChefFlow fixture cites `Chef Flow Personas/Completed/Public/the-enthusiast.txt`: the $80–$150 per-person comfort range and demand for operational clarity are drawn from that historical persona. Fixture item prices, labels, signal weight, choice events, and outage are constructed synthetic conditions. Provenance is `inferred` with an explicit note; no simulation outcome is customer evidence.

The deliberate fault omits hard candidate eligibility before invoking `scoreDiscoveryRailItems`, showing the $175 candidate to a $150-budget actor. The repaired adapter checks price, dietary, geography, availability and service status before the *same unchanged scorer*. This proves the safety boundary in the adapter, not that the deployed ChefFlow discovery UI already applies that boundary. Hooking a production candidate source to this adapter is a separate product integration step.

CLI: `node --import tsx tools/simulation-forge/cli.mjs prove` writes `docs/simulation-forge/first-milestone-evidence.json`; `release` is automatic from `scripts/regression-firewall.mjs`; `replay 100` is explicitly bounded. CI specifies Node 20 and already depends on `tsx`; local Node 24 was also exercised. The generic WeatherHQ fixture verifies adapter portability but does not imply WeatherHQ integration.
