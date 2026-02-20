# Visual Consistency Pass 1

## What Changed and Why

This pass addressed low-risk inconsistencies identified during a full visual audit of ChefFlow V1. All changes are purely cosmetic — no logic, data, or layout structure was altered.

---

## Changes Made

### 1. Switch toggle color — `components/ui/switch.tsx`

**Before:** `bg-stone-900` (black) when checked

**After:** `bg-brand-600` (orange) when checked; focus ring updated from `ring-stone-900` → `ring-brand-600`

**Why:** The switch was visually disconnected from the brand color system. Every other active/interactive state in the app uses brand orange. Black felt arbitrary.

---

### 2. Stat card icon boxes — `components/ui/stat-card.tsx`

**Before:** `bg-stone-100 / text-stone-600` (gray icon box)

**After:** `bg-brand-50 / text-brand-600` (faint orange icon box)

**Why:** Stat cards are prominent on the dashboard. The gray icon boxes felt flat and neutral. Warming them up with brand-50 adds visual cohesion without competing with the metric number as the focal point.

---

### 3. Homepage border radius — `app/(public)/page.tsx`

**Before:** Feature cards and steps box used `rounded-2xl` (16px)

**After:** Both changed to `rounded-xl` (12px)

**Why:** The rest of the app consistently uses `rounded-xl` for all card-level containers. The homepage was inconsistent, making it feel like a different design system.

---

### 4. Sidebar font sizes — `components/navigation/chef-nav.tsx`

**Before:** `text-[11px]`, `text-[15px]` — arbitrary sizes outside the Tailwind scale

**After:** `text-[11px]` → `text-xs` (12px), `text-[15px]` → `text-sm` (14px)

**Why:** Using hardcoded pixel values breaks out of the design system. The normalized sizes are visually imperceptible from the originals but the code is now consistent.

---

### 5. Dashboard trend color — `app/(chef)/dashboard/page.tsx`

**Before:** `text-green-600` for positive trend indicators (3 occurrences)

**After:** `text-emerald-600`

**Why:** The semantic color system uses `emerald` for success/positive states throughout (badges, alerts, status indicators). `green` is from a different Tailwind color family and is tonally different. This unifies all positive states under one color.

---

### 6. Card border opacity — `components/ui/card.tsx`

**Before:** `border-stone-200/80` (80% opacity)

**After:** `border-stone-200` (full opacity)

**Why:** The `/80` opacity modifier caused subtle rendering inconsistency, especially over non-white backgrounds (which the chef portal supports via custom background colors). Full opacity is more predictable and matches all other border uses in the codebase.

---

### 7. PWA theme color — `app/layout.tsx` + `public/manifest.json`

**Before:** `theme_color: #111827` (dark navy), `background_color: #111827`

**After:** `theme_color: #e88f47` (brand-500 orange), `background_color: #faf9f7` (surface-muted cream)

**Why:** `#111827` is from Tailwind's gray-900 (cool gray) — completely disconnected from the warm stone+orange palette used everywhere else. On mobile, the theme color tints the browser chrome. The orange is now on-brand. The background color (shown during PWA splash screen) now matches the actual app page background.

---

### 8. Cookie consent button + link + container — `components/ui/cookie-consent.tsx`

**Before:** Button `bg-stone-900 hover:bg-stone-800` (black); Privacy link `hover:text-amber-600` (wrong semantic — amber = warning); Container `rounded-2xl`

**After:** Button `bg-brand-600 hover:bg-brand-700`; Privacy link `hover:text-brand-700`; Container `rounded-xl`

**Why:** Three separate issues in one component. The button was off-brand black. The link used amber (warning color) on hover — amber means "something pending/cautionary," not "I'm a link." The container radius was `rounded-2xl`, inconsistent with the `rounded-xl` standard normalized across the app.

---

## Files Modified

- [components/ui/switch.tsx](../components/ui/switch.tsx)
- [components/ui/stat-card.tsx](../components/ui/stat-card.tsx)
- [components/ui/card.tsx](../components/ui/card.tsx)
- [components/ui/cookie-consent.tsx](../components/ui/cookie-consent.tsx)
- [components/navigation/chef-nav.tsx](../components/navigation/chef-nav.tsx)
- [app/(public)/page.tsx](../app/(public)/page.tsx)
- [app/(chef)/dashboard/page.tsx](../app/(chef)/dashboard/page.tsx)
- [app/layout.tsx](../app/layout.tsx)
- [public/manifest.json](../public/manifest.json)

## What Was NOT Changed

- Logo (still `.jpg` — requires new asset from user)
- The two-orange issue (`brand-500` in calendar vs `brand-600` on buttons) — calendar uses FullCalendar CSS overrides and is intentionally scoped separately
- Client nav font sizes — client-nav.tsx was audited and is clean (no arbitrary sizes found)
- Any layout, spacing, or structural changes

## Additional Sweep (same session)

`text-green-600` → `text-emerald-600` swept across all 43 remaining files including: financials, events, clients, goals, recipes, scheduling, marketing, chat, imports, and public pages. Zero instances remain in the codebase.
