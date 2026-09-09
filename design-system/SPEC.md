# ChefFlow Design System

Version 1.0.0 - 2026-09-09

This is the single source of truth for how ChefFlow interfaces look and behave. It is not a mood board and not a redesign. Almost everything in it was recovered from decisions already made in this repository over six-plus months; the new material fills gaps that were genuinely empty.

**If you are an agent about to build or modify a page, read [BUILD-CHECKLIST.md](./BUILD-CHECKLIST.md) instead. It is the short version.**

---

## 0. Authority

When two sources disagree, the higher one wins.

| Rank | Source                                                           | Owns                                                                      |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | `CLAUDE.md`, `AGENTS.md`, `docs/autonomous-delivery-contract.md` | How work is done at all                                                   |
| 2    | **`design-system/tokens/tokens.json`**                           | Every value: colour, type, space, radius, elevation, layer, motion        |
| 3    | **`design-system/SPEC.md`** (this file)                          | Every rule about using those values                                       |
| 4    | `design-system/registry/*.json`                                  | What already exists and must be reused                                    |
| 5    | `docs/specs/universal-interface-philosophy.md`                   | Behavioural governance: disclosure, hierarchy, the five data states       |
| 6    | `docs/specs/surface-grammar-governance.md`                       | Surface modes and shell budgets                                           |
| 7    | `app/globals.css`, `tailwind.config.ts`                          | Generated output of rank 2. Do not hand-edit inside the GENERATED markers |

The interface philosophy spec explicitly disclaims owning colour, typography and spacing ("that is the design system's job"). This document is that job. Nothing here contradicts it; this fills the hole it named.

**Generated files.** `app/globals.css` and `tailwind.config.ts` contain blocks fenced by `GENERATED:design-system-*` markers. Edit `tokens.json` and run `npm run tokens:build`. CI fails if they drift.

---

## 1. What the product looks like

Recovered verbatim from `docs/specs/app-polish-and-completion.md`:

> Warm, not cold. Terracotta, cream, wood tones. Not blue, not gray.
> Professional, not playful. This is a business tool, not a game.
> Consistent, not scattered. One animation language, one colour story, one typography hierarchy.
> The kitchen metaphor: think copper pots, wooden boards, warm lighting. Not sterile stainless steel.

Identity: **ChefFlow** (capital C, capital F, one word). Brand colour `#e88f47`. Default palette **Copper and Cast Iron**. Founder David Ferragamo.

Voice, from `docs/specs/client-comms-brand-voice.md`: warm not corporate, confident not hedging, brief not verbose, personal not generic, human not automated, action-oriented. Copy bans are hook-enforced: **no em dashes**, no "OpenClaw" in any public surface, no regional place-name copy.

**Chef creativity is sacred.** The system never generates recipes, menus, dish names, ingredients, pairings or descriptions. An empty culinary field stays empty.

---

## 2. Layer 1: Assets

Registry: `design-system/registry/assets.json`. Regenerate with `npm run registry:build`. Search with `node design-system/registry/find.mjs --kind=asset <query>`.

### Logos and icons

The CF wordmark on the brand orange gradient is the mark. `public/logo.svg` is a different chef-hat illustration and is unused; do not mix the two identities. `logo.jpg` is the canonical raster logo (`logo.png` is the same bytes with the wrong extension and exists only to feed `scripts/generate-icons.ts`).

There are no light, dark, mono or compact logo variants. Producing them is the top open asset gap.

### Photography and video

- Share images are always **1200x630**.
- Product screenshots live in `public/proof/` under `{cp|operator|public}-name-YYYY-MM-DD.png`.
- Every image sits in a fixed aspect-ratio container so nothing shifts on load.
- Text over photography uses `.media-scrim` (`--media-scrim`). A flat colour wash over an image is never acceptable, and no treatment may push heading contrast below 4.5:1.
- Video needs a poster frame and a captions track. The one demo video has neither.

### Illustration and mascot

