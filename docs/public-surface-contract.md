# Public Surface Contract

Last updated: 2026-04-09

This is the canonical decision document for ChefFlow's public acquisition surface. It turns the existing route inventory into one clear public contract without changing the authenticated product architecture.

## Primary Decision

ChefFlow's public website is primarily for people who want to hire a private chef or book a chef-led food experience.

The public site also supports two secondary jobs:

- operator acquisition for chefs and food businesses
- broader local food discovery through the supporting directory

## Canonical Public Path

The primary consumer path is:

1. `/`
2. `/book` or `/chefs`
3. `/chef/[slug]`
4. `/chef/[slug]/inquire`

Interpretation:

- `/book` is the matched-chef lane
- `/chefs` is the browse-and-choose lane
- `/chef/[slug]/inquire` is the direct single-chef lane

## Route Hierarchy

### Primary

- `/`
- `/book`
- `/chefs`
- `/chef/[slug]`
- `/chef/[slug]/inquire`
- `/services`
- `/how-it-works`

### Secondary

- `/for-operators`
- `/marketplace-chefs`
- `/trust`
- `/contact`

### Supporting / SEO

- `/nearby`
- `/nearby/[slug]`
- `/compare`
- `/compare/[slug]`
- `/customers`
- `/customers/[slug]`

### Legacy / Compatibility

- `/discover`
- `/discover/*`

Legacy `discover/*` URLs must continue to resolve, but they are not part of the canonical acquisition story. They permanently redirect into `/nearby/*`.

## CTA Vocabulary

Top-level consumer CTA labels must stay stable:

- Primary consumer CTA: `Book a Chef`
- Secondary consumer CTA: `Browse Chefs`
- Supporting directory label: `Food Directory`
- Operator entry label: `For Operators`

Context-specific chef actions can stay specific:

- On chef profile pages, `Start inquiry` remains correct
- On chef profiles with external routing preferences, `Visit website` remains correct

## Enforcement Rules

- Use `Book a Chef` for global buyer-facing CTA chrome instead of generic labels like `Get Started`.
- Keep `/nearby` available, but present it as a supporting directory rather than a competing primary path.
- Keep operator entry visible, but do not give it the strongest buyer-facing CTA position.
- Preserve legacy redirects and compatibility routes so old indexed and shared URLs keep working.
- Do not let public copy imply a single generic funnel when `/book` and `/chef/[slug]/inquire` behave differently.

## Current Implementation Anchors

- Global public shell: [`app/(public)/layout.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/layout.tsx>)
- Public navigation config: [`components/navigation/public-nav-config.ts`](/c:/Users/david/Documents/CFv1/components/navigation/public-nav-config.ts)
- Public CTA constants: [`lib/public/public-surface-config.ts`](/c:/Users/david/Documents/CFv1/lib/public/public-surface-config.ts)
- Homepage: [`app/(public)/page.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/page.tsx>)
- Booking lane: [`app/(public)/book/page.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/book/page.tsx>)
- Browse lane: [`app/(public)/chefs/page.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/chefs/page.tsx>)
- Supporting directory: [`app/(public)/nearby/page.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/nearby/page.tsx>)
- Legacy redirect fallback: [`app/(public)/discover/[[...path]]/page.tsx`](</c:/Users/david/Documents/CFv1/app/(public)/discover/[[...path]]/page.tsx>)
- Edge redirects: [`next.config.js`](/c:/Users/david/Documents/CFv1/next.config.js)
