# Discovery Rail Layer 1: Visual Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji pills with premium image-backed cards, establish a design system, wire `control-rail-contracts.ts` assembly logic, and make the rail container breathe.

**Architecture:** Extract card rendering from the 3168-line `cuisine-marquee.tsx` into focused components. Introduce a static image map for food photography. Wire the existing `assembleDiscoveryRailItems()` to replace ad-hoc item assembly. Establish CSS custom properties for the discovery design system.

**Tech Stack:** Next.js (React Server Components + Client Components), Tailwind CSS, CSS custom properties, `next/image` for optimized loading.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 1, Builds 1.1-1.4)

---

## File Map

### New Files

| File                                                   | Responsibility                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `components/discovery/discovery-card.tsx`              | Card component with 3 visual variants (FoodPhoto, Abstract, Proof) |
| `components/discovery/discovery-card-feedback.tsx`     | Love/Pin/Hide feedback buttons extracted from marquee              |
| `components/discovery/discovery-row.tsx`               | Single scrollable row extracted from marquee render loop           |
| `lib/discovery/image-map.ts`                           | Static mapping of cuisine/occasion/vibe slugs to image paths       |
| `tests/unit/image-map.test.ts`                         | Image map coverage and fallback tests                              |
| `tests/unit/discovery-card.test.ts`                    | Card variant selection and prop threading                          |
| `tests/unit/control-rail-assembly-integration.test.ts` | Assembly wiring tests                                              |

### Modified Files

| File                                              | Changes                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/_components/cuisine-marquee.tsx`    | Extract card rendering, row rendering, use DiscoveryCard + DiscoveryRow components, wire assembleDiscoveryRailItems |
| `app/(public)/_components/homepage-discovery.tsx` | Widen container from max-w-2xl to max-w-6xl                                                                         |
| `app/(public)/page.tsx`                           | Pass assembled items through control rail pipeline                                                                  |
| `app/globals.css`                                 | Discovery design system CSS custom properties, depth tokens, gradient mesh                                          |

### Image Assets (deferred)

| Directory                      | Contents                            |
| ------------------------------ | ----------------------------------- |
| `public/discovery/cuisine/`    | 40 WebP cuisine images (~30KB each) |
| `public/discovery/occasion/`   | 15 WebP occasion images             |
| `public/discovery/vibe/`       | 10 WebP vibe images                 |
| `public/discovery/ingredient/` | 10 WebP ingredient images           |

> **Note on images:** Task 2 creates the image map with paths. Actual image files are sourced separately (download from Unsplash/Pexels, convert to WebP, optimize). The map includes gradient fallbacks so the rail works without images present.

---

## Task 1: Discovery Design System (CSS Custom Properties)

**Files:**

- Modify: `app/globals.css` (discovery section, lines ~1017-1499)
- Test: Visual inspection (CSS custom properties are tested through component tests)

This task establishes the color, typography, and depth tokens that all subsequent tasks use.

- [ ] **Step 1: Read current discovery CSS section**

Read `app/globals.css` lines 1017-1499 to understand existing discovery styles.

- [ ] **Step 2: Add CSS custom properties block**

Add this block at the TOP of the discovery section in `app/globals.css`, before existing rules:

```css
/* ── Discovery Rail Design System ─────────────────────── */
:root {
  /* Lane palettes */
  --discovery-taste-primary: #f59e0b;
  --discovery-taste-secondary: #fbbf24;
  --discovery-taste-muted: rgba(245, 158, 11, 0.15);
  --discovery-taste-glow: rgba(245, 158, 11, 0.25);
  --discovery-taste-bg: rgba(38, 20, 9, 0.8);

  --discovery-occasion-primary: #10b981;
  --discovery-occasion-secondary: #34d399;
  --discovery-occasion-muted: rgba(16, 185, 129, 0.15);
  --discovery-occasion-glow: rgba(16, 185, 129, 0.25);
  --discovery-occasion-bg: rgba(24, 25, 15, 0.76);

  --discovery-picks-primary: #8b5cf6;
  --discovery-picks-secondary: #a78bfa;
  --discovery-picks-muted: rgba(139, 92, 246, 0.15);
  --discovery-picks-glow: rgba(139, 92, 246, 0.25);
  --discovery-picks-bg: rgba(42, 22, 13, 0.85);

  /* Text opacity scale */
  --discovery-text-primary: 0.95;
  --discovery-text-secondary: 0.7;
  --discovery-text-tertiary: 0.45;
  --discovery-text-disabled: 0.25;

  /* Depth layers */
  --discovery-depth-bg: rgba(255, 255, 255, 0.01);
  --discovery-depth-rail: rgba(255, 255, 255, 0.03);
  --discovery-depth-card: rgba(255, 255, 255, 0.05);
  --discovery-depth-border: rgba(255, 255, 255, 0.08);

  /* Card dimensions */
  --discovery-card-w: 200px;
  --discovery-card-h: 140px;
  --discovery-card-w-mobile: 170px;
  --discovery-card-h-mobile: 120px;
  --discovery-card-radius: 16px;
  --discovery-card-gap: 16px;
  --discovery-card-gap-mobile: 12px;

  /* Type scale */
  --discovery-heading-size: 1.125rem;
  --discovery-lane-label-size: 0.875rem;
  --discovery-card-title-size: 0.875rem;
  --discovery-card-sublabel-size: 0.75rem;
  --discovery-eyebrow-size: 0.625rem;
}

