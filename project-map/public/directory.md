# Directory and Public Profiles

**What:** Food operator discovery and public chef profiles. How the world finds chefs.

**Routes:** `/chef/[slug]` (public profile), `/nearby` (food operator directory, canonical), `/for-operators` (operator landing page)
**Status:** PARTIALLY COMPLETE

## What's Here

- Public chef profile: avatar, display name, tagline, highlight text, social icons (Instagram, TikTok, Facebook, YouTube, Linktree), bio, cuisine tags, service types, reviews & testimonials, featured testimonials (gold border), JSON-LD AggregateRating for SEO
- Food operator directory: public discovery page at `/nearby` with search, filters (type, cuisine, state, city, price), pagination
- Directory import from OpenClaw crawler data (OSM-sourced, ODbL attribution)
- Post-claim enhancement flow for operators
- Showcase image upload (hero image for directory listing)
- Legacy `/discover` route redirects to `/nearby`

## Open Items

- Nomination form commented out (data quality not ready for public display)
- Claim/remove actions commented out on listing detail pages (hidden until directory is public)
- Listing detail pages set to `noindex, nofollow` (not yet indexed by search engines)
- Stats line hidden on main page (data quality not ready)
- Operator taxonomy (8 types in code) exceeds what specs document (5-6)
- No true geospatial "nearby" search yet (city/state filter only)
- See `docs/specs/chef-flow-decision-ledger-v1.md` for full cohesion status
