# Phase 1: Marketplace + Multi-Currency + i18n Foundation

## What Changed

### Migration (`20260331000049`)

- **`chefs` table**: Added `preferred_currency` (TEXT, default 'USD') and `preferred_locale` (TEXT, default 'en-US')
- **`ledger_entries` table**: Added `currency_code` (TEXT, default 'USD') and `exchange_rate_to_base` (NUMERIC, default 1.0)
- **`marketplace_profiles`**: Cross-tenant client identity. One row per auth user. Stores preferences (cuisines, dietary, allergies, location). Links to legacy `clients` via `primary_client_id` and to dinner circle hub via `hub_profile_id`.
- **`marketplace_client_links`**: Maps one marketplace profile to N tenant-scoped client records. UNIQUE on `(marketplace_profile_id, tenant_id)`.
- **`chef_marketplace_profiles`**: Enriched public search data for the marketplace. Full-text search via tsvector + GIN index. Public read access via RLS.

### Auth (`lib/auth/get-user.ts`)

- **`requireMarketplaceClient()`**: Returns `MarketplaceUser` with marketplace profile ID and all linked tenants. Auto-creates marketplace profile if needed.
- **`requireClientForTenant(tenantId)`**: Validates client has relationship with specific chef, returns tenant-scoped `AuthUser`. Fast path for legacy single-tenant clients.

### Currency

- **`lib/currency/resolve.ts`**: `getChefCurrency(tenantId)` and `getChefLocale(tenantId)` with `unstable_cache` (tag: `chef-currency`). Validates against `SUPPORTED_CURRENCIES`.
- **`lib/utils/currency.ts`**: `formatCurrency()` now accepts optional `locale` parameter (defaults to 'en-US' for backwards compatibility with 226+ callers).
- **`lib/ledger/append.ts`**: `AppendLedgerEntryInput` type now includes optional `currency_code` and `exchange_rate_to_base`. Passed through to DB insert.

### i18n

- **`next-intl` v4.8.3** installed
- **`next.config.js`**: Wrapped with `createNextIntlPlugin('./i18n/request.ts')`
- **`i18n/request.ts`**: Cookie-based locale resolution. Priority: `chefflow-locale` cookie > Accept-Language header > 'en'. Supports: en, es, fr, pt, de, it, ja.
- **`messages/en.json`**: Tier 1 strings (~90 keys). Namespaces: common, nav, status, finance, auth, marketplace, settings.

### Backfill

- **`scripts/backfill-marketplace-profiles.ts`**: Run after migration to create marketplace_profiles + links for existing clients, and chef_marketplace_profiles for approved chefs. Idempotent (safe to re-run).

## What Didn't Change

- `requireClient()` and `requireChef()` are untouched (zero breaking changes)
- `user_roles` UNIQUE constraint preserved
- All 226 existing `formatCurrency()` callers work identically (default params)
- No URL structure changes (cookie-based i18n, no `/[locale]` prefix)

## Cache Invalidation

- When chef updates currency/locale in settings: `revalidateTag('chef-currency')` must be called
- `getChefCurrencyConfig` has 5-min TTL fallback

## Next Steps (Phase 2-3)

1. Fix 3 Stripe files to use `getChefCurrency()` instead of hardcoded 'usd'
2. Build `/marketplace` search page
3. Build `/marketplace/[chefSlug]` enhanced profile
4. Integrate locale detection into middleware
5. Extract Tier 2 i18n strings (dashboard, events, clients)
6. Add Regional settings section (currency + language selector)
