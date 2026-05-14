# Homepage Massive UI Upgrade

> **Status:** draft
> **Priority:** P1
> **Depends on:** none (all existing infrastructure sufficient)
> **Approach:** Hybrid (icons/gradients for categories, real photos for hero + featured chefs)

---

## What This Does

Transforms the homepage from a functional but monochrome discovery interface into a visually premium, emotionally engaging food marketplace. Eight coordinated improvements create visual rhythm, hierarchy, and trust while preserving all existing personalization, analytics, and discovery rail functionality.

---

## Improvement 1: Hero Background Imagery

### Current

Solid gradient (`#1a0e08`) with radial bloom accents. Text-only hero. No food imagery on a food platform.

### Target

Layered hero with a **slow Ken Burns pan** on a curated food photograph behind a gradient overlay. The gradient overlay preserves text readability while the photo adds warmth and appetite appeal.

### Implementation

- New component: `HeroBackgroundImage` in `app/(public)/_components/hero-background-image.tsx`
- Uses `CloudinaryFetchImage` with a curated set of 5-8 high-quality food photos (plated dishes, table settings, chef action shots)
- Photos rotate on each page load (server-side random selection from a static array of Unsplash/Pexels URLs)
- CSS: `position: absolute; inset: 0; object-fit: cover;` with `opacity: 0.15-0.20` and a gradient overlay on top
- Ken Burns: `@keyframes ken-burns` with slow `scale(1) -> scale(1.08)` + subtle `translate` over 20s, `animation-fill-mode: forwards`
- Reduced motion: static image, no animation
- Gradient overlay: existing radial blooms remain on top, creating depth
- Fallback: if image fails to load, current gradient-only hero renders (graceful degradation)

### Assets Needed

- 5-8 royalty-free food photos (Unsplash/Pexels). Pre-selected URLs hardcoded in a constant array.
- All served through existing Cloudinary fetch proxy with `w_1920,q_auto,f_auto` transforms

---

## Improvement 2: Visual Cuisine Category Cards (Row 1 Upgrade)

### Current

Row 1 ("Taste") renders all items as small text pills (~48px height). Cuisine pills have country flag images from flagcdn.com but are still small and text-dominant.

### Target

Top 12-16 most popular cuisines render as **large visual cards** (160x100px mobile, 180x120px desktop) with:

- Gradient background using per-cuisine glow colors (already defined in `CUISINE_GLOW_COLORS`)
- Country flag as a subtle watermark/overlay (30% opacity, positioned bottom-right)
- Cuisine emoji large and centered
- Cuisine name + country label below
- Remaining cuisines still render as current pills (graceful overflow)

### Implementation

- New pill presentation type: `'visual_card'` in `DiscoveryRailItem`
- `getPillStyle()` returns larger dimensions + card-specific styling for this presentation
- `DiscoveryPill` renders a different layout when `presentation === 'visual_card'`
- `buildHomepageTasteRailItems()` marks top 12-16 items with `presentation: 'visual_card'`, rest keep `'badge'`
- Row 1 auto-scroll speed adjusted for larger card widths
- Cards use `rounded-2xl` with subtle inner shadow and border glow on hover

### No New Files

- Modifications to `cuisine-marquee.tsx` (pill rendering) and `homepage-taste-rail.ts` (item building)

---

## Improvement 3: Visual Hierarchy Between Rows

### Current

All 3 desktop rows look identical: same pill sizes, same brown tones, same spacing. No visual separation.

### Target

Each row has a distinct visual identity:

**Row 1 (Taste):** Large visual cards (Improvement 2). Warm amber/copper palette. Slightly more vertical padding.

**Row 2 (Occasion):** Icon-forward pills with **color coding by category**:

- Occasions (birthday, date night): rose/pink tones
- Services (catering, meal prep): teal/green tones
- Dietary (vegan, gluten-free): emerald tones
- Timing (tonight, this weekend): amber/gold tones
- Group size / price: slate/cool tones

**Row 3 (ChefFlow Picks):** Mixed-size items:

- Featured chef cards: **2x width** (320px) with photo, name, cuisine, location
- Story cards: 1.5x width with editorial styling
- Regular pills: standard size
- Culinary signals: gold accent border with seasonal icon

### Implementation

- Row label badges ("TASTE", "OCCASION", "CHEFFLOW PICKS") get subtle left-aligned headers above each row (uppercase, tracking-widest, 11px, stone-500)
- `getPillStyle()` updated with category-aware color mapping for Row 2
- Row 3 featured chef pills get `presentation: 'featured_hero'` with 2x width
- Each row gets a thin `border-t border-stone-800/30` separator
- Vertical padding between rows increases from current 4px to 12px

---

