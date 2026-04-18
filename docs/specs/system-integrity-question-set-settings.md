# System Integrity Question Set: Settings

> 40 questions across 10 domains. Covers all 69 settings pages, sensitive operations, API keys, Stripe, delete account, and cross-system connections.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                             | Answer                                                                                                                                                                                                           | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Do all 69 settings pages gate with `requireChef()` or equivalent?    | Yes. 65 pages call `requireChef()` directly. 3 are client components whose server actions all call `requireChef()`. 1 is a redirect to an auth-gated page. Parent `(chef)/layout.tsx` provides defense-in-depth. | BUILT  |
| 2   | Are developer tools (API keys, webhooks) gated behind feature flags? | Yes. Both `api-keys/page.tsx` and `webhooks/page.tsx` check `hasChefFeatureFlagWithDb(db, user.entityId, CHEF_FEATURE_FLAGS.developerTools)` and redirect to `/settings` if not enabled.                         | BUILT  |
| 3   | Does the Remy settings page require admin access?                    | Yes. `remy/page.tsx` calls `requireAdmin()` instead of `requireChef()`. Non-admin users cannot access Remy configuration.                                                                                        | BUILT  |
| 4   | Do all `[id]` settings pages check ownership via tenant scoping?     | Yes. `journal/[id]`, `journey/[id]`, and `repertoire/[id]` all call `requireChef()` and their data functions filter by `tenant_id`.                                                                              | BUILT  |

## Domain 2: Sensitive Data Protection

| #   | Question                                                            | Answer                                                                                                                                                                        | Status |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Does the API keys page mask full key values?                        | Yes. `getApiKeys()` selects only `key_prefix` (not the full key). Full key shown only once at creation time. Stored keys never returned to client.                            | BUILT  |
| 6   | Does change-password require current password verification?         | Yes. Page description states "You will need to enter your current password for verification." `ChangePasswordForm` client component handles the verification flow.            | BUILT  |
| 7   | Does delete-account use soft-delete with grace period?              | Yes. `delete-account/page.tsx` calls `getAccountDeletionStatus()`. Shows 30-day grace period with countdown, `CancelDeletionCard` for reversal, and pre-deletion checks.      | BUILT  |
| 8   | Does the embed page avoid exposing secrets?                         | Yes. `embed/page.tsx` passes only `chefId` to `EmbedCodePanel`. Generated embed code contains public booking slug, not API keys or auth tokens.                               | BUILT  |
| 9   | Does Stripe Connect show connection status without exposing tokens? | Yes. `stripe-connect/page.tsx` calls `getConnectAccountStatus()` which returns status metadata, not raw Stripe tokens. Client component shows connection state and payout UI. | BUILT  |

## Domain 3: Financial Settings Safety

| #   | Question                                                       | Answer                                                                                                                                                                              | Status |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10  | Does the billing page show accurate subscription status?       | Yes. `billing/page.tsx` calls `getSubscriptionStatus(user.entityId)` which reads from Stripe subscription data. Shows current tier, upgrade CTA, and supporter contribution option. | BUILT  |
| 11  | Does the pricing settings page update pricing safely?          | Yes. `pricing/page.tsx` calls `requireChef()` and pricing action functions validate input with Zod before updating.                                                                 | BUILT  |
| 12  | Does the payment methods page scope to the authenticated chef? | Yes. `payment-methods/page.tsx` calls `requireChef()` and payment method queries filter by tenant.                                                                                  | BUILT  |

## Domain 4: Profile & Public Surfaces

| #   | Question                                                                  | Answer                                                                                                                                     | Status |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 13  | Does the profile page update both internal and public-facing data?        | Yes. `profile/page.tsx` and `my-profile/page.tsx` both call `requireChef()`. Profile updates propagate to public profile and booking page. | BUILT  |
| 14  | Does the public profile page allow preview without publishing?            | Yes. `public-profile/page.tsx` calls `requireChef()`. Separate from live public page, shows preview of what clients see.                   | BUILT  |
| 15  | Does the client preview page show the chef's view of their client portal? | Yes. `client-preview/page.tsx` calls `requireChef()`. Renders a preview of what the client portal looks like for this chef's clients.      | BUILT  |
| 16  | Does the portfolio page manage images with proper auth?                   | Yes. `portfolio/page.tsx` calls `requireChef()`. Image uploads go through auth-gated server actions.                                       | BUILT  |

## Domain 5: Communication & Notification Settings

| #   | Question                                                         | Answer                                                                                                                                                                       | Status |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17  | Does the notifications page load all preference categories?      | Yes. `notifications/page.tsx` fetches `getNotificationPreferences()`, `getSmsSettings()`, `getNotificationExperienceSettings()`, and `getNotificationTierMap()` in parallel. | BUILT  |
| 18  | Does the communication page manage templates and auto-responses? | Yes. `communication/page.tsx` calls `requireChef()` and wraps content in `WidgetErrorBoundary` for resilient loading.                                                        | BUILT  |
| 19  | Does the touchpoints page manage client contact schedules?       | Yes. `touchpoints/page.tsx` calls `requireChef()`. Manages automated client touchpoint rules.                                                                                | BUILT  |

## Domain 6: Integration Settings

