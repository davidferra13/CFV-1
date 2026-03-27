# Spec: API Integration Reinstatement and Health Audit

> **Status:** built
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-27
> **Updated:** 2026-03-27 (v3 - blast radius analysis, caller files listed, Maps diagnosis corrected, dead code confirmed)
> **Built by:** Claude Code (2026-03-27)

---

## What This Does (Plain English)

A builder agent audits, tests, and repairs every third-party API integration in ChefFlow. The developer discovered the Google Maps Places API was configured but broken. This spec treats that as a symptom: if one integration silently regressed, others likely did too. The agent walks every integration from env var through library code through server action through UI component, verifies each link in the chain actually works, and fixes anything that doesn't. The deliverable is: (1) every integration confirmed working or explicitly flagged for developer action, (2) silent failure patterns replaced with honest error states, (3) a reusable health check script, and (4) a living report.

---

## Why It Matters

ChefFlow's competitive advantage comes from deep integrations: real grocery pricing from local stores, nutrition and allergen analysis, weather-aware event planning, receipt OCR, multi-channel messaging, review aggregation, e-signatures, and more. Every broken integration is a feature the chef paid for but can't use, with no error telling them why.

Worse: a deep audit revealed that 9 out of 10 integration files **silently swallow errors**. When an API fails, the UI doesn't show an error; it shows misleading empty data, stale prices disguised as current, or "no concerns" when it should say "could not check." This violates the Zero Hallucination rule (Law 2: never hide failure as zero). Fixing wiring without fixing error handling just makes the lies faster.

---

## Prerequisites (MUST be satisfied before builder starts)

| Prerequisite                                                                                                                                                                  | Who                                 | When                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Dev server running on port 3100                                                                                                                                               | Developer starts it                 | Before Session 1 Phase 4, Before Session 2     |
| Ollama running on localhost:11434                                                                                                                                             | Developer starts it                 | Before Session 2 (Remy-dependent verification) |
| Docker database up (`docker compose up -d`)                                                                                                                                   | Developer starts it                 | Before Session 2 (cached results need DB)      |
| Missing API keys added to `.env.local`                                                                                                                                        | Developer pastes them               | Between Session 1 and Session 2                |
| Google Cloud Console: enable "Places API (New)" + "Maps JavaScript API", add referrer restrictions for `localhost:3100/*` and `app.cheflowhq.com/*`, verify billing is active | Developer (console access required) | Before Session 1 Phase 2 (Maps fix)            |

**The builder CANNOT fabricate API keys.** Session 1 generates the exact list of what's missing. The developer fills them in. Session 2 verifies and repairs.

**The builder CANNOT access Google Cloud Console.** The Maps fix is split: builder diagnoses what's wrong (test key, screenshot failure, check console errors). Developer fixes it in Google Cloud Console. Builder then verifies.

**No new dependencies needed.** `dotenv` (v17.3.1) and `tsx` (v4.21.0) are already in `package.json`. `tsconfig.scripts.json` covers `scripts/**/*.ts` with `@/lib/*` path aliases. The health check script follows the same pattern as `scripts/setup-agent-account.ts`.

---

## Execution Model: Two Builder Sessions

This spec is designed for **two sequential sessions** with a developer handoff in between.

```
SESSION 1 (Diagnostic - no missing keys needed)
  Phase 1: Inventory and diagnosis (read-only)
  Phase 2: Fix known broken wiring (Google Maps, type errors)
  Phase 3: Build health check script
  Phase 4: Generate missing-keys report for developer
  Deliverable: health check script + missing keys list + Google Maps fixed

    --- Developer adds missing API keys to .env.local ---

SESSION 2 (Repair - keys must be present)
  Phase 5: Verify every key works via health check script
  Phase 6: Fix silent failure patterns (7 integration files + 8-10 caller files)
  Phase 7: Unify env var inconsistencies (Twilio)
  Phase 8: UI verification with Playwright
  Phase 9: Generate final living report
  Deliverable: all integrations verified + silent failures fixed + report
```

---

## Files to Create

| File                                    | Purpose                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `scripts/api-health-check.ts`           | Runnable diagnostic: tests every API key and wiring chain, prints pass/fail per service |
| `docs/api-integration-health-report.md` | Living report: last audit date, status per integration, rate limits, known issues       |

---

## Files to Modify

### Integration libraries (change return types)

| File                                | What to Change                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| `lib/nutrition/edamam.ts`           | `analyzeRecipe()`: return `{ data, error }` instead of `T                                                                                                                                              | null` |
| `lib/grocery/pricing-actions.ts`    | `getSpoonacularPrice()`, `getKrogerPrice()`, `getKrogerToken()`, `getMealMePrice()`: return `{ cents, error }`. Update internal aggregation in `runGroceryPriceQuote()` to track which sources failed. |
| `lib/nutrition/analysis-actions.ts` | `fetchDishNutrition()`: return `{ data, error }`. Update `analyzeMenuNutrition()` to pass error reason per dish                                                                                        |
| `lib/geo/public-location.ts`        | `resolvePublicLocationQuery()`: return `{ data, error }`. Add `console.warn` logging on all catch blocks                                                                                               |
| `lib/weather/open-meteo.ts`         | `getEventWeather()`: return `{ data, error }`. For `fetchForecast()`: return `{ forecasts: [], error }` (NOTE: this returns an array, not null, so error field is additive)                            |
| `lib/ocr/ocr-space.ts`              | `scanReceipt()`, `scanReceiptFromBuffer()`: return `{ text, error }` instead of `string                                                                                                                | null` |

### Caller files (update to handle new return types)

| File                                            | What to Change                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `lib/recipes/allergen-actions.ts`               | Update `detectAllergens()`: handle `{ data, error }` from `analyzeRecipe()`. Show "Allergen check unavailable" on error |
| `components/events/grocery-quote-panel.tsx`     | Update to handle structured error from `runGroceryPriceQuote()`. Show which pricing sources failed                      |
| `lib/ai/agent-actions/grocery-actions.ts`       | Update null check on `runGroceryPriceQuote()` result                                                                    |
| `app/(chef)/events/[id]/grocery-quote/page.tsx` | Update `.catch(() => null)` pattern on `getLatestGroceryQuote()`                                                        |
| `lib/weather/weather-actions.ts`                | Update 2 call sites for `getEventWeather()` and 1 for `fetchForecast()`                                                 |
| `lib/directory/location-actions.ts`             | Update `resolvePublicLocationQuery()` null check                                                                        |
| `lib/booking/match-chefs.ts`                    | Update `resolvePublicLocationQuery()` null check                                                                        |
| `lib/expenses/receipt-actions.ts`               | Update `scanReceiptFromBuffer()` null check. Show "OCR service unavailable" on error                                    |

### Remy message fixes (internal only, no return type changes)

| File                         | What to Change                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-weather.ts`     | When all geocoding fails in `getWeatherAlerts()`, return message "Could not check weather for your events" instead of empty array that renders as "No weather concerns" |
| `lib/ai/remy-travel-time.ts` | When all routing fails in `getTravelEstimates()`, return message "Could not check travel times" instead of empty array that renders as "No scheduling conflicts"        |

### Dead code (confirmed orphaned, zero callers)

| File                           | What to Change                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/wine/spoonacular-wine.ts` | `getWinePairing()`, `getDishPairing()`, `getWineDescription()` have zero imports anywhere in codebase. Flag for developer: delete or build UI to use them. Do NOT fix error handling on functions nobody calls |

### Maps error handling (new)

| File                                      | What to Change                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `components/ui/address-autocomplete.tsx`  | Add `onLoadError` callback to `useJsApiLoader()`. Show inline error when SDK fails to load |
| `components/ui/location-autocomplete.tsx` | Same: add error handling for SDK load failure                                              |
| `components/ui/store-autocomplete.tsx`    | Same (this component was missing from the spec)                                            |
| `components/ui/location-map.tsx`          | Same: add error handling for map load failure                                              |

### Env var unification

