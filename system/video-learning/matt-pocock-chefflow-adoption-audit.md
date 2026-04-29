# Matt Pocock Lecture Adoption Audit

Source: `https://www.youtube.com/watch?v=v4F1gFy-hqg&t=330s`

Purpose: convert the lecture into ChefFlow operating behavior, not a transcript copy. This file records what is now adopted, what was enforced in skills, and where the repo should apply the deep-module drills next.

## Adopted Into Agent Behavior

| Lecture principle | Adoption surface | Status |
| --- | --- | --- |
| Software fundamentals matter more in the AI age | `software-fundamentals` | Adopted |
| Specs-to-code is insufficient without design ownership | `planner`, `builder`, `omninet` | Adopted |
| Shared design concept before implementation | `software-fundamentals`, `planner`, `builder` | Adopted |
| Grill-me until shared understanding when ambiguity remains | `software-fundamentals`, `planner`, `builder` | Adopted |
| Ubiquitous language between humans, AI, and code | `software-fundamentals`, `planner`, `builder` | Adopted |
| Fast feedback loops are the speed limit | `software-fundamentals`, `builder`, `debug`, `tdd` | Adopted |
| TDD or equivalent focused feedback before behavior changes | `software-fundamentals`, `tdd`, `builder` | Adopted |
| Good codebases are easy to test | `tdd`, `review`, `builder` | Adopted |
| Deep modules hide complexity behind simple interfaces | `software-fundamentals`, `review`, `builder`, `planner` | Adopted |
| Design the interface, delegate the implementation | `software-fundamentals`, `builder`, `tdd`, `review` | Adopted |
| Humans own strategic boundaries, AI handles tactical internals | `software-fundamentals`, `review`, `debug` | Adopted |
| Invest in system design every day | `builder`, `planner`, `review`, lecture ledger | Adopted |
| Visual talks require visual evidence, not transcript-only learning | `youtube-watch`, lecture ledger | Adopted |

## Repo-Level Adoption Drills

These are not broad refactors to do casually. They are the next bounded applications of the lecture model when one of these areas becomes active work.

| Area | Evidence | Lecture lens | Adoption drill |
| --- | --- | --- | --- |
| Remy command orchestration | `lib/ai/command-orchestrator.ts`, `lib/ai/command-intent-parser.ts` have broad task imports, switch dispatch, regex routing, and overlapping intent patterns | Deep modules, interface-first delegation | Define a Remy tool contract with `taskType`, input schema, policy tier, executor, deterministic examples, and golden tests in one registry-owned interface. New tools should enter through the registry, then orchestration calls `registry.execute(task)`. |
| AI fallback language | `lib/ai/with-ai-fallback.ts`, `lib/ai/draft-actions.ts`, `tests/system-integrity/q96-ollama-error-propagation.spec.ts` mix fail-clear AI rules with deterministic fallback language | Ubiquitous language | Use "formula floor" for truthful deterministic non-AI output and "AI runtime unavailable" for failed inference. Before AI changes, ask whether the feature can complete truthfully without AI. If not, rethrow `OllamaOfflineError`; if yes, return and display the source. |
| Server action boundaries | `lib/tasks/actions.ts`, `lib/ledger/append.ts`, `lib/ledger/compute.ts` expose types or internal functions from server-action files | Deep modules, boundary leakage | Before touching a `'use server'` file, list exports and classify each as action, type, or internal. Move types to `*.schema.ts`, internal logic to `*.service.ts`, and keep `*.actions.ts` for authenticated async server actions only. |
| Task action repetition | `lib/tasks/actions.ts` repeats tenant scoping, cache invalidation, mutation result shape, and side-effect handling | Deep modules, feedback loops | Define a `TaskCommandService` boundary with authenticated context, scoped query helpers, result shape, cache invalidation, and side-effect runner. Add focused tests for tenant scope and return shape before changing task behavior. |
| Finance read models | Finance pages reduce raw ledger entries directly instead of using named projections | Human strategic inspection, stable interfaces | Any displayed financial number should come from `lib/ledger/compute.ts` or a named finance projection, not page-local reductions. Add read-model tests for payment, tip, refund, credit, and add-on cases before changing finance pages. |

## Full-Adoption Definition

This video is considered adopted when future agents do all of the following on relevant work:

1. Route through `software-fundamentals` for non-trivial planning, building, debugging, TDD, and review.
2. State the shared design concept before coding or spec writing.
3. Stop for grill-me questions when ambiguity affects correctness.
4. Reuse ChefFlow domain language and flag naming conflicts.
5. Identify the fastest meaningful feedback loop before implementation.
6. Prefer deep modules and stable interfaces over shallow helper sprawl.
7. Review high-risk internals directly, especially money, auth, tenant scope, privacy, migrations, billing, and safety.
8. End substantial changes with a design investment closeout.
9. Preserve video-derived lessons with transcript confidence and visual evidence.

## Current Limit

The lecture has been adopted as operating behavior and audit drills. It has not been copied verbatim, and it should not be copied verbatim into the repo. Future app refactors should be scoped through specs, tests, and production-safe branches.