| #   | Question                                                              | Answer                                                                                                                                              | Status |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 20  | Does the integrations page show all connected services?               | Yes. `integrations/page.tsx` calls `requireChef()`. Shows Google, Wix, Stripe, calendar sync, platform connections with connection status for each. | BUILT  |
| 21  | Does the calendar sync page handle OAuth connections safely?          | Yes. `calendar-sync/page.tsx` calls `requireChef()`. Google Calendar OAuth handled through secure redirect flow.                                    | BUILT  |
| 22  | Does the platform connections page manage third-party chef platforms? | Yes. `platform-connections/page.tsx` calls `requireChef()`. Manages connections to external platforms (Take a Chef, etc.).                          | BUILT  |
| 23  | Does the Yelp integration page handle API credentials safely?         | Yes. `yelp/page.tsx` calls `requireChef()`. Yelp API credentials managed through server actions, not exposed to client.                             | BUILT  |

## Domain 7: Compliance & Protection

| #   | Question                                                         | Answer                                                                                                                                                              | Status |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 24  | Does the compliance hub cover HACCP and GDPR?                    | Yes. `compliance/page.tsx`, `compliance/haccp/page.tsx`, and `compliance/gdpr/page.tsx` all call `requireChef()`. Separate sub-pages for each compliance domain.    | BUILT  |
| 25  | Does the protection hub cover insurance, certs, NDA, and crisis? | Yes. 7 protection sub-pages: `insurance/`, `certifications/`, `nda/`, `crisis/`, `business-health/`, `continuity/`, `portfolio-removal/`. All call `requireChef()`. | BUILT  |
| 26  | Does the credentials page manage professional certifications?    | Yes. `credentials/page.tsx` calls `requireChef()`. Manages food handler certs, business licenses, etc.                                                              | BUILT  |
| 27  | Does the AI privacy page control data usage preferences?         | Yes. `ai-privacy/page.tsx` is a client component. Underlying server actions call `requireChef()`. Controls how AI uses chef data.                                   | BUILT  |

## Domain 8: Workspace Customization

| #   | Question                                                     | Answer                                                                                                    | Status |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------ |
| 28  | Does the dashboard settings page control widget visibility?  | Yes. `dashboard/page.tsx` calls `requireChef()`. Manages which widgets appear on the chef dashboard.      | BUILT  |
| 29  | Does the navigation settings page customize the sidebar?     | Yes. `navigation/page.tsx` calls `requireChef()`. Allows chef to customize nav item order and visibility. | BUILT  |
| 30  | Does the appearance settings page control theme preferences? | Yes. `appearance/page.tsx` calls `requireChef()`. Manages UI theme and display preferences.               | BUILT  |
| 31  | Does the modules page control feature module visibility?     | Yes. `modules/page.tsx` calls `requireChef()`. Toggles feature modules on/off for the workspace.          | BUILT  |

## Domain 9: Professional & Culinary Profile

| #   | Question                                                      | Answer                                                                                                                                                                    | Status |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 32  | Does the culinary profile page use auth-gated server actions? | Yes. `culinary-profile/page.tsx` is a client component. `getCulinaryProfile` and `saveCulinaryProfileBulk` in `lib/ai/chef-profile-actions.ts` both call `requireChef()`. | BUILT  |
| 33  | Does the professional growth page manage skills and momentum? | Yes. `professional/page.tsx`, `professional/skills/page.tsx`, `professional/momentum/page.tsx` all call `requireChef()`.                                                  | BUILT  |
| 34  | Does the services page manage service offerings?              | Yes. `my-services/page.tsx` is a client component. `getServiceConfig` and `saveServiceConfig` call `requireChef()`.                                                       | BUILT  |
| 35  | Does the event types page customize event categories?         | Yes. `event-types/page.tsx` calls `requireChef()`. Manages custom event type definitions.                                                                                 | BUILT  |

## Domain 10: Cache Invalidation & Cross-System

| #   | Question                                                    | Answer                                                                                                                                                                         | Status |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 36  | How many mutation paths bust settings-related caches?       | 254 calls to `revalidatePath(/settings/...)` across 78 files. Covers profile, credentials, compliance, protection, notifications, integrations, and all sub-pages.             | BUILT  |
| 37  | Does the error boundary hide raw error messages?            | Yes. `settings/error.tsx` sanitized this session. Shows static "Something went wrong." with opaque digest only. No `error.message` leakage.                                    | BUILT  |
| 38  | Do settings changes propagate to dependent surfaces?        | Yes. Profile changes revalidate public profile, booking page, and dashboard. Notification changes revalidate notification delivery. Calendar sync changes revalidate calendar. | BUILT  |
| 39  | Does the settings hub provide guided navigation?            | Yes. Main `settings/page.tsx` renders `SettingsGuidedOverview` (categorized cards for common settings) and `SettingsAdvancedDirectory` (full list for power users).            | BUILT  |
| 40  | Does the demo data manager only show when demo data exists? | Yes. Main settings page conditionally renders `DemoDataManager` only when `await hasDemoData()` returns true. Hidden for real accounts.                                        | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

None.

**Sweep score: 40/40 BUILT, 0 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 69 pages auth-gated (defense-in-depth via parent layout), API keys masked (prefix-only), delete-account uses 30-day soft-delete with cancellation, developer tools feature-flagged, Stripe tokens never exposed, error boundary sanitized, 254 cache invalidation calls across 78 files.

**Key fix from this session (applied earlier):**

- Q37: Settings `error.tsx` was leaking `error.message`. Fixed to show static message + opaque digest only (part of systemic 17-file error boundary fix).
