# Free API Integrations — ChefFlow V1

> **Date:** 2026-02-26
> **Status:** All utilities created, awaiting API key entry for 3 services

## Summary

8 free APIs integrated into ChefFlow. All are free-tier, no credit card required. 5 need no signup at all.

## API Inventory

### No Signup Required (zero friction)

| #   | API             | File                          | What It Does                        | Limits    |
| --- | --------------- | ----------------------------- | ----------------------------------- | --------- |
| 1   | **Open-Meteo**  | `lib/weather/open-meteo.ts`   | Weather forecasts for event days    | 10K/day   |
| 2   | **Nager.Date**  | `lib/holidays/nager-date.ts`  | US holiday detection for pricing    | Unlimited |
| 3   | **Frankfurter** | `lib/currency/frankfurter.ts` | Currency conversion (ECB rates)     | Unlimited |
| 4   | **IP-API**      | `lib/geo/ip-api.ts`           | Auto-detect client timezone from IP | 45/min    |
| 5   | **reSmush.it**  | `lib/images/resmush.ts`       | Image compression for photos        | Unlimited |

### Free API Key Required (email signup, no card)

| #   | API               | File                    | Env Var            | What It Does                               | Limits     |
| --- | ----------------- | ----------------------- | ------------------ | ------------------------------------------ | ---------- |
| 6   | **USDA FoodData** | `lib/nutrition/usda.ts` | `USDA_API_KEY`     | Authoritative nutrition data (380K+ foods) | 1K/hour    |
| 7   | **Geocodio**      | `lib/geo/geocodio.ts`   | `GEOCODIO_API_KEY` | Address → lat/lng, reverse geocode, batch  | 2,500/day  |
| 8   | **API Ninjas**    | `lib/tax/api-ninjas.ts` | `API_NINJAS_KEY`   | Sales tax rates by ZIP code                | 100K/month |

## Key Functions by API

### Open-Meteo (already integrated)

- `getEventWeather(lat, lng, date)` — forecast or historical weather for event day
- Already wired into event detail page via `WeatherPanel`

### Nager.Date — Holiday Detection

- `getPublicHolidays(year, 'US')` — all US holidays for a year
- `checkHoliday(date)` — is this date a holiday? what's the next one?
- `isPremiumHoliday(date)` — should the chef charge surge pricing?

### Frankfurter — Currency

- `getExchangeRates('USD')` — all rates from USD
- `convertCurrency(amount, 'USD', 'EUR')` — convert between currencies
- `formatCurrency(100.50, 'EUR')` — format with correct symbol

### IP-API — Geolocation

- `getGeoFromIp(ip)` — full location data from IP
- `getClientIp(headers)` — extract IP from Next.js request
- `detectTimezone(headers)` — auto-detect IANA timezone

### reSmush.it — Image Compression

- `compressImageByUrl(url, quality)` — compress by public URL
- `compressImageBuffer(buffer, filename, quality)` — compress raw buffer

### USDA FoodData — Nutrition

- `searchFoods(query)` — search 380K+ foods
- `getFoodDetails(fdcId)` — full nutrient profile
- `getNutritionSummary(fdcId)` — simplified macros (cal/protein/fat/carbs)

### Geocodio — Geocoding

- `geocodeAddress(address)` — address to lat/lng
- `reverseGeocode(lat, lng)` — coordinates to address
- `batchGeocode(addresses)` — batch up to 10K addresses

### API Ninjas — Sales Tax

- `getSalesTaxRate(zipCode)` — state/county/city/combined tax rate
- `calculateSalesTax(amountCents, zipCode)` — full tax calculation
- `formatTaxRate(rate)` — display rate as percentage

## Where Each API Fits in ChefFlow

| Feature Area        | API Used      | Integration Point                                |
| ------------------- | ------------- | ------------------------------------------------ |
| Event detail page   | Open-Meteo    | Weather forecast widget (done)                   |
| Event pricing       | Nager.Date    | Holiday surcharge detection                      |
| Quote/invoice       | Frankfurter   | Multi-currency display for international clients |
| New event form      | IP-API        | Pre-fill timezone from client's location         |
| Photo uploads       | reSmush.it    | Compress before storing in Supabase              |
| Recipe/menu builder | USDA FoodData | Nutrition labels for menu items                  |
| Event location      | Geocodio      | Address → coordinates for maps + weather         |
| Invoice/checkout    | API Ninjas    | Auto-calculate sales tax by event ZIP            |

## Architecture Notes

- All utilities follow the same pattern as `lib/weather/open-meteo.ts`
- All use `next: { revalidate: N }` for smart caching
- All fail gracefully (return `null` on error, never throw to callers)
- No-signup APIs use HTTP fetch directly (no keys in headers)
- API-key APIs read from `process.env` and throw if key is missing
- IP-API is HTTP-only (not HTTPS) — must be server-side only

## Signup Links

- USDA: https://fdc.nal.usda.gov/api-key-signup
- Geocodio: https://dash.geocod.io/register
- API Ninjas: https://api-ninjas.com/register