| File                       | What to Change                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/sms/twilio-client.ts` | Change `TWILIO_PHONE_NUMBER` to `process.env.TWILIO_FROM_NUMBER \|\| process.env.TWILIO_PHONE_NUMBER` |
| `lib/sms/send.ts`          | Already uses `TWILIO_FROM_NUMBER` (canonical name, no change needed)                                  |

### Type error fixes (adjacent to integration code)

| File                                              | What to Change                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `app/api/documents/consolidated-grocery/route.ts` | Fix AuthUser missing `name` property                                     |
| `app/(chef)/recipes/dump/recipe-dump-client.tsx`  | Fix null vs undefined parameter type                                     |
| `components/onboarding/recipe-entry-form.tsx`     | Fix RecipeListItem missing `family_id`, `variation_label`, `family_name` |
| `components/recipes/recipe-batch-import.tsx`      | Fix error property check on union type                                   |

### Config

| File           | What to Change                                                       |
| -------------- | -------------------------------------------------------------------- |
| `.env.local`   | Developer adds missing API keys (builder generates the template)     |
| `package.json` | Add `"api:health": "npx tsx scripts/api-health-check.ts"` to scripts |

---

## Database Changes

None

---

## Critical Context the Builder Must Know

### 1. Caching Is In-Memory Only (Not Redis)

The file `lib/cache/upstash.ts` is misleadingly named. It was migrated from Upstash Redis to a **plain JavaScript `Map`**. There is no Redis connection. All cached API responses are lost on server restart.

Implications:

- Edamam's "30-day cache" lasts until next deploy, not 30 days
- API Ninjas' "3-layer cache" is actually 1 layer (in-memory only)
- Rate limit counters reset on restart (Spoonacular's 150/day resets)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are not configured

This is not a blocker for this spec. The integrations still work; they just hit APIs more often than the comments suggest. Document this reality in the health report. Do NOT attempt to set up Redis (out of scope).

### 2. Circuit Breaker Exists But Doesn't Cover All Integrations

`lib/resilience/circuit-breaker.ts` has pre-configured breakers for: Stripe, Resend, Gemini, MealMe, Kroger, Spoonacular, Google Maps.

**NOT covered:** Edamam, USDA, Geocodio, API Ninjas, OCR.space, Yelp, Twilio, OneSignal, Tavily, Frankfurter, Nager.Date.

This means uncovered services can fail repeatedly without fast-fail protection. Flag this in the report as a follow-up task; do NOT add circuit breakers in this spec (scope creep).

### 3. The AI Dispatch Layer (`lib/ai/dispatch/`) Does Not Exist

The AI model governance doc and CLAUDE.md reference `lib/ai/dispatch/` with files like `privacy-gate.ts`, `router.ts`, `cost-tracker.ts`. This directory was never built. AI routing is done via direct imports (`parseWithOllama` or `parseWithAI`) at each call site. This is fine for this audit. Do NOT reference `lib/ai/dispatch/` as a real location.

### 4. Stripe Keys Are Empty Strings, Not Missing

`.env.local` has `STRIPE_SECRET_KEY=` (empty string), not a missing variable. `process.env.STRIPE_SECRET_KEY` returns `""` which is falsy but NOT undefined. Some truthy checks (`if (key)`) catch this; others (`if (key !== undefined)`) don't. The health check must specifically test for empty string values.

### 5. `SOCIAL_TOKEN_ENCRYPTION_KEY` Will Crash If Missing

This env var powers AES-256-GCM encryption for storing social OAuth tokens in the database. If a chef connects Instagram/TikTok/etc without this key set, the app **crashes** on token save (not a graceful failure). The health check must flag this as CRITICAL if any social platform env vars are configured but this key is not.

---

## The Master Integration Map

Every integration below has a full wiring chain. The builder agent must verify each link. If any link is broken, fix it.

**Chain format:** `Env Var` -> `Library Module` -> `Server Action / API Route` -> `UI Component / Page`

---

### CATEGORY 1: MAPS, LOCATION, AND WEATHER

These power event location management, travel planning, geocoding, and weather-aware scheduling.

#### 1. Google Maps / Places API

**Chain:**

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (.env.local - SET)
- -> `components/ui/address-autocomplete.tsx` (street address autocomplete using `@react-google-maps/api`)
- -> `components/ui/location-autocomplete.tsx` (city/region/ZIP autocomplete)
- -> `components/ui/location-map.tsx` (embedded map display, falls back to OpenStreetMap)
- -> Used by 15+ components: event-form, event-creation-wizard, client-create-form, inquiry forms, book-dinner-form, homepage-search, mileage-tracker, etc.

**Also:** `GOOGLE_PLACES_API_KEY` (server-side, used in `lib/reviews/external-sync.ts` for review sync)

**Known issue:** Developer confirmed broken. Investigate:

1. Is "Places API (New)" enabled in Google Cloud Console? (not just legacy Places API)
2. Is "Maps JavaScript API" enabled?
3. Are HTTP referrer restrictions blocking `localhost:3100` or `app.cheflowhq.com`?
4. Is the `@react-google-maps/api` package using the correct Places API version?
5. Does the key have billing enabled? (Google requires billing even for free tier)

**Test:** Navigate to any page with address autocomplete (e.g., event creation). Type "123 Main" and verify suggestions appear. Screenshot the result.

#### 2. Mapbox

**Chain:**

- `NEXT_PUBLIC_MAPBOX_TOKEN` (.env.local - MISSING)
- -> `lib/maps/mapbox.ts` (exports: `getStaticMapUrl()`, `geocode()`, `getDirections()`, `getEventMapUrl()`)
- -> Used as fallback geocoding in `lib/geo/public-location.ts`
- -> Used by Remy weather/travel modules for coordinate resolution

**Test:** `GET https://api.mapbox.com/geocoding/v5/mapbox.places/Boston.json?access_token={token}&limit=1` - verify 200 with features array.

#### 3. Geocodio

**Chain:**

- `GEOCODIO_API_KEY` (.env.local - MISSING)
- -> `lib/geo/geocodio.ts` (exports: `geocodeAddress()`, `reverseGeocode()`, `batchGeocode()`)
- -> Primary geocoding provider in `lib/geo/public-location.ts` (Nominatim is free fallback)
- -> Used by directory location search, event location inputs
- -> Cached in-memory (7-day TTL, resets on restart) + `public_location_references` table

**Silent failure:** `geocodio.ts` throws on missing key (good). But `public-location.ts` catches everything and returns `null` silently (bad). Builder must add logging and surface "geocoding unavailable" to callers.

**Test:** `GET https://api.geocod.io/v1.7/geocode?q=Haverhill+MA&api_key={key}` - verify 200 with lat/lng results.

#### 4. Open-Meteo (Weather)

**Chain:**

- No API key needed (free, 1000 req/min)
- -> `lib/weather/open-meteo.ts` (exports: `fetchForecast()`, `getEventWeather()`, `getWeatherForEvents()`)
- -> `lib/formulas/weather-risk.ts` (weather risk scoring for events)
- -> `lib/ai/remy-weather.ts` (exports: `getWeatherAlerts()`, `formatWeatherAlerts()` - Remy proactive alerts)
- -> UI: `components/events/weather-panel.tsx`, event calendar inline weather, Remy chat drawer

**Silent failure:** `fetchForecast()` returns `[]` on error. `getEventWeather()` returns `null`. Remy sees empty forecast, says "No weather concerns" when it should say "Could not fetch weather data."

**Test:** `GET https://api.open-meteo.com/v1/forecast?latitude=42.77&longitude=-71.08&daily=temperature_2m_max&timezone=America/New_York` - verify JSON with daily temps.

#### 5. OSRM (Routing/Travel Time)

**Chain:**

- No API key needed (free)
- -> `lib/ai/remy-travel-time.ts` (exports: `getTravelEstimates()`, `formatTravelEstimates()`)
- -> Remy proactive alert engine (back-to-back event scheduling conflict detection)
- -> UI: Remy chat drawer

**Silent failure:** `getDrivingTime()` returns `null` on error. Remy loop does `if (!route) continue`, skipping events silently. Chef sees "no scheduling conflicts" when OSRM was down.

**Test:** `GET https://router.project-osrm.org/route/v1/driving/-71.08,42.77;-71.06,42.36` - verify JSON with duration/distance.

#### 6. OpenStreetMap

**Chain:**

- No API key needed
- -> `components/ui/location-map.tsx` (fallback when Google Maps unavailable)
- -> Embedded via `https://www.openstreetmap.org/export/embed.html`

**Test:** Verify embed URL loads in iframe.

#### 7. IP-API (IP Geolocation)

**Chain:**

- No API key needed
- -> `lib/geo/ip-api.ts`
- -> Visitor location detection for public pages

**Test:** `GET http://ip-api.com/json/` - verify JSON with city/country.

#### 8. REST Countries

**Chain:**

- No API key needed
- -> `lib/geo/rest-countries.ts`
- -> Country metadata for location features

**Test:** `GET https://restcountries.com/v3.1/alpha/US` - verify JSON response.

---

### CATEGORY 2: FOOD, GROCERY, AND NUTRITION

These power grocery quoting, ingredient pricing, allergen detection, nutrition analysis, and wine pairing. This is ChefFlow's core differentiator for private chefs.

#### 9. Spoonacular

**Chain:**

