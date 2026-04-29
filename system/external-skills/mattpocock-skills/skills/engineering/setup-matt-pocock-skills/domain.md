# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists Ã¢â‚¬â€ it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** Ã¢â‚¬â€ read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT.md
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ docs/adr/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 0001-event-sourced-orders.md
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 0002-postgres-for-write-model.md
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT-MAP.md
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ docs/adr/                          Ã¢â€ Â system-wide decisions
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ordering/
    Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT.md
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ docs/adr/                  Ã¢â€ Â context-specific decisions
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ billing/
        Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT.md
        Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal Ã¢â‚¬â€ either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) Ã¢â‚¬â€ but worth reopening becauseÃ¢â‚¬Â¦_
