# System Integrity Interrogation - Round 2

> **Purpose:** High-leverage Q&A targeting auth/role enforcement, inquiry-to-event pipeline, and pricing resolution chain.
> **Status:** active working document
> **Created:** 2026-04-15
> **Scope:** auth boundaries, embed widget gaps, pricing silent-zero bugs, rate limiting, data loss during conversion

Each question tagged with failure type, current behavior, gap, and build path.

---

## E. Auth & Role Enforcement

### E1. Admin client usage in partner layout

**Failure type:** elevated privilege surface
**Current behavior:** `app/(partner)/layout.tsx` uses `createAdminClient()` to bypass RLS. The partner layout serves external collaborator pages.
**File:** `app/(partner)/layout.tsx`
**Impact:** If any partner page passes user-controlled input to queries run through the admin client, it bypasses row-level security entirely.
**Build path:** Audit all queries in partner pages. Replace `createAdminClient()` with scoped queries where possible. Document any legitimate admin-client usage.
**Priority:** P2

### E2. E2E test auth env vars in production

**Failure type:** test credential exposure
**Current behavior:** `app/api/e2e/auth/route.ts` checks `process.env.NODE_ENV !== 'production'`. If env vars `AGENT_EMAIL` / `AGENT_PASSWORD` are set in prod, this endpoint is the only gate.
**File:** `app/api/e2e/auth/route.ts`
**Impact:** Low risk (env check is correct). Verify production `.env` does not set these vars.
**Build path:** Add structural test that `api/e2e/` routes reject when `NODE_ENV=production`.
**Priority:** P3

### E3. Session cache TTL allows stale role data

**Failure type:** stale authorization
**Current behavior:** Auth.js JWT callback caches role data in the token. If an admin revokes a user's role, the JWT remains valid until expiry (typically 30 days).
**File:** `lib/auth/auth-config.ts`
**Impact:** A revoked user retains access until their session expires naturally.
**Build path:** Document as known V1 limitation. For V2, add a `session_invalidated_at` column and check it in middleware.
**Priority:** P3

---

## F. Inquiry-to-Event Pipeline

### F1. Embed widget inquiries don't trigger chef email notification

**Failure type:** silent data loss (notification)
**Current behavior:** `app/api/embed/inquiry/route.ts` sends acknowledgment email to the client (`sendInquiryReceivedEmail`) but never notifies the chef. The `/api/book` route, Wix handler, and Gmail sync all call `sendNewInquiryChefEmail`. The embed route does not.
**File:** `app/api/embed/inquiry/route.ts:339-354`
**Impact:** Chef never gets an email when a client submits through their embedded website widget. Must manually check the dashboard. Inquiry may go stale.
**Build path:** After step 6 (client email), add step 6b: look up chef email from `chefs` table (already have `tenantId`), call `sendNewInquiryChefEmail()`. Non-blocking.
**Priority:** P0

### F2. Embed route has IP-only rate limit (no email-based dedup)

**Failure type:** spam vector
**Current behavior:** Rate limit is `embed-inquiry:${ip}` (10 per 5 min per IP). A spammer with rotating IPs can flood a chef's inbox. No dedup by email address.
**File:** `app/api/embed/inquiry/route.ts:58-67`
**Impact:** Automated form spam creates hundreds of fake clients and inquiries per chef.
**Build path:** Add a second rate limit: `embed-inquiry-email:${email}` (3 per hour). Prevents same email from submitting repeatedly even across different IPs.
**Priority:** P0

### F3. Data loss during inquiry-to-event conversion

**Failure type:** silent field drop
**Current behavior:** When embed creates a draft event (step 5), these fields from the inquiry form are NOT carried to the event: `favorite_ingredients_dislikes`, `additional_notes`, `allergy_flag`, `budget_range`, `consent_at`, `consent_version`. They exist only in `inquiries.unknown_fields` JSON.
**File:** `app/api/embed/inquiry/route.ts:278-298`
**Impact:** Chef loses structured data about client preferences when working from the event view instead of the inquiry view. Must cross-reference inquiry to see full context.
**Build path:** Map remaining fields: `special_requests` should concatenate favorites/dislikes + additional notes. Budget range should populate `budget_range_text` if exact budget is not provided. Track as enhancement since `unknown_fields` preserves the data.
**Priority:** P2

### F4. Public directory exposes lat/lon geolocation

**Failure type:** privacy leak
**Current behavior:** `/discover` pages query `chefs.home_lat` and `chefs.home_lon` for map display. These are the chef's actual home coordinates.
**File:** `lib/discover/actions.ts`
**Impact:** Anyone can extract a chef's home location from the public directory API response.
**Build path:** Quantize coordinates to ~1km grid (round to 2 decimal places). Or use a separate `service_area_lat/lon` that the chef sets manually.
**Priority:** P1

