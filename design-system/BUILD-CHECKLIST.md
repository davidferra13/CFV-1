# Build checklist

The short version of the design system. Follow this whenever you build or modify any page, component or feature. Full reasoning lives in [SPEC.md](./SPEC.md).

---

## Before you write a line

```bash
node design-system/registry/find.mjs "<what you need>"     # does it already exist?
node design-system/registry/find.mjs --missing             # known gaps and duplicates
```

- [ ] **Declare the surface mode.** triage / planning / editing / reviewing / monitoring / configuring / browsing. It sets the shell budget and the allowed primitives.
- [ ] **Search the registries.** Reuse beats extend, extend beats add.
- [ ] If you must add something new, know which gap forced it. You will write that down in `DECISIONS.md`.

---

## While you build

### Colour

- [ ] Zero raw hex, `rgb()`, `hsl()` values. The brand ramp swaps at runtime across eight palettes, so a hardcoded colour is right in one and wrong in seven.
- [ ] Use `brand-*`, `stone-*`, `var(--surface-N)`, `var(--text-*)`, `var(--border-*)`, `--status-*` / `.status-*`.
- [ ] No `blue`, `sky`, `cyan`, `indigo`, `violet`, `fuchsia`. They are not in the theme.
- [ ] Status hues are fixed: success emerald, warning amber, danger red, info brand. Same meaning everywhere, whatever the silhouette.
- [ ] At most two accent colours in the view. Backgrounds neutral.
- [ ] Colour is never the only carrier of meaning.

### Type

- [ ] `font-display` (Playfair) for h1/h2/hero/metric. `font-sans` for everything else. `font-mono` only for code and IDs.
- [ ] Never set `font-family`. Never load a font.
- [ ] Weights 400, 500, 600, 700 only.
- [ ] Use scale steps, not `text-[13px]`. `text-2xs` is 10px, `text-xxs` is 11px.
- [ ] Prose caps at 68ch. Inputs never render below 16px.

### Layout

- [ ] 4px grid. The 2px half-step is fine for dense control padding; anything else off-grid is a mistake.
- [ ] Containers from the scale: `max-w-content`, `max-w-prose`, `max-w-form`, `max-w-settings`.
- [ ] Radius from the scale: `rounded-field`, `rounded-card`, `rounded-sheet`, `rounded-pill`. No `rounded-[1.75rem]`.
- [ ] Elevation: `shadow-card`, `shadow-card-hover`, `shadow-overlay`. Nothing else.
- [ ] Stacking from the layer scale: `z-raised`, `z-sticky`, `z-chrome`, `z-nav`, `z-overlay`, `z-dialog`, `z-float`, `z-toast`, `z-tooltip`. Never `z-[9999]`.
- [ ] Safe areas: `.pb-safe`, `.pt-safe`, `.pt-mobile-header`.

### Components

- [ ] Reuse the canonical component. Do not hand-write a `<button className="bg-brand-600 rounded-lg px-4 py-2">`.
- [ ] Only use variants that exist. Button: primary, secondary, danger, ghost. Badge: default, success, warning, error, info.
- [ ] `cn()` has no `tailwind-merge`, so your `className` will not override a conflicting base class. Use the variant prop.
- [ ] Icons from `@/components/ui/icons`. Never `lucide-react`. Never an emoji.

### Limits

- [ ] 1 primary button per screen. 6 nav items. 2 hero metrics, 5 supporting. 7 form fields per section. 7 table columns. 5 toolbar buttons. 6 tabs. 2 toasts.
- [ ] Adding a dashboard widget means removing or consolidating something else.

### States

- [ ] All five data states: empty, loading, loaded, error, partial.
- [ ] All interaction states: default, hover, focus-visible, active, disabled, plus loading and error where async.
- [ ] Never show success without server confirmation. Never render a failed load as `$0.00` or an empty list.
- [ ] Never ship a no-op button.

### Motion

- [ ] Motion explains hierarchy, state, causality or spatial movement. Nothing animates to look richer.
- [ ] Durations from the scale, `ease-spring` by default.
- [ ] Under `prefers-reduced-motion`, the interface must still be usable. Entrance animations resolve to their final state; they do not leave content invisible.
- [ ] Loading: nothing under 1s, skeleton 1-2s, progress 2-10s, background task beyond 10s.

### Accessibility

- [ ] Keyboard-only completes the task. Focus is always visible.
- [ ] 44x44px touch targets, 8px apart. Destructive never adjacent to confirm.
- [ ] Contrast measured: 4.5:1 text, 3:1 UI and focus.
- [ ] Errors and warnings announce (`role="alert"`); confirmations use `role="status"`.
- [ ] No nested interactive elements.
- [ ] Works at 200% text zoom.

---

## Before you call it done

```bash
npm run tokens:check          # generated output matches tokens.json
npm run registry:check        # asset registry matches disk
npm run audit:design:strict   # no design rule got worse
npm run audit:a11y:markup:strict
npm run lines:check
npx tsc --noEmit --skipLibCheck
npx next lint --max-warnings 0
```

Then, per `CLAUDE.md` and `docs/definition-of-done.md`:

- [ ] Screenshot proof at desktop **and 375px**. "Look at it" means a real browser screenshot, never grep output.
- [ ] Keyboard-only pass.
- [ ] Reduced-motion pass.
- [ ] `npm run regression:firewall`.
- [ ] `/crucible`, grade B or better.

---

## If you added something new

- [ ] Registered in `design-system/registry/{components,patterns,features}.json` or `assets.json` with purpose, variants, sizes, states, responsive behaviour, accessibility, content limits and correct/incorrect usage.
- [ ] A line in `design-system/DECISIONS.md` saying which gap forced it.
- [ ] `find.mjs <new name>` returns exactly one entry, not two.

## If you pulled something from an external library

- [ ] It solves a need the registry does not cover.
- [ ] Restyled entirely with our tokens. No competing palette, radius language or motion curve survived.
- [ ] Unnecessary dependencies and effects stripped.
- [ ] Licence and provenance recorded.
- [ ] Responsive, keyboard, contrast, reduced-motion and bundle impact all verified.
- [ ] Registered.