Remy is the assistant mascot, one image per emotional state, reached only through `EmptyState remy=`, `RemyAvatar`, `RemyLoader`, `RemyAnimatedMascot` or `StepProgress`. Never reference a Remy path directly from a page.

### Icons

Phosphor, duotone, 20px, imported from `@/components/ui/icons`. Sizes: 16px inline, 20px default and nav, 24px primary action. Never mix sizes inside one visual group. Never an emoji as an icon. Every icon must be removable without losing meaning: an icon is recognition, not decoration.

### Provenance

Every asset added from now on records role, source, licence and usage rule in the registry, in the same change that adds it. Three provenance risks are recorded in the registry and are not design-system decisions to make: two active scrapers accumulating third-party photography, no repository licence file, and a hero image with no recorded source.

---

## 3. Layer 2: Tokens

Source: `design-system/tokens/tokens.json`.

### 3.1 Colour and the Prism rule

> **No new hex, rgb, hsl or arbitrary colour value may be introduced for a role that already exists.**

This is not style policing. The `--brand-*` ramp is swapped at runtime across eight named palettes by `components/ui/color-palette-provider.tsx`. A hardcoded `#e88f47` is correct in exactly one palette and wrong in the other seven. That is why the rule exists, and it is why `no-raw-hex` is an error and not a warning.

**Roles.** Every colour a component uses comes from one of these:

