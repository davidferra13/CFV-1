# Spec: Production Performance Optimization

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-03 17:00 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-04-03 17:00 | Planner (Opus 4.6) |        |
| Claimed (in-progress) |                  |                    |        |
| Spike completed       |                  |                    |        |
| Pre-flight passed     |                  |                    |        |
| Build completed       |                  |                    |        |
| Type check passed     |                  |                    |        |
| Build check passed    |                  |                    |        |
| Playwright verified   |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

### Raw Signal

Make cheflowhq.com load, render, and respond as fast as physically possible under modern web constraints. Only load what is needed, exactly when it is needed. Eliminate all unnecessary computation, rendering, and network activity. Optimize for real user experience, not synthetic scores. Treat any noticeable delay as a failure.

The site runs through a Cloudflare Tunnel from localhost. Every millisecond of unnecessary overhead is doubled by the tunnel round trip. The developer is cost-conscious (Vercel incident: $1,489.97 wasted) and runs everything from a single Windows machine. There is no CDN edge compute, no Vercel, no cloud hosting. Performance wins must come from the app itself: smaller bundles, smarter loading, fewer round trips.

The developer wants a full audit first (live site, bundles, rendering, data, assets, infrastructure), then aggressive fixes. Not recommendations. Fixes. Measured before and after.

### Developer Intent

- **Core goal:** Make every page of cheflowhq.com feel instant, especially first load and navigation for new visitors and returning chefs.
- **Key constraints:** Single-machine architecture (Cloudflare Tunnel). No external CDN. No Vercel. Must work with current Next.js 14 + postgres.js + local PostgreSQL stack. No breaking changes to existing features.
- **Motivation:** The tunnel adds 50-200ms per round trip. Every unnecessary byte, render, or network call compounds that latency. The site must compensate by being surgically efficient.
- **Success from the developer's perspective:** Sub-2s LCP on landing page. Sub-1s TTI for authenticated chef dashboard (warm cache). Navigation between pages feels instant. Bundle budget under 500 KB/route. Zero layout shift.

---

## What This Does (Plain English)

A systematic performance hardening pass across the entire ChefFlow application. The builder will fix LCP image loading, add resource hints, dynamically import heavy libraries, remove unused dependencies, tighten bundle budgets, add request deduplication, fix cache tag/revalidation mismatches, and add `priority` to hero images. The result is faster page loads, smaller bundles, and fewer unnecessary network requests for every user on every page.

---

## Why It Matters

ChefFlow runs through a Cloudflare Tunnel, which adds 50-200ms per round trip. Every wasted byte or unnecessary request is amplified. New visitors to the landing page and returning chefs on the dashboard both need the app to feel fast. Performance is credibility for a platform asking food operators to trust it with their business.

---

## Files to Create

| File | Purpose                                         |
| ---- | ----------------------------------------------- |
| None | All changes are modifications to existing files |

---

## Files to Modify

### Phase 1: Critical Path (LCP + Resource Hints)

| File                                                                                    | What to Change                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                                                 | Add `priority` prop to hero chef card images (first 2-3 visible `<Image>` components). These are the LCP elements.                                                                                   |
| `app/(public)/_components/featured-chef-card.tsx` (or wherever chef card images render) | Accept and pass `priority` prop to `<Image>`.                                                                                                                                                        |
| `app/layout.tsx`                                                                        | Add `<link rel="preconnect">` for `https://challenges.cloudflare.com` and any external origins used on first paint. Add `<link rel="dns-prefetch">` for `res.cloudinary.com`, `images.unsplash.com`. |
| `app/book/[chefSlug]/page.tsx`                                                          | Add `priority` to the chef profile/hero image (LCP for booking pages).                                                                                                                               |

### Phase 2: Bundle Reduction (Dynamic Imports + Unused Deps)

| File                                                      | What to Change                                                                                                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                            | Remove unused dependencies: `tesseract.js`, `xlsx`, `mammoth`. These have zero source-code imports.                                                                                            |
| `next.config.js` line 58                                  | Add `lucide-react` and `date-fns` to `optimizePackageImports` array.                                                                                                                           |
| `components/ui/location-map.tsx`                          | Wrap in `next/dynamic` with `ssr: false` and a skeleton loader. Google Maps (~250KB) should not load eagerly.                                                                                  |
| `components/ui/location-autocomplete.tsx`                 | Wrap in `next/dynamic` with `ssr: false`.                                                                                                                                                      |
| `components/ui/address-autocomplete.tsx`                  | Wrap in `next/dynamic` with `ssr: false`.                                                                                                                                                      |
| `components/stripe/payment-form.tsx`                      | Wrap in `next/dynamic` with `ssr: false`. Stripe Elements (~50KB) only needed on payment page.                                                                                                 |
| Any page importing `lib/documents/pdf-layout.ts` directly | Ensure PDF generation is behind `next/dynamic` or only imported in API routes (not in page components). Verify jspdf/pdfkit are only in server-side API route handlers, not in client bundles. |

