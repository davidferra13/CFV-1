# ChefFlow Design System

One enforceable visual language for every ChefFlow interface. Recovered from decisions already made across this repository, reconciled, and wired into the code so it cannot be ignored.

## In sixty seconds

```bash
node design-system/registry/find.mjs "<what you need>"   # does it already exist?
node design-system/registry/find.mjs --missing           # known gaps and duplicates
npm run design:check                                     # the gate
npm run gallery:build && open design-system/gallery/index.html   # see everything
```

The one rule that matters: **reuse beats extend, extend beats add.** Search before you build. If you add something, register it in the same change.

## The files

| File                                                     | What it is                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [`BUILD-CHECKLIST.md`](./BUILD-CHECKLIST.md)             | **Start here.** The short version. Follow it for any UI change.                                                                     |
| [`SPEC.md`](./SPEC.md)                                   | The full specification. All four layers, plus the authority order and the enforcement model.                                        |
| [`tokens/tokens.json`](./tokens/tokens.json)             | **The source of truth for every value.** Colour, type, space, size, radius, elevation, layer, motion, limits, accessibility floors. |
| [`tokens/tokens.ts`](./tokens/tokens.ts)                 | Generated. Import `BREAKPOINTS`, `MEDIA`, `LAYER`, `DURATION`, `EASING`, `LIMITS` from here instead of hardcoding numbers in JS.    |
| [`tokens/tokens.css`](./tokens/tokens.css)               | Generated. A standalone copy for non-Tailwind surfaces (PDFs, emails, embeds).                                                      |
| [`registry/components.json`](./registry/components.json) | Every primitive: purpose, variants, sizes, props, states, accessibility, content limits, correct and incorrect usage.               |
| [`registry/patterns.json`](./registry/patterns.json)     | Page shells and complete section assemblies.                                                                                        |
| [`registry/features.json`](./registry/features.json)     | Recurring functionality, each with a `selectWhen` condition. Not every feature belongs in every project.                            |
| [`registry/assets.json`](./registry/assets.json)         | Generated. Every asset in `public/` with role, provenance, licence and usage rule.                                                  |
| [`registry/find.mjs`](./registry/find.mjs)               | Search across all four registries plus the tokens.                                                                                  |
| [`gallery/index.html`](./gallery/index.html)             | Generated. The rendered visual catalog: every token, variant, state and responsive form, in light and dark.                         |
| [`DECISIONS.md`](./DECISIONS.md)                         | What was preserved, consolidated, replaced, newly decided and rejected, with reasons and rollbacks.                                 |
| [`MIGRATION.md`](./MIGRATION.md)                         | Duplicate, obsolete and hardcoded implementations, each with its exact remedy.                                                      |
| [`OPEN-CONFLICTS.md`](./OPEN-CONFLICTS.md)               | Real contradictions in the evidence, recorded rather than guessed at.                                                               |

## How it is wired

Nothing here is documentation the code ignores.

- `tokens.json` **generates** the fenced blocks in `app/globals.css` and `tailwind.config.ts`. Editing those blocks by hand is pointless; `npm run tokens:check` fails CI when they drift.
- `scripts/audit-design-system.mjs` enforces thirteen rules as a **ratchet**: each rule's violation count may fall but never rise. It runs in CI and in `npm run regression:firewall`.
- `tests/unit/design-system-guards.test.ts` asserts the system is wired: every layer class is defined, reduced motion is implemented and not merely documented, the interactive Card is keyboard operable, Alert announces, no raw hex in the primitive layer.
- `design-system/gallery/validate.mjs` renders the catalog in a real browser and checks overflow, axe, touch targets, focus visibility, measured contrast, reduced motion and 200% zoom at 375, 768, 1024 and 1440 in both themes.

## Commands

```bash
npm run tokens:build           # regenerate globals.css, tailwind.config.ts, tokens.ts, tokens.css
npm run tokens:check           # fail if the generated output is stale
npm run registry:build         # rescan public/ into assets.json
npm run registry:check         # fail if assets.json is stale
npm run audit:design           # report every rule against the ratchet baseline
npm run audit:design:strict    # fail if any rule got worse
npm run audit:design -- --rule=no-raw-hex   # every hit for one rule, with file and line
npm run audit:design:baseline  # lower the baseline after a migration
npm run gallery:build          # rebuild the static catalog
npm run gallery:validate       # build it, then verify it in a real browser
npm run design:check           # tokens + registry + ratchet, the one-liner gate
```

## Changing something

**A value** (a colour, a duration, a radius): edit `tokens/tokens.json`, run `npm run tokens:build`, add a line to `DECISIONS.md`.

**A component**: edit it, update its entry in `registry/components.json` (variants, states, accessibility, usage), rebuild the gallery, add a line to `DECISIONS.md` if the change alters a rule.

**Adding something new**: only after `find.mjs` comes back empty. Register it, say which gap forced it, and confirm `find.mjs <new name>` returns exactly one entry.

**Migrating debt**: pick an item from `MIGRATION.md`, do it, verify visually, then run `npm run audit:design:baseline` to lock in the lower number.

## Done means

Another agent can enter this repository, read `BUILD-CHECKLIST.md`, and build a new page without inventing a font, a colour, a spacing step, a border, a radius, a shadow, an animation, an interaction state, a component or a recurring feature.