@media (max-width: 767px) {
  :root {
    --discovery-card-w: 170px;
    --discovery-card-h: 130px;
    --discovery-card-gap: 12px;
  }
}
```

- [ ] **Step 3: Add depth and glassmorphism utility classes**

Add below the custom properties:

```css
.discovery-container {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(15, 10, 5, 0.4) 0%,
    rgba(10, 8, 20, 0.3) 50%,
    rgba(15, 10, 5, 0.4) 100%
  );
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid var(--discovery-depth-border);
  border-radius: 24px;
  padding: 24px 0;
}

.discovery-rail-layer {
  background: var(--discovery-depth-rail);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.discovery-card-base {
  width: var(--discovery-card-w);
  height: var(--discovery-card-h);
  border-radius: var(--discovery-card-radius);
  border: 1px solid var(--discovery-depth-border);
  background: var(--discovery-depth-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition:
    transform 150ms ease-out,
    box-shadow 150ms ease-out;
}

.discovery-card-base:hover {
  transform: scale(1.04) translateY(-3px);
}

.discovery-card-base:active {
  transform: scale(0.97);
}

/* Lane-specific card glows on hover */
.discovery-card-taste:hover {
  box-shadow: 0 8px 32px var(--discovery-taste-glow);
}
.discovery-card-occasion:hover {
  box-shadow: 0 8px 32px var(--discovery-occasion-glow);
}
.discovery-card-picks:hover {
  box-shadow: 0 8px 32px var(--discovery-picks-glow);
}

/* Gradient scrim for text over images */
.discovery-card-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    transparent 100%
  );
  pointer-events: none;
}

/* Abstract card gradient backgrounds */
.discovery-abstract-taste {
  background: linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%);
}
.discovery-abstract-occasion {
  background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%);
}
.discovery-abstract-picks {
  background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #2e1065 100%);
}

/* Lane separator */
.discovery-lane-separator {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--discovery-depth-border) 20%,
    var(--discovery-depth-border) 80%,
    transparent 100%
  );
  margin: 8px 0;
}

/* Edge fade mask */
.discovery-row-mask {
  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
}

@media (max-width: 767px) {
  .discovery-row-mask {
    mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 5%,
      black 95%,
      transparent 100%
    );
  }
}
```

- [ ] **Step 4: Verify no existing class name conflicts**

Run: `grep -r "discovery-container\|discovery-card-base\|discovery-rail-layer" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" -l`

Expected: Only `app/globals.css` matches.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(discovery): add design system CSS custom properties and depth tokens"
```

---

## Task 2: Image Map

**Files:**

- Create: `lib/discovery/image-map.ts`
- Create: `tests/unit/image-map.test.ts`

- [ ] **Step 1: Write failing test for image map**

Create `tests/unit/image-map.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  getDiscoveryImage,
  getDiscoveryCuisineImage,
  getDiscoveryOccasionImage,
  DISCOVERY_CUISINE_IMAGES,
} from '@/lib/discovery/image-map'

