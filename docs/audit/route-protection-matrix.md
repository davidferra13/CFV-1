# Route Protection Matrix

> Security audit of all 901 page routes against the 4-layer defense model.
> Generated: 2026-05-14

## Defense Layers

| Layer            | Mechanism                                                         | Scope                  |
| ---------------- | ----------------------------------------------------------------- | ---------------------- |
| 1. Middleware    | `middleware.ts` using `route-policy.ts` arrays                    | All non-asset requests |
| 2. Route Policy  | `lib/auth/route-policy.ts` prefix-match arrays                    | Explicit path lists    |
| 3. Layout Guards | `requireChef()`, `requireClient()`, etc. in group layouts         | Route group children   |
| 4. Action Auth   | `requireChef()`/`requireClient()` in server actions/data fetchers | Individual pages       |

## Summary Stats

| Category                                 | Count |     % |
| ---------------------------------------- | ----: | ----: |
| **Total page routes**                    |   901 |  100% |
| Both policy array + layout guard         |   858 | 95.2% |
| Layout guard only (no policy array)      |     7 |  0.8% |
| Edge cases (standalone/bare/mobile/demo) |    36 |  4.0% |
| **True gaps (zero protection)**          |     0 |    0% |

### By Role

| Role                                  | Routes in policy array |             Layout guard             |
| ------------------------------------- | ---------------------: | :----------------------------------: |
| Chef (CHEF_PROTECTED_PATHS)           |                   ~665 |    (chef) layout: `requireChef()`    |
| Client (CLIENT_PROTECTED_PATHS)       |                    ~64 |  (client) layout: `requireClient()`  |
| Admin (ADMIN_PATHS)                   |                    ~42 |   (admin) layout: `requireAdmin()`   |
| Staff (STAFF_PROTECTED_PATHS)         |                      6 |   (staff) layout: `requireStaff()`   |
| Partner (PARTNER_PROTECTED_PATHS)     |                      6 | (partner) layout: `requirePartner()` |
| Public (PUBLIC_UNAUTHENTICATED_PATHS) |                    ~80 |    (public) layout: none required    |

---

## 1. Routes in Layout-Guarded Groups but MISSING from Policy Arrays

These routes are protected by the layout `require*()` guard (Layer 3) but are invisible to middleware (Layer 1). Middleware classifies them as `mode: 'public'` via `getRouteAccountMode()`, meaning it allows any authenticated user through regardless of role. The layout guard then blocks wrong roles, but this is a defense-in-depth gap.

| URL Path                | Route Group |  Layout Guard   | Risk                                                  |
| ----------------------- | ----------- | :-------------: | ----------------------------------------------------- |
| `/pie-cart`             | (chef)      | `requireChef()` | LOW: Layout protects it. Middleware skips role check. |
| `/catalog-pick/[token]` | (public)    |      None       | NONE: Intentionally public token page.                |
| `/cuisines/[slug]`      | (public)    |      None       | NONE: Public SEO page.                                |
| `/discover/[[...path]]` | (public)    |      None       | NONE: Redirect stub to /nearby.                       |
| `/menu-pick/[token]`    | (public)    |      None       | NONE: Public token page (rate-limited).               |
| `/menu/[token]`         | (public)    |      None       | NONE: Public menu view by token.                      |
| `/split/[token]`        | (public)    |      None       | NONE: Public payment split by token.                  |

### Recommendations

| Route           | Action                                                                                 |
| --------------- | -------------------------------------------------------------------------------------- |
| `/pie-cart`     | **Add to `CHEF_PROTECTED_PATHS`** to restore middleware role enforcement.              |
| `/catalog-pick` | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness.                            |
| `/cuisines`     | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness.                            |
| `/discover`     | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness (even though it redirects). |
| `/menu-pick`    | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness.                            |
| `/menu`         | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness.                            |
| `/split`        | **Add to `PUBLIC_UNAUTHENTICATED_PATHS`** for explicitness.                            |

---

## 2. Edge Case Routes (Standalone, Bare, Mobile, Demo)

These pages live outside standard route groups. Each requires individual analysis.

