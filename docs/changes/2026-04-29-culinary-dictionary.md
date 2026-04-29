# Culinary Dictionary Build

Built the first canonical Culinary Dictionary layer.

## What Changed

- Added additive database migration proposal and seed data for dictionary terms, aliases, links, safety flags, chef overrides, and review queue.
- Added deterministic normalization shared by ingredient matching and dictionary search.
- Added chef dictionary route at `/culinary/dictionary`.
- Added public dictionary routes at `/dictionary` and `/dictionary/[slug]`.
- Added fallback seed terms so dictionary routes do not fail before the migration is applied.
- Added dictionary alias suggestions to ingredient matching without allowing dictionary matches to auto-confirm.
- Added public Ingredient Guide link to the dictionary and public ingredient detail alias display.
- Added unit coverage for normalization, publication policy, and server-action contract checks.

## Safety Notes

- No AI recipe generation was introduced.
- No destructive SQL was introduced.
- Dictionary chef overrides are chef-scoped.
- Public routes only show public-safe terms.
