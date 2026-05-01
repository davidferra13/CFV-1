---
name: builder
description: Full Builder Gate procedure for execution agents. Use when building from a spec or implementing features.
---

# BUILDER GATE (Execution Agents - MANDATORY)

**Every builder agent must pass this gate before marking work complete. No exceptions.**

This gate exists because agents say "done" when they mean "it compiled." Building code is not the same as shipping a working feature. This gate forces real testing, real evidence, and real accountability.

**Canonical launcher prompts live in `docs/specs/README.md`.** The top-level `prompts/` tree is a prompt library and queue, not the source of truth for planner, builder, or research launcher prompts.

## Queue Selection (How Builders Pick What to Build)

Builder agents are queue-aware. They do not wait to be told what to build:

0. **Run `v1-governor` first.** If the request or selected spec is not a V1 blocker, current-lane V1 support, critical bug/security/money/safety repair, or explicitly overridden with `Override V1 governor: build this anyway.`, do not build. Classify it, preserve it, and stop.

1. **Scan** every file in `docs/specs/`. Collect all specs with status `ready`.
2. **Filter** out any spec whose "Depends on" references a spec that is NOT `verified` or `built`.
3. **Module gate.** Run `improve-codebase-architecture` and identify the module owner before claiming. If the item is unassigned, cross-module without a named owner, or only a vague finding, classify it for module review or planning and do not build.
4. **Sort** by priority: P0 first, then P1, P2, P3.
5. **Pick the first moduled item.** That is the build target.
6. **Claim it** immediately: change status to `in-progress`, set "Built by" to your session, add a Timeline entry, commit the claim. This prevents double-picking.
7. If no buildable specs remain, report "Queue empty" and stop.

If the developer says "Build [specific spec or plain English]," skip the queue and build that. The rest of the gate still applies.

## Pre-Flight Check (MANDATORY - Before Writing Any Code)

**You do not build on a broken foundation. Verify the app works BEFORE you touch anything.**

1. **`git status`** - is the repo clean? If there are uncommitted changes from a prior agent, stop and report.
2. **`npx tsc --noEmit --skipLibCheck`** - must exit 0. If it fails, the app is already broken. Do not proceed. Report what's broken.
3. **`npx next build --no-lint`** - must exit 0. Skip ONLY if `.multi-agent-lock` exists. If it fails, stop and report.

**If any pre-flight check fails:** you are NOT allowed to write code. Fix the existing break first, or report it to the developer. Never stack new code on top of broken code.

## Spike (Before Writing Implementation Code)

1. **Read `CLAUDE.md`** cover to cover.
2. **Read the spec** you're implementing. Read the **Developer Notes** section carefully - understand the WHY, not just the WHAT.
3. **Run `context-continuity`** for the feature domain. Find existing related surfaces, canonical attachment points, duplicate risks, recent overlapping commits, and active dirty or claimed files before proposing any new route, component, module, table, or spec file.
4. **Look up affected pages in `docs/app-complete-audit.md`**.
5. **Read every file the spec names.** Not skim. Read. Understand conditional paths, validation, state management.
6. **Spike report** - before writing implementation code, report:
   - "I read these files: [list with line counts]"
   - "The spec is accurate about: [what matches]"
   - "The spec is wrong or incomplete about: [what doesn't match reality]"
   - "Developer intent from the notes: [summary of what the developer actually wants]"
   - "Continuity decision: [extend / attach / merge-candidate / new] and canonical owner: [path or route]"
   - If the spec is wrong: **STOP. Do not improvise.** Update the spec with corrections, then continue.

## Build Phase (Continuous Verification)