### Phase 3: Cache Alignment + Request Deduplication

| File                                                             | What to Change                                                                                                                                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/chef/layout-data-cache.ts`                                  | Document which mutations must call `revalidateTag`.                                                                                                                                                   |
| `lib/archetypes/actions.ts`                                      | Add `revalidateTag('chef-archetype-{chefId}')` after archetype mutations.                                                                                                                             |
| `lib/chef/chef-actions.ts` (or wherever chef profile is updated) | Add `revalidateTag('chef-layout-{chefId}')` after profile mutations that affect layout data.                                                                                                          |
| `lib/admin/admin-actions.ts` (or wherever admin status changes)  | Add `revalidateTag('is-admin-{authUserId}')` after admin role mutations.                                                                                                                              |
| `lib/db/server.ts` or new `lib/db/cached-queries.ts`             | Wrap frequently-called server-component queries in `React.cache()` for per-request deduplication. Priority: `getCurrentUser`, `getChefLayoutData`, any query called 2+ times in the same render tree. |

### Phase 4: Bundle Budget Tightening

| File                              | What to Change                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/check-bundle-budget.mjs` | Reduce budgets: `maxRouteKb: 800`, `p95RouteKb: 500`, `maxChunkKb: 350`. Current values (2200/1100/700) are 3-5x above industry standards. |

### Phase 5: Asset Cleanup (Deploy Speed)

| File                                              | What to Change                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/images/remy/`                             | Delete sprite sheets marked `available: false` in `lib/ai/remy-sprite-manifests.ts` (~40MB). These are not served to users but bloat deploys. |
| `public/images/remy/Gustav/gustav-mascot-b64.txt` | Delete. Base64 image data should not be in source control.                                                                                    |

---

## Database Changes

None.

---

## Data Model

No changes to the data model.

---

## Server Actions

No new server actions. Existing server actions gain `revalidateTag()` calls where missing (Phase 3).

| Action                      | Auth             | Change                                         | Side Effects          |
| --------------------------- | ---------------- | ---------------------------------------------- | --------------------- |
| Archetype mutation actions  | `requireChef()`  | Add `revalidateTag('chef-archetype-{chefId}')` | Busts archetype cache |
| Chef profile update actions | `requireChef()`  | Add `revalidateTag('chef-layout-{chefId}')`    | Busts layout cache    |
| Admin role mutation actions | `requireAdmin()` | Add `revalidateTag('is-admin-{authUserId}')`   | Busts admin cache     |

---

## UI / Component Spec

No new UI. All changes are invisible performance improvements.

### States

- **Loading:** Existing skeleton loaders are preserved. Dynamic imports add lightweight loading fallbacks for Maps, Stripe, and autocomplete components.
- **Empty:** No change.
- **Error:** No change.
- **Populated:** No change. Pages render identically but faster.

### Interactions

No interaction changes. Navigation and clicks work identically. The only user-visible difference is speed.

---

## Edge Cases and Error Handling

| Scenario                                               | Correct Behavior                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Maps dynamic import fails to load               | Show a fallback "Enter address manually" text input. Do not crash the form.                                                                                            |
| Stripe dynamic import fails to load                    | Show "Payment form loading failed. Please refresh." with retry button.                                                                                                 |
| `revalidateTag` called for nonexistent cache           | No-op (Next.js handles gracefully).                                                                                                                                    |
| Bundle budget fails after dependency removal           | Investigate which route exceeded budget. This is expected if large libraries were not yet dynamically imported.                                                        |
| Unused dependency removal breaks a rarely-used feature | Run `npx tsc --noEmit --skipLibCheck` and `npm run build -- --no-lint` after removal. If imports are found, the build will fail and the dependency should be restored. |

---

## Verification Steps

### Phase 1 Verification

1. Run `npm run build -- --no-lint`
2. Inspect `.next/server/app/(public)/page.html` (or equivalent) for `<link rel="preload" as="image">` tag on hero image
3. Inspect root layout HTML for `<link rel="preconnect">` tags
4. Sign in with agent account, navigate to `/` (landing page), screenshot. Verify hero images load immediately (not lazy).

### Phase 2 Verification

1. Run `npm install` after removing unused deps. Confirm no import errors.
2. Run `npx tsc --noEmit --skipLibCheck` - must exit 0.
3. Run `npm run build -- --no-lint` - must exit 0.
4. Check build output for Google Maps chunk - should appear only in routes that use maps, not in shared chunks.
5. Run `node scripts/check-bundle-budget.mjs` - record before/after for top 10 heaviest routes.

### Phase 3 Verification

1. Search codebase: every `unstable_cache` tag should have at least one matching `revalidateTag` call in a mutation file.
2. Verify: update chef archetype -> layout data refreshes without waiting 60s.

### Phase 4 Verification

1. Run `node scripts/check-bundle-budget.mjs` with new budgets.
2. If any routes exceed new budget, document them as follow-up optimization targets.

### Phase 5 Verification

1. Confirm deleted sprite sheets are not referenced by any code with `available: true`.
2. Run build, verify no 404s for sprite assets.

### Final Metrics

Record before and after:

- `node scripts/check-bundle-budget.mjs` output (top 10 heaviest routes, max route KB, P95 route KB)
- Total size of `public/images/remy/` directory
- Count of `<link rel="preconnect">` tags in root HTML
- Count of `priority` props on public page images

---

## Out of Scope

- Server infrastructure changes (Cloudflare Tunnel configuration, HTTP/3, Tiered Cache)
- Migrating to Vercel or any other hosting platform
- Rewriting server components to reduce the 1,519 client component count (separate spec; requires per-component audit)
- CSS code splitting (Next.js App Router limitation with globals.css)
- Service worker caching strategy changes (current implementation is already well-designed)
- Database query optimization or index changes (current queries are well-structured with Promise.all)
- PostHog removal or reconfiguration (already properly deferred behind dynamic import)

---

## Notes for Builder Agent

### Execution Order

Execute phases 1-5 in order. Each phase is independently verifiable. Do not start Phase 2 until Phase 1 passes build.

### Critical Gotchas

1. **jspdf/pdfkit may already be server-only.** Check if they're imported only in `app/api/` route handlers. If so, they're already excluded from client bundles by Next.js automatically. Do NOT wrap API route handlers in `next/dynamic`. Only wrap if these libraries are imported in page components or client components.

2. **Google Maps components are used on public pages** (homepage search, booking form, directory filters). The dynamic import wrapper must include a meaningful loading state, not just a blank div. Use a text input fallback that works without JS.

3. **`tesseract.js`, `xlsx`, `mammoth` removal.** Before removing, run `grep -r "tesseract\|xlsx\|mammoth" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" app/ lib/ components/ scripts/` to triple-check zero imports. The initial audit found zero, but verify.

