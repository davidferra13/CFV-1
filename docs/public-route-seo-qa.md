# Public Route SEO QA

Focused guardrails for public-route metadata and template defects live in:

- `tests/helpers/public-route-seo.ts`
- `tests/coverage/13-public-seo-guards.spec.ts`
- `tests/unit/public-route-seo-guards.test.ts`

## What the checks catch

- missing canonical tags
- missing `og:image`
- missing `twitter:image`
- duplicate `| ChefFlow | ChefFlow` title suffixes
- obvious raw taxonomy labels leaking into visible UI such as `farm_to_table`
- unexpected indexability changes for routes that should be `noindex`

## Run locally or in CI

```bash
npm run test:seo:public
```

That command runs:

1. a small unit test suite with example failure fixtures
2. a Playwright audit against the explicit public route inventory

## Extend to a new route

Add the route to `PUBLIC_ROUTE_SEO_CHECKS` in `tests/helpers/public-route-seo.ts`.

Each entry can override:

- `expectedIndexable`
- `canonicalPath`
- `requireCanonical`
- `requireOpenGraphImage`
- `requireTwitterImage`
- `forbiddenBodyPatterns`

Keep the list intentional. This is meant to validate key public routes, not crawl the whole site.
