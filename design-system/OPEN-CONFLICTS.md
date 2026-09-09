# Open conflicts

Real, unresolved contradictions found in the evidence. These are recorded rather than guessed at. Each needs an owner decision; none blocks using the design system.

---

## C-01 - Two taglines ship simultaneously

- `docs/brand-account-kit.md`, `app/opengraph-image.tsx`, the other OG routes and `public/og-image.svg` say **"Ops for Artists"**.
- `app/layout.tsx` metadata and `public/manifest.json` say **"Food & Chef Marketplace"** / "Food and chef marketplace...".

Both are live. A link shared from ChefFlow shows one positioning; the browser tab and install prompt show the other.

They may both be intentional, aimed at the two sides of the market the brand kit describes (consumer-facing and operator-facing). If so, the split needs a stated rule about which surface gets which. If not, one of them is stale.

**Needs:** a decision on which tagline goes where, or a single tagline.

---

## C-02 - Rams versus the shipped visual language

`docs/research/interface-philosophy-enforceable-rules.md` section 9.1:

> Long-lasting: No trend-driven styling (gradients, glassmorphism, etc.) that will look dated in 18 months. Neutral palette, standard typography.

The shipped product uses gradients and glassmorphism extensively and deliberately: `--card-gradient`, `--page-bg-gradient`, `--accent-gradient`, `.glass-subtle`, `.glass-heavy`, `--glass-bg`, the three ambient radial glows in the public shell, and `backdrop-blur-xl` on the `glass` card variant.

**Resolved in practice, for now:** the design system keeps them. Production usage is tier-3 and tier-4 evidence; a research note is tier 5. The warm glass treatment is part of the identity the brand documents describe.

**Still open:** the research note is not wrong about longevity, and it is still in the repository as an enforceable rule with no annotation. Either annotate it as superseded or plan the reduction. It should not sit there silently contradicting the shipped product.

---

## C-03 - Nav maximum: 5, 6 or 7

- `docs/specs/universal-interface-philosophy.md` section 6: 7 top-level nav items.
- `.claude/skills/qol/SKILL.md` Law 2: "5 items max in primary nav. More than 5 = decision paralysis. (Apple)".
- `docs/chef-navigation-decision-contract.md`: exactly 6 primary domains (Today, Inbox, Events, Clients, Culinary, Finance), described as "the canonical structural contract that future navigation work must follow".

**Taken as 6**, because the navigation contract is the most specific and most binding of the three. Recorded here because the other two documents still say otherwise and will keep confusing agents until one of them is updated.

---

## C-04 - Stale font references across the documentation

`docs/ui-ux-audit-report.md`, `docs/frontend-redesign-v2.md` and `docs/specs/app-polish-and-completion.md` all discuss **DM Serif Display**, **DM Sans** and a `--font-inter` CSS variable. `docs/ui-ux-full-reconciliation.md` Q16 records a decision to keep the `--font-inter` name and "document it instead".

None of those exist in the codebase. `app/layout.tsx` loads Playfair Display and `tailwind.config.ts` uses a system stack. The variable is `--font-playfair`.

**Taken as:** those documents are stale on fonts and current on everything else. The design system states Playfair plus system sans plus system mono.

**Needs:** a stale-on-fonts note added to each of those three documents so the next agent does not re-derive this.

---

## C-05 - The design-system database feature is empty

Seven migrations landed on 2026-05-17 building a tenant-scoped, DB-backed design-system product feature: `design_system`, `typography`, `accessibility`, `style_guardrails`, `theme_tokens`, `color_semantics`, `design_debt`, with the matching types in `lib/ui/*`. `docs/UNIFIED-BUILD-QUEUE.md` marks it DONE.

The schema exists. It contains no token values. It is an auditing surface for a design system, built before the design system existed.

**Now that the design system exists**, that feature is the natural place to surface violations to the owner in the product. `scripts/audit-design-system.mjs --out report.json` produces exactly the shape those tables expect.

**Needs:** a decision on whether to wire the audit output into `design_debt` and `color_semantics.color_violations`, or to leave the feature dormant.

---

## C-06 - Two icon brand systems

The SVG icon family (`favicon.svg`, `icon-*.svg`) draws the CF wordmark on the brand orange gradient. The generated PNG family (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`), produced by `scripts/generate-icons.ts` and `scripts/generate-pwa-icons.cjs`, draws it on `#111827` navy. `manifest.theme_color` is `#e88f47`, the orange.

Whichever a given platform picks, half the install surfaces are off-brand.

**Needs:** pick the ground colour, then regenerate the whole icon set from one source. Also fold in the maskable safe-zone fix (MIGRATION.md M-14).

---

## C-07 - `docs/ui-ux-full-reconciliation.md` Q7 was marked resolved but never implemented

The global reduced-motion block was recorded as "RESOLVED. One CSS block fixes everything." It had not been written. It has now been implemented (DECISIONS.md R-02), with two corrections to the documented version.

**Recorded not as an open question but as a pattern to watch:** a "RESOLVED" line in a reconciliation document is not proof that code exists. The token generator and the audit script now assert this particular one; the general lesson is that a decision document needs a corresponding check.

---

## C-08 - `app/globals.css` is 3,507 lines

Roughly a third of it is feature-specific: the discovery rail design system with its own `:root` block and its own hardcoded hex values (`#f59e0b`, `#10b981`, `#8b5cf6`), homepage colour-temperature zones, Remy mascot animations, FullCalendar overrides and three print modes.

A parallel mini design system living inside the global stylesheet is a consolidation target, but splitting it is a large, risky change with no visual verification available in this environment.

**Needs:** a decision on whether to extract the discovery rail block into a scoped stylesheet and fold its palette into the brand tokens. Listed here rather than in MIGRATION.md because it is a structural question, not a mechanical edit.
