# Website Performance Hardening Handoff

Date: 2026-04-03
Status: completed, builder-facing handoff
Purpose: record the 2026-04-03 public-shell performance pass, the build-tooling resilience fixes required to verify it cleanly, and the exact boundary for any future performance work

---

## Why This Exists

The canonical website-build cross-reference focuses on public trust, conversion structure, and dependency order.

It is not meant to be a low-level rendering or build-tooling audit.

This companion handoff exists for the narrower case where the assigned work is:

- critical rendering path optimization
- lazy loading and bundle deferral
- third-party loading control
- static asset caching
- build or typecheck verification stability for website work

Use this only when the assignment is explicitly performance-oriented.

---

## What Shipped

### 1. Deferred non-critical root runtime work

The root layout no longer puts non-critical client runtime work directly on the first-render path.

Shipped:

- `app/layout.tsx`
- `components/runtime/deferred-root-runtime.tsx`
- `components/analytics/posthog-provider.tsx`
- `components/ui/global-tooltip-provider.tsx`

Result:

- analytics bootstrap
- performance telemetry
- global tooltips
- cookie consent
- service worker registration

now load in a deferred client-only runtime chunk instead of inflating the public shell's initial client work.

### 2. Deferred Google Maps Places loading for shared autocomplete inputs

The shared autocomplete fields no longer load the Google Maps Places SDK immediately on mount.

Shipped:

- `hooks/use-deferred-google-maps-loader.ts`
- `components/ui/location-autocomplete.tsx`
- `components/ui/address-autocomplete.tsx`
- `components/ui/store-autocomplete.tsx`

Result:

- SDK load is deferred until idle or user intent
- plain text input remains immediately usable
- Places requests now declare narrower `fields` to reduce payload

This reduces third-party work on the initial route render and makes the public inquiry path less JS-heavy before interaction.

### 3. Reduced public-shell render pressure

Shipped:

- `app/(public)/layout.tsx`
- `components/navigation/public-footer.tsx`
- `components/branding/app-logo.tsx`

Result:

- the optional market research entry card now streams behind `Suspense`
- the footer newsletter signup now loads client-side only when needed
- the shared logo no longer forces unconditional image priority on every surface

### 4. Stronger image and caching defaults

Shipped:

- `next.config.js`

Result:

- AVIF and WebP output enabled
- higher remote image cache TTL
- long-lived caching for `/images/*`
- `sw.js` and `manifest.json` stay revalidating rather than being cached incorrectly

### 5. Verification tooling no longer lies about the baseline

The performance pass exposed two local-tooling failure modes that were not actual source regressions:

- stale `.next` output could break the canonical production build
- stale `.tsbuildinfo` state could false-fail the canonical typecheck wrapper

Shipped:

- `scripts/run-next-build.mjs`
- `scripts/run-typecheck.mjs`
- `tests/unit/typecheck-config.test.ts`

Result:

- `npm run build -- --no-lint` now clears stale default `.next` output before building
- `npm run typecheck:app` and `npm run typecheck:next` now retry once after resetting corrupt incremental state
- the tooling contract test now matches the actual wrapper behavior

This matters for future builder work because the recorded baseline is now reproducible from the default commands again, not only from a temporary dist-directory workaround.

---

## Verification

Verified on the current dirty checkout:

- `npx eslint -- "scripts/run-next-build.mjs" "scripts/run-typecheck.mjs" "tests/unit/typecheck-config.test.ts" "app/layout.tsx" "app/(public)/layout.tsx" "components/runtime/deferred-root-runtime.tsx" "components/analytics/posthog-provider.tsx" "components/ui/global-tooltip-provider.tsx" "components/ui/location-autocomplete.tsx" "components/ui/address-autocomplete.tsx" "components/ui/store-autocomplete.tsx" "components/navigation/public-footer.tsx" "components/branding/app-logo.tsx" "hooks/use-deferred-google-maps-loader.ts" "next.config.js"`
- `npm run typecheck:next`
- `npm run typecheck:app`
- `node --test --import tsx tests/unit/typecheck-config.test.ts`
- `npm run build -- --no-lint`

Important verification note:

- the canonical build now passes on the default `.next` path
- the earlier `NEXT_DIST_DIR=.next-perf-verify` workaround is no longer required for a clean local build

---

## Known Non-Blocking Warnings

These warnings remain, but were not introduced by this pass and do not currently block the build:

- existing `DYNAMIC_SERVER_USAGE` warnings from unrelated routes during static generation
- Next 14.2.35 warning that `serverActions` is an unrecognized `next.config.js` key
- Next TypeScript plugin recommendation because `tsconfig.json` extends another config

Treat those as follow-up cleanup, not as reasons to reopen this performance pass.

---

## Intentional Non-Goals

This pass did not attempt to do any of the following:

- rewrite public information architecture or landing-page strategy
- remove product telemetry or analytics entirely
- perform route-by-route Lighthouse or CrUX auditing across the full site
- redesign image strategy for every public surface
- refactor unrelated authenticated surfaces just because they also render client code
- chase marginal bundle wins once the critical public-shell pressure was reduced

That boundary was intentional.

The goal was to improve user-facing load behavior and truthful verification without drifting into open-ended micro-optimization work.

---

## Future Builder Order

If a future builder is explicitly assigned more website-performance work, use this order:

1. Read `docs/build-state.md`.
2. Read `docs/research/current-builder-start-handoff-2026-04-02.md`.
3. Read `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`.
4. Read this handoff.
5. Measure the homepage and public inquiry flow before touching more runtime code.
6. Only deepen the work if the expected Core Web Vitals or perceived-latency gains justify the additional implementation cost.

Do not restart from generic "optimize the whole app" instincts.

The next performance builder should begin from measured user-facing bottlenecks, not from tooling churn or theoretical bundle purity.
