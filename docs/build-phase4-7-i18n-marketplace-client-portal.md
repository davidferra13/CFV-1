# Build Phase 4-7: i18n Core, Inquiry Flow, Client Portal, Cleanup

**Date:** 2026-03-11
**Branch:** feature/risk-gap-closure

## What Changed

### Phase 4: i18n Core

- **Middleware locale detection** (`middleware.ts`): Resolves locale from `chefflow-locale` cookie > Accept-Language header > 'en'. Sets `x-locale` request header for downstream use.
- **Route policy fix** (`lib/auth/route-policy.ts`): Moved `/marketplace` from chef-protected to public-unauthenticated paths (marketplace must be browsable without auth). Added `/my-chefs` to client-protected paths.
- **7 translation files** (`messages/`): en, es, fr, pt, de, it, ja. Tier 1 strings covering common UI, nav, status, finance, auth, marketplace, and settings namespaces (~120 keys each).
- **Date formatting utility** (`lib/utils/date-format.ts`): Locale-aware date formatting using date-fns locale support. Maps locale codes to date-fns locale objects for 7 languages.
- **Email i18n** (`lib/email/i18n.ts`): Simple lookup function for email template strings. Covers 7 languages with 24 common email strings (greetings, labels, actions).
- **Remy multilingual** (`lib/ai/remy-personality.ts`): Added `REMY_LANGUAGE_DIRECTIVE()` function. When chef's locale is non-English, injects a language directive into the system prompt. Action labels stay English (map to code paths).

### Phase 5: Multi-Chef Inquiry Flow

- **Marketplace inquiry page** (`app/(public)/marketplace/[chefSlug]/inquire/`): Full inquiry form with name, email, phone, event date, guest count, occasion, cuisine preferences, dietary restrictions, message. Loads chef data by slug. Shows success state after submission.
- **Marketplace inquiry actions** (`lib/marketplace/inquiry-actions.ts`): `submitMarketplaceInquiry()` creates/finds client record, creates inquiry, upserts marketplace_client_links for authenticated users.
- **Signup marketplace integration** (`lib/auth/actions.ts`): `signUpClient()` now creates marketplace_profiles and marketplace_client_links (non-blocking side effect).
- **Public inquiry marketplace integration** (`lib/inquiries/public-actions.ts`): `submitPublicInquiry()` now upserts marketplace_client_links when the submitter has an existing auth account (non-blocking).

### Phase 6: Cross-Chef Client Portal

- **Cross-tenant actions** (`lib/marketplace/cross-tenant-actions.ts`): `getCrossChefEvents()`, `getCrossChefInquiries()`, `getLinkedChefs()` for querying data across all linked chefs.
- **My Chefs page** (`app/(client)/my-chefs/page.tsx`): Grid of chef cards showing name, image, cuisine types, total events, last event date. Links to marketplace profiles. Empty state with "Browse Chefs" CTA.
- **Chef switcher** (`components/client/chef-switcher.tsx`): Dropdown component for switching active chef context. Sets `chefflow-active-tenant` cookie.

### Phase 7: Cleanup

- All translation files (7 languages) created
- Email i18n lookup covering 7 languages
- Date formatting with locale support
- Remy multilingual directive

## Architecture Notes

- Marketplace profiles are created as non-blocking side effects during signup and inquiry submission. Failure never blocks the main operation.
- Cross-tenant queries use admin client to bypass per-tenant RLS. The marketplace auth layer (`requireMarketplaceClient()`) validates the user owns the profile.
- Cookie-based locale detection avoids breaking all 772 existing page routes (no URL prefix needed).
- next-intl falls back to English for untranslated keys, enabling safe incremental extraction.
