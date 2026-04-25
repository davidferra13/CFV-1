# BUILD: Simulation Orchestrator

You are taking over ChefFlow in a fresh context window. `CLAUDE.md` is the governing project contract. Read it before making decisions and follow it over this prompt if there is any conflict.

## Boot Sequence

Before doing anything else:

1. Run `bash scripts/session-briefing.sh`
   - If WSL bash fails on Windows, use Git Bash:
     `C:\Program Files\Git\bin\bash.exe scripts/session-briefing.sh`
2. Read `docs/.session-briefing.md`
3. Read `CLAUDE.md`
4. Read `MEMORY.md`
5. Skim the last 3 files in `docs/session-digests/`

## Your Task

Read and execute `docs/specs/simulation-orchestrator.md`.

That spec is your complete build plan. It defines:

- **What:** A pure-function orchestrator (`lib/simulation/orchestrator.ts`) that connects 14 existing simulation engines into a single `simulate()` call. Takes an event ID + parameter overrides (guest count, service style, dish swaps, allergies), runs existing engines in dependency order, returns a unified `EventSnapshot`.
- **Why:** ChefFlow has 14 production-quality simulation engines that each answer one question in isolation. No system answers "what happens to cost, ingredients, allergens, prep time, and readiness if I change guest count from 20 to 30?" The engines exist. They need a conductor.
- **Architecture:** 4 new files (`lib/simulation/orchestrator.ts`, `lib/simulation/actions.ts`, `lib/simulation/types.ts`, `lib/simulation/loader.ts`) + 1 UI component (`components/events/event-simulator-panel.tsx`) + integration into the event detail page.

## Critical Rules

1. **Read every existing engine file** listed in the spec's Dependency Map BEFORE writing code. Understand their exact signatures, return types, and edge cases. Do not guess.
2. **Zero new database tables.** Zero migrations. Zero AI calls. This is pure deterministic computation over existing data.
3. **Zero mutations.** The orchestrator reads data and computes. It never writes to the database.
4. **Formula > AI.** Every number must be deterministic math. No Ollama, no LLM, no probabilistic anything.
5. **Prep timeline extraction:** `lib/events/prep-timeline.ts` is a `'use server'` file. You cannot import its internal computation functions directly into the orchestrator. Either extract the pure computation into a shared non-server helper, or replicate the prep categorization logic. Read the full file to understand what needs to be extracted.
6. **The loader pattern is mandatory.** `loader.ts` fetches all data in batch queries (not N+1). `orchestrator.ts` is a pure function that takes `SimulationInput` and returns `EventSnapshot`. This separation makes the orchestrator testable with mock data.
7. **Delta = two runs.** When overrides are provided, run the pipeline twice (current state + overridden state) and diff. Cache the loaded data; only re-run computation stages.

## Build Order

1. Types first (`lib/simulation/types.ts`)
2. Loader second (`lib/simulation/loader.ts`) -- read existing query patterns from `lib/culinary/shopping-list-actions.ts` and `lib/service-simulation/actions.ts` for reference
3. Orchestrator third (`lib/simulation/orchestrator.ts`) -- the pure computation pipeline
4. Server action fourth (`lib/simulation/actions.ts`) -- thin wrapper with auth
5. UI last (`components/events/event-simulator-panel.tsx` + integration into event detail page)
6. Tests after UI (`tests/unit/simulation-orchestrator.test.ts`)

## Verification

After building, run:

- `npx tsc --noEmit --skipLibCheck`
- `npx next build --no-lint`
- `node --test --import tsx tests/unit/simulation-orchestrator.test.ts`
- Browser verify: navigate to an event with a menu, confirm simulator panel renders, change guest count, verify results update

## Do Not Do

- Do not build combinatorial menu expansion (Phase 2)
- Do not build auto-cascade triggers (Phase 3)
- Do not build equipment capacity modeling (Phase 4)
- Do not add new database tables or migrations
- Do not use AI/Ollama for any computation
- Do not redesign existing engine files -- import and use them as-is
- Do not mutate any database table
- Do not push without developer approval
