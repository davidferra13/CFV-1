# Research: Free-First API Integration Priorities

> **Date:** 2026-04-01
> **Question:** Which API integrations are actually needed first in ChefFlow if the rule is "simple, useful, and always free," and how well is each candidate already supported by the current codebase?
> **Status:** partial (strict zero-cost verification for Google People API still needs one direct official pricing citation)

## Citation Note

Repo-state findings below cite local file paths and line numbers. External API behavior or cost/policy claims use official provider docs links because the repo cannot verify external vendor rules by itself.

## Origin Context

The developer did not ask for an API wish list. They asked for simple integrations that add real quality of life, stressed that everything must stay free, and explicitly wanted the integrations the product actually needs first rather than the ones that sound trendy. That intent is now preserved in the spec's Developer Notes and execution translation so the builder sees the reasoning, not just the chosen feature. `docs/specs/p1-google-contacts-import-via-google-people-api.md:26-62`

The developer also required permanent capture of the conversation itself: transcript, underlying intent, execution-ready requirements, constraints, and any nuance that would otherwise be lost in compression. That is why this report and the paired spec both preserve the why behind the recommendation instead of only naming a platform. `CLAUDE.md:468-515` `docs/specs/p1-google-contacts-import-via-google-people-api.md:26-62`

## Summary

The repo's clearest need-first integration gap is contacts import, not social publishing. ChefFlow already supports Google Contacts only through manual CSV export/import, while the shared Google OAuth stack can already request arbitrary scopes and persist them in `google_connections`, which makes Google Contacts via the People API the cleanest first build from a product-leverage perspective. `components/import/csv-import.tsx:149-194` `lib/ai/parse-csv-clients.ts:98-113` `app/api/auth/google/connect/route.ts:35-73` `app/api/auth/google/connect/callback/route.ts:188-225`

Google Drive is the strongest free-first fallback or second step if the team wants an official "no additional cost" citation before building Google Contacts. Social is more mature in the repo than a quick scan suggests, but it is still env/config-heavy, account-type-constrained, and less directly tied to a visibly broken day-one workflow than contact import. `docs/api-integration-health-report.md:94-100` `app/api/integrations/social/connect/[platform]/route.ts:17-105` `app/api/integrations/social/callback/[platform]/route.ts:90-145`

## Detailed Findings

### 1. The current need-first gap is contacts import, not "more integrations" in the abstract

The onboarding/import surface already treats contact import as a core action. The audit points chefs to `/import?mode=csv` for "Import contacts," and the Smart Import hub exposes CSV/Spreadsheet import as one of the built-in import modes. `docs/app-complete-audit.md:140` `docs/app-complete-audit.md:1539` `app/(chef)/import/page.tsx:61-111` `components/import/smart-import-hub.tsx:66-77`

The current CSV importer explicitly says it supports Google Contacts CSV exported from `contacts.google.com`, and the deterministic parser has Google Contacts header detection built in. That means the product already acknowledges Google Contacts as an input source, but only through a manual export/upload loop. `components/import/csv-import.tsx:152-158` `lib/ai/parse-csv-clients.ts:98-113` `lib/ai/parse-csv-clients.ts:320-322`

The existing import flow is already review-first and builder-friendly: `CsvImport` runs preview, duplicate detection, skip/confirm, and then writes through `importClient()` / `importClients()`. That lowers the implementation cost of a direct Google Contacts path because the missing piece is source acquisition, not a new import review system. `components/import/csv-import.tsx:61-121` `components/import/csv-import.tsx:197-415` `lib/ai/import-actions.ts:26-175`

### 2. Google Contacts fits the current architecture unusually well

ChefFlow already has a shared Google OAuth entry and callback flow that accepts arbitrary scopes, validates CSRF, and merges granted scopes back into `google_connections.scopes`. That is exactly the foundation a People API integration needs. `app/api/auth/google/connect/route.ts:35-73` `app/api/auth/google/connect/callback/route.ts:188-225`

`google_connections` already stores the shared Google token row with `access_token`, `refresh_token`, `token_expires_at`, `connected_email`, service flags, and `scopes TEXT[]`. The token refresh helper also already exists and is reusable from server code. `database/migrations/20260218000001_gmail_agent.sql:9-34` `lib/google/auth.ts:93-157`