4. **Bundle budget tightening may fail immediately.** The new budgets (800/500/350) are aspirational. If routes currently exceed them, log which routes fail and set budgets to 10% above the current P95 as an intermediate step. The goal is to catch regressions, not to fail every build.

5. **`revalidateTag` additions.** Search for every mutation that writes to `chefs` table, `user_roles` table, or archetype-related tables. Each must have the corresponding `revalidateTag`. Use the existing pattern in `lib/archetypes/actions.ts` as reference.

6. **`React.cache()` wrapping.** Only wrap functions called in server components (not server actions). `cache()` deduplicates within a single request/render. It does NOT persist across requests. Do not confuse with `unstable_cache`.

7. **Image `priority` prop.** Only add to images that are above the fold on initial load. Adding `priority` to too many images defeats the purpose and creates unnecessary preload tags. Target: 1-2 images per public page.

8. **Remy sprite cleanup.** Read `lib/ai/remy-sprite-manifests.ts` and identify every entry with `available: false`. Cross-reference with the actual files in `public/images/remy/`. Only delete files that are both `available: false` AND not referenced by any other code path.

### Reference Files

- Bundle budget script: `scripts/check-bundle-budget.mjs`
- Remy sprite manifests: `lib/ai/remy-sprite-manifests.ts`
- Layout cache with tags: `lib/chef/layout-data-cache.ts`
- Root layout: `app/layout.tsx`
- Next config: `next.config.js`
- Public homepage: `app/(public)/page.tsx`
- Chef layout: `app/(chef)/layout.tsx`
- Google Maps components: `components/ui/location-map.tsx`, `components/ui/location-autocomplete.tsx`, `components/ui/address-autocomplete.tsx`
- Stripe payment: `components/stripe/payment-form.tsx`
- PDF generation: `lib/documents/pdf-layout.ts`, `lib/documents/pdf-generator.ts`

### Measurement Protocol

Before starting any changes, run and save output of:

```bash
node scripts/check-bundle-budget.mjs
du -sh public/images/remy/
```

After all phases complete, run the same commands and include both outputs in the session log departure notes.
