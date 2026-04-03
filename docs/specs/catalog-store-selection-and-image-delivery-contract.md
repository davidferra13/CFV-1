# Spec: Catalog Store Selection And Image Delivery Contract

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** small (3-5 files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-02 13:33 | Planner       |        |
| Status: ready | 2026-04-02 13:33 | Planner       |        |

---

## Developer Notes

### Raw Signal

"This is not a missing feature. This is a pipeline / data rendering failure. You already built image fetching and enrichment logic, but the UI shows no images, meaning the output is not making it to the frontend. Confirm full alignment before proceeding. Expose assumptions. Show proof. Avoid bloat. This work is speculative and for research. Only write spec. Never build or touch code."

"It seems to work now. Can you prove it?"

"Proceed with the most intelligent decisions on my behalf, in the correct order."

### Developer Intent

- **Core goal:** Lock the real catalog contract in writing so future work targets the actual failure mode, not a guessed one.
- **Key constraints:** No speculative feature expansion, no pipeline rewrite, no implementation work in this phase, and no drift away from what is already proven to work.
- **Motivation:** The discussion already proved how easy it is to misdiagnose this surface. The spec must separate verified truth from assumption and fence the next builder into the smallest correct fix.
- **Success from the developer's perspective:** One narrow spec says exactly what is already working, exactly what is still broken, what evidence supports both, and what the next implementation must do without adding noise.

---

## What This Does (Plain English)

This spec hardens the chef-facing Food Catalog contract at `/culinary/price-catalog`. It treats image delivery as an already-working path that must be preserved, and treats store selection as the remaining truthfulness bug. After this spec is built, a chef can choose `All Stores` or a specific store and see real results with real product images or honest category fallbacks. The catalog must not regress into blank remote images, fake empty states, or zero-result store pages caused by picking the wrong upstream source token.

---

## Why It Matters

The earlier diagnosis for this page was wrong. The Pi already had image URLs, and the catalog already mapped them into the UI. The real issue split into two parts: image delivery to the browser, which is now working, and store-card selection, which still used unstable source identities. Without a narrow spec, the next agent could easily "fix" the wrong layer again.

---

## Current State (What Already Exists)

### Page Shell

- `/culinary/price-catalog` is chef-gated and renders the shared `PriceCatalogClient`. `app/(chef)/culinary/price-catalog/page.tsx:1-14`
- The app audit already describes this route as the full chef-facing market catalog with store filters, infinite scroll, and expanded detail. `docs/app-complete-audit.md:759`

### Catalog Browser Contract

- `CatalogBrowser` starts in `store-picker` mode, loads stores through `getCatalogStores()`, and stores the selected value in `selectedStore`. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:107-125`
- Search requests pass `selectedStore` straight through as the `store` query param into `searchCatalogV2()`. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:189-203`, `lib/openclaw/catalog-actions.ts:322-340`
- The browsing header renders `activeStoreName || 'All Stores'`, and the empty state already distinguishes between generic no-results and store-specific no-data copy. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:517-522`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:746-761`

### Store Picker Contract

- `getCatalogStores()` fetches raw upstream sources from `GET /api/sources` and maps each source into `{ id, name, tier, status, logoUrl, region, city, state }`. `lib/openclaw/catalog-actions.ts:136-166`
- `CatalogStorePicker` strips only the `(via X)` suffix through `cleanStoreName()`. It does not canonicalize slug forms like `stop_and_shop`. `components/pricing/catalog-store-picker.tsx:23-33`
- The picker deduplicates active stores by cleaned display name, but it keeps only the first source as the card identity and sends only `store.id` on click. The merged `_sourceIds` are collected but never used for search. `components/pricing/catalog-store-picker.tsx:69-89`, `components/pricing/catalog-store-picker.tsx:157-185`

### Image Delivery Contract

- `searchCatalogV2()` already maps upstream `item.image_url` into the frontend-facing `imageUrl` field. `lib/openclaw/catalog-actions.ts:352-367`
- The catalog uses `ImageWithFallback` in desktop rows, mobile cards, and product cards. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:934-939`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:1040-1045`, `components/pricing/product-card.tsx:40-46`
- `ImageWithFallback` resolves remote URLs through `toOpenClawImageProxyUrl()`, resets failed state when the source changes, and falls back to category SVG icons on missing or failed images. `components/pricing/image-with-fallback.tsx:81-107`
- `toOpenClawImageProxyUrl()` preserves same-origin and inline sources, proxies absolute remote URLs to `/api/openclaw/image`, and avoids double-proxying. `lib/openclaw/image-proxy.ts:1-23`
- The proxy route validates upstream URLs, blocks unsafe hosts, enforces image content types, and returns cacheable image responses. `app/api/openclaw/image/route.ts:3-132`
- Unit coverage currently exists for the proxy helper only. `tests/unit/openclaw.image-proxy.test.ts:1-31`

### Existing Broader Specs

- The store-first catalog UX and product-photo expectations already exist in prior specs. This spec does not replace them. It narrows the remaining correctness bug in the current implementation. `docs/specs/catalog-ux-overhaul.md:16-23`, `docs/specs/catalog-ux-overhaul.md:66-90`
- Prior visual strategy work already treats `ImageWithFallback` as the standard image surface and expects broken catalog image URLs to fall back cleanly. `docs/specs/visual-representation-strategy.md:463-476`, `docs/specs/visual-representation-strategy.md:496-500`, `docs/specs/visual-representation-strategy.md:573-579`

---

## Runtime Evidence (2026-04-02)

These checks were run directly against the Pi API and the real browser session for this page:

### Browser Proof Already Collected

- `All Stores` rendered populated product cards with images in Playwright.
- The page showed real proxied product images using `/api/openclaw/image?...`.
- Visible catalog images loaded with non-zero browser dimensions.
- Screenshot captured: `C:\Users\david\AppData\Local\Programs\Microsoft VS Code\price-catalog-image-proxy-2026-04-02.png`

### Direct Pi API Proof

- `GET /api/ingredients?store=ic-market-basket&limit=3` returned populated ingredients.
- `GET /api/ingredients?store=market-basket-flipp&limit=1` returned `0`.
- `GET /api/ingredients?store=Market%20Basket&limit=1` returned populated ingredients.
- `GET /api/ingredients?store=stop-and-shop-new-england&limit=1` returned `0`.
- `GET /api/ingredients?store=stop-shop-flipp&limit=1` returned populated ingredients.
- `GET /api/ingredients?store=Stop%20%26%20Shop&limit=1` returned populated ingredients.

### Conclusion From Runtime Evidence

The image pipeline is not the remaining blocker for this surface. The remaining blocker is store selection truthfulness:

1. The picker visually collapses multiple upstream sources into one store card.
2. The card still emits one raw source ID, typically the first one seen.
3. Some of those first source IDs return zero items even when the human store name returns data.

That makes the current store-specific empty state unreliable.

---

## Files to Create

| File                                          | Purpose                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/openclaw/catalog-store-selection.ts`     | Pure helper for canonical store naming and query-token generation for store-card clicks                |
| `tests/unit/catalog-store-selection.test.ts`  | Verifies canonical display names and query tokens for merged chains like Market Basket and Stop & Shop |
| `tests/price-catalog-store-selection.spec.ts` | Playwright regression proving store cards return results and images still render                       |

---

## Files to Modify

| File                                                    | What to Change                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `components/pricing/catalog-store-picker.tsx`           | Keep visual dedupe, but stop using the first raw `source_id` as the search token for merged store cards        |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Track a stable store-selection object or query token instead of assuming `selectedStore` is always a source ID |

---

## Database Changes

None.

This is a browser-contract fix plus regression protection. No schema or migration work is needed.

---

## Data Model

### Existing Upstream Store Shape

```ts
type CatalogStore = {
  id: string
  name: string
  tier: string
  status: string
  logoUrl: string | null
  storeColor: string | null
  region: string | null
  city: string | null
  state: string | null
}
```

Source: `lib/openclaw/catalog-actions.ts:55-65`

### New Runtime Selection Shape

```ts
type CatalogStoreSelection = {
  displayName: string
  canonicalKey: string
  queryValue: string
  sourceIds: string[]
}
```

Rules:

- `displayName` is the human-friendly store name shown in the UI, for example `Market Basket` or `Stop & Shop`.
- `canonicalKey` is the normalized merge key used by the picker, for example `market basket` or `stop & shop`.
- `queryValue` is the value passed into `searchCatalogV2({ store })`. For merged store cards, this must be a verified stable token that returns data, not an arbitrary first `source_id`.
- `sourceIds` preserves all raw upstream source IDs that were merged into the card for debugging and future expansion.

### Existing Catalog Item Image Shape

```ts
type CatalogItemV2 = {
  id: string
  name: string
  category: string
  standardUnit: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  imageUrl: string | null
  brand: string | null
  priceCount: number
  inStockCount: number
  outOfStockCount: number
  hasSourceUrl: boolean
  lastUpdated: string | null
}
```

Source: `lib/openclaw/catalog-actions.ts:229-244`

---

## Server Actions

No new server actions are required for the minimal version.

| Action             | Auth            | Input                            | Output                                                             | Side Effects |
| ------------------ | --------------- | -------------------------------- | ------------------------------------------------------------------ | ------------ |
| `getCatalogStores` | `requireChef()` | none                             | `CatalogStore[]` from Pi `/api/sources`                            | None         |
| `searchCatalogV2`  | `requireChef()` | `{ store?: string, ...filters }` | `{ items, total, hasMore, nextCursor }` from Pi `/api/ingredients` | None         |

The contract change belongs at the picker/browser boundary, not in a new server action.

---

## UI / Component Spec

### Page Layout

The page shell stays the same:

- Chef-gated route at `/culinary/price-catalog`
- Shared `PriceCatalogClient`
- Store picker entry view
- Existing browsing header, filters, table/grid/store-aisle views
- Existing cart sidebar and detail expansion

Source: `app/(chef)/culinary/price-catalog/page.tsx:1-14`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:107-125`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:457-839`

### Store Picker Requirements

- The picker may still dedupe raw upstream sources into one card per human store.
- Dedupe must canonicalize common variants, not just strip `(via X)`.
- Variants like `Stop & Shop (via Instacart)`, `Stop & Shop (New England)`, and `stop_and_shop (via Instacart)` must collapse into one `Stop & Shop` card.
- Clicking a store card must use a stable query token that returns the store's catalog data. It must not blindly forward the first raw `source_id`.
- The browsing header must continue to show the human-friendly store label.

### Image Requirements

- Product images must continue to render through the same-origin proxy path already established by `ImageWithFallback`.
- No new image component is allowed. Reuse `ImageWithFallback` everywhere this flow already uses it.
- Missing or broken image URLs must continue to fall back to category icons without a broken-layout state.

### Empty-State Truthfulness

- The store-specific empty state, "No catalog data for {store} yet. Coverage for this store is still in progress.", is only valid after the canonical store query token returns zero results.
- A merged store card must not show that copy just because one raw source ID happened to be empty.

---

## States

- **Loading:** Existing store-picker skeletons and catalog-loading UI remain unchanged.
- **Empty, global filters:** Existing generic "No ingredients found" copy remains valid when filters eliminate results. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:746-761`
- **Empty, store truly has no data:** Show the existing store-specific coverage-in-progress copy only after the canonical store query returns zero items.
- **Error:** Keep existing honest error behavior. Do not substitute zero results for fetch failure.
- **Populated:** Existing table/grid/store-aisle views remain, with product images proxied through `/api/openclaw/image` and category-icon fallback on failure.

---

## Interactions

1. Chef opens `/culinary/price-catalog`.
2. Store picker renders canonicalized store cards.
3. Chef clicks `Market Basket` or `Stop & Shop`.
4. Picker passes a stable `CatalogStoreSelection` query token into the browser state.
5. `CatalogBrowser` calls `searchCatalogV2({ store: queryValue, ... })`.
6. Grid or table view renders returned items.
7. Product images render through `ImageWithFallback`.
8. If an image fails, category fallback icon shows.
9. If the canonical store query truly returns zero items, the existing store-specific empty state is allowed.

---

## Edge Cases and Error Handling

| Scenario                                                 | Correct Behavior                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| One merged raw source is empty, another has data         | Store card still returns populated results                                        |
| Store name contains slug formatting like `stop_and_shop` | Canonicalize to human display name `Stop & Shop`                                  |
| Broken upstream image URL                                | `ImageWithFallback` falls back to category icon                                   |
| Missing `image_url`                                      | `ImageWithFallback` falls back to category icon                                   |
| `All Stores` browsing                                    | Must continue working exactly as it does now                                      |
| Pi fetch fails                                           | Show honest error state, not fake empty data                                      |
| Store card represents only one unique upstream source    | Stable query token may equal the canonical name if that is the verified API token |

---

## Verification Steps

1. Sign in with the agent account.
2. Navigate to `/culinary/price-catalog`.
3. Verify the page still opens on the store picker.
4. Verify the picker shows human-friendly store cards, including `Stop & Shop`, not `stop_and_shop`.
5. Click `Market Basket`.
6. Verify the browsing header says `Market Basket` and the results count is greater than zero.
7. Verify at least one visible product image loads through `/api/openclaw/image?...`.
8. Click back to stores, then click `Stop & Shop`.
9. Verify the browsing header says `Stop & Shop` and the results count is greater than zero.
10. Click `Browse All Stores`.
11. Verify `All Stores` still loads and images still render.
12. Run unit tests for store-selection normalization.
13. Run the existing proxy-helper unit test to confirm image delivery did not regress.
14. Capture screenshots for `Market Basket`, `Stop & Shop`, and `All Stores`.

---

## Out of Scope

- No scraper or enrichment-pipeline changes
- No changes to Pi sync cadence or job scheduling
- No redesign of the catalog layout, cart, detail rows, or admin catalog
- No vendor-personalization work
- No changes to the existing image proxy route or `ImageWithFallback` unless a regression is proven during verification

---

## Notes for Builder Agent

1. **Do not chase the pipeline.** For this surface, image data already exists and already maps into `CatalogItemV2.imageUrl`. `lib/openclaw/catalog-actions.ts:352-367`

2. **The fix belongs at the picker boundary.** `searchCatalogV2()` already forwards whatever `store` token it receives. The bug is that the picker/browser currently forwards unstable raw source IDs for visually merged cards. `lib/openclaw/catalog-actions.ts:325-340`, `components/pricing/catalog-store-picker.tsx:69-89`, `components/pricing/catalog-store-picker.tsx:157-185`

3. **Preserve the working image path.** `ImageWithFallback`, `toOpenClawImageProxyUrl()`, and `/api/openclaw/image` are already the correct delivery stack for this page. Do not replace them. `components/pricing/image-with-fallback.tsx:81-107`, `lib/openclaw/image-proxy.ts:1-23`, `app/api/openclaw/image/route.ts:55-132`

4. **Canonical name normalization is part of correctness, not polish.** `stop_and_shop` is not acceptable as the chef-facing store label when the same chain already exists as `Stop & Shop`.

5. **The minimal complete version is small.** Canonicalize store-card naming, change the store query token to a verified stable value, add unit tests, add one Playwright regression, and stop.

---

## Spec Validation

### 1. What exists today that this touches?

- Chef page shell: `app/(chef)/culinary/price-catalog/page.tsx:1-14`
- Catalog browser state and search wiring: `app/(chef)/culinary/price-catalog/catalog-browser.tsx:107-125`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:189-243`
- Store picker dedupe and click behavior: `components/pricing/catalog-store-picker.tsx:23-33`, `components/pricing/catalog-store-picker.tsx:69-89`, `components/pricing/catalog-store-picker.tsx:157-185`
- Store source fetch and catalog item mapping: `lib/openclaw/catalog-actions.ts:136-166`, `lib/openclaw/catalog-actions.ts:322-367`
- Shared image renderer and proxy stack: `components/pricing/image-with-fallback.tsx:81-107`, `lib/openclaw/image-proxy.ts:1-23`, `app/api/openclaw/image/route.ts:55-132`

### 2. What exactly changes?

- Store-card query-token generation changes from raw first `source_id` to a canonical, verified token for browsing.
- Store-card naming changes from raw upstream labels to human-friendly canonical names where needed.
- Regression protection is added with unit tests and Playwright coverage.
- Image rendering logic does not change behaviorally and is protected from regression.

### 3. What assumptions are being made?

- **Verified:** `searchCatalogV2()` forwards the `store` token unchanged. `lib/openclaw/catalog-actions.ts:325-340`
- **Verified:** picker dedupe keeps only the first raw source as click identity. `components/pricing/catalog-store-picker.tsx:69-89`, `components/pricing/catalog-store-picker.tsx:157-185`
- **Verified:** image URLs already map into `CatalogItemV2.imageUrl`. `lib/openclaw/catalog-actions.ts:352-367`
- **Verified in runtime:** `Market Basket` and `Stop & Shop` name-based filters return data even where some raw source IDs return zero.

### 4. Where will this most likely break?

1. Canonical-name mapping could collapse unrelated stores if normalization is too aggressive.
2. Builder could accidentally touch the working image path while fixing store selection.
3. Empty-state copy could remain misleading if the browser still treats a failed store fetch as a real zero-result state.

### 5. What is underspecified?

The exact normalization table for all future source-name variants is not fully enumerated here. The minimal version only needs the known current variants plus a conservative default of stripping `(via X)` and preserving punctuation.

### 6. What dependencies or prerequisites exist?

None. No migration, no new backend route, no Pi change.

### 7. What existing logic could this conflict with?

- `CatalogStorePicker` current merge behavior
- `CatalogBrowser` current `selectedStore` state
- Shared image renderer, which must remain untouched unless failing verification proves otherwise

### 8. What is the end-to-end data flow?

Chef clicks store card -> picker emits canonical store query token -> `CatalogBrowser` stores token -> `searchCatalogV2({ store })` -> Pi `/api/ingredients?store=...` -> result items map `image_url` into `imageUrl` -> `ImageWithFallback` proxies remote image URLs -> browser renders product images or category fallback icons.

### 9. What is the correct implementation order?

1. Add canonical store-selection helper and unit tests.
2. Wire picker to use canonical display/query values.
3. Wire browser state to use the new selection contract.
4. Add Playwright regression for store selection plus image rendering.
5. Verify `All Stores` still works.

### 10. What are the exact success criteria?

- `Market Basket` store card returns populated results.
- `Stop & Shop` store card returns populated results.
- No `stop_and_shop` slug card remains visible.
- `All Stores` still returns populated results.
- Product images still render through `/api/openclaw/image?...`.
- Missing or broken images still fall back to category icons.

### 11. What are the non-negotiable constraints?

- No code changes outside the catalog store-selection contract and its regression coverage
- No pipeline rewrites
- No fake zero-result states on fetch failure
- No replacement of the current proxy-based image delivery path

### 12. What should NOT be touched?

- `app/api/openclaw/image/route.ts`
- `lib/openclaw/image-proxy.ts`
- `components/pricing/image-with-fallback.tsx`
- Admin price catalog surfaces
- Pi sync, scraper, and enrichment code

### 13. Is this the simplest complete version?

Yes. It fixes the current correctness bug, preserves the already-working image path, and adds the minimum regression protection needed to stop this exact issue from returning.

### 14. If implemented exactly as written, what would still be wrong?

Nothing material for this surface. Broader catalog enhancements, store logos, vendor integration, and upstream data quality gaps remain separate work and are intentionally excluded.

---

## Final Check

This spec is production-ready for implementation.

The remaining uncertainty is low and bounded to conservative canonical-name coverage beyond the already-proven examples. That does not block correctness for the minimal version because the current bug is specifically reproduced by merged chain cards whose first raw source IDs are empty while name-based queries return data.