The clients table already holds the fields that a Google contact can map into, and the existing import action already handles contacts without email by generating a placeholder import address. That avoids the need for a contact-staging table in v1. `database/migrations/20260215000001_layer_1_foundation.sql:75-154` `lib/ai/import-actions.ts:83-145`

Official People API method docs confirm that the authenticated user's connections can be fetched via `people.connections.list`, and the response includes paginated `connections[]`, `nextPageToken`, and totals, which matches the proposed preview import model. Official docs: https://developers.google.com/people/api/rest/v1/people.connections/list

### 3. Google Drive is the cleanest free-first fallback or second integration

The current integrations/settings surface already frames the product as connected to accounting, contracts, scheduling, and automation tools, but there is no verified Google Drive integration path in the repo. The visible Google integration work today is Gmail and Calendar, plus Google Business in the platform-connections lane. `app/(chef)/settings/integrations/page.tsx:25-99` `components/settings/google-integrations.tsx:223-345` `lib/integrations/platform-connections-constants.ts:5-16`

That makes Drive attractive for a second pass because it shares the existing Google auth family without colliding with the social/reviews stack. It is also easier to defend under the free-first rule because Google's Drive API limits page explicitly states that Drive API use is available at no additional cost. Official docs: https://developers.google.com/workspace/drive/api/guides/limits

Drive is still not the first need-first recommendation because the repo shows an explicit current contact-import gap, while the case for Drive is more "nice storage and file-organization leverage" than "existing user workflow is visibly manual right now." `components/import/csv-import.tsx:152-158` `docs/app-complete-audit.md:140`

### 4. Social is more wired than it first looks, but it is still not the first simple/free-needed integration

The social connections route exists, and the UI already offers account connections for Instagram, Facebook, TikTok, LinkedIn, X, Pinterest, and YouTube Shorts. `app/(chef)/social/connections/page.tsx:9-35` `components/social/social-connections-manager.tsx:22-87`

The repo also has a unified social OAuth/connect stack under `/api/integrations/social/...`, not just the older platform-specific routes. The generic connect route supports all configured platforms, the callback persists credentials, and the disconnect route soft-disconnects per platform. `app/api/integrations/social/connect/[platform]/route.ts:17-105` `app/api/integrations/social/callback/[platform]/route.ts:90-145` `app/api/integrations/social/disconnect/[platform]/route.ts:10-34`

Meta, TikTok, and YouTube are not fake on the code side. The callback route contains platform-specific account fetch and credential persistence branches, and the publishing adapters for Meta, TikTok, and YouTube are implemented. `app/api/integrations/social/callback/[platform]/route.ts:148-243` `app/api/integrations/social/callback/[platform]/route.ts:329-339` `lib/social/publishing/adapters/meta.ts:53-191` `lib/social/publishing/adapters/tiktok.ts:19-149` `lib/social/publishing/adapters/youtube.ts:27-165`

That said, social still fails the developer's "first needed" standard for this pass:

- The env/config health report shows Meta, TikTok, YouTube, and social token encryption all missing in the current environment. `docs/api-integration-health-report.md:94-100`
- TikTok is still explicitly video-only in the repo, which narrows its usefulness and increases platform friction. `lib/social/publishing/adapters/tiktok.ts:1-4` `lib/social/publishing/adapters/tiktok.ts:23-29`
- YouTube Shorts has a real uploader, but it is a heavier video pipeline, not a day-one operational relief feature. `lib/social/publishing/adapters/youtube.ts:27-128`
- The social surface solves outbound growth/distribution. The contacts gap solves an existing inbound CRM/manual-entry burden.

### 5. Reviews and marketplace API surfaces are not the first free-first answer

The reviews stack is real, but it is mixed. The original external-review schema only allowed `google_places` and `website_jsonld`, while the current sync code now includes Yelp as a provider branch. That means the repo already has some drift and layering complexity in this area. `database/migrations/20260226000018_external_reviews_unified.sql:6-64` `lib/reviews/external-actions.ts:13-36` `lib/reviews/external-sync.ts:4-6` `lib/reviews/external-sync.ts:378-395`

