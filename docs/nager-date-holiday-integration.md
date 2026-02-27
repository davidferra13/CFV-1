# Nager.Date Holiday API Integration — Pricing Engine

**Date:** 2026-02-26
**Branch:** `feature/risk-gap-closure`

## What Changed

Wired the free [Nager.Date public holiday API](https://date.nager.at/) into ChefFlow's deterministic pricing engine to improve accuracy of floating holiday detection.

### Problem

The pricing engine (`lib/pricing/compute.ts`) has hardcoded heuristics for floating holidays — Thanksgiving (4th Thursday of November), Easter (Gregorian algorithm), Mother's Day (2nd Sunday of May), etc. These heuristics work well for most cases, but:

- Easter detection used a +/- 1 day fuzzy match, which could miss exact dates or produce false positives
- Mother's Day, Father's Day, Memorial Day, and Labor Day relied on day-of-week math that is correct but untested for edge cases across many years
- No way to catch new public holidays or date corrections without code changes

### Solution

**Pattern: Formula > AI** — the hardcoded holiday arrays remain the PRIMARY source of truth. Nager.Date is a supplemental validation layer.

#### New File: `lib/pricing/holiday-cache.ts`

- In-memory cache that fetches holidays from Nager.Date API once per year
- 24-hour TTL (holidays don't change mid-year)
- Provides synchronous lookups after initial async warm-up
- Normalizes Nager.Date holiday names to our internal names (e.g., "Thanksgiving Day" -> "Thanksgiving")
- Non-blocking: if the API fails, returns empty and hardcoded logic takes over

#### Modified File: `lib/pricing/compute.ts`

- `computePricing()` now warms the holiday cache before Step 5 (holiday detection) — wrapped in try/catch, non-blocking
- `detectHoliday()` enhanced:
  - **Fixed holidays** (Christmas, July 4th, etc.): unchanged — hardcoded logic is already perfect
  - **Floating holidays** (Thanksgiving, Easter, etc.): if cache is warm, uses API data to verify dates. If cache is not warm, falls back to existing hardcoded heuristics
- `detectHolidayProximity()` enhanced:
  - After scanning with `detectHoliday()` (which now uses the cache internally), also checks the cache for holidays the hardcoded list might have missed
  - New helper `resolveCachedHolidayTier()` maps Nager.Date holiday names back to our Tier 1/2/3 system

### How It Works

```
Event date provided (e.g., "2026-11-26")
  |
  v
warmHolidayCache(2026)  <-- async, non-blocking
  |
  v
detectHoliday("2026-11-26")
  |
  +-- Fixed holiday? --> hardcoded match (month/day)
  |
  +-- Floating holiday + cache warm? --> check Nager.Date cache
  |     |
  |     +-- API says YES --> confirmed match, return tier
  |     +-- API says NO  --> skip (hardcoded heuristic would have been wrong)
  |
  +-- Floating holiday + cache NOT warm? --> fall back to hardcoded heuristic
```

### What Did NOT Change

- The hardcoded `TIER_1_HOLIDAYS`, `TIER_2_HOLIDAYS`, `TIER_3_HOLIDAYS` arrays are untouched
- The `PricingBreakdown` type is untouched
- The `constants.ts` file is untouched
- The `nager-date.ts` utility file is untouched (used as-is)
- All existing pricing behavior is preserved when the API is unavailable

### Testing

- **API available:** Floating holidays will be verified against Nager.Date. If a hardcoded heuristic would have returned a false positive (wrong date for Easter, etc.), the cache corrects it.
- **API unavailable:** Behavior is identical to before this change. Hardcoded heuristics handle everything.
- **Cache TTL:** 24 hours. After TTL expires, next `computePricing()` call re-fetches. This is fast (single HTTP GET, ~200ms).

### Files

| File                                     | Change                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| `lib/pricing/holiday-cache.ts`           | **NEW** — in-memory cache with Nager.Date integration |
| `lib/pricing/compute.ts`                 | Enhanced holiday detection with cache fallback        |
| `docs/nager-date-holiday-integration.md` | **NEW** — this document                               |