- Brand: `brand-50` through `brand-950`
- Neutral: `stone-50` through `stone-950` (also reachable as `zinc`, `gray`, `neutral`, which are aliased to the same scale on purpose). The light-mode ramp is deliberately **inverted** so dark-first utility usage renders correctly on a light ground.
- Surface: `--surface-0` page, `--surface-1` shell, `--surface-2` card and field, `--surface-3` elevated and hover, `--surface-4` pressed
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-muted-soft`, `--text-placeholder`, `--text-inverse`
- Border: `--border-subtle`, `--border-default`, `--border-strong`, `--border-warm`, `--border-warm-hover`
- Status: `--status-{success|warning|danger|info|neutral}-{bg|fg|border|solid}`, plus the `.status-*` utility classes
- Interaction: `--focus-ring-color`, `--selected-surface`, `--selected-foreground`, `--disabled-foreground`
- Overlay: `--scrim`, `--glass-bg`, `--glass-subtle-bg`, `--glass-heavy-bg`, `--media-scrim`
- Gradient: `--card-gradient`, `--page-bg-gradient`, `--accent-gradient`

**Status meaning is global; silhouette is local.** success is always emerald, warning always amber, danger always red, info always brand. That holds whether the status appears as a dot, a chip, a row accent, an icon or a text treatment. Never introduce a new hue for a role that exists, and never let colour be the only carrier of meaning: always pair it with an icon or a label.

**Banned families.** `blue`, `sky`, `cyan`, `indigo`, `violet`, `fuchsia` are not declared in `tailwind.config.ts` at all. Using them leaks Tailwind defaults into a deliberately warm identity.

**Accent budget.** At most two accent colours in any single view: one for primary action, one for status. Backgrounds are neutral; coloured section backgrounds for decoration are not a thing here.

**Measured contrast** (validated, not asserted):

| Pair                                      | Ratio              |
| ----------------------------------------- | ------------------ |
| white on `brand-700` (primary button)     | 4.74:1             |
| `--focus-ring-color` on light `surface-0` | 4.63:1             |
| `--focus-ring-color` on dark `surface-0`  | 4.17:1             |
| `--text-primary` light / dark             | 18.43:1 / 15.73:1  |
| `--text-muted` light / dark               | 12.98:1 / 7.83:1   |
| `--text-placeholder` light / dark         | 6.92:1 / 4.12:1    |
| every status fg on its bg, light          | 7.48:1 to 8.30:1   |
| every status fg on its bg, dark           | 14.41:1 to 15.52:1 |

`--focus-ring-color` resolves to `brand-600` in light mode and `brand-500` in dark, because `brand-500` on near-white measures 1.97:1 and fails.

### 3.2 Typography

**Two visible families and one functional monospace. That is the whole list.**

| Utility        | Family                                                 | Use                                                                                                     |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `font-display` | Playfair Display (`--font-playfair`), Georgia fallback | h1, h2, hero headlines, large metrics, pull quotes. The brand voice. Never below 20px, never body copy. |
| `font-sans`    | system stack, no webfont                               | Everything else. Body, labels, nav, buttons, captions, tables.                                          |
| `font-mono`    | system monospace stack                                 | Code, IDs, hashes, fixed-width data. Functional only.                                                   |
| `font-ui`      | alias of the system stack                              | When you explicitly want the interface family where display would otherwise apply.                      |

One scoped exception: `app/(chef)/culinary-board/**` loads six handwriting families because the corkboard metaphor _is_ the interface there. It must never leak into a shared component.

Weights allowed: 400, 500, 600, 700. Weights banned: 100, 200, 300, 800, 900 (the system stack renders them inconsistently and Playfair is loaded at 400/700 only).

Scale (from `tailwind.config.ts`, deliberately raised from Tailwind's defaults for readability): `4xs` 8px, `3xs` 9px, `2xs` 10px, `xxs` 11px, `xs-tight` 12px, `xs` 13px, `sm` 15px, `base` 16px, then the standard ramp. Fluid heading classes: `.fluid-display-xl`, `.fluid-display-lg`, `.fluid-title-md`.

Roles are defined in `tokens.json` under `typography.roles`: display, page-title, section-heading, card-title, body, body-long, label, nav, button, caption, overline, quote, metric, metric-sm, code.

Rules:

- Never set `font-family` inside a component.
- Never load a family or a weight that is not in the token file.
- Long-form prose caps at 68ch; card body copy at 44ch.
- Inputs render at `max(16px, 0.9375rem)` so iOS does not auto-zoom. Never override that down.
- Numeric displays use `tabular-nums`, which is why no third font was added for numbers.

### 3.3 Space and size

Base unit **4px**. A 2px half-step is approved for dense control padding and icon gaps and is intentional, not debt. Anything off that grid is a layout mistake, not a missing token.

Semantic spacing: `--space-control-gap` 8px, `--space-field-gap` 16px, `--space-card-padding` 24px, `--space-card-grid` 20px, `--space-section` 48px, `--space-section-lg` 64px, page gutters 16 / 24 / 32px.

Containers: `max-w-content` 72rem (the app shell width), `max-w-prose` 42rem, `max-w-form` 36rem, `max-w-settings` 48rem. Settings never stretch to the full viewport.

Targets: **44x44px minimum on touch**, 24x24px minimum for mouse-only, 8px minimum gap between adjacent targets. Destructive actions never sit adjacent to confirm actions; separate by at least 16px or place them on opposite sides.

Control heights: sm and md both clear 44px and differ in horizontal padding and type size, not height. lg is 48px.

### 3.4 Radius

`rounded-{sm|md|lg|xl|2xl|3xl|full}` keep Tailwind's own values so nothing shifts. Semantic aliases: `rounded-field` and `rounded-control` 8px, `rounded-card` 12px, `rounded-media` 12px, `rounded-sheet` 16px, `rounded-pill` and `rounded-avatar` full.

Arbitrary radii are banned. Focus outlines are square (`border-radius: 0`), per the WCAG guidance already in `globals.css`.

### 3.5 Elevation

Three tiers, not five. Depth is carried mainly by the surface scale; shadow is the secondary cue.

`shadow-none` for rows and list items, `shadow-card` at rest, `shadow-card-hover` on hover, `shadow-overlay` for dialogs, drawers, popovers, menus and toasts.

### 3.6 Layering

The complete stacking contract. Before 2026-09-09, `z-dialog`, `z-float`, `z-chrome` and `z-toast` were used in 122 files while being undefined, so every dialog and popover stacked by DOM order.

| Class       | Value | Use                                   |
| ----------- | ----- | ------------------------------------- |
| `z-below`   | -1    | behind the flow                       |
| `z-base`    | 0     | default                               |
| `z-raised`  | 10    | in-card raised elements               |
| `z-sticky`  | 20    | sticky headers within a scroll region |
| `z-chrome`  | 30    | app chrome, skip link                 |
| `z-nav`     | 40    | sidebar, mobile nav                   |
| `z-overlay` | 50    | dialog scrim                          |
| `z-dialog`  | 60    | dialog and drawer panels              |
| `z-float`   | 70    | menus, selects, popovers, comboboxes  |
| `z-toast`   | 80    | toasts                                |
| `z-tooltip` | 90    | the tooltip singleton                 |
| `z-max`     | 9999  | last resort, justify it               |

`z-float` sits **above** `z-dialog` on purpose: a menu opened from inside a modal must render over it. Numeric `z-10` through `z-50` still work and map onto raised through overlay.

### 3.7 Breakpoints

Tailwind's scale, unchanged: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.

**Verify every UI change at 375, 768, 1024 and 1440.** Mobile first: 375px is the design baseline, not an afterthought. The mobile audit matrix additionally covers 320, 360, 390, 414 and 768.

Never read `window.innerWidth` to branch layout. Import `BREAKPOINTS` or `MEDIA` from `design-system/tokens/tokens.ts`, or use a Tailwind prefix. Prefer container queries (`.cq-shell` plus `@container`) for a component that appears both in a sidebar and full width.

### 3.8 Motion

Durations: `instant` 75ms, `fast` 100ms, `normal` 200ms, `slow` 350ms, `enter` 220ms, `exit` 150ms, `deliberate` 500ms.
Easing: `ease-spring` (the house curve), `ease-bounce`, plus `ease-in`, `ease-out`, `ease-in-out`.

**Motion explains hierarchy, state, causality or spatial movement. Nothing animates to look richer.** No auto-playing media. Never move an element the user is about to click. No layout-shifting hover.

Loading thresholds: under 1s no indicator; 1-2s skeleton or subtle spinner; 2-10s progress or step indicator; beyond 10s a background task with a completion notification.

Toasts: 3s confirmation, 5s warning, errors never auto-dismiss, never more than 2 at once.

**Reduced motion is now implemented globally.** It was documented as resolved in `docs/ui-ux-full-reconciliation.md` Q7 and had never shipped. The generated block collapses durations to 0.01ms, disables smooth scrolling, and forces `animation-fill-mode: forwards` plus `opacity: 1; transform: none` on `animate-*` elements so entrance animations resolve to their final state instead of leaving content invisible. Loading spinners, skeleton shimmer and progress fills are exempt because they are the user's only feedback that work is happening. Anything else opts in with `class="motion-essential"`.

---

## 4. Layer 3: Components

Registry: `design-system/registry/components.json`. Search: `node design-system/registry/find.mjs <name>`. Gaps: `node design-system/registry/find.mjs --missing`.

### Rules

1. **Never build a component that already exists.** 385 files hand-write a Card and 189 hand-write a Button. That is the failure mode this system exists to stop.
2. **Extend before adding.** If a canonical component almost fits, add a documented variant to it. A new component is the last resort and must be registered in the same change.
3. **Only use variants that exist.** `<Button>` takes primary, secondary, danger, ghost. `<Badge>` takes default, success, warning, error, info. `outline`, `warning` and `success` are not Button variants; they fail silently.
4. **Every interactive component defines default, hover, focus-visible, active and disabled**, plus loading and error where it can be async.
5. **Components consume semantic tokens.** No raw hex, no `rgb()` literal, no inline style colour.
6. `cn()` is clsx only, with no `tailwind-merge`. A caller `className` does **not** override a conflicting base class. Pass the variant prop; do not fight it with `className`.
7. Icons come from `@/components/ui/icons`.
8. A raw `<button>` carrying Tailwind styling outside `components/ui/` is a hand-built Button and is a violation. Legitimate raw buttons: inside `components/ui/`, inside `error.tsx` files, and file-upload triggers.
9. Cards group 3 to 8 related things. Never one card per toggle. Never cards for a list of 10 or more similar items; use rows.

### Interface maximums

Exceeding one of these is a design defect, not a preference.

| Thing                           | Max |
| ------------------------------- | --- |
| Top-level nav items             | 6   |
| Dashboard hero metrics          | 2   |
| Dashboard supporting metrics    | 5   |
| Form fields per visible section | 7   |
| Table columns by default        | 7   |
| Buttons on one toolbar          | 5   |
| Simultaneous toasts             | 2   |
| Tabs on one page                | 6   |
| Primary buttons per screen      | 1   |
| Accent colours per view         | 2   |

Adding a dashboard widget requires removing or consolidating something of equal or lesser value. If everything is tier 1, nothing is.

---

## 5. Layer 4: Patterns and features

Registries: `design-system/registry/patterns.json` and `features.json`.

**Declare the surface mode before you lay anything out.** The seven modes (`triage`, `planning`, `editing`, `reviewing`, `monitoring`, `configuring`, `browsing`) set the shell budget and the allowed primitives.

Patterns cover the global page shells, the marketing homepage and its sections, booking, auth, dashboard, list page, detail page, search and filtering, settings, empty and error and loading pages, mobile navigation, the rail strip, print surfaces and OG images.

The repository's core composition idiom, which every dashboard-like page follows: a page-level `_sections/` directory, a co-located `section-skeletons.tsx`, and every section wrapped in `<Suspense>` plus `<WidgetErrorBoundary>`. It is what keeps one slow or failing query from blanking a page.

The feature registry says, for each recurring capability, whether it exists, where the canonical implementation lives, and **under what condition a new surface should adopt it**. Not every feature belongs in every project; read `selectWhen` first.

---

## 6. The asset-selection algorithm

Every agent follows this before writing any interface code.

1. **Name the semantic need.** Not "a rounded orange box" but "the primary action on this form".
2. **Search the registries.** `node design-system/registry/find.mjs <need>`.
3. **Reuse** the established item when it satisfies the need.
4. **Extend** an existing item through a documented variant when it nearly does.
5. **Add something new only when nothing covers it.**
6. **Say what gap required the addition**, in `design-system/DECISIONS.md`.
7. **Register it**: purpose, anatomy, variants, sizes, props, states, responsive behaviour, accessibility, content limits, allowed tokens, correct and incorrect usage.
8. **Confirm it does not duplicate or conflict** with an existing entry. Run `find.mjs` again on the new name.

### External component libraries

Magic UI, 21st.dev and comparable galleries are reference and implementation sources, never decoration. Before adopting anything from one:

- Confirm it solves a real interface need that the registry does not already cover.
- Restyle it entirely with our tokens. If it arrives with its own palette, radius language or motion curve, that is a competing design language and must be removed, not layered on.
- Strip unnecessary dependencies and effects.
- Verify licence and provenance, and record both.
- Verify responsive behaviour at 375px, keyboard operation, focus visibility, contrast, reduced motion and bundle impact.
- Record where it came from, then register it.

`docs/CLAUDE-SKILLS-REFERENCE.md` notes 21st Magic MCP is installed. The rules above apply to anything it produces.

---

## 7. What may vary per project, and what may not

**May vary**

- The active brand palette (eight are shipped; `copper` is default)
- Density mode (comfortable or compact), which changes vertical rhythm only
- Which features from the feature registry are switched on
- Page composition: which patterns a surface uses and in what order
- Container width within the container scale
- Illustration and photography selection

**Must never vary**

- Token names and their semantic roles
- Status meaning: success, warning, danger, info, neutral
- The two-family typography rule and the weight list
- The 4px spacing grid
- The layer scale
- Touch target minimums and contrast minimums
- Focus visibility
- Reduced-motion behaviour
- Which component is canonical for a given need
- The interface maximums in section 4

A per-project override that changes a "must never vary" item is not a customisation; it is a fork, and it needs a line in `DECISIONS.md` saying so.

---

## 8. Accessibility floor

Not aspirational. These are release blockers, and most are already enforced somewhere in this repo.

- Contrast: 4.5:1 body text, 3:1 large text, 3:1 UI components and focus indicators. Target WCAG 2.2 AA, AAA where achievable.
- Focus: 3px solid `--focus-ring-color` at 2px offset on `:focus-visible` for buttons, links and roles; 2px at 1px offset for fields. Focus is never removed without a more visible replacement. A `forced-colors` block keeps the ring visible in high-contrast mode.
- Every interactive element is keyboard reachable and operable. An `onClick` on a `div` needs a role, a tabIndex and Enter/Space handling, or it should be a real button.
- Colour is never the only carrier of meaning.
- Targets: 44x44px touch, 24x24px mouse, 8px between.
- `prefers-reduced-motion` is honoured globally.
- Live regions: errors and warnings are `role="alert"` and assertive; confirmations are `role="status"` and polite.
- No nested interactive elements. Already enforced by `scripts/audit-a11y-markup.mjs`.
- Text must survive a 200% zoom without loss of content or function.

---

## 9. Enforcement

| Check                             | Command                                                              | Gate                                    |
| --------------------------------- | -------------------------------------------------------------------- | --------------------------------------- |
| Tokens in sync with `tokens.json` | `npm run tokens:check`                                               | CI, fails on drift                      |
| Registries in sync with disk      | `npm run registry:check`                                             | CI                                      |
| Design rules, ratchet             | `npm run audit:design:strict`                                        | CI, fails when any rule count increases |
| Design rules, full report         | `npm run audit:design -- --out report.json`                          | on demand                               |
| One rule in detail                | `node scripts/audit-design-system.mjs --rule=no-raw-hex`             | on demand                               |
| Structural guards                 | `npm run test:unit` (`tests/unit/design-system-guards.test.ts`)      | CI                                      |
| Nested interactive elements       | `npm run audit:a11y:markup:strict`                                   | CI, already wired                       |
| Public-surface axe scan           | `npx playwright test tests/smoke/accessibility-public.spec.ts`       | on demand                               |
| Mobile overflow audit             | `npm run test:mobile:audit`                                          | on demand                               |
| Visual catalog                    | `npm run gallery:build` then open `design-system/gallery/index.html` | on demand                               |

**The ratchet.** The codebase carries real accumulated debt: 3,033 raw hex hits, 870 arbitrary font sizes, 662 off-identity colour utilities. A repo-wide zero-tolerance gate would fail on day one and get switched off, which protects nothing. So `--strict` fails only when a count goes **up**. Debt can only shrink. Lower a baseline number as you migrate; raising one requires a line in `DECISIONS.md`.

---

## 10. Definition of done for any UI change

1. Surface mode declared.
2. Registry searched; nothing duplicated.
3. Only registered tokens used; no raw values.
4. All five data states handled: empty, loading, loaded, error, partial.
5. All interaction states present: default, hover, focus-visible, active, disabled, and loading or error where relevant.
6. Verified at 375, 768, 1024 and 1440 with no horizontal scroll and nothing behind fixed chrome.
7. Keyboard-only pass completes the task; focus is always visible.
8. Contrast measured, not assumed.
9. Reduced-motion pass leaves the interface usable, not frozen or invisible.
10. Long content, short content, missing media and slow network all handled.
11. `npm run audit:design:strict` and `npm run tokens:check` pass.
12. Screenshot proof at desktop and 375px. "Look at it" means a real browser screenshot, never grep output.
