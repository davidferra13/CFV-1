# ChefFlow Color Theme Map

Every place identity colors touch the UI. Nothing can be missed when switching themes.

## How the Theme System Works

The identity has two halves:

- **Accent colors** (the brand scale: copper/purple/blue/etc.) - this is what changes dramatically between themes
- **Foundation tint** (the dark grays get a subtle tint toward the accent) - subtle, optional

The accent does 90% of the visual identity shift. The foundation tint is the remaining 10%.

---

## Layer 1: CSS Custom Properties (globals.css :root)

These are the single source of truth. Everything else should flow from here.

| Variable              | Current Value            | Role                                    |
| --------------------- | ------------------------ | --------------------------------------- |
| `--brand-50`          | `#fef9f3`                | Lightest accent tint                    |
| `--brand-400`         | `#f3c596`                | Soft accent (links, highlights)         |
| `--brand-500`         | `#eda86b`                | Hero accent (buttons, focus, active)    |
| `--brand-600`         | `#b15c26`                | Deep accent (hover, text links)         |
| `--brand-950`         | `#3e200f`                | Darkest accent (selection bg, today bg) |
| `--surface-0`         | `#0c0a09`                | Body background                         |
| `--surface-1`         | `#1c1917`                | Sidebar, recessed panels                |
| `--surface-2`         | `#292524`                | Cards, inputs                           |
| `--surface-3`         | `#44403c`                | Popovers, modals, borders               |
| `--border-warm`       | `rgba(232,143,71, 0.12)` | Accent-tinted border                    |
| `--border-warm-hover` | `rgba(232,143,71, 0.25)` | Accent-tinted border hover              |
| `--shadow-card`       | warm-tinted              | Card shadow                             |
| `--shadow-card-hover` | warm-tinted              | Card hover shadow                       |
| `--shadow-overlay`    | warm-tinted              | Overlay shadow                          |
| `--card-gradient`     | `rgba(255,255,255,0.02)` | Subtle top-light on cards               |
| `--text-muted`        | `#d6d3d1`                | Secondary text                          |
| `--text-muted-soft`   | `#b8b1ab`                | Tertiary text                           |
| `--text-placeholder`  | `#a8a29e`                | Placeholder text                        |

---

## Layer 2: Tailwind Config (tailwind.config.ts)

The `brand` color scale is hardcoded hex. Needs to reference CSS vars instead.

| Token       | Current Hex | Needs to become    |
| ----------- | ----------- | ------------------ |
| `brand.50`  | `#fef9f3`   | `var(--brand-50)`  |
| `brand.100` | `#fcf0e0`   | `var(--brand-100)` |
| `brand.200` | `#f8ddc0`   | `var(--brand-200)` |
| `brand.300` | `#f3c596`   | `var(--brand-300)` |
| `brand.400` | `#f3c596`   | `var(--brand-400)` |
| `brand.500` | `#eda86b`   | `var(--brand-500)` |
| `brand.600` | `#b15c26`   | `var(--brand-600)` |
| `brand.700` | `#b15c26`   | `var(--brand-700)` |
| `brand.800` | `#8e4a24`   | `var(--brand-800)` |
| `brand.900` | `#744021`   | `var(--brand-900)` |
| `brand.950` | `#3e200f`   | `var(--brand-950)` |

**Problem:** Tailwind's `bg-brand-500/20` (opacity modifier) doesn't work with CSS `var()` in hex format. We need to use `rgb()` format for CSS vars so Tailwind opacity works:

- `--brand-500: 237 168 107` (RGB values)
- Tailwind: `rgb(var(--brand-500) / 0.2)`

---

## Layer 3: Hardcoded Hex Values in globals.css

These bypass CSS vars and must be converted.