### 2a. Token-Authenticated Standalone Pages (no session auth)

These use token-based access (URL contains `[token]`). They are intentionally outside session auth. Middleware sees them as unmatched paths, so unauthenticated users get redirected to `/auth/signin`. This is **incorrect** for token pages.

| URL Path                                    | Auth Mechanism     | In Policy Array | Middleware Behavior        | Issue                                                          |
| ------------------------------------------- | ------------------ | :-------------: | -------------------------- | -------------------------------------------------------------- |
| `/client/[token]`                           | Token lookup       |       NO        | Redirects unauth to signin | **BUG**: Token pages need unauthenticated access               |
| `/client/[token]/events/[eventId]/contract` | Token + rate limit |       NO        | Redirects unauth to signin | **BUG**: Same as above                                         |
| `/client/[token]/pay/[eventId]`             | Token + rate limit |       NO        | Redirects unauth to signin | **BUG**: Same as above                                         |
| `/client/[token]/quotes/[quoteId]`          | Token + rate limit |       NO        | Redirects unauth to signin | **BUG**: Same as above                                         |
| `/intake/[token]`                           | Token lookup       |       NO        | Redirects unauth to signin | **BUG**: Comment says "no auth required" but middleware blocks |

**Critical finding**: 5 token-based standalone pages are blocked by middleware for unauthenticated users. The middleware check at line 137-149 redirects any non-session user on non-public paths to `/auth/signin`. These pages MUST be added to `PUBLIC_UNAUTHENTICATED_PATHS` or the middleware matcher must exclude them.

**Recommendation**: Add these prefixes to `PUBLIC_UNAUTHENTICATED_PATHS`:

- `/client` (covers all `/client/[token]/*` paths)
- `/intake`

### 2b. Print Pages

| URL Path                                  | Auth Mechanism                       | In Policy Array | Middleware Behavior        | Risk                                                                                                                                            |
| ----------------------------------------- | ------------------------------------ | :-------------: | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/print/cannabis-dosing-packet/[eventId]` | `requireChef()` + cannabis agreement |       NO        | Redirects unauth to signin | LOW: Action-level auth works, but middleware redirects before page renders for unauth users. Acceptable since this should require chef session. |
| `/print/menu/[id]`                        | `requireChef()` via action           |       NO        | Redirects unauth to signin | LOW: Same pattern. Chef must be signed in to print.                                                                                             |

**Recommendation**: Add `/print` to `CHEF_PROTECTED_PATHS` for explicit middleware enforcement.

### 2c. Mobile Pages

| URL Path                 | Route Group | Auth Mechanism               |    In Policy Array    | Issue                                                                                                |
| ------------------------ | ----------- | ---------------------------- | :-------------------: | ---------------------------------------------------------------------------------------------------- |
| `/chef/[slug]/dashboard` | (mobile)    | `requireChef()` via action   | YES (matches `/chef`) | **OVERLAP**: Matches PUBLIC `/chef` prefix. Middleware treats as public, action-level auth saves it. |
| `/client/[token]/events` | (mobile)    | `requireClient()` via action |          NO           | **SAME BUG as 2a**: Token page blocked by middleware                                                 |

**Note**: The mobile route `/chef/[slug]/dashboard` matches the PUBLIC_UNAUTHENTICATED_PATHS entry `/chef`, so middleware allows it through unauthenticated. The action-level `requireChef()` then enforces auth. This is backwards from the intended flow but functionally safe since the action throws.

### 2d. Bare Layout Pages

| URL Path            | Route Group |         In Policy Array         |       Layout Guard        | Risk                        |
| ------------------- | ----------- | :-----------------------------: | :-----------------------: | --------------------------- |
| `/account-security` | (bare)      |          YES (PUBLIC)           | None (bare = passthrough) | NONE: Intentionally public. |
| `/nearby/join`      | (bare)      | YES (PUBLIC, matches `/nearby`) | None (bare = passthrough) | NONE: Intentionally public. |

### 2e. Demo Page

| URL Path | Route Group | In Policy Array |            Layout Guard            | Risk                |
| -------- | ----------- | :-------------: | :--------------------------------: | ------------------- |
| `/demo`  | (demo)      |  YES (PUBLIC)   | Env-var gate (`DEMO_MODE_ENABLED`) | NONE: Double-gated. |

### 2f. Auth Pages (standalone `app/auth/`)

All 11 auth pages match the `/auth` prefix in `PUBLIC_UNAUTHENTICATED_PATHS`. The `app/auth/layout.tsx` is a minimal wrapper with no auth guard (correct for auth pages). **No issues.**

| URL Path                     | Status      |
| ---------------------------- | ----------- |
| `/auth/client-signup`        | OK (PUBLIC) |
| `/auth/confirm-email-change` | OK (PUBLIC) |
| `/auth/forgot-password`      | OK (PUBLIC) |
| `/auth/mfa-verify`           | OK (PUBLIC) |
| `/auth/partner-signup`       | OK (PUBLIC) |
| `/auth/reauth`               | OK (PUBLIC) |
| `/auth/reset-password`       | OK (PUBLIC) |
| `/auth/role-selection`       | OK (PUBLIC) |
| `/auth/signin`               | OK (PUBLIC) |
| `/auth/signup`               | OK (PUBLIC) |
| `/auth/verify-email`         | OK (PUBLIC) |

### 2g. Other Standalone Pages

| URL Path                     | In Policy Array | Middleware Behavior | Risk |
| ---------------------------- | :-------------: | ------------------- | ---- |
| `/beta-survey`               |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/beta-survey/[token]`       |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/beta-survey/public/[slug]` |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/book/[chefSlug]`           |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/book/[chefSlug]/thank-you` |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/book/campaign/[token]`     |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/embed/inquiry/[chefId]`    |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/kiosk`                     |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/kiosk/disabled`            |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/kiosk/pair`                |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/staff-login`               |  YES (PUBLIC)   | Allows unauth       | NONE |
| `/unauthorized`              |  YES (PUBLIC)   | Allows unauth       | NONE |

### 2h. Potential UX Issue: Client Onboarding in Wrong Group

| URL Path              | Route Group | Issue                                                                                                                                                                                                                                                             |
| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding/[token]` | (client)    | This page uses token-based lookup (`verifyOnboardingToken`), not session auth. But it is inside the `(client)` layout which calls `requireClient()`. New clients clicking onboarding links would need to already be signed in as a client, defeating the purpose. |