- `SPOONACULAR_API_KEY` (.env.local - MISSING)
- -> `lib/grocery/pricing-actions.ts` (ingredient pricing via `/food/ingredients/search`)
- -> `lib/wine/spoonacular-wine.ts` (exports: `getWinePairing()`, `getDishPairing()`, `getWineDescription()`)
- -> `lib/nutrition/analysis-actions.ts` (exports: `analyzeMenuNutrition()`, `getMenuNutrition()`, `updateDishNutrition()`, `deleteDishNutrition()`)
- -> UI: `components/events/grocery-quote-panel.tsx`, `components/events/grocery-live-pricing-sidebar.tsx`, `app/(chef)/events/[id]/grocery-quote/page.tsx`, `components/nutrition/nutrition-card.tsx`, `app/(chef)/nutrition/[menuId]/page.tsx`

**Rate limit:** 150 requests/day (shared across all three use cases: pricing, wine, nutrition). Check remaining quota in response headers.

**Silent failure:** `getSpoonacularPrice()` in `pricing-actions.ts` returns `null` on error with zero logging. Callers aggregate nulls into averages. If all APIs fail, the grocery quote falls back to stale recipe-book prices disguised as current estimates.

**Possibly orphaned:** `getWinePairing()`, `getDishPairing()`, `getWineDescription()` are exported from `spoonacular-wine.ts` but the research could not confirm any UI component calling them. Builder must definitively trace callers: `grep` for imports of these functions. If no callers, flag as dead code in the report (do not delete without developer approval).

**Test:** `GET https://api.spoonacular.com/food/ingredients/search?query=chicken+breast&number=1&apiKey={key}` - verify 200 with results.

#### 10. Kroger

**Chain:**

- `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET` (.env.local - MISSING)
- -> `lib/grocery/pricing-actions.ts` -> `getKrogerPrice()` (internal, uses OAuth client credentials with 30-min token caching)
- -> Part of `runGroceryPriceQuote()` aggregate pricing
- -> UI: Displayed as "Kroger" column in grocery quote panel

**Silent failure:** `getKrogerToken()` returns `null` on auth failure. `getKrogerPrice()` returns `null` on API error. Both with zero logging.

**Test:** Attempt OAuth token exchange at `https://api.kroger.com/v1/connect/oauth2/token` with client credentials grant. Verify 200 with access_token.

#### 11. MealMe

**Chain:**