## Improvement 4: Featured Chef Spotlight Section

### Current

Featured chef appears as a same-size pill in Row 3, easily missed.

### Target

Dedicated **Featured Chef Spotlight** section between the discovery rail and below-fold content. Full-width card with:

- Chef profile photo (left side, 120x120 rounded-2xl via `getOptimizedAvatar`)
- Chef name (large, serif font)
- Primary cuisine + location
- One-liner tagline or bio excerpt
- "View profile" CTA button
- Warm gradient background distinct from surrounding sections
- Rotates between available featured chefs (server-side selection)

### Implementation

- New component: `FeaturedChefSpotlight` in `app/(public)/_components/featured-chef-spotlight.tsx`
- Server component receiving `FeaturedChefRailData` (already fetched in page.tsx)
- Selects the chef with the most complete profile (photo + bio + cuisine)
- Wrapped in `ScrollReveal` for entrance animation
- Graceful degradation: returns `null` if no chef has a profile photo
- Featured chef ALSO remains in Row 3 as a pill (dual presence reinforces)

---

## Improvement 5: Seasonal Visual Band

### Current

Seasonal ingredients appear as small pills in Row 3, indistinguishable from other pills.

### Target

Full-width **seasonal band** between hero and discovery rail:

- Season name with icon (existing Lucide season icons)
- Color palette shifts by season:
  - Spring: soft green accents (`emerald-400/10` bg, `emerald-500` borders)
  - Summer: warm gold (`amber-400/10` bg, `amber-500` borders)
  - Fall: burnt orange (`orange-400/10` bg, `orange-600` borders)
  - Winter: cool slate (`slate-400/10` bg, `slate-500` borders)
- "What's fresh right now" header
- 2-3 peak ingredient pills with seasonal styling
- 1 "ending soon" pill with urgent amber styling
- "See all seasonal" link to `/ingredients`
- Acts as visual break between hero warmth and discovery rail

### Implementation

- Activate existing `HomepageSeasonalSpotlight` component (already built, not currently rendered in page.tsx)
- Restyle with season-aware color palette
- Add season detection logic (already exists in `getPublicSeasonalMarketPulse`)
- Place between `HomepageDiscovery` and the activity signals bar
- Wrapped in `ScrollReveal`

---

## Improvement 6: Micro-Interactions & Polish

### Current

Pill hover has scale + glow. Hero text has shimmer. Scroll reveal exists. Functional but uniform.

### Target

Layered micro-interactions that reward exploration:

**Hero:**

- Ken Burns on background photo (covered in Improvement 1)
- Parallax: hero text scrolls at 0.8x speed, background at 0.6x speed (CSS `transform: translateY(calc(var(--scroll) * 0.2))` via scroll listener)
- Search bar: existing premium glow enhanced with subtle breathing animation on idle

**Discovery Rail:**

- Pill hover: category-specific glow color (not uniform amber)
- Pill click: brief scale-down (0.95) + ripple effect
- Row entrance: stagger already exists, enhance with slight horizontal offset (pills slide in from scroll direction)

**General:**

- CTA buttons: subtle shimmer sweep on idle (reuse `hero-glint-gold` pattern)
- Avatar strip: gentle floating animation (translateY oscillation, 3s cycle)

### Implementation

- New CSS keyframes in `globals.css` for parallax, breathing glow, floating avatars
- Scroll listener in `homepage-discovery.tsx` for parallax (using `requestAnimationFrame`, no layout thrash)
- All animations respect `prefers-reduced-motion`
- Performance: CSS transforms only (no layout/paint triggers), `will-change` on animated elements

---

## Improvement 7: Trust & Social Proof Bar

### Current

`ChefAvatarStrip` is 36px overlapping circles with "Real chefs. Real kitchens." Barely visible. Activity signals bar is a thin text line.

### Target

Combined **Trust Bar** section below the hero:

- Larger avatars (48px) with hover: expand to show chef name tooltip
- "Trusted by X chefs across Y cities" headline (uses real stats)
- Optional rotating testimonial snippet (if 3+ approved testimonials exist)
- Stats integrated inline: avg rating with stars, cuisine count, city count
- Visual treatment: glass-warm card with subtle border

### Implementation

- New component: `HeroTrustBar` in `app/(public)/_components/hero-trust-bar.tsx`
- Merges functionality of `ChefAvatarStrip` (from page.tsx) and `HomepageActivitySignals`
- Server component receiving `stats` + `avatarChefs` props
- Replaces both existing elements (removes `homepage-activity-signals.tsx` usage from page, keeps file for potential reuse elsewhere)
- Testimonial rotation: client-side `useState` cycling every 5s with fade transition

---

## Improvement 8: Color Temperature Breaks