| Line(s)    | Current                                    | What it does             |
| ---------- | ------------------------------------------ | ------------------------ |
| L56        | `#3e200f`                                  | `::selection` background |
| L66        | `#1c1917`                                  | Scrollbar track          |
| L69        | `#44403c`                                  | Scrollbar thumb          |
| L72        | `#57534e`                                  | Scrollbar thumb hover    |
| L123       | `#0c0a09`                                  | Ring offset color        |
| L195       | `#f3c596`                                  | Link hover color         |
| L271       | `#44403c`                                  | FullCalendar border      |
| L273-274   | `#292524`, `#1c1917`                       | FullCalendar backgrounds |
| L298-299   | `#292524`, `#44403c`                       | Calendar header          |
| L304       | `#d6d3d1`                                  | Calendar header text     |
| L315       | `#292524`                                  | Calendar day hover       |
| L322       | `#d6d3d1`                                  | Day numbers              |
| L342       | `#57534e`                                  | Other month days         |
| L379-388   | `#292524`                                  | Time grid slots          |
| L383       | `#a8a29e`                                  | Time slot labels         |
| L420-435   | `#292524`                                  | List view backgrounds    |
| L449-458   | `#44403c`, `#1c1917`, `#292524`, `#d6d3d1` | Calendar popover         |
| L1091      | `rgba(232,143,71, 0.03)`                   | Sidebar gradient         |
| L1163      | `#e8a878`                                  | Remy fallback body       |
| L1173      | `#f5f0e8`                                  | Remy fallback hat        |
| L1184-1185 | `#44302a`                                  | Remy fallback eyes       |
| L1194      | `#fafaf9`                                  | Blog h2                  |
| L1205      | `#e7e5e4`                                  | Blog h3                  |
| L1209      | `#a8a29e`                                  | Blog paragraph           |
| L1215      | `#e7e5e4`                                  | Blog strong              |
| L1220      | `#d6d3d1`                                  | Blog em                  |
| L1226      | `#a8a29e`                                  | Blog lists               |
| L1243      | `#e88f47`                                  | Blog link color          |
| L1250      | `#eda86b`                                  | Blog link hover          |
| L1254-1255 | `#1c1917`, `#44403c`                       | Blog code block          |
| L1265      | `#d6d3d1`                                  | Blog code text           |
| L1270-1271 | `#292524`, `#e88f47`                       | Blog inline code         |
| L1286-1291 | `#292524`, `#e7e5e4`, `#44403c`            | Blog table               |
| L1295      | `#a8a29e`                                  | Blog table cells         |
| L1301      | `#1c1917`                                  | Blog table row hover     |
| L1306      | `#44403c`                                  | Blog hr                  |

---

## Layer 4: Hardcoded Hex in Components (inline styles, not Tailwind classes)

