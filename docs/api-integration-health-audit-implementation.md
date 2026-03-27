# API Integration Health Audit - Implementation Notes

> Built: 2026-03-27
> Spec: `docs/specs/api-integration-health-audit.md`

## What Was Done

### Silent Failure Fixes (7 integration files + 10 caller files)

All integration functions that returned `null` on failure now return `{ data, error }` structured results so callers can distinguish "no data exists" from "API failed."

| File                                | Function                                   | Before               | After                                               |
| ----------------------------------- | ------------------------------------------ | -------------------- | --------------------------------------------------- |
| `lib/nutrition/edamam.ts`           | `analyzeRecipe()`                          | `null` on failure    | `{ data: null, error: string }`                     |
| `lib/weather/open-meteo.ts`         | `fetchForecast()`                          | `[]` on failure      | `{ forecasts: [], error: string }`                  |
| `lib/weather/open-meteo.ts`         | `getEventWeather()`                        | `null` on failure    | `{ data: null, error: string }`                     |
| `lib/geo/public-location.ts`        | `resolvePublicLocationQuery()`             | `null` on failure    | `{ data: null, error: string }`                     |
| `lib/ocr/ocr-space.ts`              | `scanReceipt()`, `scanReceiptFromBuffer()` | `null` on failure    | `{ text: null, error: string }`                     |
| `lib/grocery/pricing-actions.ts`    | All pricing functions                      | Silent null          | Added `console.error` logging                       |
| `lib/nutrition/analysis-actions.ts` | `analyzeMenuNutrition()`                   | Just counts failures | Returns `errors[]` array + early exit if no API key |

### Caller Files Updated

- `lib/recipes/allergen-actions.ts` - unwrap `.data` from edamam result
- `lib/weather/weather-actions.ts` - use `.forecasts` and `.data` patterns
- `lib/expenses/receipt-actions.ts` - check `.error` then `.text` from OCR
- `lib/booking/match-chefs.ts` - unwrap `.data` from location result
- `app/(public)/chefs/page.tsx` - unwrap `.data`, surface error message
- `lib/discovery/actions.ts` - unwrap `.data` from location result
- `lib/directory/location-search.ts` - unwrap `.data` inline
- `components/events/weather-panel.tsx` - unwrap `.data` from weather result
- `app/(chef)/events/[id]/pack/page.tsx` - unwrap `.data` from weather result
- `lib/ai/remy-proactive-alerts.ts` - use `.alerts` from weather result

### Remy Message Honesty (Phase 7)

Both Remy weather and travel time functions now track `checkedCount` and `failedCount`:

- `getWeatherAlerts()` returns `{ alerts, checkedCount, failedCount }`
- `formatWeatherAlerts()` no longer says "Clear skies ahead!" when APIs fail
- `getTravelEstimates()` returns `{ estimates, checkedCount, failedCount }`
- `formatTravelEstimates()` no longer says "You're good!" when geocoding fails

### Google Maps Error Handling (Phase 2)

Four components now detect `loadError` from `useJsApiLoader` and fall back gracefully:

- `components/ui/address-autocomplete.tsx` - falls back to plain text input
- `components/ui/location-autocomplete.tsx` - falls back to plain text input
- `components/ui/store-autocomplete.tsx` - falls back to plain text input
- `components/ui/location-map.tsx` - falls back to OpenStreetMap

### Twilio Env Var Unification (Phase 9)

`lib/sms/twilio-client.ts` now reads `TWILIO_FROM_NUMBER || TWILIO_PHONE_NUMBER`, resolving the inconsistency where `send.ts` and `twilio-client.ts` read different env vars.

### Health Check Script (Phase 3)

New `scripts/api-health-check.ts` checks all integrations:

- Run: `npm run api:health`
- Checks env vars, makes minimal read-only API calls
- Outputs color-coded terminal report + writes `docs/api-integration-health-report.md`
- Special checks: Stripe empty keys, USDA DEMO_KEY, Twilio var mismatch

### Type Error Fixes (Phase 4)

- `app/api/documents/consolidated-grocery/route.ts` - cast user.name, wrap Buffer as Uint8Array
- `app/(chef)/recipes/dump/recipe-dump-client.tsx` - null to undefined for optional param
- `components/recipes/recipe-batch-import.tsx` - narrow discriminated union before accessing .error
- `components/onboarding/recipe-entry-form.tsx` - add missing family_id, variation_label, family_name

## Files Changed

~25 files modified across lib/, components/, app/, scripts/. See git diff for full list.

## Health Check Results

14 PASS, 2 FAIL (Resend 401, Groq 403), 1 EMPTY (Stripe), 29 MISS, 2 CONF, 2 OPTN, 1 WARN (USDA DEMO_KEY).
Full report: `docs/api-integration-health-report.md`