- **Expansion-first default.** ChefFlow builds grow like a root system: additive, incremental, and compounding. Default every implementation to expanding existing capability piece by piece, preserving working surfaces and data paths unless the developer explicitly asks for removal, replacement, or contraction.
- **No subtractive cleanup by assumption.** Do not remove features, UI, fields, docs, routes, tests, scripts, or behavior just because they look old, duplicated, incomplete, or awkward. If something conflicts with the current build, adapt around it or mark it for developer review.
- **Progress over rewrite.** Prefer small forward steps that deepen the current system: add a guarded branch, extend a component, introduce an additive helper, fill a missing state, or connect an existing flow. Treat rewrites, simplifications that reduce surface area, and broad pruning as out of scope without explicit approval.
- **Modular refinement always.** As builds expand, continuously refine repeated logic, tangled UI, and fuzzy domain behavior into deep TypeScript modules with small public interfaces. Use `software-fundamentals` as the Matt Pocock-style lens and `improve-codebase-architecture` as the architecture sidecar: shared language, clear boundaries, interface seams, locality, tested contracts, hidden complexity, and humans owning architecture.
- **Module gate always.** Nothing gets built if it does not get moduled. Every build must name the module owner, canonical files or route family, interface, invariants, and test surface before implementation code starts.
- **No module theater.** Do not split code into shallow helper files just to look organized. Extract a module only when it creates a clearer contract, reduces real cognitive load, protects an invariant, improves testability, or gives future agents a better boundary to work inside.
- Implement exactly what the spec defines. No unapproved additions.
- No "while I'm here" refactors. No bonus features.
- If you discover something the spec didn't anticipate: stop, update the spec, then continue.

**After every significant change (new file, major edit, or completing a logical unit):**

Run `npx tsc --noEmit --skipLibCheck`. If it fails, fix it NOW before touching another file. Do not accumulate type errors. Catch regressions the moment they happen, not at the end.

## Verification Plan (State Before Building)

**Before writing implementation code, state your verification plan:** what you will check, how you will check it, and what success looks like.

## Final Verification (Proof Required - Not Descriptions of Proof)

**You are not allowed to mark this complete without executing these steps and showing the output.**

1. **Type check:** `npx tsc --noEmit --skipLibCheck`. Paste output. Must exit 0.
2. **Build check:** `npx next build --no-lint`. Paste output. Must exit 0. Skip if `.multi-agent-lock` exists.
3. **Playwright verification:** Sign in with agent credentials (`.auth/agent.json`). Navigate to the feature. Execute the full user flow. Take screenshots. Paste screenshots. If Playwright literally cannot test this (rare), explain exactly why.
4. **Edge cases tested:** List each edge case from the spec. For each: what you did, what happened (not what "would" happen).
5. **Regression check:** List every page/component that imports or shares code with your changes. Verify at least one still works. If the feature touches auth/layout/navigation, run `npm run test:experiential`.
6. **Before vs after:** Show what changed. Screenshots, data output, or behavioral comparison.

## Final Check (Must Answer Explicitly)

> If this were handed to a real user right now:
> What is most likely to be broken, incomplete, or misleading?

If the answer is anything other than "nothing," fix it before marking complete.

## Completion Rules

- If any verification step fails: fix it, re-verify, then proceed.
- If you discover a regression: fix it before finishing.
- If you've hit 3 failures on the same issue: stop and report (Anti-Loop Rule).
- Update the spec's Timeline table with build + verification timestamps.
- Update the spec status to `verified` only after all verification passes.
- Update `docs/app-complete-audit.md` if any UI changed.
- Update `docs/build-state.md` with the new green state and commit hash.
- Commit with message format: `feat|fix(spec-name): description`.
- Push.

**Self-enforcement:** You must run every verification step and the Final Check ON YOUR OWN before telling the developer the build is complete. If you say "done" without pasted typecheck output, build output, and Playwright screenshots, you have failed the gate.

## Continuous Mode

In continuous mode, after completing one spec the agent loops back to Queue Selection and picks the next buildable spec. This continues until the queue is empty. If the Anti-Loop rule triggers on a spec, set its status back to `ready` with a note about what failed, then move to the next spec. One bad spec does not block the queue.