**Recommendation**: Move `app/(client)/onboarding/[token]/` to a standalone or (public) route, or add `/onboarding` to `PUBLIC_UNAUTHENTICATED_PATHS` and create a separate page outside the (client) group.

---

## 3. Middleware Behavior Analysis

### How Unmatched Routes Are Handled

When a URL does not match ANY policy array:

1. `getRouteAccountMode()` returns `'public'`
2. `getRoutePolicyDecisionForRole()` returns `{ allowed: true, mode: 'public' }`
3. Middleware allows the request through

This means routes missing from all arrays default to **allowed for any authenticated user**. The layout guard (Layer 3) is the safety net.

For **unauthenticated** users hitting unmatched routes, middleware redirects to `/auth/signin` (line 147-149), UNLESS:

- The path is `/` (root, allowed through)
- The path matches `isPublicUnauthenticatedPath()`
- The path is an API path matching `isApiSkipAuthPath()`

### Root Page (`/`)

The root page gets special treatment in middleware (line 138-140): unauthenticated users see it without redirect. This is correct; it lives in the `(public)` layout.

### Middleware Matcher Exclusions

The middleware matcher regex excludes these API prefixes (they never hit middleware):
`auth, webhooks, build-version, gmail, scheduled, e2e, remy/client, remy/stream, remy/public, remy/landing, ollama-status, health, ai/health, ai/monitor, documents, embed, demo, monitoring, inngest, kiosk, feeds, v2, storage, realtime, book, cron, discovery, sentinel, openclaw/webhook, ingredients, calling, llm-txt`

Also excluded: `_next/static`, `_next/image`, `favicon.ico`, static assets (`.svg`, `.png`, `.jpg`, etc.), and `PUBLIC_ASSET_PATHS`.

---

