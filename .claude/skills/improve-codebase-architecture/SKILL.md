---
name: improve-codebase-architecture
description: Improve ChefFlow codebase architecture through incremental, additive module refinement. Use when the user names improve-codebase-architecture, asks to improve architecture, reduce codebase entropy, refine tangled code into modules, create better boundaries, apply Matt Pocock-style software fundamentals, or make future Codex work easier without removing product surface.
---

# Improve Codebase Architecture

Use this skill to improve ChefFlow's architecture without shrinking the product. This is an architecture refinement loop, not a rewrite license.

## Core Rule

Make the expanding codebase easier to understand, test, and extend by refining repeated behavior into deep TypeScript modules with small public contracts. Preserve working surfaces unless the developer explicitly asks for removal.

## Workflow

1. Load `software-fundamentals` first and use its shared-language, interface-first, feedback-loop process.
2. Pick one bounded architecture target from actual code evidence:
   - repeated domain logic,
   - tangled component state,
   - leaky helper APIs,
   - duplicated validation,
   - unclear data contracts,
   - hard-to-test behavior.
3. Define the target boundary before editing:
   - module name,
   - public inputs and outputs,
   - invariants,
   - errors,
   - owning files,
   - fastest meaningful validation.
4. Make one additive improvement slice:
   - extract a typed contract,
   - add a focused module,
   - move repeated logic behind that module,
   - add or update tests at the public boundary,
   - wire one caller through the refined boundary.
5. Stop before broad rewrites. Leave future slices obvious in notes or specs if more refinement is warranted.

## Guardrails

- Do not remove UI, routes, features, tests, data paths, or docs as cleanup unless explicitly requested.
- Do not create shallow helper sprawl. A new module must hide meaningful complexity behind a simpler interface.
- Do not rename domain concepts casually. Reuse ChefFlow's existing language unless conflicts must be resolved.
- Do not mix architecture refinement with unrelated visual polish or product expansion.
- For money, auth, tenant scope, privacy, AI, migrations, and production operations, inspect internals directly and add tests before trusting the boundary.

## Closeout

Report the architecture improvement in concrete terms:

- Boundary improved:
- Public contract:
- Callers changed:
- Validation run:
- Remaining safe next slice:
