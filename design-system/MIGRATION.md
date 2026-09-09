# Migration report

Duplicate, obsolete, hardcoded and inconsistent implementations found during the 2026-09-09 consolidation, with the exact remedy for each.

Nothing here was fixed blind. Items marked **DONE** were fixed and are covered by the decision log. Items marked **QUEUED** carry a visual or behavioural risk that could not be verified in this environment (no browser access to the running app), so the exact edit is written down rather than guessed at.

Measure progress with `node scripts/audit-design-system.mjs`. The ratchet baseline is `design-system/.audit-baseline.json`.

---

## Baseline at consolidation

| Rule                            | Count | Severity |
| ------------------------------- | ----- | -------- |
| `no-raw-hex`                    | 3,029 | error    |
| `no-arbitrary-font-size`        | 870   | warn     |
| `no-off-identity-color-family`  | 662   | error    |
| `no-inline-style-color`         | 656   | warn     |
| `no-link-wraps-button`          | 427   | warn     |
| `no-raw-rgb-literal`            | 359   | error    |
| `no-emoji-as-icon`              | 139   | warn     |
| `no-font-family-declaration`    | 69    | error    |
| `no-arbitrary-radius`           | 68    | warn     |
| `no-lucide-import`              | 53    | error    |
| `no-styled-raw-button`          | 24    | warn     |
| `no-arbitrary-z-index`          | 10    | error    |
| `no-hardcoded-breakpoint-in-js` | 8     | error    |
| `touch-target-too-small`        | 1     | error    |
| `no-external-font-link`         | 0     | error    |

Whole-repo context from the audit: 4,890 raw hex occurrences across 444 files (994 distinct values), 18,188 off-token palette utility usages (575 distinct classes), 3,704 arbitrary Tailwind values, 1,676 inline `style={{` across 454 files, 15,551 `rounded-*` usages, 3,395 raw `<button>` elements across 1,178 files.

---

## Done in this pass

| #    | Item                                                                                                                                             | What changed                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-01 | 122 files used `z-dialog` / `z-float` / `z-chrome` / `z-toast`, none of which existed                                                            | Full layer scale defined; `DropdownMenuContent` moved from `z-50` to `z-float`                                                                                                                                                                                                 |
| D-02 | `ease-spring` used 34 times, undefined                                                                                                           | Defined, along with `ease-bounce` and the three standard curves                                                                                                                                                                                                                |
| D-03 | `font-display` a no-op across 124 headings                                                                                                       | Mapped to the Playfair stack; `font-ui` added as the alias for the old behaviour                                                                                                                                                                                               |
| D-04 | `font-mono` (320 usages) fell through to a Tailwind default                                                                                      | Explicit system monospace stack                                                                                                                                                                                                                                                |
| D-05 | Global `prefers-reduced-motion` block documented as resolved but never written                                                                   | Written, with essential-motion exemptions and final-state resolution                                                                                                                                                                                                           |
| D-06 | `Switch` ignored `disabled`                                                                                                                      | Fixed                                                                                                                                                                                                                                                                          |
| D-07 | `Button` with `href` ignored `disabled` and `loading`                                                                                            | Fixed                                                                                                                                                                                                                                                                          |
| D-08 | `Alert` was announced by no screen reader across ~135 call sites                                                                                 | `role="alert"` / `role="status"` with matching `aria-live`                                                                                                                                                                                                                     |
| D-09 | Interactive `Card` had no focus ring and no keyboard path                                                                                        | `role="button"`, `tabIndex`, Enter/Space, visible ring                                                                                                                                                                                                                         |
| D-10 | `Button` pinned its focus-ring offset to `stone-900` in both themes                                                                              | Removed, so the global `--ring-offset-surface` applies                                                                                                                                                                                                                         |
| D-11 | `AccessibleDialog` and `SelectContent` hardcoded `rgba(28, 25, 23, ...)` inline                                                                  | `--glass-heavy-bg`, `--border-subtle`, `--elevation-overlay`                                                                                                                                                                                                                   |
| D-12 | `EmptyState` hardcoded `rgba(232,143,71,0.15)`                                                                                                   | `rgb(var(--brand-500)/0.15)`                                                                                                                                                                                                                                                   |
| D-13 | Brand ramp had two duplicate stops                                                                                                               | Stop 300 interpolated; stop 600 deliberately left pinned for focus-ring contrast                                                                                                                                                                                               |
| D-14 | `--contrast-status-*` and `--shadow-*` were parallel definitions                                                                                 | Aliased onto `--status-*` and `--elevation-*`; both names still resolve                                                                                                                                                                                                        |
| D-15 | Sixteen named layer classes in use, none defined                                                                                                 | The whole vocabulary was absorbed rather than renamed: `z-fab`, `z-fab-secondary`, `z-page-bar`, `z-mobile-header`, `z-command`, `z-offline`, `z-island`, `z-context-menu`, `z-system-overlay`, `z-subnav`, `z-status`, `z-spotlight` all keep their names and now have values |
| D-16 | Dark-mode `--text-placeholder` measured 4.12:1 and failed AA                                                                                     | Raised to `rgb(134 126 120)`, 4.96:1, still clearly dimmer than `--text-muted`                                                                                                                                                                                                 |
| D-17 | Field error text was theme-blind                                                                                                                 | `text-red-600` is 4.72:1 on light but 4.09:1 on dark. Now `text-red-600 dark:text-red-400` in `Input`, `Textarea` and `Select`, including the required-field asterisk and the Textarea character counter                                                                       |
| D-18 | `Switch` had no way to receive an accessible name                                                                                                | `aria-label` and `aria-labelledby` now reach the `<button>`; the hidden input is `aria-hidden` and out of the tab order                                                                                                                                                        |
| D-19 | Five nested interactive elements (`<a>` wrapping `<Button>`) failed the repository's own `audit:a11y:markup:strict` gate, which is wired into CI | All five converted to `<Button href>`, which is exactly what that variant is for. The gate is green: 4,440 files, zero findings                                                                                                                                                |
| D-20 | An emoji used as an icon in the pulse view                                                                                                       | Replaced with the Phosphor `Mail` icon plus an `aria-label`                                                                                                                                                                                                                    |
| D-21 | `logo-fallback` and `success-check` carried raw hex in the primitive layer                                                                       | `rgb(var(--stone-700))` and `var(--status-success-solid)`. `components/ui` is now hex-free apart from two registered exceptions                                                                                                                                                |

---

## Queued, ordered by return on effort

### M-21 - 427 nested Link and Button pairs

`<Link href="..."><Button>...</Button></Link>` renders `<a><button></button></a>`: two focus stops for one action, and a screen reader announces it twice. The repository's own `scripts/audit-a11y-markup.mjs` only catches the literal `<a>` form, so this went unseen. The new `no-link-wraps-button` rule counts it.

**Edit:** `<Button href="/path">` where a full page navigation is fine, which is the large majority. Where client-side navigation genuinely matters, put the `Link` inside a Button-styled wrapper rather than around it, or use `useRouter().push` from the Button's `onClick`.
**Risk:** low per site, large in aggregate. Migrate a directory at a time and re-baseline after each.

### M-22 - 139 emoji used as icons

Phosphor is the icon system. An emoji renders differently on every platform, cannot be recoloured by a token, and is read aloud by its unicode name.

**Edit:** import the equivalent from `@/components/ui/icons` and give the control an `aria-label`.

### M-23 - Form fields are 40px tall

`Input`, `Textarea` and `Select` render at `px-3 py-2 text-sm`, which is 40px. A form field is a tap target like any other control and the floor is 44px. The base `input` styling in `globals.css` already uses `px-3.5 py-2.5`, so the component and the global rule disagree.

**Edit:** add `min-h-touch` to the field base class in all three components.
**Risk:** low visually (4px taller), but it touches every form in the product. Verify a dense form at 375px.

### M-01 - TabNav active state is hardcoded amber

`components/shared/tab-nav.tsx`. The active tab is `border-amber-500 text-amber-400` with badge pills at `bg-amber-500/20 text-amber-300`. Every other active or primary surface in the app is brand. This is the most visible token violation in the shared layer, and under any non-copper palette it is plainly wrong.

**Edit:** `amber-500` to `brand-500`, `amber-400` to `brand-400`, `amber-300` to `brand-300`. Four class strings in one file.
**Risk:** low. **Verify:** any page with a hub nav at 1440 and 375, in two palettes.

### M-02 - `text-[10px]` and `text-[11px]`

819 of the 870 arbitrary font-size hits are these two values, and both already exist as tokens.

**Edit:** `text-[10px]` to `text-2xs`, `text-[11px]` to `text-xxs`, `text-[12px]` to `text-xs-tight`. Mechanical, repo-wide.
**Risk:** none, the values are identical. **Verify:** `npm run audit:design` count drops by roughly 850.

### M-03 - Chart colours