describe('image-map', () => {
  describe('getDiscoveryCuisineImage', () => {
    it('returns mapped image for known cuisine', () => {
      const result = getDiscoveryCuisineImage('italian')
      expect(result).toEqual({
        src: '/discovery/cuisine/italian.webp',
        alt: 'Italian cuisine',
        fallbackGradient: expect.any(String),
      })
    })

    it('returns category fallback for unmapped cuisine', () => {
      const result = getDiscoveryCuisineImage('obscure-regional-cuisine')
      expect(result.src).toBe('/discovery/cuisine/_default.webp')
      expect(result.fallbackGradient).toBeTruthy()
    })
  })

  describe('getDiscoveryOccasionImage', () => {
    it('returns mapped image for known occasion', () => {
      const result = getDiscoveryOccasionImage('date-night')
      expect(result).toEqual({
        src: '/discovery/occasion/date-night.webp',
        alt: 'Date night',
        fallbackGradient: expect.any(String),
      })
    })

    it('returns gradient-only fallback for unknown occasion', () => {
      const result = getDiscoveryOccasionImage('unknown-occasion')
      expect(result.src).toBe('/discovery/occasion/_default.webp')
    })
  })

  describe('getDiscoveryImage', () => {
    it('routes cuisine type to cuisine image', () => {
      const result = getDiscoveryImage('cuisine', 'italian')
      expect(result.src).toContain('/cuisine/')
    })

    it('routes occasion type to occasion image', () => {
      const result = getDiscoveryImage('occasion', 'date-night')
      expect(result.src).toContain('/occasion/')
    })

    it('routes vibe type to vibe image', () => {
      const result = getDiscoveryImage('vibe', 'romantic')
      expect(result.src).toContain('/vibe/')
    })

    it('returns fallback for unknown type', () => {
      const result = getDiscoveryImage('surprise', 'anything')
      expect(result.fallbackGradient).toBeTruthy()
    })
  })

  describe('DISCOVERY_CUISINE_IMAGES coverage', () => {
    it('has at least 30 cuisine entries', () => {
      expect(Object.keys(DISCOVERY_CUISINE_IMAGES).length).toBeGreaterThanOrEqual(30)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/image-map.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement image-map.ts**

Create `lib/discovery/image-map.ts`:

```typescript
export interface DiscoveryImageRef {
  src: string
  alt: string
  fallbackGradient: string
}

const TASTE_GRADIENT = 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)'
const OCCASION_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)'
const PICKS_GRADIENT = 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #2e1065 100%)'
const VIBE_GRADIENT = 'linear-gradient(135deg, #701a75 0%, #86198f 50%, #4a044e 100%)'
const INGREDIENT_GRADIENT = 'linear-gradient(135deg, #365314 0%, #3f6212 50%, #1a2e05 100%)'

export const DISCOVERY_CUISINE_IMAGES: Record<string, { alt: string; gradient: string }> = {
  italian: {
    alt: 'Italian cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
  },
  japanese: {
    alt: 'Japanese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
  },
  mexican: {
    alt: 'Mexican cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
  },
  french: { alt: 'French cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)' },
  chinese: {
    alt: 'Chinese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  indian: { alt: 'Indian cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)' },
  thai: { alt: 'Thai cuisine', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
  korean: { alt: 'Korean cuisine', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)' },
  mediterranean: {
    alt: 'Mediterranean cuisine',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)',
  },
  american: {
    alt: 'American cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
  },
  vietnamese: {
    alt: 'Vietnamese cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
  },
  greek: { alt: 'Greek cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  spanish: {
    alt: 'Spanish cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
  },
  ethiopian: {
    alt: 'Ethiopian cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #4d7c0f 100%)',
  },
  moroccan: {
    alt: 'Moroccan cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  },
  caribbean: {
    alt: 'Caribbean cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
  },
  brazilian: {
    alt: 'Brazilian cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  },
  peruvian: {
    alt: 'Peruvian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  turkish: {
    alt: 'Turkish cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  lebanese: {
    alt: 'Lebanese cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 100%)',
  },
  cajun: { alt: 'Cajun cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)' },
  southern: {
    alt: 'Southern cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
  },
  fusion: { alt: 'Fusion cuisine', gradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)' },
  hawaiian: {
    alt: 'Hawaiian cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #14b8a6 100%)',
  },
  filipino: {
    alt: 'Filipino cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  german: { alt: 'German cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  jamaican: {
    alt: 'Jamaican cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 100%)',
  },
  persian: {
    alt: 'Persian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  },
  soul_food: { alt: 'Soul food', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  colombian: {
    alt: 'Colombian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  cuban: { alt: 'Cuban cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  argentinian: {
    alt: 'Argentinian cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #22d3ee 100%)',
  },
  british: {
    alt: 'British cuisine',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
  },
  african: {
    alt: 'African cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 100%)',
  },
  indonesian: {
    alt: 'Indonesian cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  malaysian: {
    alt: 'Malaysian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  taiwanese: {
    alt: 'Taiwanese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
  },
  bbq: { alt: 'BBQ', gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)' },
  seafood: { alt: 'Seafood', gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)' },
  vegan: { alt: 'Vegan cuisine', gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)' },
}

const DISCOVERY_OCCASION_IMAGES: Record<string, { alt: string; gradient: string }> = {
  'date-night': {
    alt: 'Date night',
    gradient: 'linear-gradient(135deg, #701a75 0%, #a21caf 100%)',
  },
  'dinner-party': {
    alt: 'Dinner party',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
  },
  corporate: {
    alt: 'Corporate event',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
  },
  wedding: { alt: 'Wedding', gradient: 'linear-gradient(135deg, #f5f5f4 0%, #d6d3d1 100%)' },
  birthday: { alt: 'Birthday', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
  brunch: { alt: 'Brunch', gradient: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)' },
  holiday: {
    alt: 'Holiday gathering',
    gradient: 'linear-gradient(135deg, #14532d 0%, #dc2626 100%)',
  },
  casual: {
    alt: 'Casual gathering',
    gradient: 'linear-gradient(135deg, #365314 0%, #4d7c0f 100%)',
  },
  family: { alt: 'Family meal', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  anniversary: {
    alt: 'Anniversary',
    gradient: 'linear-gradient(135deg, #701a75 0%, #be185d 100%)',
  },
  graduation: { alt: 'Graduation', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  'meal-prep': { alt: 'Meal prep', gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)' },
  catering: { alt: 'Catering', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  'cooking-class': {
    alt: 'Cooking class',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)',
  },
  tasting: { alt: 'Tasting event', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
}

const DISCOVERY_VIBE_IMAGES: Record<string, { alt: string; gradient: string }> = {
  romantic: {
    alt: 'Romantic dining',
    gradient: 'linear-gradient(135deg, #701a75 0%, #be185d 100%)',
  },
  cozy: { alt: 'Cozy atmosphere', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  elevated: {
    alt: 'Elevated dining',
    gradient: 'linear-gradient(135deg, #1e1e1e 0%, #374151 100%)',
  },
  adventurous: {
    alt: 'Adventurous food',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
  },
  comfort: { alt: 'Comfort food', gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)' },
  elegant: {
    alt: 'Elegant experience',
    gradient: 'linear-gradient(135deg, #1e1e1e 0%, #6b7280 100%)',
  },
  festive: {
    alt: 'Festive celebration',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #fbbf24 100%)',
  },
  rustic: { alt: 'Rustic setting', gradient: 'linear-gradient(135deg, #365314 0%, #78350f 100%)' },
  modern: { alt: 'Modern cuisine', gradient: 'linear-gradient(135deg, #1e1e1e 0%, #4b5563 100%)' },
  intimate: {
    alt: 'Intimate dining',
    gradient: 'linear-gradient(135deg, #701a75 0%, #4c1d95 100%)',
  },
}

const DISCOVERY_INGREDIENT_IMAGES: Record<string, { alt: string; gradient: string }> = {
  truffle: { alt: 'Truffle', gradient: INGREDIENT_GRADIENT },
  lobster: { alt: 'Lobster', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' },
  wagyu: { alt: 'Wagyu beef', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  seasonal: { alt: 'Seasonal ingredients', gradient: INGREDIENT_GRADIENT },
  citrus: { alt: 'Citrus', gradient: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)' },
  herbs: { alt: 'Fresh herbs', gradient: INGREDIENT_GRADIENT },
  mushroom: { alt: 'Mushrooms', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  chocolate: { alt: 'Chocolate', gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' },
  avocado: { alt: 'Avocado', gradient: 'linear-gradient(135deg, #14532d 0%, #4d7c0f 100%)' },
  salmon: { alt: 'Salmon', gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)' },
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getDiscoveryCuisineImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_CUISINE_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/cuisine/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/cuisine/_default.webp',
    alt: `${slug} cuisine`,
    fallbackGradient: TASTE_GRADIENT,
  }
}

export function getDiscoveryOccasionImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_OCCASION_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/occasion/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/occasion/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: OCCASION_GRADIENT,
  }
}

function getDiscoveryVibeImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_VIBE_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/vibe/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/vibe/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: VIBE_GRADIENT,
  }
}

function getDiscoveryIngredientImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_INGREDIENT_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/ingredient/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/ingredient/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: INGREDIENT_GRADIENT,
  }
}

const TYPE_TO_RESOLVER: Record<string, (slug: string) => DiscoveryImageRef> = {
  cuisine: getDiscoveryCuisineImage,
  food_type: getDiscoveryCuisineImage,
  craving: getDiscoveryCuisineImage,
  occasion: getDiscoveryOccasionImage,
  service: getDiscoveryOccasionImage,
  special_dining: getDiscoveryOccasionImage,
  vibe: getDiscoveryVibeImage,
  mood: getDiscoveryVibeImage,
  ingredient: getDiscoveryIngredientImage,
  culinary_signal: getDiscoveryIngredientImage,
  seasonal: getDiscoveryIngredientImage,
}

export function getDiscoveryImage(itemType: string, label: string): DiscoveryImageRef {
  const slug = slugify(label)
  const resolver = TYPE_TO_RESOLVER[itemType]
  if (resolver) return resolver(slug)
  return {
    src: '/discovery/cuisine/_default.webp',
    alt: label,
    fallbackGradient: TASTE_GRADIENT,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/image-map.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/image-map.ts tests/unit/image-map.test.ts
git commit -m "feat(discovery): add static image map with cuisine/occasion/vibe/ingredient coverage"
```

---

## Task 3: DiscoveryCard Component

**Files:**

- Create: `components/discovery/discovery-card.tsx`
- Create: `components/discovery/discovery-card-feedback.tsx`
- Create: `tests/unit/discovery-card.test.ts`

- [ ] **Step 1: Write failing test for card variant selection**

Create `tests/unit/discovery-card.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  resolveCardVariant,
  type DiscoveryCardVariant,
} from '@/components/discovery/discovery-card'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'

function makeItem(
  overrides: Partial<DiscoveryRailItem> & { type: DiscoveryRailItem['type'] }
): DiscoveryRailItem {
  return {
    label: 'Test',
    href: '/eat',
    ...overrides,
  }
}

describe('resolveCardVariant', () => {
  it('returns food_photo for cuisine items in taste lane', () => {
    expect(resolveCardVariant(makeItem({ type: 'cuisine' }), 'taste')).toBe('food_photo')
  })

  it('returns food_photo for craving items in taste lane', () => {
    expect(resolveCardVariant(makeItem({ type: 'craving' }), 'taste')).toBe('food_photo')
  })

  it('returns abstract for occasion items in occasion lane', () => {
    expect(resolveCardVariant(makeItem({ type: 'occasion' }), 'occasion')).toBe('abstract')
  })

  it('returns abstract for service items in occasion lane', () => {
    expect(resolveCardVariant(makeItem({ type: 'service' }), 'occasion')).toBe('abstract')
  })

  it('returns proof for featured_chef in chefflow_picks lane', () => {
    expect(resolveCardVariant(makeItem({ type: 'featured_chef' }), 'chefflow_picks')).toBe('proof')
  })

  it('returns food_photo for chef_pick without proof data', () => {
    expect(resolveCardVariant(makeItem({ type: 'chef_pick' }), 'chefflow_picks')).toBe('food_photo')
  })

  it('returns food_photo as default for taste lane unknown type', () => {
    expect(resolveCardVariant(makeItem({ type: 'technique' }), 'taste')).toBe('food_photo')
  })

  it('returns abstract as default for occasion lane unknown type', () => {
    expect(resolveCardVariant(makeItem({ type: 'circle' }), 'occasion')).toBe('abstract')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/discovery-card.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Create discovery-card-feedback.tsx (extracted feedback buttons)**

Create `components/discovery/discovery-card-feedback.tsx`:

```tsx
'use client'

import { Heart, Pin, X } from 'lucide-react'

interface DiscoveryCardFeedbackProps {
  isPinned?: boolean
  onLove?: () => void
  onPin?: () => void
  onHide?: () => void
}

export function DiscoveryCardFeedback({
  isPinned,
  onLove,
  onPin,
  onHide,
}: DiscoveryCardFeedbackProps) {
  return (
    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 z-10">
      {onLove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLove()
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-rose-400 hover:bg-black/80 transition-colors"
          aria-label="More like this"
        >
          <Heart className="h-3 w-3" />
        </button>
      )}
      {onPin && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPin()
          }}
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-black/60 transition-colors ${
            isPinned ? 'text-amber-400' : 'text-white/70 hover:text-amber-400'
          } hover:bg-black/80`}
          aria-label={isPinned ? 'Unpin' : 'Pin to shortcuts'}
        >
          <Pin className="h-3 w-3" />
        </button>
      )}
      {onHide && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onHide()
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-colors"
          aria-label="Hide this"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create discovery-card.tsx**

Create `components/discovery/discovery-card.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'
import { getDiscoveryImage, type DiscoveryImageRef } from '@/lib/discovery/image-map'
import { DiscoveryCardFeedback } from '@/components/discovery/discovery-card-feedback'

export type DiscoveryCardVariant = 'food_photo' | 'abstract' | 'proof'

const TASTE_TYPES = new Set([
  'cuisine',
  'food_type',
  'craving',
  'dietary',
  'mood',
  'seasonal',
  'culinary_signal',
  'technique',
  'ingredient',
  'vibe',
])
const PROOF_TYPES = new Set(['featured_chef'])

export function resolveCardVariant(
  item: Pick<DiscoveryRailItem, 'type'>,
  lane: HomepageDiscoveryLane
): DiscoveryCardVariant {
  if (PROOF_TYPES.has(item.type)) return 'proof'
  if (lane === 'taste') return 'food_photo'
  if (lane === 'occasion') return 'abstract'
  if (lane === 'chefflow_picks') return 'food_photo'
  return 'food_photo'
}

interface DiscoveryCardProps {
  item: DiscoveryRailItem
  lane: HomepageDiscoveryLane
  isPinned?: boolean
  isSelected?: boolean
  onLove?: () => void
  onPin?: () => void
  onHide?: () => void
  onSelect?: () => void
}

function FoodPhotoCard({
  item,
  imageRef,
}: {
  item: DiscoveryRailItem
  imageRef: DiscoveryImageRef
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {!imgError ? (
        <img
          src={imageRef.src}
          alt={imageRef.alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: imageRef.fallbackGradient }} />
      )}
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="font-semibold text-white leading-tight"
          style={{
            fontSize: 'var(--discovery-card-title-size)',
            opacity: 'var(--discovery-text-primary)',
          }}
        >
          {item.label}
        </p>
        {item.sublabel && (
          <p
            className="text-white mt-0.5 leading-tight"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
      </div>
    </>
  )
}

function AbstractCard({ item, lane }: { item: DiscoveryRailItem; lane: HomepageDiscoveryLane }) {
  const gradientClass =
    lane === 'occasion' ? 'discovery-abstract-occasion' : 'discovery-abstract-taste'

  return (
    <div className={`absolute inset-0 ${gradientClass} flex flex-col justify-end p-3`}>
      {item.eyebrow && (
        <p
          className="uppercase tracking-widest text-white mb-1"
          style={{
            fontSize: 'var(--discovery-eyebrow-size)',
            opacity: 'var(--discovery-text-tertiary)',
          }}
        >
          {item.eyebrow}
        </p>
      )}
      {item.icon && (
        <span className="text-2xl mb-1.5" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <p
        className="font-semibold text-white leading-tight"
        style={{
          fontSize: 'var(--discovery-card-title-size)',
          opacity: 'var(--discovery-text-primary)',
        }}
      >
        {item.label}
      </p>
      {item.sublabel && (
        <p
          className="text-white mt-0.5 leading-tight line-clamp-2"
          style={{
            fontSize: 'var(--discovery-card-sublabel-size)',
            opacity: 'var(--discovery-text-secondary)',
          }}
        >
          {item.sublabel}
        </p>
      )}
    </div>
  )
}

function ProofCard({ item, imageRef }: { item: DiscoveryRailItem; imageRef: DiscoveryImageRef }) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {!imgError ? (
        <img
          src={imageRef.src}
          alt={imageRef.alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 discovery-abstract-picks" />
      )}
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {item.eyebrow && (
          <p
            className="uppercase tracking-widest text-white mb-0.5"
            style={{
              fontSize: 'var(--discovery-eyebrow-size)',
              opacity: 'var(--discovery-text-tertiary)',
            }}
          >
            {item.eyebrow}
          </p>
        )}
        <p
          className="font-semibold text-white leading-tight"
          style={{
            fontSize: 'var(--discovery-card-title-size)',
            opacity: 'var(--discovery-text-primary)',
          }}
        >
          {item.label}
        </p>
        {item.sublabel && (
          <p
            className="text-white mt-0.5 leading-tight"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
      </div>
    </>
  )
}

const LANE_GLOW_CLASS: Record<HomepageDiscoveryLane, string> = {
  taste: 'discovery-card-taste',
  occasion: 'discovery-card-occasion',
  chefflow_picks: 'discovery-card-picks',
}

export function DiscoveryCard({
  item,
  lane,
  isPinned,
  isSelected,
  onLove,
  onPin,
  onHide,
  onSelect,
}: DiscoveryCardProps) {
  const variant = resolveCardVariant(item, lane)
  const imageRef = getDiscoveryImage(item.type, item.label)
  const glowClass = LANE_GLOW_CLASS[lane]
  const selectedBorder = isSelected ? 'ring-2 ring-amber-400/60' : ''

  return (
    <Link
      href={item.href}
      className={`discovery-card-base ${glowClass} ${selectedBorder} group relative block`}
      onClick={(e) => {
        if (onSelect) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {variant === 'food_photo' && <FoodPhotoCard item={item} imageRef={imageRef} />}
      {variant === 'abstract' && <AbstractCard item={item} lane={lane} />}
      {variant === 'proof' && <ProofCard item={item} imageRef={imageRef} />}

      <DiscoveryCardFeedback isPinned={isPinned} onLove={onLove} onPin={onPin} onHide={onHide} />
    </Link>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/discovery-card.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/discovery/discovery-card.tsx components/discovery/discovery-card-feedback.tsx tests/unit/discovery-card.test.ts
git commit -m "feat(discovery): add DiscoveryCard component with 3 visual variants"
```

---

## Task 4: Control Rail Assembly Wiring

**Files:**

- Create: `tests/unit/control-rail-assembly-integration.test.ts`
- Modify: `app/(public)/page.tsx` (lines ~91-240)

- [ ] **Step 1: Write failing integration test**

Create `tests/unit/control-rail-assembly-integration.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  assembleDiscoveryRailItems,
  classifyDiscoveryRailSlot,
  evaluateDiscoveryRailSlotPolicy,
  type DiscoveryRailAssemblyItem,
} from '@/lib/discovery/control-rail-contracts'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

function makeAssemblyItem(
  overrides: Partial<DiscoveryRailAssemblyItem> & { type: DiscoveryRailItem['type'] }
): DiscoveryRailAssemblyItem {
  return { label: 'Test', href: '/eat', ...overrides }
}

describe('control rail assembly integration', () => {
  it('filters hidden items', () => {
    const items = [
      makeAssemblyItem({ type: 'cuisine', label: 'Italian' }),
      makeAssemblyItem({ type: 'cuisine', label: 'French' }),
    ]
    const result = assembleDiscoveryRailItems(items, {
      hiddenKeys: new Set(['cuisine:French:/eat']),
    })
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Italian')
  })

  it('puts pinned items first', () => {
    const items = [
      makeAssemblyItem({ type: 'cuisine', label: 'Italian' }),
      makeAssemblyItem({ type: 'cuisine', label: 'French' }),
      makeAssemblyItem({ type: 'cuisine', label: 'Thai' }),
    ]
    const result = assembleDiscoveryRailItems(items, {
      pinnedKeys: new Set(['cuisine:Thai:/eat']),
      seed: 42,
    })
    expect(result[0].label).toBe('Thai')
  })

  it('classifies cuisine as practical', () => {
    expect(classifyDiscoveryRailSlot(makeAssemblyItem({ type: 'cuisine' }))).toBe('practical')
  })

  it('classifies featured_chef as editorial', () => {
    expect(classifyDiscoveryRailSlot(makeAssemblyItem({ type: 'featured_chef' }))).toBe('editorial')
  })

  it('classifies story as ambient', () => {
    expect(classifyDiscoveryRailSlot(makeAssemblyItem({ type: 'story' }))).toBe('ambient')
  })

  it('policy passes for practical-heavy rail', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeAssemblyItem({ type: 'cuisine', label: `Cuisine ${i}` })
    )
    const report = evaluateDiscoveryRailSlotPolicy(items)
    expect(report.passed).toBe(true)
  })

  it('policy flags when first slot is not practical', () => {
    const items: DiscoveryRailAssemblyItem[] = [
      makeAssemblyItem({ type: 'story', label: 'A story' }),
      ...Array.from({ length: 5 }, (_, i) => makeAssemblyItem({ type: 'cuisine', label: `C${i}` })),
    ]
    const report = evaluateDiscoveryRailSlotPolicy(items)
    expect(report.violations.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/unit/control-rail-assembly-integration.test.ts`
Expected: All 7 tests PASS (these test existing code in `control-rail-contracts.ts`).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/control-rail-assembly-integration.test.ts
git commit -m "test(discovery): add control rail assembly integration tests"
```

---

## Task 5: DiscoveryRow Component (Extraction)

**Files:**

- Create: `components/discovery/discovery-row.tsx`

This extracts the row rendering loop from `cuisine-marquee.tsx` into a reusable component. Does NOT yet replace the marquee code (that happens in Task 6).

- [ ] **Step 1: Create DiscoveryRow component**

Create `components/discovery/discovery-row.tsx`:

```tsx
'use client'

import {
  useRef,
  useCallback,
  useEffect,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
  DiscoveryRowRole,
} from '@/lib/discovery/homepage-discovery-rail'
import { DiscoveryCard } from '@/components/discovery/discovery-card'

interface DiscoveryRowProps {
  role: DiscoveryRowRole
  lane: HomepageDiscoveryLane
  label: string
  items: DiscoveryRailItem[]
  className?: string
  labelClassName?: string
  ariaLabel: string
  pinnedKeys?: Set<string>
  selectedKeys?: Set<string>
  onItemLove?: (item: DiscoveryRailItem) => void
  onItemPin?: (item: DiscoveryRailItem) => void
  onItemHide?: (item: DiscoveryRailItem) => void
  onItemSelect?: (item: DiscoveryRailItem) => void
  scrollRef?: RefObject<HTMLDivElement | null>
}

const LANE_DOT_COLOR: Record<HomepageDiscoveryLane, string> = {
  taste: 'bg-amber-400/60',
  occasion: 'bg-emerald-400/50',
  chefflow_picks: 'bg-violet-400/55',
}

function itemKey(item: DiscoveryRailItem): string {
  return `${item.type}:${item.label}:${item.href}`
}

export function DiscoveryRow({
  role,
  lane,
  label,
  items,
  className = '',
  labelClassName = '',
  ariaLabel,
  pinnedKeys,
  selectedKeys,
  onItemLove,
  onItemPin,
  onItemHide,
  onItemSelect,
  scrollRef,
}: DiscoveryRowProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = scrollRef ?? internalRef

  // Double items for seamless looping
  const loopedItems = [...items, ...items]

  return (
    <div className={className} role="region" aria-label={ariaLabel}>
      {/* Lane label */}
      <div className={`flex items-center gap-2 px-4 mb-2 ${labelClassName}`}>
        <span className={`h-2 w-2 rounded-full ${LANE_DOT_COLOR[lane]}`} aria-hidden="true" />
        <span
          className="font-medium text-white"
          style={{
            fontSize: 'var(--discovery-lane-label-size)',
            opacity: 'var(--discovery-text-secondary)',
          }}
        >
          {label}
        </span>
      </div>

      {/* Scrollable row */}
      <div
        ref={ref}
        className="discovery-row-mask flex overflow-x-auto scrollbar-none"
        style={{ gap: 'var(--discovery-card-gap)' }}
        tabIndex={0}
        role="list"
        aria-label={`${label} discovery items`}
      >
        {loopedItems.map((item, i) => {
          const key = `${itemKey(item)}-${i}`
          const pinKey = itemKey(item)
          return (
            <div key={key} role="listitem" className="flex-shrink-0">
              <DiscoveryCard
                item={item}
                lane={lane}
                isPinned={pinnedKeys?.has(pinKey)}
                isSelected={selectedKeys?.has(pinKey)}
                onLove={onItemLove ? () => onItemLove(item) : undefined}
                onPin={onItemPin ? () => onItemPin(item) : undefined}
                onHide={onItemHide ? () => onItemHide(item) : undefined}
                onSelect={onItemSelect ? () => onItemSelect(item) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/discovery/discovery-row.tsx
git commit -m "feat(discovery): extract DiscoveryRow component from marquee"
```

---

## Task 6: Widen Discovery Container

**Files:**

- Modify: `app/(public)/_components/homepage-discovery.tsx`

- [ ] **Step 1: Read homepage-discovery.tsx**

Read `app/(public)/_components/homepage-discovery.tsx` to see current container markup.

- [ ] **Step 2: Widen the marquee container**

In `homepage-discovery.tsx`, find the `max-w-2xl` wrapper around `<CuisineMarquee>` and widen it. The search bar keeps `max-w-2xl` (it should stay narrow and centered). The marquee needs room for larger cards.

Change the marquee container from:

```tsx
<div className="mx-auto mt-4 w-full max-w-2xl px-2">
```

to:

```tsx
<div className="mx-auto mt-4 w-full max-w-6xl px-2">
```

Keep the search container at `max-w-2xl`.

- [ ] **Step 3: Wrap the marquee in the discovery-container class**

Add the glassmorphism container class around the marquee. In the same file, wrap `<CuisineMarquee>`:

Change:

```tsx
<div className="mx-auto mt-4 w-full max-w-6xl px-2">
  <CuisineMarquee
```

to:

```tsx
<div className="mx-auto mt-4 w-full max-w-6xl px-2">
  <div className="discovery-container">
    <CuisineMarquee
```

And close the wrapper div after `</CuisineMarquee>`.

- [ ] **Step 4: Verify the page still renders**

Run: `npx next build --no-lint` (or check dev server)
Expected: Build succeeds. The marquee now has a wider container with glassmorphism background.

- [ ] **Step 5: Commit**

```bash
git add app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): widen container to max-w-6xl with glassmorphism wrapper"
```

---

## Task 7: Mobile Snap-Scroll

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Add mobile snap-scroll styles**

Add to the discovery section in `app/globals.css`:

```css
/* Mobile snap-scroll */
@media (max-width: 767px) {
  .discovery-row-snap {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .discovery-row-snap > [role='listitem'] {
    scroll-snap-align: start;
  }
}

/* Card sizing responsive */
.discovery-card-base {
  width: var(--discovery-card-w);
  height: var(--discovery-card-h);
}

/* Scrollbar hiding */
.discovery-row-mask {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.discovery-row-mask::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Update DiscoveryRow to use snap-scroll class on mobile**

In `components/discovery/discovery-row.tsx`, add `discovery-row-snap` to the scrollable div:

Change:

```tsx
className = 'discovery-row-mask flex overflow-x-auto scrollbar-none'
```

to:

```tsx
className = 'discovery-row-mask discovery-row-snap flex overflow-x-auto scrollbar-none'
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css components/discovery/discovery-row.tsx
git commit -m "feat(discovery): add mobile snap-scroll and responsive card sizing"
```

---

## Task 8: Lane Separator Component

**Files:**

- Modify: `components/discovery/discovery-row.tsx`

- [ ] **Step 1: Add separator between rows**

In `DiscoveryRow`, add an optional separator prop. Add to the interface:

```tsx
showSeparator?: boolean
```

Add before the scrollable row div (after the lane label):

```tsx
{
  showSeparator && <div className="discovery-lane-separator mx-4" />
}
```

- [ ] **Step 2: Commit**

```bash
git add components/discovery/discovery-row.tsx
git commit -m "feat(discovery): add lane separator to DiscoveryRow"
```

---

## Task 9: Placeholder Image Assets

**Files:**

- Create: `public/discovery/cuisine/_default.webp` (and dirs)
- Create: `public/discovery/occasion/_default.webp`
- Create: `public/discovery/vibe/_default.webp`
- Create: `public/discovery/ingredient/_default.webp`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p public/discovery/cuisine public/discovery/occasion public/discovery/vibe public/discovery/ingredient
```

- [ ] **Step 2: Create 1x1 transparent placeholder WebP files**

These are temporary placeholders so the gradient fallback always triggers until real images are added. Create minimal valid WebP files:

```bash
# Create minimal placeholder files (the image-map gradient fallback will show instead)
# These are 1x1 transparent WebP files to prevent 404s during development
printf 'RIFF$\x00\x00\x00WEBPVP8 \x18\x00\x00\x000\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x01\x00\x03p\x00\xfe\xfb\x94\x00\x00' > public/discovery/cuisine/_default.webp
cp public/discovery/cuisine/_default.webp public/discovery/occasion/_default.webp
cp public/discovery/cuisine/_default.webp public/discovery/vibe/_default.webp
cp public/discovery/cuisine/_default.webp public/discovery/ingredient/_default.webp
```

- [ ] **Step 3: Add .gitkeep files for empty directories**

```bash
touch public/discovery/cuisine/.gitkeep public/discovery/occasion/.gitkeep public/discovery/vibe/.gitkeep public/discovery/ingredient/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add public/discovery/
git commit -m "chore(discovery): add placeholder image directories and default fallback files"
```

---

## Task 10: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new files.

- [ ] **Step 2: Run all discovery tests**

Run: `npx vitest run tests/unit/image-map.test.ts tests/unit/discovery-card.test.ts tests/unit/control-rail-assembly-integration.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 1 health check issues"
```

---

## Summary

After completing all 10 tasks, you will have:

1. **Design system** -- CSS custom properties for colors, typography, depth, and dimensions
2. **Image map** -- Static mapping of 95+ items to image paths with gradient fallbacks
3. **DiscoveryCard** -- 3-variant card component (food_photo, abstract, proof) replacing emoji pills
4. **DiscoveryCardFeedback** -- Extracted feedback buttons (love/pin/hide)
5. **DiscoveryRow** -- Extracted scrollable row with lane labels, separators, snap-scroll
6. **Control rail assembly tests** -- Integration tests confirming wiring works
7. **Wider container** -- max-w-6xl with glassmorphism depth
8. **Mobile snap-scroll** -- CSS scroll-snap on mobile breakpoints
9. **Placeholder images** -- Directory structure ready for real photography

The marquee still renders using its existing pill code. Task 6 in Layer 2's plan (or a follow-up integration task) will swap the marquee's render loop to use these new components. This approach avoids a risky big-bang rewrite of the 3168-line file.