| File                                                  | What                                  | Hex values used                                                  |
| ----------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `app/layout.tsx:28`                                   | Meta theme-color                      | `#e88f47`                                                        |
| `app/opengraph-image.tsx`                             | OG image gradients                    | `#eda86b`, `#e88f47`, `#d47530`                                  |
| `app/global-error.tsx`                                | Error page inline styles              | `#292524`, `#1c1917`, `#44403c`, `#e88f47`                       |
| `app/embed/error.tsx`                                 | Embed error button                    | `#e88f47`                                                        |
| `app/embed/inquiry/[chefId]/page.tsx`                 | Embed accent default                  | `#e88f47`                                                        |
| `app/embed/not-found.tsx`                             | Embed 404 heading                     | `#1c1917`                                                        |
| `app/(public)/unsubscribe/page.tsx`                   | Unsubscribe bg                        | `#0c0a09`, `#1c1917`                                             |
| `app/(public)/hub/join/[groupToken]/page.tsx`         | Hub gradient fallback                 | `#1c1917`, `#0c0a09`                                             |
| `app/(public)/hub/me/[profileToken]/profile-view.tsx` | Profile tab border, badge, powered-by | `#e88f47`                                                        |
| `app/(public)/chef/[slug]/page.tsx`                   | Chef page primary color fallback      | `#1c1917`                                                        |
| `app/(public)/chef/[slug]/opengraph-image.tsx`        | Chef OG image                         | `#1c1917`                                                        |
| `app/(public)/chef/[slug]/partner-signup/page.tsx`    | Partner signup color                  | `#1c1917`                                                        |
| `app/(public)/g/[code]/page.tsx`                      | Gift card primary color               | `#1c1917`                                                        |
| `app/(public)/partner-signup/page.tsx`                | Partner signup color                  | `#1c1917`                                                        |
| `app/(client)/book-now/page.tsx`                      | Book now primary color                | `#1c1917`                                                        |
| `components/ui/branded-illustrations.tsx`             | All SVG illustrations                 | `#eda86b`, `#e88f47`, `#d47530`, `#fef9f3`, `#f5f3ef`, `#f8ddc0` |
| `components/ui/food-placeholder-image.tsx`            | Food image gradient                   | `#e88f47`, `#d47530`, `#b85d1a`                                  |
| `components/ui/milestone-overlay.tsx`                 | Milestone button text                 | `#1c1917`                                                        |
| `public/embed/chefflow-widget.js`                     | Widget iframe bg, close btn           | `#1c1917`, `#44403c`                                             |
| `components/activity/live-presence-panel.tsx:181`     | Retrace link color                    | Uses `brand-600` class                                           |

---

## Layer 5: Tailwind Classes Using brand-\* (auto-updates if we fix Layer 2)

These are the ~200+ places using `brand-50` through `brand-950` via Tailwind classes. Once the Tailwind config references CSS vars, ALL of these update automatically. No changes needed in individual files.

**Most common patterns:**

- `bg-brand-500` / `bg-brand-600` - primary buttons, active states
- `text-brand-600` / `text-brand-400` - links, interactive text
- `hover:text-brand-400` - link hover states
- `border-brand-500` / `border-brand-600` - focus rings, active borders
- `bg-brand-950` - deep accent backgrounds (selected states, today marker)
- `ring-brand-500/20` - focus ring glow
- `bg-brand-100 text-brand-400` - light accent badges

---

## Layer 6: Stone Classes (Foundation)

The stone scale (`stone-50` through `stone-950`) is Tailwind's built-in palette and is used in 300+ places. It forms the dark foundation of the app.

**For theming, there are two approaches:**

**Approach A (recommended): Keep stone as-is.** All 8 theme variations use the same dark foundation. Only the accent changes. This is 90% of the visual impact with 10% of the work. The stone grays are neutral enough to work with any accent color.

**Approach B (full): Override stone with tinted grays.** Each theme gets subtly tinted grays (purple-gray for Plum, blue-gray for Indigo, etc.). This requires overriding Tailwind's stone scale with CSS vars, which is invasive but possible.

**Recommendation: Start with Approach A.** If the accent-only swap looks good (it will), ship it. Tinted foundations can come later as a refinement.

---

## Implementation Plan

1. **Convert Tailwind brand scale to CSS vars** (tailwind.config.ts)
2. **Add all brand values to :root as CSS vars** (globals.css) - partially done, needs full scale
3. **Convert hardcoded hexes in globals.css** to use CSS vars
4. **Create theme definitions** - one `:root` block per theme, activated by `data-theme` attribute
5. **Build ThemeProvider** - React context + localStorage persistence
6. **Add theme picker to settings page**
7. **Handle edge cases** - OG images, embed widget, SVG illustrations, inline styles
8. **Default to Copper and Cast Iron**

### Edge Cases That Can't Use CSS Vars

- OG images (rendered server-side as images, no CSS)
- Embed widget (standalone JS, runs on external sites)
- SVG illustrations (could use `currentColor` instead of hex)
- Meta theme-color (set in layout.tsx, could read from cookie/session)

These will stay as Copper and Cast Iron (the brand default) regardless of user theme preference. The theme is a UI preference, not a brand identity override for external-facing assets.
