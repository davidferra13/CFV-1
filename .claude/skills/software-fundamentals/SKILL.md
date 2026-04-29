---
name: software-fundamentals
description: Apply the AI-era software fundamentals operating model from Matt Pocock's "Software Fundamentals Matter More Than Ever" lecture. Use before AI-assisted planning, specs-to-code work, coding, refactors, architecture changes, test design, agent delegation, Claude Code/Codex workflows, or any task where the user asks to adopt software fundamentals, grill requirements, create shared language, use TDD feedback loops, design deep modules, or keep humans strategic while AI implements tactically.
---

# Software Fundamentals

## Overview

AI does not make code cheap. It makes good software design more valuable because agents compound the quality of the system they work inside. Use this skill to force shared understanding, shared language, feedback loops, testable boundaries, and interface-first design before letting AI generate or modify code.

## Core Thesis

1. Treat bad code as expensive because it blocks AI leverage and accelerates entropy.
2. Do not run a specs-to-code loop where the agent repeatedly rewrites code from changing prose while nobody reads or designs the code.
3. Keep the human in the strategic role: own architecture, boundaries, interfaces, tradeoffs, and verification.
4. Use AI as tactical implementation capacity inside explicit constraints and tight feedback loops.
5. Invest in the design of the system every day.
6. Keep refining growing features into real modules over time: shared language, simple interfaces, hidden complexity, and tested contracts.

## Mandatory Loop

Run this before coding unless the task is a tiny mechanical edit:

1. Shared design concept:
   - Restate the thing being built or changed.
   - Identify what is still ambiguous.
   - Interview the user or the codebase until the plan is coherent.
   - For ambiguous work, use the short trigger: "Grill me until we reach shared understanding."
   - Walk the design tree branch by branch and resolve dependencies between decisions before implementation.
2. Ubiquitous language:
   - Extract the domain terms, module names, entities, workflows, and invariants already used by the repo.
   - Reuse those names in the plan, code, tests, and final answer.
   - If terms conflict, stop and normalize the language before coding.
3. Feedback loops:
   - Identify the fastest meaningful checks before writing code.
   - Prefer static types, unit tests, browser or Playwright inspection for UI, lint or targeted validation, and focused regression checks.
   - Move in small steps because the rate of feedback is the speed limit.
4. TDD when behavior changes:
   - Write or identify a failing test first when feasible.
   - Make the smallest change to pass.
   - Refactor only after feedback proves behavior.
   - If TDD is not practical, state the replacement feedback loop.
5. Deep module design:
   - Look for a small number of modules with simple interfaces and hidden complexity.
   - Avoid adding shallow helper sprawl, fragmented files, and leaky interfaces.
   - Test at stable interfaces rather than incidental internals.
   - When repeated behavior appears, refine it into a named module only if the module creates a better boundary than the scattered code.
6. Interface-first delegation:
   - Design the public contract, inputs, outputs, invariants, errors, and ownership boundaries first.
   - Delegate or implement internals only after the interface is clear.
   - For non-critical internals, let AI fill implementation behind a tested boundary.
   - For critical areas such as money, auth, tenant scope, privacy, migrations, and safety, inspect internals directly.

## Failure Mode Map

- AI did the wrong thing: shared design concept was missing. Grill requirements before planning.
- AI is verbose or talks past the repo: ubiquitous language is missing. Build or refresh the project term map.
- AI built something that does not work: feedback loops are too slow, missing, or unused.
- AI made a huge speculative change: slice smaller and use TDD or a comparable check.
- AI cannot navigate the codebase: modules are shallow, fragmented, or poorly bounded.
- Human review is exhausting: interfaces are unclear, so too much implementation detail must stay in working memory.
- Specs-to-code is degrading the system: stop regenerating and invest in design.

## Planning Template

Use this compact template for non-trivial work:

```markdown
Shared design concept:
[What we are building or changing, and what must stay true]

Ubiquitous language:
[Domain terms, module names, invariants, and any naming conflicts]

Interfaces and modules:
[Public contracts, affected modules, boundaries, and ownership]

Feedback loop:
[Failing test, type check, browser inspection, unit test, or replacement check]

Implementation slice:
[Smallest coherent step, not the whole system at once]

Design investment:
[How this change improves or preserves the system design]
```

## Guardrails

- Do not treat a PRD, spec, or prompt as a substitute for reading the code.
- Do not optimize for more generated code. Optimize for easier future change.
- Do not accept code that passes only because tests are too broad, flaky, or detached from the interface.
- Do not add modules unless they hide meaningful complexity behind a simpler contract.
- Do not hand-wave architecture as "implementation detail." Architecture is the human-owned strategic layer.
- Do not let AI outrun feedback. After a large change, stop and verify before continuing.
- Do not review every non-critical internal line by default when a strong interface test covers it, but do inspect high-risk internals.

## ChefFlow Application

For ChefFlow work, combine this skill with the most specific task skill:

- `builder`: require shared design concept, module boundary, and feedback loop before implementation.
- `planner`: produce specs that include module/interface impact and validation, not just user-facing behavior.
- `tdd`: use when behavior changes and a meaningful failing test can be written.
- `debug`: use feedback loops and root cause evidence before changing code.
- `review`: review for entropy, shallow modules, missing tests, unclear interfaces, and AI-generated drift.
- `ledger-safety`, `stripe-webhook-integrity`, `billing-monetization`, `validation-gate`: keep human strategic inspection high because these are critical boundaries.