Yelp setup UI, actions, and sync code exist, but the current health report marks Yelp as a miss because `YELP_API_KEY` is not configured. `app/(chef)/settings/yelp/page.tsx:11-35` `components/settings/yelp-settings.tsx:121-242` `lib/integrations/yelp/yelp-sync.ts:24-190` `docs/api-integration-health-report.md:88`

Google Places review sync is implemented, but it depends on `GOOGLE_PLACES_API_KEY`, which is explicitly called out in the sync code. Under the developer's strict "always free" standard, Places is a weak first pick because Google's Places platform is billed separately from the general Google Workspace API family. `lib/reviews/external-sync.ts:143-204` Official docs: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

On the marketplace side, the repo now has a `platform_api_connections` foundation table and a platform-connections page, but the constants file is explicit that only real working connections should be listed and that only Google Business Profile is currently exposed. Email parsing for booking platforms is intentionally handled through Gmail sync instead of direct platform APIs. `database/migrations/20260401000058_inquiry_consolidation_phase2.sql:22-64` `lib/integrations/platform-connections-constants.ts:5-16` `lib/integrations/platform-connections.ts:21-83`

### 6. The repo itself already narrowed false integration claims, which supports a conservative first pick

The polish workstream explicitly removed false third-party platform claims, renamed Take a Chef references to "Email Lead Capture," and reduced the real platform-connection list to Google Business Profile only. That is a strong signal that the right move is to extend verified infrastructure, not revive over-promised surfaces. `docs/app-polish-workstream-1-4.md:12-27` `docs/app-polish-workstream-1-4.md:103`

The integrations audit also reflects a mixed reality: the settings surface lists broad categories, but the currently audited routes specifically call out Google integrations, Yelp settings, and social connections as separate, more specialized areas. `docs/app-complete-audit.md:1274-1276` `docs/app-complete-audit.md:1331` `docs/app-complete-audit.md:1409`

## Gaps and Unknowns

- I did not verify a direct official pricing statement for Google People API itself in this session. The technical API docs are verified, but the strict vendor-side "always free" proof still needs one direct official source if the developer wants procurement-grade certainty before build. Official People API docs: https://developers.google.com/people/api/rest/v1/people.connections/list
- I did not verify real tenant contact volumes, so any first-pass cap for preview/import size is still a design choice rather than a measured operating threshold.
- I verified that the unified social OAuth/connect flow exists after tightening the search. Earlier assumptions that the generic social routes were missing would have been wrong; this report corrects that based on the actual repo files. `app/api/integrations/social/connect/[platform]/route.ts:17-105` `app/api/integrations/social/callback/[platform]/route.ts:90-145`

## Recommendations

- **needs a spec:** Build Google Contacts import first, inside the existing CSV import flow, using the shared Google OAuth stack and no new tables. That is the highest-leverage, lowest-scope current gap. `docs/specs/p1-google-contacts-import-via-google-people-api.md:64-252`
- **needs discussion:** If the developer requires direct official proof that the first shipped integration is explicitly no-additional-cost, confirm Google People API pricing language first or swap the first build to Google Drive while keeping Google Contacts as the next need-first integration.
- **quick fix:** If the builder tackles the contacts spec, extend duplicate warnings to normalized phone matches at the same time. Google contacts without email are common enough that name/email-only warnings are not a good import experience. `lib/ai/import-actions.ts:26-66`
- **needs discussion:** Treat Meta as the next social integration only if outbound social distribution becomes a clear priority. The repo can support that work, but it is not the first missing operational relief feature. `app/api/integrations/social/callback/[platform]/route.ts:148-243` `lib/social/publishing/adapters/meta.ts:53-191`
- **do not prioritize first:** TikTok, YouTube, Yelp, Google Places, and generic marketplace API work. They either fail the strict free-first rule more obviously, require heavier configuration, or solve a less urgent current pain than contact import. `docs/api-integration-health-report.md:88-100` `lib/social/publishing/adapters/tiktok.ts:1-29` `lib/reviews/external-sync.ts:143-204`