`components/analytics/insights-charts.tsx` carries 120 raw hex values; `lib/discovery/image-map.ts` 156; `app/(chef)/cannabis/events/[id]/control-packet/control-packet-client.tsx` 163; `app/(public)/_components/cuisine-marquee.tsx` 100 plus 27 rgba; `components/ui/branded-illustrations.tsx` 91.

**Edit:** define a categorical series palette in `tokens.json` (a brand-anchored sequence plus the four status hues), export it from `design-system/tokens/tokens.ts`, and have every chart and illustration read from it.
**Risk:** medium, charts change colour. **Verify:** screenshot each analytics route before and after.

### M-04 - about 20 MB of unused WebP

Every Remy PNG has a WebP sibling that is 10 to 40 times smaller, and the code references only the PNGs. `remy-hat.png` is 2,989,897 bytes against `remy-hat.webp` at 132,360.

**Edit:** switch the `.png` references to `.webp` in `components/ui/empty-state.tsx`, `components/ai/remy-animated-mascot.tsx`, `components/ai/remy-avatar.tsx`, `components/ui/remy-loader.tsx`, `components/ui/step-progress.tsx`, `components/ui/context-loader.tsx`, `components/ai/remy-mascot-button.tsx`. Keep the PNGs on disk; this is a reference change, not a deletion.
**Risk:** low technically, but every mascot surface must be looked at. **Verify:** render each of the eight states.

### M-05 - Form fields are off the surface scale

`Input`, `Textarea`, `Select` and `Table` use `bg-stone-900` while `Card` uses `var(--surface-2)`. Nothing guarantees they agree, so a form inside a card sits on an unrelated scale.

**Edit:** `bg-stone-900` to `bg-[var(--surface-2)]`, `disabled:bg-stone-800` to `disabled:bg-[var(--surface-1)]`, borders to `--border-default`.
**Risk:** medium-high. 233 Input consumers, 103 Textarea, 57 Select, 93 Table. **Verify:** a form-heavy route and a table route, both themes, both at 375 and 1440.

### M-06 - Compound `Select` has no keyboard support

`SelectRoot` / `SelectTrigger` / `SelectContent` / `SelectItem` render buttons with no arrow-key navigation, no Escape, no outside-click close and no `role="listbox"`. The native `Select` in the same file is fine.

**Edit:** either port it to Radix (already a dependency for the dropdown menu) or add roving focus, Escape, outside-click and the listbox roles. Radix is the smaller, safer change.
**Risk:** low, only 57 files import the module and most use the native export. **Verify:** keyboard-only pass on a compound select.

### M-07 - Four badge implementations

`Badge` (670 importers), `StatusBadge` (0), `SaveStateBadge`, `EnvironmentBadge`, all inside `components/ui`.

**Edit:** move `StatusBadge`'s 25-entry `STATUS_MAP` onto `Badge` as a `status` prop, point `SaveStateBadge` at `STATUS_BADGE_CONTRAST_CLASSES`, then retire the `StatusBadge` chip. Do not delete the file without the owner's say-so.
**Risk:** low, `StatusBadge` has zero importers.

### M-08 - Five progress primitives

`DeterminateProgress`, `ProgressPill`, `ProgressRing`, `StepProgress`, `RouteProgress` share no base and derive their colours differently (one from a percentage threshold, one from a prop, one from a status).

**Edit:** one `Progress` primitive with `variant` (linear, pill, ring, steps) and a single colour derivation from the status tokens.
**Risk:** medium.

### M-09 - Ten gallery implementations

`components/{photos,portfolio,profile,events,client-portal,hub,sharing,recipes,clients}/…-gallery.tsx`.

**Edit:** one `Gallery` primitive plus per-domain adapters. Fixed aspect-ratio containers, a dialog-based lightbox with focus trap and arrow keys.
**Risk:** medium-high, touches many surfaces. Do it once a second gallery needs changing.

### M-10 - Off-identity colour families

662 hits on `blue`, `sky`, `cyan`, `indigo`, `violet`, `fuchsia`, none of which are declared in the theme. The existing `tests/unit/theme-and-color-guards.test.ts` already bans them on ten public files with a three-file allowlist.

**Edit:** map each to a status role or to brand. Extend that test's `COLOR_AUDIT_FILES` to the whole of `app/` and `components/`, keeping its allowlist mechanism.

### M-11 - Lucide imports

53 files still import `lucide-react`, so two icon libraries ship to the client.