### Current

Entire page is one warm brown temperature (`#1a0e08` to `#0c0a09`). No visual rhythm.

### Target

Alternating temperature zones create visual breathing room:

| Section        | Temperature                   | Background                            |
| -------------- | ----------------------------- | ------------------------------------- |
| Hero           | Warm (keep)                   | `#1a0e08` gradient + photo overlay    |
| Seasonal Band  | Season-tinted (Improvement 5) | Season-specific accent on dark base   |
| Trust Bar      | Warm glass                    | `glass-warm` on transparent           |
| Discovery Rail | Cooler dark                   | `#0f0d0c` (slightly cooler stone-950) |
| Featured Chef  | Warm accent                   | Gradient card on `#0c0a09`            |
| How It Works   | Cool charcoal                 | `#111111` (neutral, no warm tint)     |
| For Providers  | Warm return                   | Current styling                       |
| Final CTA      | Dark clean                    | `#0a0a0a` with brand accent           |

### Implementation

- Each section gets an explicit `bg-[]` or CSS custom property
- Transitions between zones use 80px gradient bleed (`background: linear-gradient(to bottom, zone-A, zone-B)`) to avoid hard cuts
- New CSS custom properties: `--zone-discovery`, `--zone-howit`, `--zone-cta`
- Modify `landing-below-fold.tsx` section backgrounds
- Add zone wrapper divs in `page.tsx` render

---

## Files to Create

| File                                                   | Purpose                                    |
| ------------------------------------------------------ | ------------------------------------------ |
| `app/(public)/_components/hero-background-image.tsx`   | Ken Burns hero photo with gradient overlay |
| `app/(public)/_components/featured-chef-spotlight.tsx` | Full-width featured chef card section      |
| `app/(public)/_components/hero-trust-bar.tsx`          | Combined trust + social proof + stats bar  |

## Files to Modify

| File                                                       | Changes                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                    | New section ordering, zone wrappers, seasonal spotlight activation, trust bar integration          |
| `app/(public)/_components/cuisine-marquee.tsx`             | Visual card presentation, category color coding, row hierarchy, micro-interactions                 |
| `app/(public)/_components/homepage-seasonal-spotlight.tsx` | Season-aware color palette, restyle                                                                |
| `app/globals.css`                                          | Ken Burns keyframes, parallax, breathing glow, floating avatars, zone backgrounds, category colors |
| `lib/discovery/homepage-taste-rail.ts`                     | Mark top cuisines as `visual_card` presentation                                                    |
| `lib/discovery/homepage-discovery-rail.ts`                 | Add `visual_card` and `featured_hero` presentation types                                           |

## Files NOT Modified

| File                            | Why                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `homepage-activity-signals.tsx` | Kept as-is; trust bar replaces its usage on homepage but component may be reused |
| `homepage-testimonials.tsx`     | Unchanged; testimonial data feeds into trust bar rotation                        |
| `landing-below-fold.tsx`        | Only background colors change; content/structure preserved                       |

---

## Database Changes

None.

---

## Asset Strategy (Hybrid)

| Element           | Asset Type                              | Source                                      |
| ----------------- | --------------------------------------- | ------------------------------------------- |
| Hero background   | Real photos (5-8)                       | Unsplash/Pexels, hardcoded URLs             |
| Cuisine cards     | Emoji + CSS gradients + flag watermarks | Existing `CUISINE_GLOW_COLORS` + flagcdn    |
| Featured chef     | Real profile photo                      | Existing `profile_image_url` via Cloudinary |
| Seasonal band     | Lucide icons + CSS                      | Existing components                         |
| Trust bar avatars | Real chef photos                        | Existing `profile_image_url` via Cloudinary |
| Occasion pills    | Lucide icons + category colors          | Existing `DISCOVERY_ICON_MAP`               |

No new external dependencies. No new storage. All images through existing Cloudinary fetch proxy.

---

## Performance Considerations

- Hero image: lazy-load with `loading="eager"` (above fold), `priority` flag on Next.js Image
- Ken Burns: CSS-only animation, no JS. `will-change: transform` on the image element
- Parallax: single `requestAnimationFrame` scroll listener, CSS transforms only
- Visual cards in Row 1: same `<img>` tag for flags (already cached), emoji are text
- All new animations: `prefers-reduced-motion` respected globally

---

## What This Does NOT Change

- Discovery rail personalization logic (scoring, signals, preferences)
- Multi-select filter mode
- Pin/hide/love feedback system
- Analytics tracking (PostHog events)
- SEO structured data (JSON-LD)
- Mobile layout fundamentals (responsive breakpoints preserved)
- Search functionality
- Below-fold content structure
- Authentication or data fetching