---

## G. Pricing Resolution & Costing

### G1. compute_recipe_cost_cents() treats unpriced ingredients as $0

**Failure type:** silent cost understatement
**Current behavior:** The DB function uses `ELSE 0` in its CASE expression. An ingredient with no price contributes $0 to recipe cost. The outer `COALESCE(SUM(...), 0)` returns 0 when all ingredients are unpriced.
**File:** `database/migrations/20260330000095_cascading_food_costs.sql:56-90`
**Impact:** A $200 recipe with 2 unpriced luxury ingredients shows as $120. Chef sets menu price based on understated food cost. Margin evaporates.
**Build path:** Change `ELSE 0` to `ELSE NULL`. Change outer `COALESCE(SUM(...), 0)` to `SUM(...)` so function returns NULL when no ingredients are priced. Update `compute_menu_cost_cents()` to propagate NULL. UI already has costing gap indicators; this makes the numbers honest.
**Priority:** P0

### G2. Shopping list uses || 0 fallback for missing prices

**Failure type:** silent cost understatement
**Current behavior:** `getMenuShoppingList()` computes cost with `ingredient.last_price_cents || ingredient.average_price_cents || 0`. Unpriced ingredients show $0.00 in the shopping list total.
**File:** `lib/menus/actions.ts:2051`
**Impact:** Shopping list total is understated. Chef budgets based on incomplete cost data without any warning on the total line.
**Build path:** Already tracks `hasPricing` boolean per ingredient. Fix: when `!hasPricing`, set `estimatedCostCents` to `null` (not 0). UI should show "Price unknown" for unpriced items and mark the total as "partial estimate".
**Priority:** P0

### G3. Historical prices (Tier 8) have no age limit

**Failure type:** stale pricing
**Current behavior:** `resolve-price.ts` Tier 8 queries `ingredient_price_history` for the most recent price. No `WHERE observed_at > NOW() - INTERVAL '...'` filter.
**File:** `lib/pricing/resolve-price.ts`
**Impact:** A 3-year-old price from a discontinued store is used as current pricing. Chef thinks saffron is $8/oz because that was the 2023 price.
**Build path:** Add age cap: reject historical prices older than 180 days. Return null with `stale_price_available` flag so UI can offer "use stale price?" option.
**Priority:** P1

### G4. event_inventory_variance uses COALESCE(last_price_cents, 0) for variance cost

**Failure type:** silent variance understatement
**Current behavior:** `variance_cost_cents = (variance_qty * COALESCE(last_price_cents, 0))`. If an ingredient has no price, variance cost is always $0 regardless of quantity variance.
**File:** `database/migrations/20260325000005_inventory_analytics_views.sql:124`
**Impact:** Inventory variance report shows $0 cost impact for unpriced ingredients. Waste is invisible.
**Build path:** Remove `COALESCE(..., 0)`. Let NULL propagate so variance_cost_cents is NULL when price is unknown. UI should show "N/A" instead of "$0.00".
**Priority:** P0

### G5. compute_menu_cost_cents masks recipe NULL via COALESCE

**Failure type:** cascaded cost understatement
**Current behavior:** `compute_menu_cost_cents()` wraps result in `COALESCE(SUM(compute_recipe_cost_cents(...)), 0)`. If recipe cost is NULL (after G1 fix), the NULL is ignored by SUM. Menu cost shows sum of only the priced recipes.
**File:** `database/migrations/20260401000114_menu_cost_scale_factor.sql:5-13`
**Impact:** After fixing G1, a menu with 3 recipes (2 fully priced, 1 with gaps) shows cost of only the 2 priced recipes. Understated.
**Build path:** After G1, update `compute_menu_cost_cents()` to return NULL if ANY recipe returns NULL. Ensures cost incompleteness cascades visibly.
**Priority:** P1 (depends on G1)

---

## Priority Execution Order

### P0 (Fix now)

- **F1** Embed widget missing chef email notification
- **F2** Email-based rate limit on embed route
- **G1** compute_recipe_cost_cents silent zero
- **G2** Shopping list || 0 fallback
- **G4** Inventory variance silent zero

### P1 (Fix next)

- **F4** Public directory lat/lon exposure
- **G3** Historical price age cap
- **G5** Menu cost NULL propagation (after G1)

### P2 (Track)

- **E1** Admin client in partner layout
- **F3** Data loss during inquiry-to-event conversion

### P3 (Document)

- **E2** E2E test auth env vars
- **E3** Session cache TTL stale role