**Edit:** `from 'lucide-react'` to `from '@/components/ui/icons'`. Check each named import exists in the 347-icon shim; add any that do not. Then remove the dependency.
**Risk:** low. **Verify:** bundle size before and after.

### M-12 - Hardcoded breakpoints in JS

Eight sites: `components/ai/remy-wrapper.tsx:106`, `components/navigation/chef-nav.tsx:742`, `components/feedback/user-feedback-form.tsx:31-32`, `components/feedback/feedback-form.tsx:24-25`, `components/pwa/install-prompt.tsx:36`, `components/onboarding/tour-checklist.tsx:23`.

**Edit:** import `BREAKPOINTS` / `MEDIA` from `design-system/tokens/tokens.ts`.
**Risk:** none.

### M-13 - Arbitrary radii

68 hits, 11 distinct values, nine of them clustered between 1.25rem and 2rem.

**Edit:** map to `rounded-card` (12px), `rounded-sheet` (16px), `rounded-3xl` (24px), `rounded-pill`.
**Risk:** low, sub-pixel visual differences.

### M-14 - Asset defects

- `manifest.json` points at `/screenshots/mobile.png` and `/screenshots/desktop.png`; neither exists, so Chrome drops the richer install UI. Produce them at 1080x1920 and 1920x1080, or remove the key.
- Maskable icons are byte-identical to the standard ones with no safe zone; Android clips them. Regenerate with 20% padding.
- The generated PNG icons sit on `#111827` navy while the SVG family and `manifest.theme_color` use the orange gradient. Pick one and regenerate.
- `public/fonts/` does not exist, so `lib/documents/generate-foh-image.ts` silently falls back to fetching hashed Inter TTFs from `fonts.gstatic.com` on every cold start, and fails outright with no egress. Vendor the three TTFs.
- `public/New Remy/RemyCelebrationJump.png` is 5.9 MB with zero references and a space in its directory name. Register it or move it out of `public/`.
- `public/og-image.svg` is a self-labelled placeholder.
- `logo.png` is JPEG data with a `.png` extension.
- Nine sprite sheets are declared in `lib/ai/remy-sprite-manifests.ts` and do not exist on disk; the generation pipeline (`scripts/remy-assets/`) is absent from the repo.
- `public/images/remy/sprites/remy-eyes.png` is 6.25 MB and shipped for a feature that is deliberately disabled in code.
- `.husky/` contains a stray 6 MB `RemyEyeStates.png`.

### M-15 - Culinary board font loading

`app/(chef)/culinary-board/page.tsx` loads six families through a raw render-blocking `<link>` with no subset pinned. The families are an approved exception; the loading method is not.

**Edit:** move to `next/font/google` scoped to that route.

### M-16 - Unused dependencies

`motion` (0 importers), `next-intl` (0), `react-dropzone` (0), `@tanstack/react-table` (0). Remove or adopt.

### M-17 - Table states

`components/ui/table.tsx` has only a row hover state. No selected, focused, sorted, disabled or loading row. Every cell is `whitespace-nowrap`, which forces horizontal scroll on a phone. Add the states, make `whitespace-nowrap` opt-in, and route mobile through `ResponsiveTable` (which exists and has zero importers).

### M-18 - Missing primitives

Sheet/Drawer, Popover, Pagination and Accordion have no `components/ui` implementation. Feature-local drawers and one FAQ accordion exist. Build each on the existing `AccessibleDialog` focus-management core when the second consumer appears, not before.

### M-19 - Media accessibility

`public/demo/operator-demo.mp4` has no poster frame, no WebM fallback and no captions track. Captions are a requirement.

### M-20 - Two skeleton systems

`.skeleton` CSS (6 importers) and `.loading-bone*` via `page-skeleton` (155 importers). Standardise on `page-skeleton` and make `Skeleton` delegate to the same shimmer.

---

## Not design-system decisions

Recorded so they are not lost, but they need an owner decision.

- **Scraped third-party photography.** `scripts/fetch-directory-photos.mjs` and `scripts/pi-directory-images/scraper.mjs` download `og:image` / `json-ld` / hero images from other companies' sites into a 41 MB SQLite store, deployed as a Pi service. The recorded `source` field is a fetch method, not a licence. No robots or terms check, no attribution in the UI.
- **No repository licence or attribution file** anywhere outside `node_modules`.
- **`public/images/hero-bg.jpg`** has no recorded source and EXIF consistent with a stock download.
- **`Chef Flow Personas/`** contains 2.8 MB of text naming real public figures, with no rights documentation. Text only, no imagery.
