# Directory and Public Profiles

**What:** Food operator discovery and public chef profiles. How the world finds chefs.

**Routes:** `/chef/[slug]` (public profile), `/chef/[slug]/inquire` (direct chef inquiry), `/nearby` (Nearby food operator discovery, canonical), `/dictionary`, `/dictionary/[slug]`
**Status:** PARTIALLY COMPLETE

## What's Here

- Public chef profile: visual hero, display name, tagline, highlight text, social icons (Instagram, TikTok, Facebook, YouTube, Linktree), bio summary, cuisine tags, service types, top-of-page visual proof, conversion-focused booking panel, mobile sticky CTA, compact link hub mode, public Sample Menus with optional first-dish photo heroes, reviews & testimonials, featured testimonials (gold border), JSON-LD AggregateRating for SEO
- Direct chef inquiry page: route-specific inquiry form for one named chef, with truthful expectation copy about direct follow-up instead of matched-chef routing
- Nearby: public food discovery page at `/nearby` with search-first hero, rotating examples, category pills, cuisine and price pills, state and city filters, location/radius search, map mode, visual card mode, pagination, trust/freshness guide, gradient category placeholders, and free claim prompts for listed businesses
- Public culinary dictionary: public-safe terms, ingredient aliases, technique vocabulary, safety flags, and dictionary detail pages
- Directory import from system crawler data (OSM-sourced, ODbL attribution)
- Post-claim enhancement flow for operators
- Showcase image upload (hero image for directory listing)
- Legacy `/discover` route redirects to `/nearby`

## Open Items

- Listing detail pages set to `noindex, nofollow` (not yet indexed by search engines)
- Operator taxonomy uses 8 Nearby business types
- See `docs/specs/chef-flow-decision-ledger-v1.md` for full cohesion status