- `MEALME_API_KEY` (.env.local - MISSING)
- -> `lib/grocery/pricing-actions.ts` -> `getMealMePrice()` (internal)
- -> Part of `runGroceryPriceQuote()` and `previewManualGroceryPricing()`
- -> Covers 1M+ US stores (Market Basket, Hannaford, Shaw's, Stop & Shop, Whole Foods, Walmart)
- -> UI: Per-item pricing in grocery quote panel

**Silent failure:** Returns `null` silently on any error.

**Test:** Call MealMe search endpoint with a common grocery item. Verify response contains store pricing.

#### 12. Instacart

**Chain:**

- `INSTACART_API_KEY` (.env.local - MISSING)
- -> `lib/grocery/instacart-actions.ts` (exports: `buildInstacartCartLink()`)
- -> Called from `runGroceryPriceQuote()`, result stored in `instacart_link` column
- -> UI: Clickable "Shop on Instacart" link in grocery quote panel

**Test:** Call Instacart API to generate a cart link with a test item list. Verify URL is returned.

#### 13. USDA FoodData Central

**Chain:**

- `USDA_API_KEY` / `USDA_FDC_API_KEY` (.env.local - MISSING)
- -> THREE modules exist (consolidation candidate, out of scope for this spec):
  - `lib/nutrition/usda.ts` (exports: `searchFoods()`, `getFoodDetails()`, `getNutritionSummary()`)
  - `lib/nutrition/usda-client.ts` (exports similar functions, falls back to `DEMO_KEY`)
  - `lib/nutrition/usda-fdc.ts` (exports similar functions, falls back to `DEMO_KEY`)
- -> Used in `lib/grocery/pricing-actions.ts` for NE-regional pricing fallback
- -> Nutrition analysis workflows

**DEMO_KEY issue:** Without a real key, `usda-client.ts` and `usda-fdc.ts` fall back to `DEMO_KEY` (30 req/hour vs 1,000 req/hour with a real key). Free key available at https://fdc.nal.usda.gov/api-key-signup.html.

**Test:** `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&pageSize=1&api_key={key}` - verify 200 with foods array.

#### 14. Edamam

**Chain:**

- `EDAMAM_APP_ID`, `EDAMAM_APP_KEY` (.env.local - MISSING)
- -> `lib/nutrition/edamam.ts` (exports: `analyzeRecipe()` - allergen detection, health labels, nutrition macros)
- -> `lib/recipes/allergen-actions.ts` -> `detectAllergens()` server action
- -> UI: `components/recipes/allergen-badge-panel.tsx` on recipe detail page
- -> Cached in-memory (30-day TTL, resets on restart, free tier: 10K calls/month)

**Silent failure (DANGEROUS):** `analyzeRecipe()` returns `null` on API failure. Caller shows zero allergens. A recipe containing peanuts could show a clean allergen badge because the API was down. This is a safety issue, not just a UX issue.

**Test:** `POST https://api.edamam.com/api/nutrition-details?app_id={id}&app_key={key}` with body `{"ingr":["1 cup rice"]}` - verify 200 with nutrition data.

---

### CATEGORY 3: COMMUNICATION AND MESSAGING

#### 15. Resend (Email)

**Chain:**

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (.env.local - SET)
- -> `lib/email/resend-client.ts` (singleton client)
- -> `lib/email/send.ts` (exports: email sending functions)
- -> All transactional emails: quotes, confirmations, reminders, notifications

**Test:** `GET https://api.resend.com/domains` with `Authorization: Bearer {key}` - verify 200. Do NOT send a test email.

#### 16. Twilio (SMS / WhatsApp)

**Chain:**

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_FROM_NUMBER` (.env.local - ALL MISSING)
- -> `lib/sms/twilio-client.ts` (exports: `sendSMS()`, `sendWhatsApp()`, `parseInboundWebhook()`)
- -> `lib/sms/send.ts` (higher-level send, checks for `TWILIO_FROM_NUMBER`)
- -> `lib/notifications/channel-router.ts` (notification routing)
- -> Webhook ingestion: `app/api/webhooks/twilio/route.ts`, `app/api/comms/sms/route.ts`
- -> UI: `components/notifications/notification-settings.tsx`, unified inbox

**Env var inconsistency (MUST FIX):** `TWILIO_FROM_NUMBER` and `TWILIO_PHONE_NUMBER` are used in different files for what may be the same number. `lib/sms/send.ts` reads `TWILIO_FROM_NUMBER`. `lib/sms/twilio-client.ts` reads `TWILIO_PHONE_NUMBER`. `app/api/comms/sms/route.ts` reads `TWILIO_FROM_NUMBER`. If the developer sets only one, half the SMS code silently fails.

**Fix:** Pick one canonical name. Add an alias in the other file (`const from = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER`). Update `.env.local.example` to document one name.

**Test:** `GET https://api.twilio.com/2010-04-01/Accounts/{SID}.json` with Basic auth (SID:Token) - verify 200 with account info. Do NOT send a message.

#### 17. OneSignal (Push Notifications)

**Chain:**

- `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` (.env.local - MISSING)
- -> `lib/notifications/onesignal.ts` (exports: `sendPushToUser()`, `sendPushToAll()`, plus per-event helpers)
- -> Notification orchestration layer
- -> UI: Push subscription management

**Test:** `GET https://onesignal.com/api/v1/apps` with `Authorization: Basic {key}` - verify auth succeeds.

#### 18. Gmail API

**Chain:**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (.env.local - SET, shared with OAuth)
- -> `lib/gmail/client.ts` (exports: message listing, sending, history tracking)
- -> Gmail sync pipeline, unified inbox
- -> UI: Inbox, inquiry capture from email

**Test:** Verify OAuth flow loads. Full test requires user grant (out of scope for automated check).

---

### CATEGORY 4: FINANCIAL AND BUSINESS

#### 19. Stripe

**Chain:**

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (.env.local - ALL THREE ARE EMPTY STRINGS)
- -> `lib/stripe/*` (payment processing)
- -> `app/api/webhooks/stripe/route.ts` (webhook handler)
- -> `components/stripe/payment-form.tsx` (client-side)
- -> Supporter contributions, booking payments

**CRITICAL:** All three Stripe keys are blank in `.env.local`. This means all payment functionality is non-functional. Developer must provide keys. Note: these are empty strings (`""`), not undefined. The health check must test for this specifically because `""` is falsy in `if (key)` but NOT undefined in `if (key !== undefined)`.

**Test:** If keys are set, call `stripe.accounts.retrieve()` server-side. Verify valid response.

#### 20. Square

**Chain:**

- `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`, `SQUARE_SANDBOX` (.env.local - MISSING)
- -> `lib/integrations/square/square-client.ts` (OAuth + payment links)
- -> All functions require `requirePro('integrations')`

**Test:** Verify env vars are present. Check OAuth URL builds correctly. Full test requires user OAuth grant.

#### 21. QuickBooks

**Chain:**

- `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_SANDBOX` (.env.local - MISSING)
- -> `lib/integrations/quickbooks/quickbooks-client.ts` (invoice sync, expense tracking)
- -> All functions require `requirePro('integrations')`

**Test:** Verify env vars are present. Check OAuth URL builds. Full test requires user OAuth grant.

#### 22. DocuSign

**Chain:**

- `DOCUSIGN_CLIENT_ID`, `DOCUSIGN_CLIENT_SECRET`, `DOCUSIGN_AUTH_URL`, `DOCUSIGN_API_BASE`, `DOCUSIGN_CONNECT_HMAC_KEY` (.env.local - MISSING)
- -> `lib/integrations/docusign/docusign-client.ts` (contract sending, envelope status)
- -> Webhook: `app/api/webhooks/docusign/route.ts`
- -> All functions require `requirePro('integrations')`
- -> Defaults to demo environment if `DOCUSIGN_AUTH_URL` not set

**Test:** Verify env vars are present. Check OAuth URL builds. Full test requires user OAuth grant.

#### 23. API Ninjas (Sales Tax)

**Chain:**

- `API_NINJAS_KEY` (.env.local - MISSING)
- -> `lib/tax/api-ninjas.ts` (exports: `getSalesTaxRate()`, `calculateSalesTax()`, `formatTaxRate()`)
- -> `lib/commerce/tax-actions.ts`, `lib/events/invoice-actions.ts`
- -> Cache: in-memory only (despite code comments claiming 3-layer, Redis is not connected)
- -> UI: Invoice generation, tax center

**Test:** `GET https://api.api-ninjas.com/v1/salestax?zip_code=01835` with `X-Api-Key: {key}` - verify 200 with tax breakdown.

#### 24. Frankfurter (Currency)

**Chain:**

- No API key needed (free, ECB rates)
- -> `lib/currency/frankfurter.ts` (exports: `getExchangeRates()`, `convertCurrency()`, `formatCurrency()`)
- -> UI: `components/currency/currency-conversion-hint.tsx`

**Test:** `GET https://api.frankfurter.dev/v1/latest?from=USD&to=EUR` - verify JSON with rate.

---

### CATEGORY 5: CONTENT AND MEDIA

#### 25. OCR.space (Receipt Scanning)

**Chain:**

- `OCR_SPACE_API_KEY` (.env.local - MISSING)
- -> `lib/ocr/ocr-space.ts` (exports: `scanReceipt()`, `scanReceiptFromBuffer()`)
- -> `lib/expenses/receipt-actions.ts` -> `scanAndParseReceipt()` server action
- -> UI: `components/expenses/receipt-scanner.tsx`
- -> Flow: upload receipt image -> OCR text extraction -> regex parsing -> chef review -> manual save

**Silent failure:** Returns `null` to caller. Console logs the error but UI has no way to see it. Chef sees "No receipt found" when OCR service was down.

**Test:** `POST https://api.ocr.space/parse/imageurl` with `apikey={key}&url=https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/ReceiptSwiss.jpg/170px-ReceiptSwiss.jpg` - verify 200 with parsed text.

#### 26. Unsplash

**Chain:**

- `UNSPLASH_ACCESS_KEY` (.env.local - MISSING)
- -> `lib/images/unsplash.ts` (exports: `searchPhotos()`, `getRandomFoodPhoto()`, `trackDownload()`, `getAttribution()`)
- -> Menu item photos, empty state imagery
- -> UI: `components/ui/food-placeholder-image.tsx`

**Test:** `GET https://api.unsplash.com/search/photos?query=food&per_page=1` with `Authorization: Client-ID {key}` - verify 200.

#### 27. Pexels

**Chain:**

- `PEXELS_API_KEY` (.env.local - MISSING)
- -> `lib/images/pexels.ts` (exports: `searchPhotos()`, `getCuratedPhotos()`, `getPhotoById()`, `getAttribution()`)
- -> Same usage as Unsplash (alternative stock photo source)

**Test:** `GET https://api.pexels.com/v1/search?query=food&per_page=1` with `Authorization: {key}` - verify 200.

#### 28. Cloudinary

**Chain:**

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (.env.local - MISSING)
- -> `lib/images/cloudinary.ts` (exports: `getMenuThumbnail()`, `getEventHero()`, `getProfilePhoto()`, `getBlurPlaceholder()`, etc.)
- -> URL-based image transformation (no upload SDK needed)
- -> Graceful: returns original URL if cloud name missing (this is correct behavior, not a silent failure)

**Test:** Verify env var is set. If set, construct a transformation URL and verify it returns an image.

#### 29. LibreTranslate

**Chain:**

- No API key needed (public instance)
- -> `lib/translate/libre-translate.ts` (exports: `translateText()`, `translateMenuItems()`, `detectLanguage()`, `getSupportedLanguages()`)
- -> `lib/translate/translate-actions.ts` server action
- -> UI: `components/menus/menu-translate-button.tsx`
- -> Supports: ES, FR, IT, PT, DE, JA, ZH, KO, AR

**Test:** `POST https://libretranslate.com/translate` with `{"q":"Hello","source":"en","target":"es"}` - verify response contains "Hola".

---

### CATEGORY 6: REVIEWS AND REPUTATION

#### 30. Yelp

**Chain:**

- `YELP_API_KEY` (.env.local - MISSING)
- -> `lib/integrations/yelp/yelp-sync.ts` (exports: `fetchYelpReviews()`, `searchYelpBusiness()`, `syncYelpReviews()`)
- -> Reviews upserted into `external_reviews` table
- -> UI: `app/(chef)/settings/yelp/page.tsx`

**Note:** Yelp is the ONE integration with proper error handling: it throws on HTTP failure and persists errors to the `last_error` DB field. Use this as the reference pattern when fixing other integrations.

**Test:** `GET https://api.yelp.com/v3/businesses/search?term=restaurant&location=Boston&limit=1` with `Authorization: Bearer {key}` - verify 200.

---

### CATEGORY 7: AI PROVIDERS

#### 31. Ollama (Local, Privacy-First)

**Chain:**

- `OLLAMA_BASE_URL` (.env.local - SET: `http://localhost:11434`)
- `OLLAMA_MODEL`, `OLLAMA_MODEL_FAST`, `OLLAMA_MODEL_COMPLEX` (.env.local - NOT SET, uses defaults from `lib/ai/providers.ts`)
- -> `lib/ai/parse-ollama.ts`, `lib/ai/providers.ts`
- -> ALL private data processing: recipes, client PII, financials, allergies
- -> Remy concierge, brain dump parsing, recipe parsing, AAR generation, contract generation, etc.

**Test:** `GET http://localhost:11434/api/tags` - verify running and list available models. Check that the default model tiers (qwen3:4b, qwen3-coder:30b, qwen3:30b) are pulled.

#### 32. Gemini (Cloud, Non-Private Only)

**Chain:**

- `GEMINI_API_KEY` (.env.local - SET)
- -> `lib/ai/parse.ts`, `lib/ai/parse-document-vision.ts`
- -> Generic tasks only: technique lists, kitchen specs, campaign themes
- -> Document vision (client info extraction - known privacy tradeoff, documented in AI_POLICY.md)
- -> NEVER used for client PII, financials, or private data (except vision, where Ollama can't do it on 6GB VRAM)

**Test:** Make a minimal `generateContent` call with prompt "List 3 cooking techniques" - verify response.

#### 33. Groq

**Chain:**

- `GROQ_API_KEY` (.env.local - SET)
- -> AI routing (non-private tasks, fast/cheap inference)
- -> No dispatch layer exists; routing is via direct import at call sites

**Test:** `GET https://api.groq.com/openai/v1/models` with `Authorization: Bearer {key}` - verify 200 with model list.

#### 34. Cerebras

**Chain:**

- `CEREBRAS_API_KEY` (.env.local - SET)
- -> AI routing (non-private tasks)

**Test:** Attempt minimal inference call or model list endpoint. Verify key is active.

#### 35. Mistral

**Chain:**

- `MISTRAL_API_KEY` (.env.local - SET)
- -> AI routing (non-private tasks)

**Test:** `GET https://api.mistral.ai/v1/models` with `Authorization: Bearer {key}` - verify 200.

#### 36. SambaNova

**Chain:**

- `SAMBANOVA_API_KEY` (.env.local - SET)
- -> AI routing (non-private tasks)

**Test:** Verify key format. Attempt health check or minimal inference.

#### 37. GitHub Models

**Chain:**

- `GITHUB_MODELS_TOKEN` (.env.local - SET)
- -> AI routing (code utilities, docs)

**Test:** Verify PAT format (`github_pat_...`). Check token is not expired.

---

### CATEGORY 8: SOCIAL MEDIA PUBLISHING

All are OAuth-based. The builder can only verify config presence, not full auth flow.

#### 38-44. Instagram, Facebook, TikTok, X, LinkedIn, YouTube, Pinterest

**Chain (all platforms):**

- Platform-specific env vars (see table below)
- -> `lib/social/platform-adapters/{platform}.ts` (OAuth flow + API adapter)
- -> `lib/social/oauth-actions.ts` (connection management)
- -> `app/api/integrations/social/connect/[platform]/route.ts` (OAuth initiation)
- -> `app/api/integrations/social/callback/[platform]/route.ts` (token exchange)
- -> Token storage: `lib/social/oauth/token-store.ts` (AES-256-GCM encrypted in `social_platform_credentials` table)
- -> UI: `components/social/social-post-composer.tsx`

**CRITICAL dependency:** `SOCIAL_TOKEN_ENCRYPTION_KEY` is required for storing tokens. Without it, any social platform OAuth connection will **crash** on token save. If any social platform env vars are configured but this key is not, the health check must flag it as CRITICAL.

| Platform           | Client ID Env Var    | Client Secret Env Var    |
| ------------------ | -------------------- | ------------------------ |
| Instagram/Facebook | `META_APP_ID`        | `META_APP_SECRET`        |
| TikTok             | `TIKTOK_CLIENT_KEY`  | `TIKTOK_CLIENT_SECRET`   |
| X/Twitter          | `X_CLIENT_ID`        | `X_CLIENT_SECRET`        |
| LinkedIn           | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |
| YouTube            | `YOUTUBE_CLIENT_ID`  | `YOUTUBE_CLIENT_SECRET`  |
| Pinterest          | `PINTEREST_APP_ID`   | `PINTEREST_APP_SECRET`   |

**Test:** For each platform, verify env vars are present and non-empty. Verify OAuth initiation URL builds without error. Do NOT initiate actual OAuth flows.

---

### CATEGORY 9: BUSINESS AUTOMATION

#### 45. Zapier/Make Webhooks

**Chain:**

- `ZAPIER_SUBSCRIBE_API_KEY` (.env.local - MISSING)
- -> `lib/integrations/zapier/zapier-webhooks.ts` (webhook delivery with HMAC-SHA256 signatures)
- -> `lib/integrations/zapier/zapier-events.ts` (11 event types: inquiry.created, event.status_changed, payment.received, etc.)
- -> Database: `zapier_webhook_subscriptions`, `zapier_webhook_deliveries`
- -> Security: SSRF protection via `validateWebhookUrl()`, blocks private IPs, requires HTTPS
- -> All functions require `requirePro('integrations')`

**Test:** Verify env var present. No external call needed (webhooks are outbound).

---

### CATEGORY 10: SCHEDULING AND JOBS

#### 46. Inngest

**Chain:**

- `INNGEST_EVENT_KEY` (.env.local - MISSING)
- -> `lib/jobs/inngest-client.ts` (4 event types: event.completed, commerce.day-closeout, commerce.reconcile-payments, commerce.map-settlement)
- -> Background job engine: post-event follow-ups, daily settlement, payment reconciliation

**Test:** Verify env var present. If set, check Inngest cloud dashboard connectivity. Without key, `inngest.send()` no-ops gracefully.

---

### CATEGORY 11: MONITORING AND ANALYTICS

#### 47. Sentry

**Chain:**

- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (.env.local - NOT CONFIGURED)
- -> `instrumentation.ts`, `instrumentation-client.ts` (auto-init in production or when `SENTRY_FORCE_ENABLE=true`)
- -> `lib/monitoring/sentry-reporter.ts` (manual error reporting)
- -> `next.config.js` (source map upload config, dry-runs without `SENTRY_AUTH_TOKEN`)

**Test:** If DSN set, verify format matches `https://xxx@xxx.ingest.sentry.io/xxx`. If not set, mark as "not configured (optional)".

#### 48. PostHog

**Chain:**

- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (.env.local - NOT CONFIGURED)
- -> `components/analytics/posthog-provider.tsx` (client-side provider)
- -> `lib/analytics/posthog.ts` (event tracking helpers)

**Test:** If key set, verify format starts with `phc_`. If not set, mark as "not configured (optional)".

---

### CATEGORY 12: SECURITY

#### 49. Cloudflare Turnstile

**Chain:**

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (.env.local - MISSING)
- -> `lib/security/turnstile.ts` (exports: `verifyTurnstileToken()`)
- -> Public forms: embed inquiry, contact form, public signup

**IMPORTANT:** Without the secret key, Turnstile verification is bypassed in dev (acceptable). In production, forms are unprotected from bots. The health check should flag this as WARN in dev, CRITICAL in production.

**Test:** Verify env vars present. If set, check Turnstile verification endpoint responds.

---

### CATEGORY 13: MISCELLANEOUS

#### 50. Nager.Date (Holidays)

**Chain:**

- No API key needed (free)
- -> `lib/holidays/nager-date.ts` (exports: `getPublicHolidays()`, `checkHoliday()`, `isPremiumHoliday()`)
- -> Holiday campaign targeting, surge pricing logic
- -> Cached in-memory (90-day TTL, resets on restart)

**Test:** `GET https://date.nager.at/api/v3/PublicHolidays/2026/US` - verify JSON array with holidays.

#### 51. ProPublica (Nonprofits)

**Chain:**

- No API key needed (free)
- -> `lib/charity/propublica-actions.ts` (exports: `searchNonprofits()`, `browseNonprofits()`)
- -> UI: `components/charity/nonprofit-search.tsx`

**Test:** `GET https://projects.propublica.org/nonprofits/api/v2/search.json?q=food+bank` - verify JSON response.

#### 52. WFP RSS

**Chain:**

- No API key needed (public RSS)
- -> `lib/charity/wfp-actions.ts` (exports: `getWfpNews()`)
- -> UI: `components/charity/wfp-feed.tsx`

**Test:** `GET https://www.wfp.org/rss.xml` - verify XML response with news items.

#### 53. Tavily (Web Search for Remy)

**Chain:**

- `TAVILY_API_KEY` (.env.local - MISSING)
- -> `lib/ai/remy-web-actions.ts` (exports: `searchWeb()`, `readWebPage()`)
- -> DuckDuckGo is free fallback when Tavily not configured
- -> SSRF protection via `isUrlSafeForFetch()` on `readWebPage()`
- -> UI: Remy chat drawer (research capability)

**Test:** If key set, `POST https://api.tavily.com/search` with `{"api_key":"{key}","query":"test","max_results":1}` - verify 200.

---

## `.env.local` Gap Analysis

### Currently configured (working or assumed working):

| Env Var                                          | Status           |
| ------------------------------------------------ | ---------------- |
| `DATABASE_URL`                                   | Set              |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL`   | Set              |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                | Set (but broken) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`      | Set              |
| `GEMINI_API_KEY`                                 | Set              |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL`           | Set              |
| `OLLAMA_BASE_URL`                                | Set              |
| `GROQ_API_KEY`                                   | Set              |
| `CEREBRAS_API_KEY`                               | Set              |
| `MISTRAL_API_KEY`                                | Set              |
| `SAMBANOVA_API_KEY`                              | Set              |
| `GITHUB_MODELS_TOKEN`                            | Set              |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | Set              |
| `AUTH_SECRET` / `NEXTAUTH_URL`                   | Set              |
| `CRON_SECRET`                                    | Set              |
| `PROSPECTING_API_KEY` / `PROSPECTING_TENANT_ID`  | Set              |

### Must be added to `.env.local` (developer provides values):

| Env Var                              | Category            | Notes                                                                       |
| ------------------------------------ | ------------------- | --------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Payments            | Currently empty string, not missing                                         |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments            | Currently empty string                                                      |
| `STRIPE_WEBHOOK_SECRET`              | Payments            | Currently empty string                                                      |
| `SPOONACULAR_API_KEY`                | Grocery/Nutrition   | 150 req/day free                                                            |
| `KROGER_CLIENT_ID`                   | Grocery Pricing     | OAuth app                                                                   |
| `KROGER_CLIENT_SECRET`               | Grocery Pricing     | OAuth app                                                                   |
| `MEALME_API_KEY`                     | Grocery Pricing     | Requires sales contact                                                      |
| `INSTACART_API_KEY`                  | Grocery             | Cart link generation                                                        |
| `USDA_API_KEY`                       | Nutrition           | Free, 1000 req/hr, signup: https://fdc.nal.usda.gov/api-key-signup.html     |
| `USDA_FDC_API_KEY`                   | Nutrition           | Same service, alt var name                                                  |
| `EDAMAM_APP_ID`                      | Nutrition/Allergens | 10K calls/month free                                                        |
| `EDAMAM_APP_KEY`                     | Nutrition/Allergens | 10K calls/month free                                                        |
| `NEXT_PUBLIC_MAPBOX_TOKEN`           | Maps                | 50K loads/month free                                                        |
| `GEOCODIO_API_KEY`                   | Geocoding           | 2500 req/day free                                                           |
| `GOOGLE_PLACES_API_KEY`              | Reviews             | Server-side Places key                                                      |
| `TWILIO_ACCOUNT_SID`                 | SMS/WhatsApp        | Messaging                                                                   |
| `TWILIO_AUTH_TOKEN`                  | SMS/WhatsApp        | Messaging                                                                   |
| `TWILIO_FROM_NUMBER`                 | SMS                 | Outbound SMS (canonical name, see fix below)                                |
| `TWILIO_WHATSAPP_NUMBER`             | WhatsApp            | WhatsApp sender                                                             |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID`       | Push                | Push notifications                                                          |
| `ONESIGNAL_REST_API_KEY`             | Push                | Push notifications                                                          |
| `YELP_API_KEY`                       | Reviews             | Review sync                                                                 |
| `TAVILY_API_KEY`                     | AI Search           | Remy web search (DuckDuckGo fallback exists)                                |
| `OCR_SPACE_API_KEY`                  | OCR                 | Receipt scanning                                                            |
| `API_NINJAS_KEY`                     | Tax                 | Sales tax lookup, 100K req/month free                                       |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`  | Images              | Image optimization                                                          |
| `UNSPLASH_ACCESS_KEY`                | Images              | Stock photos                                                                |
| `PEXELS_API_KEY`                     | Images              | Stock photos                                                                |
| `SOCIAL_TOKEN_ENCRYPTION_KEY`        | Security            | **CRITICAL** if using any social OAuth. Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`     | Security            | Bot protection (required for production)                                    |
| `TURNSTILE_SECRET_KEY`               | Security            | Bot protection (required for production)                                    |
| `INNGEST_EVENT_KEY`                  | Jobs                | Background processing                                                       |

### OAuth integrations (add when ready to connect):

| Env Var                                               | Platform             |
| ----------------------------------------------------- | -------------------- |
| `META_APP_ID` / `META_APP_SECRET`                     | Instagram + Facebook |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`          | TikTok               |
| `X_CLIENT_ID` / `X_CLIENT_SECRET`                     | X/Twitter            |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`       | LinkedIn             |
| `PINTEREST_APP_ID` / `PINTEREST_APP_SECRET`           | Pinterest            |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`         | YouTube              |
| `SQUARE_APPLICATION_ID` / `SQUARE_APPLICATION_SECRET` | Square               |
| `QUICKBOOKS_CLIENT_ID` / `QUICKBOOKS_CLIENT_SECRET`   | QuickBooks           |
| `DOCUSIGN_CLIENT_ID` / `DOCUSIGN_CLIENT_SECRET`       | DocuSign             |

---

## Silent Failure Repair Plan (Phase 6)

This is the most important phase. Without it, working keys still produce misleading UI.

### The Pattern to Fix

**Current (bad):**

```typescript
// Catch returns null/empty, caller can't distinguish "no data" from "API failed"
try {
  const result = await fetch(apiUrl)
  if (!result.ok) return null
  return result.json()
} catch {
  return null
}
```

**Target (good):**

```typescript
// Return structured result, caller can show proper error state
try {
  const result = await fetch(apiUrl)
  if (!result.ok) {
    console.error(`[spoonacular] HTTP ${result.status}: ${result.statusText}`)
    return { data: null, error: `API returned ${result.status}` }
  }
  return { data: await result.json(), error: null }
} catch (err) {
  console.error('[spoonacular] Network error:', err)
  return { data: null, error: 'Service unreachable' }
}
```

**The caller then decides:** show error state (toast, inline message, "could not check") instead of pretending data doesn't exist.

### Files to Fix (7 integration files + 8-10 caller files)

**Total blast radius: 15-17 files.** Every caller of a changed function must be updated or the build breaks. All callers are listed explicitly below.

#### PRIORITY 1: Safety-Critical (2 integration files + 4 caller files)

| Integration File                 | Function(s)                                                                         | Current Failure                                   | Required Fix                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/nutrition/edamam.ts`        | `analyzeRecipe()`                                                                   | Returns `null` (UI shows zero allergens)          | Return `{ data: null, error }`.                                                                                                |
| `lib/grocery/pricing-actions.ts` | `getSpoonacularPrice()`, `getKrogerPrice()`, `getKrogerToken()`, `getMealMePrice()` | All return `null` (stale prices shown as current) | Return `{ cents: null, error, source }`. Update internal aggregation in `runGroceryPriceQuote()` to track which sources failed |

| Caller File                                     | What to Update                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lib/recipes/allergen-actions.ts`               | `detectAllergens()`: change `if (!result)` to `if (!result.data)`, show "Allergen check unavailable" on `result.error` |
| `components/events/grocery-quote-panel.tsx`     | Update to show which pricing sources failed, not just overall success/fail                                             |
| `lib/ai/agent-actions/grocery-actions.ts`       | Update null check on `runGroceryPriceQuote()` result                                                                   |
| `app/(chef)/events/[id]/grocery-quote/page.tsx` | Update `.catch(() => null)` pattern on `getLatestGroceryQuote()`                                                       |

#### PRIORITY 2: Operational Impact (3 integration files + 4-6 caller files)

| Integration File             | Function(s)                                                        | Current Failure                               | Required Fix                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/weather/open-meteo.ts`  | `getEventWeather()` returns `null`, `fetchForecast()` returns `[]` | Empty data indistinguishable from API failure | `getEventWeather()`: return `{ data: null, error }`. `fetchForecast()`: return `{ forecasts: [], error }` (additive error field on array return, NOT changing to object-with-null) |
| `lib/geo/public-location.ts` | `resolvePublicLocationQuery()`                                     | Returns `null` silently on all failures       | Return `{ data: null, error }`. Add `console.warn` on every catch block                                                                                                            |
| `lib/ocr/ocr-space.ts`       | `scanReceipt()`, `scanReceiptFromBuffer()`                         | Returns `null`, console logs only             | Return `{ text: null, error }`                                                                                                                                                     |

| Caller File                         | What to Update                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `lib/weather/weather-actions.ts`    | Update 2 call sites for `getEventWeather()` and 1 for `fetchForecast()`        |
| `lib/directory/location-actions.ts` | Update `resolvePublicLocationQuery()` null check to handle `{ data, error }`   |
| `lib/booking/match-chefs.ts`        | Update `resolvePublicLocationQuery()` null check                               |
| `lib/expenses/receipt-actions.ts`   | Update `scanReceiptFromBuffer()` null check, surface "OCR service unavailable" |

**NOTE:** Additional callers of `resolvePublicLocationQuery()` may exist in `lib/discovery/actions.ts` and `lib/directory/location-search.ts`. Builder must grep to confirm and update all callers.

#### PRIORITY 2b: Remy Message Fixes (2 files, internal only, NO return type changes)

These do NOT change return types. They change the message Remy generates when all upstream calls fail.

| File                         | Current Behavior                                                                                                                                      | Required Fix                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-weather.ts`     | When all `geocodeLocation()` calls return `null`, loop skips silently. `getWeatherAlerts()` returns empty array. Remy says "No weather concerns"      | Add a check: if ALL geocoding failed (not just some), append an alert saying "Could not check weather for your upcoming events (location lookup failed)" instead of returning empty |
| `lib/ai/remy-travel-time.ts` | When all `getDrivingTime()` calls return `null`, loop skips silently. `getTravelEstimates()` returns empty array. Remy says "No scheduling conflicts" | Add a check: if ALL routing failed, append an estimate saying "Could not verify travel times between events (routing service unavailable)" instead of returning empty               |

**Why these are separate:** The return type stays `Alert[]` / `Estimate[]`. The fix is adding a synthetic alert/estimate entry when the underlying service is down, so Remy's message is honest. No callers need updating.

#### PRIORITY 3: Nutrition Analysis (1 integration file + 0 caller files)

| Integration File                    | Function(s)            | Current Failure                                          | Required Fix                                                                                                                                                |
| ----------------------------------- | ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/nutrition/analysis-actions.ts` | `fetchDishNutrition()` | Returns `null`, caller inserts row with `calories: null` | Return `{ data: null, error }`. `analyzeMenuNutrition()` (same file) must pass error reason in its return object so UI can show which dishes failed and why |

**No external caller changes needed.** `analyzeMenuNutrition()` already returns `{ analyzed, failed }` counts. Add an `errors: string[]` field to the return type.

#### CONFIRMED DEAD CODE: Wine Pairing (0 files to fix)

| File                           | Status                                                                                                                             | Action                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/wine/spoonacular-wine.ts` | `getWinePairing()`, `getDishPairing()`, `getWineDescription()` have **zero imports** anywhere in the codebase (confirmed via grep) | Do NOT fix error handling. Flag in report for developer decision: delete the file or build UI to consume it. Do not delete without explicit developer approval |

### Reference Implementation

Use `lib/integrations/yelp/yelp-sync.ts` as the gold standard. It:

- Throws on HTTP failure (not return null)
- Persists errors to DB (`last_error` field)
- Returns `{ error: message }` to caller
- Caller can show real error state

---

## Diagnostic Script Spec (`scripts/api-health-check.ts`)

### Behavior

```bash
npm run api:health
```

1. Loads env vars using `dotenv` (reads `.env.local` since script runs outside Next.js)
2. For each of the 53 integrations:
   - **Step 1:** Check if required env vars are present, non-empty, and not placeholder text
   - **Step 2:** If present, make a minimal read-only API call (never write/send/create)
   - **Step 3:** Report result: `PASS`, `FAIL` (with error detail), `NOT_CONFIGURED` (env var missing), `EMPTY` (env var is empty string), or `CONFIG_ONLY` (OAuth, can't auto-test)
3. **Special checks:**
   - Stripe: specifically test for empty string values (`""`)
   - USDA: flag if using DEMO_KEY fallback
   - Social: if any platform configured but `SOCIAL_TOKEN_ENCRYPTION_KEY` missing, flag CRITICAL
   - Twilio: flag if `TWILIO_FROM_NUMBER` and `TWILIO_PHONE_NUMBER` have different values or only one is set
4. Print a color-coded summary table to stdout
5. Write detailed results to `docs/api-integration-health-report.md`

### Output Format

```
==============================================
  ChefFlow API Integration Health Check
  2026-03-27
==============================================

MAPS & LOCATION
  [PASS] Google Maps/Places      Autocomplete API responding (key: AIza...K4lM)
  [MISS] Mapbox                  NEXT_PUBLIC_MAPBOX_TOKEN not set
  [MISS] Geocodio                GEOCODIO_API_KEY not set
  [PASS] Open-Meteo              Forecast API responding (free, no key)
  [PASS] OSRM                    Routing API responding (free, no key)
  [PASS] OpenStreetMap           Embed URL accessible
  [PASS] IP-API                  Geolocation responding
  [PASS] REST Countries          API responding

FOOD & GROCERY
  [MISS] Spoonacular             SPOONACULAR_API_KEY not set
  [MISS] Kroger                  KROGER_CLIENT_ID not set
  [MISS] MealMe                  MEALME_API_KEY not set
  [MISS] Instacart               INSTACART_API_KEY not set
  [WARN] USDA FDC                Using DEMO_KEY (30 req/hr limit)
  [MISS] Edamam                  EDAMAM_APP_ID not set

COMMUNICATION
  [PASS] Resend                  API key valid, domain verified
  [MISS] Twilio                  TWILIO_ACCOUNT_SID not set
  [MISS] OneSignal               ONESIGNAL_REST_API_KEY not set
  [PASS] Gmail                   OAuth configured (requires user grant)

FINANCIAL
  [EMTY] Stripe                  Keys are empty strings - payments non-functional
  [MISS] Square                  SQUARE_APPLICATION_ID not set
  [MISS] QuickBooks              QUICKBOOKS_CLIENT_ID not set
  [MISS] DocuSign                DOCUSIGN_CLIENT_ID not set
  [MISS] API Ninjas              API_NINJAS_KEY not set
  [PASS] Frankfurter             Currency API responding (free)

AI PROVIDERS
  [PASS] Ollama                  Running, 3 models available
  [PASS] Gemini                  API key valid
  [PASS] Groq                    API key valid, 8 models available
  [PASS] Cerebras                Key format valid
  [PASS] Mistral                 API key valid
  [PASS] SambaNova               Key format valid
  [PASS] GitHub Models           PAT format valid

CONTENT & MEDIA
  [MISS] OCR.space               OCR_SPACE_API_KEY not set
  [MISS] Unsplash                UNSPLASH_ACCESS_KEY not set
  [MISS] Pexels                  PEXELS_API_KEY not set
  [MISS] Cloudinary              NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set
  [PASS] LibreTranslate          Translation API responding (free)

REVIEWS
  [MISS] Yelp                    YELP_API_KEY not set

SOCIAL MEDIA
  [MISS] Instagram/Facebook      META_APP_ID not set
  [MISS] TikTok                  TIKTOK_CLIENT_KEY not set
  [MISS] X/Twitter               X_CLIENT_ID not set
  [MISS] LinkedIn                LINKEDIN_CLIENT_ID not set
  [MISS] Pinterest               PINTEREST_APP_ID not set
  [MISS] YouTube                 YOUTUBE_CLIENT_ID not set
  [CRIT] Social Encryption       SOCIAL_TOKEN_ENCRYPTION_KEY not set (will crash on OAuth)

SECURITY
  [MISS] Turnstile               TURNSTILE_SECRET_KEY not set (bot protection disabled)

MISCELLANEOUS
  [PASS] Nager.Date              Holiday API responding (free)
  [PASS] ProPublica              Nonprofit API responding (free)
  [PASS] WFP RSS                 RSS feed accessible (free)
  [MISS] Tavily                  TAVILY_API_KEY not set (DuckDuckGo fallback active)
  [MISS] Inngest                 INNGEST_EVENT_KEY not set (background jobs no-op)
  [CONF] Zapier                  ZAPIER_SUBSCRIBE_API_KEY not set
  [OPTN] Sentry                  Not configured (optional)
  [OPTN] PostHog                 Not configured (optional)

==============================================
SUMMARY: 19 PASS | 1 FAIL | 1 EMPTY | 28 MISS | 3 CONF | 2 OPTN | 1 WARN | 1 CRIT
==============================================

CRITICAL:
  1. SOCIAL_TOKEN_ENCRYPTION_KEY: Missing. Social OAuth will crash on token save.

FAILURES:
  (none with keys present - all failures are missing keys)

EMPTY KEYS:
  1. Stripe: All 3 keys are empty strings. Payments are non-functional.

WARNINGS:
  1. USDA: Using DEMO_KEY fallback (30 req/hr). Get free key: fdc.nal.usda.gov

MISSING KEYS (developer must add to .env.local):
  Copy the block below and fill in values:

  # --- PAYMENTS ---
  STRIPE_SECRET_KEY=sk_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_WEBHOOK_SECRET=whsec_...

  # --- FOOD & GROCERY ---
  SPOONACULAR_API_KEY=
  KROGER_CLIENT_ID=
  KROGER_CLIENT_SECRET=
  ...
```

### Script Rules

- **Never send real messages** (no SMS, no emails, no push notifications)
- **Never create real data** (no Stripe charges, no DocuSign envelopes, no social posts)
- **Read-only API calls only** (list, search, validate, health check)
- **Timeout each check at 10 seconds**
- **Run sequentially** to avoid rate limit issues across services
- **Report rate limit info** when available (Spoonacular daily remaining, etc.)
- **Mask API keys in output** (show first 4 + last 4 chars only: `AIza...K4lM`)
- **Use dotenv** to load `.env.local` since script runs outside Next.js
- **Detect empty strings** (Stripe case) separately from undefined/missing

---

## Session 1: Detailed Execution Plan

### Phase 1: Inventory and Diagnosis (read-only)

1. Read `.env.local` and catalog every env var: SET, MISSING, or EMPTY
2. For every integration in this spec, read the library file and trace the wiring chain
3. For every env var that IS set, make a test API call to verify the key works
4. Document findings

### Phase 2: Fix Known Broken Wiring

5. **Google Maps Places** (priority - known broken):
   - Read `components/ui/address-autocomplete.tsx` and trace the `@react-google-maps/api` loading
   - Check if the Places API version matches what the code expects
   - Test with the existing key in `.env.local`
   - If it's a Google Cloud Console config issue (referrer restrictions, API not enabled), document what the developer needs to change in the console
   - If it's a code issue, fix it

6. **Fix 4 type errors** (adjacent to integration code, prevents runtime crashes):
   - `app/api/documents/consolidated-grocery/route.ts` - AuthUser missing `name`
   - `app/(chef)/recipes/dump/recipe-dump-client.tsx` - null vs undefined
   - `components/onboarding/recipe-entry-form.tsx` - RecipeListItem missing fields
   - `components/recipes/recipe-batch-import.tsx` - error property on union type

7. **Update outdated SDK packages** (11 minor/patch updates, all non-breaking):
   - Stripe, Resend, Inngest, @google/genai, @sentry/nextjs, @stripe/stripe-js, @stripe/react-stripe-js, posthog-js, etc.
   - Run `npm update` for patch/minor only. Do NOT jump major versions.

### Phase 3: Build Health Check Script

8. Create `scripts/api-health-check.ts` per the diagnostic script spec above
9. Add `"api:health"` script to `package.json`
10. Run it and capture initial baseline results

### Phase 4: Generate Missing Keys Report

11. Generate a clean, copy-pasteable `.env.local` block with every missing env var, grouped by category
12. For each missing key, include:
    - Where to get it (signup URL or dashboard link)
    - Free tier limits
    - Whether it's blocking a user-visible feature
13. Write `docs/api-integration-health-report.md` with Session 1 results
14. Commit everything and push

**Session 1 ends here. Developer adds missing keys to `.env.local`.**

---

## Session 2: Detailed Execution Plan

### Phase 5: Verify Every Key

1. Run `npm run api:health` with new keys in place
2. For each FAIL result: diagnose the specific issue (expired key, wrong tier, endpoint changed)
3. Report any keys that don't work so the developer can fix them

### Phase 6: Fix Silent Failure Patterns (7 integration files + 8-10 caller files)

1. Apply the structured error return pattern to all files listed in the Silent Failure Repair Plan above
2. Priority 1 (safety-critical) first: `edamam.ts`, `pricing-actions.ts` + their callers (`allergen-actions.ts`, `grocery-quote-panel.tsx`, `grocery-actions.ts`, `grocery-quote/page.tsx`)
3. Priority 2 (operational) next: `open-meteo.ts`, `public-location.ts`, `ocr-space.ts` + their callers (`weather-actions.ts`, `location-actions.ts`, `match-chefs.ts`, `receipt-actions.ts`)
4. Priority 2b (Remy internal): `remy-weather.ts`, `remy-travel-time.ts` (internal message fixes only, no return type changes, no caller updates)
5. Confirmed dead code: `spoonacular-wine.ts` (zero imports). Flag in report, do NOT delete without developer approval
6. For each file, verify the UI component that consumes the data handles the new error state properly (shows error message, not empty data). Reference `lib/integrations/yelp/yelp-sync.ts` as the gold standard pattern

### Phase 7: Unify Env Var Inconsistencies

1. **Twilio:** Pick `TWILIO_FROM_NUMBER` as canonical name (used in 2 of 3 files). In `lib/sms/twilio-client.ts`, change to read `TWILIO_FROM_NUMBER` (or add fallback: `process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER`). Update `.env.local.example`.
2. **Wine pairing:** Grep for imports of `getWinePairing`, `getDishPairing`, `getWineDescription`. If no callers, flag as dead code in report. Do NOT delete without developer approval.

### Phase 8: UI Verification with Playwright

1. Ensure dev server is running on port 3100. Sign in with agent account.
2. For every integration that now has a working key, navigate to the UI page that consumes it:

| Integration        | Page to Visit                 | What to Verify                                                 |
| ------------------ | ----------------------------- | -------------------------------------------------------------- |
| Google Maps        | Event creation form           | Address autocomplete shows suggestions                         |
| Grocery Quote      | Event detail -> grocery tab   | Pricing loads from APIs, not just recipe-book fallback         |
| Allergen Detection | Recipe detail page            | Allergen badges appear (or "check unavailable" if key missing) |
| Weather            | Event calendar / event detail | Weather panel shows forecast                                   |
| Receipt OCR        | Expenses -> scan receipt      | Upload test image, verify text extraction                      |
| Currency           | Invoice / pricing pages       | Currency conversion hint appears                               |
| Translation        | Menu detail -> translate      | Translate button works                                         |
| Yelp Reviews       | Settings -> Yelp              | Review sync loads                                              |

3. Screenshot each verification. Flag any integration where the key works but the UI doesn't show the data

### Phase 9: Generate Final Report

1. Re-run `npm run api:health` for final results
2. Update `docs/api-integration-health-report.md` with:
   - Final pass/fail for every integration
   - Silent failures fixed (list files changed)
   - Rate limit budgets per service
   - Known issues requiring developer action
   - Follow-up tasks (circuit breaker coverage, USDA module consolidation, Redis caching)
3. Commit everything and push

---

## Edge Cases and Error Handling

| Scenario                                               | Correct Behavior                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| API key present but expired/revoked                    | Report FAIL with "key rejected by API - HTTP {status}"           |
| API key present but wrong service tier                 | Report WARN with tier info (e.g., "free tier, limited to X/day") |
| API endpoint changed or deprecated                     | Report FAIL with HTTP status and response body snippet           |
| Network timeout                                        | Report FAIL with "timeout after 10s - service unreachable"       |
| Key in env but code reads wrong var name               | Report FAIL with "env var mismatch: code reads X, env has Y"     |
| OAuth integration (no direct key test)                 | Report CONFIG_ONLY with env var presence check                   |
| Free service, no key needed                            | Report PASS/FAIL based on endpoint reachability                  |
| Key exists but value is empty string                   | Report EMPTY with "key is empty string" (Stripe case)            |
| Multiple env vars for same service, some set, some not | Report WARN listing which are set and which aren't               |
| DEMO_KEY fallback active                               | Report WARN with "using fallback, limited to X req/hr"           |
| Social platform configured but encryption key missing  | Report CRITICAL with "will crash on OAuth token save"            |

---

## Out of Scope

- Rotating or regenerating API keys (developer handles this)
- Building new integrations not already in the codebase
- Testing OAuth flows end-to-end (requires browser-based user consent)
- Load testing or rate limit stress testing
- Moving hardcoded keys to env vars (separate security task)
- Consolidating the three USDA modules (flag in report, separate refactor)
- Adding circuit breakers to uncovered integrations (flag in report, separate task)
- Setting up Upstash Redis for persistent caching (flag in report, separate infrastructure task)

---

## Follow-Up Tasks (Document in Report, Do Not Execute)

These are issues found during research that are out of scope but should be tracked:

1. **USDA module consolidation:** Three files (`usda.ts`, `usda-client.ts`, `usda-fdc.ts`) do similar things with different interfaces. Should be consolidated into one.
2. **Circuit breaker coverage:** 8+ integrations lack circuit breaker wrapping. Add to `lib/resilience/circuit-breaker.ts`.
3. **Persistent caching:** In-memory cache resets on deploy. Consider adding Upstash Redis for expensive API responses (Edamam, USDA, Geocodio).
4. **Wine pairing UI:** If `getWinePairing()` etc. are confirmed orphaned, either build the UI or remove the code.
5. **Twilio number audit:** Confirm whether `TWILIO_FROM_NUMBER` and `TWILIO_PHONE_NUMBER` should be the same value or different (SMS vs voice).
6. **Gemini vision privacy:** `lib/ai/parse-document-vision.ts` sends client info to Gemini because Ollama can't do vision on 6GB VRAM. Documented in AI_POLICY.md but should be revisited when local vision models improve.

---

## Notes for Builder Agent

- **Start with Google Maps Places fix in Session 1.** This is the known regression and the developer's primary concern. Fix it first, verify it works, then proceed systematically.
- **Read each integration file before testing.** Understand the full chain before making API calls.
- **Check for silent failures DURING Phase 2, not just Phase 6.** If you notice a catch block returning null while reading a file for key verification, note it for Phase 6.
- **The `.env.local` is missing 30+ keys.** The developer says they have them. After Phase 1 diagnosis, generate the exact template so the developer can paste them in. Do NOT guess or fabricate keys.
- **Some integrations are OAuth-based** (Square, QuickBooks, DocuSign, social platforms). You can only verify config, not full auth flow. Mark these as CONFIG_ONLY.
- **Free services can still break** if their endpoints move or go down. Test every one.
- **Use Yelp sync as the reference pattern** for how error handling should work in all integrations.
- **The `SOCIAL_TOKEN_ENCRYPTION_KEY` is critical.** Without it, any social platform OAuth connection will crash on token save. Flag this prominently.
- **Stripe keys are empty strings, not missing.** Test for this specifically. `""` behaves differently than `undefined` in JavaScript.
- **Caching is in-memory only.** Don't assume persistence. Rate limit budgets reset on restart.
- **The AI dispatch layer doesn't exist.** Don't reference `lib/ai/dispatch/` as a real directory.
