# Build Specs

This directory contains implementation specs for ChefFlow features.

## How It Works

1. **Planning agents** (parallel) read the codebase and write specs here using `_TEMPLATE.md`
2. **Builder agents** (sequential, one at a time) pick up specs and implement them
3. Each spec is self-contained: a fresh agent with zero prior context can build from it

## Spec Lifecycle

| Status        | Meaning                                               |
| ------------- | ----------------------------------------------------- |
| `draft`       | Being written by a planning agent, not ready to build |
| `ready`       | Reviewed, complete, safe to hand to a builder agent   |
| `in-progress` | A builder agent is currently working on this          |
| `built`       | Code is committed. Needs verification                 |
| `verified`    | Tested in the real app. Done                          |

## Rules

- **One builder at a time.** Never have two agents building different specs simultaneously.
- **Build in dependency order.** Check the "Depends on" field before starting a spec.
- **Specs are read-only for builders.** The builder implements what the spec says. If the spec is wrong or incomplete, the builder flags it and stops (does not improvise).
- **Planning agents write nothing but specs.** They read the codebase, they write a `.md` file here. No code changes.

## Naming Convention

`[priority]-[short-name].md`

Examples:

- `p0-fix-login-redirect.md`
- `p1-bulk-menu-import.md`
- `p2-staff-scheduling.md`

The `_TEMPLATE.md` file is the starting point for all specs. Copy it, fill it in, rename it.

## Starting a Planner Agent

Paste this as the first message:

```
You are a planner agent. Read CLAUDE.md for project rules. Read docs/specs/_TEMPLATE.md for the spec format. Familiarize yourself with the codebase structure. When you're ready, just say "Ready." Then I'll tell you what to plan.
```

## Starting a Builder Agent

Paste this as the first message:

```
You are a builder agent. Read CLAUDE.md for project rules. Check docs/specs/ for any specs with status "ready". List what you found and say "Ready." Then I'll tell you which to build. Before building anything, screenshot every page you are about to touch. Build the spec exactly. After building, screenshot the same pages again. If the before and after show regression, fix it before committing. Push to main when done. Update the spec status.
```