## 4. Critical Findings Summary

### HIGH Priority (Functional Bugs)

| #   | Finding                                                   | Impact                                                                                            | Fix                                             |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| H1  | `/client/[token]` and 3 sub-pages not in any policy array | Unauthenticated clients with valid tokens get redirected to signin instead of seeing their portal | Add `/client` to `PUBLIC_UNAUTHENTICATED_PATHS` |
| H2  | `/intake/[token]` not in any policy array                 | Clients cannot access intake forms without signing in first                                       | Add `/intake` to `PUBLIC_UNAUTHENTICATED_PATHS` |
| H3  | `(client)/onboarding/[token]` in wrong route group        | Token-based onboarding page requires client session, blocking new users                           | Move to standalone or (public) group            |

### MEDIUM Priority (Defense-in-Depth Gaps)

| #   | Finding                                                                   | Impact                                                                                                      | Fix                                                                                                              |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| M1  | `/pie-cart` missing from `CHEF_PROTECTED_PATHS`                           | Middleware allows any authenticated role through; layout guard catches it                                   | Add `/pie-cart` to `CHEF_PROTECTED_PATHS`                                                                        |
| M2  | `/print` pages missing from `CHEF_PROTECTED_PATHS`                        | Same as M1; action-level auth saves it                                                                      | Add `/print` to `CHEF_PROTECTED_PATHS`                                                                           |
| M3  | 6 public (public)-group pages missing from `PUBLIC_UNAUTHENTICATED_PATHS` | Unmatched policy means authenticated users get through (fine), but the route is invisible to auditing tools | Add `/catalog-pick`, `/cuisines`, `/discover`, `/menu-pick`, `/menu`, `/split` to `PUBLIC_UNAUTHENTICATED_PATHS` |

### LOW Priority (Hygiene)

| #   | Finding                                                       | Impact                                                      | Fix                                         |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| L1  | Mobile `/client/[token]/events` shares the H1 bug             | Same token-access issue in mobile group                     | Covered by H1 fix                           |
| L2  | Mobile `/chef/[slug]/dashboard` matches PUBLIC `/chef` prefix | Middleware treats as public, action auth enforces chef role | Acceptable; action-level auth is sufficient |

---

## 5. Recommended Changes to `route-policy.ts`

```typescript
// Add to PUBLIC_UNAUTHENTICATED_PATHS:
'/client',        // H1: Token-based client portal pages
'/intake',        // H2: Token-based intake forms
'/catalog-pick',  // M3: Public token page
'/cuisines',      // M3: Public SEO page
'/discover',      // M3: Redirect stub
'/menu-pick',     // M3: Public token page
'/menu',          // M3: Public menu view
'/split',         // M3: Public payment split
'/print',         // Alternative: if print pages should be public

// Add to CHEF_PROTECTED_PATHS:
'/pie-cart',      // M1: Missing from array
'/print',         // M2: Chef-only print pages (if NOT added to public above)
```

**Note on `/print`**: If print pages should only be accessible to signed-in chefs, add to `CHEF_PROTECTED_PATHS`. If they use shareable URLs, add to `PUBLIC_UNAUTHENTICATED_PATHS`. Currently they call `requireChef()` at the action level, so `CHEF_PROTECTED_PATHS` is correct.

---

## 6. Overall Assessment

The route protection system is well-architected with genuine defense in depth. 95.2% of routes have both middleware policy enforcement AND layout guard coverage. The remaining 4.8% are edge cases that mostly work correctly due to action-level auth or token-based access patterns.

The 3 HIGH-priority findings (H1, H2, H3) are functional bugs that likely affect real user flows: clients clicking token links in emails would be redirected to a signin page instead of seeing their content. These should be fixed immediately.

The defense-in-depth model is sound:

- Layer 1 (middleware) catches 95%+ of unauthorized access
- Layer 2 (route policy) provides the classification logic
- Layer 3 (layout guards) catches anything middleware missed
- Layer 4 (action auth) provides per-operation security

No route has zero protection. The worst case is "middleware allows any authenticated user, layout guard enforces role," which is an acceptable degraded state for the 7 group-only routes.
