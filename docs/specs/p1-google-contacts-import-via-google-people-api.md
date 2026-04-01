# Spec: Google Contacts Import via Google People API

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Citation Note

Repo-state claims below cite local file paths and line numbers. External API behavior or platform-policy claims use official provider docs links because the repo cannot verify external pricing or scope rules on its own.

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-01 03:44 | Planner + Research |        |
| Status: ready         | 2026-04-01 03:44 | Planner + Research |        |
| Claimed (in-progress) |                  |                    |        |
| Spike completed       |                  |                    |        |
| Pre-flight passed     |                  |                    |        |
| Build completed       |                  |                    |        |
| Type check passed     |                  |                    |        |
| Build check passed    |                  |                    |        |
| Playwright verified   |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer asked for simple API integrations that add real quality of life, not flashy API count. Their examples were Instagram, Facebook, TikTok, YouTube, or any other useful API, but the hard rule was that everything must stay free. They also made the prioritization rule explicit: figure out what the product actually needs first, not what sounds exciting first.

They then required that this conversation be preserved permanently inside the spec and report. The transcript, the reasoning underneath it, the execution translation, and any missing nuance all had to survive the handoff. Their standard was "no loss": do not compress away the why, do not leave gaps a builder has to guess through, and do not let the original intent evaporate during planning.

In the follow-up pass, the developer added a stricter planning guardrail: pause before acting, expose assumptions, separate verified facts from unverified claims, and improve the spec with external research on how chefs actually handle the workflow this feature is meant to solve. They also narrowed the execution boundary again: spec work only, no product-code changes.

### Developer Intent

- **Core goal:** Identify the first API integration that materially reduces current product friction, fits the existing architecture, and respects a strict free-first constraint.
- **Key constraints:** Reuse real infrastructure instead of inventing new surfaces; preserve review-before-write behavior; avoid integrations that require paid plans, fragile approvals, or speculative platform partnerships; permanently capture the reasoning behind the choice.
- **Motivation:** The developer wants leverage, not vanity. The right first integration should remove manual work that the product visibly still forces today.
- **Success from the developer's perspective:** A builder can pick up this spec and implement the first genuinely needed integration without re-auditing the repo, guessing the intended UX, or drifting into broader social/reviews/platform work.

### Execution Translation

- **Requirements:**
  - Add one-click Google Contacts import inside the existing CSV import flow at `/import?mode=csv`, not on a new settings page or standalone wizard. `components/import/csv-import.tsx:38-121` `components/import/csv-import.tsx:149-194` `components/import/smart-import-hub.tsx:66-77` `components/import/smart-import-hub.tsx:452`
  - Reuse the existing Google OAuth entry + callback stack and the existing `google_connections` token/scopes row. Do not create a second Google token store. `app/api/auth/google/connect/route.ts:14-73` `app/api/auth/google/connect/callback/route.ts:188-225` `database/migrations/20260218000001_gmail_agent.sql:9-34`
  - Keep the existing review-first import pattern. Google contacts must preview as candidate clients first, then import only after explicit confirmation. `components/import/csv-import.tsx:61-121` `components/import/csv-import.tsx:197-387`
  - Write imported records through the existing client import actions so tenant scoping, placeholder-email behavior, and `/clients` revalidation stay consistent. `lib/ai/import-actions.ts:72-175`
  - Preserve the contact-level fields chefs actually use at the contact stage: name, email, phone, primary address, and freeform notes. Do not turn this into full inquiry parsing or event creation in v1. `lib/ai/parse-client.ts:32-57` `database/migrations/20260215000001_layer_1_foundation.sql:75-113`
- **Constraints:**
  - No new database table or contact mirror in v1. Imported contacts write directly to `clients`; Google remains the remote source of truth. `database/migrations/20260215000001_layer_1_foundation.sql:75-154`
  - No background sync, no push-back to Google Contacts, and no change to `google_mailboxes`. `database/migrations/20260331000045_google_mailboxes.sql:1-4`
  - No social, Yelp, Google Places, or marketplace API work in this spec. Those are separate surfaces with different constraints. `app/(chef)/social/connections/page.tsx:9-35` `components/settings/yelp-settings.tsx:121-242` `lib/integrations/platform-connections-constants.ts:5-16`
  - No automatic lead, project, quote, or event creation from imported contacts. This pass only seeds client records. Industry workflow research supports keeping contact import separate from downstream pipeline creation.
  - No Google "Other Contacts" or inbox-derived contact mining in v1. This feature is for importing known Google Contacts, not for turning Gmail heuristics into CRM records. Official scope/data distinction: https://developers.google.com/people/contacts-api-migration
- **Behaviors:**
  - If Google is disconnected or the People scope is missing, the import button should send the chef through the shared Google connect flow and return them back to `/import?mode=csv&source=google-contacts`. `app/api/auth/google/connect/route.ts:35-73` `lib/google/connect-entry.ts:3-20`
  - If People scope is present, fetch contacts server-side, normalize them into the existing import preview shape, run duplicate detection, let the chef skip rows, and import only the confirmed selection. `lib/ai/parse-csv-clients.ts:257-357` `components/import/csv-import.tsx:68-121`
  - Duplicate detection must catch phone-only contacts too, not just email/name, because Google contacts often have phone numbers without email. Current duplicate detection only covers email and full-name matches, so this spec explicitly widens it. `lib/ai/import-actions.ts:26-66`
  - When Google contact notes are available, preserve them as freeform relationship context in `vibe_notes`; do not attempt structured allergy or dietary extraction from those notes in this pass.

---

## What This Does (Plain English)

Inside the existing CSV import screen, the chef gets a second path: instead of exporting a CSV from Google Contacts and uploading it manually, they can click one button to pull their Google contacts directly into the same review screen they already use for client imports. They still review duplicates, skip anything they do not want, and confirm before ChefFlow writes anything to `clients`. `components/import/csv-import.tsx:149-194` `components/import/csv-import.tsx:197-387` `database/migrations/20260215000001_layer_1_foundation.sql:75-154`

---

## Why It Matters

The repo already advertises CSV import for Google Contacts, which means contacts import is a real current need, but the product still makes the chef leave Google, export a file, and come back manually. At the same time, the existing Google OAuth stack already supports arbitrary scopes and merged scope storage, so this is a high-leverage gap to close before broader social or marketplace APIs. `components/import/csv-import.tsx:152-158` `lib/ai/parse-csv-clients.ts:98-113` `app/api/auth/google/connect/route.ts:35-63` `app/api/auth/google/connect/callback/route.ts:188-225`

---

## External Workflow Research

Current external workflow research supports this spec shape rather than a broader integration build:

- Chef-specific admin tools position the real pain as juggling enquiries, quotes, client communication, dietary needs, and payments across fragmented tools. That matches ChefFlow's current contact-import gap more closely than a first-pass social API build.
  - PrivateChefSoftware says private chefs lose hours every week managing enquiries, quotes, updating clients, tracking dietary needs, and chasing payments, and that many rely on WhatsApp, email, and spreadsheets. Source: https://www.privatechefsoftware.com/
- Marketplace chef-booking flows start with contact identity plus event-specific preferences, intolerances, and direct chef-client messaging. That means Google Contacts import should be positioned as identity bootstrap for known people, not as a replacement for inquiry intake or event briefing.
  - Take a Chef's booking flow asks for cuisine, preferences, intolerances, and then encourages messaging with chefs to refine the job. Source: https://www.takeachef.com/en-us/private-chef/near-you
- Service-business CRMs treat contact import as a distinct action from project or lead creation.
  - HoneyBook explicitly supports importing Google contacts directly into the contacts list without creating projects. Source: https://help.honeybook.com/en/articles/9242203-add-your-contacts-leads-and-existing-clients-to-honeybook
  - Dubsado warns that CSV import creates new client entries, can duplicate existing clients, and does not support merging duplicates. Source: https://help.dubsado.com/en/articles/1458403-bulk-import-a-client-list

Research-driven implications for this spec:

- Keep this as a one-time, review-first contact import.
- Preserve phone, address, and note fields when available because those matter in real chef follow-up workflows.
- Do not auto-create leads, projects, quotes, or events from imported contacts.
- Keep duplicate handling warning-first rather than inventing auto-merge logic.
- Keep dietary/allergy/event-intake collection outside this flow unless a later spec intentionally expands the system boundary.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                             | Purpose                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/google/contacts-actions.ts` | Server action that verifies Google connection/scope state, fetches People API contacts, normalizes them into import-preview candidates, and returns a preview payload without writing to the database. |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                               | What to Change                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/import/csv-import.tsx` | Add a Google Contacts CTA, Google-source loading/error states, query-param return handling, preview messaging for API-sourced contacts, and reuse the existing skip/confirm/import flow for those contacts. |
| `lib/ai/import-actions.ts`         | Extend duplicate detection so preview warnings can match existing clients by normalized phone as well as by email and full name.                                                                            |
| `docs/app-complete-audit.md`       | After the build lands, document that `/import` CSV mode now supports direct Google Contacts import in addition to manual CSV upload/paste.                                                                  |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is required for v1 because the shared Google OAuth row already exists in `google_connections`, and imported contacts already have a home in `clients`. `database/migrations/20260218000001_gmail_agent.sql:9-34` `database/migrations/20260215000001_layer_1_foundation.sql:75-154`
- Do not add a local Google-contacts cache table in this pass. That would be a separate sync spec, not a prerequisite for the one-click import UX.

---

## Data Model

- **Google workspace token state:** `google_connections` already stores one chef-scoped Google OAuth row with `access_token`, `refresh_token`, `token_expires_at`, `connected_email`, service flags, and `scopes TEXT[]`. The shared callback merges newly granted scopes into that row instead of overwriting the existing Google relationship. `database/migrations/20260218000001_gmail_agent.sql:9-34` `app/api/auth/google/connect/callback/route.ts:200-223`
- **Legacy/compatibility boundary:** Gmail mailbox sync has its own `google_mailboxes` source of truth now, but that migration explicitly keeps `google_connections` in place for legacy compatibility and Calendar. This spec stays on `google_connections` because the shared OAuth connect flow and token refresh path still use it. `database/migrations/20260331000045_google_mailboxes.sql:1-4` `lib/google/auth.ts:93-157`
- **Imported target records:** `clients` already stores the identity, phone, preferences, site notes, relationship notes, and status that the import flow writes. The table requires `tenant_id`, `full_name`, and a non-null `email`, with uniqueness enforced per `(tenant_id, email)`. `database/migrations/20260215000001_layer_1_foundation.sql:75-154`
- **Write-path behavior:** `importClient()` already handles contacts with no email by generating a `@placeholder.import` address so the `clients.email` constraint is still satisfied. That behavior must remain the canonical fallback for Google contacts without email addresses. `lib/ai/import-actions.ts:83-145`
- **Duplicate detection shape:** `checkClientDuplicates()` currently returns only `byEmail` and `byName`; this spec broadens that preview-only metadata to include phone matches so the UI can warn on phone-only contacts too. `lib/ai/import-actions.ts:21-66`
- **Research-informed boundary:** `clients` can store rich preference and relationship data, but external workflow research says contact import should stay distinct from inquiry intake and downstream booking/project creation. This spec therefore seeds the client record only; it does not attempt to create business objects from the imported contact.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                                                               | Auth            | Input                                                                  | Output                                                                                                                                                                                                                    | Side Effects                                             |
| -------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `fetchGoogleContactsImportPreview(input?: { maxContacts?: number })` | `requireChef()` | Optional max-contact cap, default `1000`                               | `{ status: 'ok', clients: ParsedClient[], totalFetched: number, truncated: boolean, warnings: string[] }` or `{ status: 'needs_connect' \| 'needs_scope', connectUrl: string }` or `{ status: 'error', message: string }` | Calls Google People API server-side; no database writes. |
| `checkClientDuplicates(candidates)`                                  | `requireChef()` | Existing client-preview candidates, expanded to include optional phone | Existing email/name response plus normalized phone matches                                                                                                                                                                | No writes; used only for preview warnings.               |

Implementation requirements for `fetchGoogleContactsImportPreview`:

- Read the current chef via `requireChef()`. `lib/auth/get-user.ts:122-143`
- Load the chef's `google_connections` row and inspect `refresh_token` plus `scopes`. If no row or no refresh token exists, return `needs_connect`; if the row exists but `https://www.googleapis.com/auth/contacts.readonly` is absent from `scopes`, return `needs_scope`. `database/migrations/20260218000001_gmail_agent.sql:14-33` `app/api/auth/google/connect/callback/route.ts:188-225`
- Build the reconnect URL with the shared entry helper and a `returnTo` of `/import?mode=csv&source=google-contacts`. `lib/google/connect-entry.ts:3-20`
- Reuse `getGoogleAccessToken(chefId)` for token refresh instead of implementing a second Google refresh path. `lib/google/auth.ts:93-157`
- Call Google People API `people.connections.list` server-side for My Contacts only, with explicit `personFields` that at minimum cover `names`, `emailAddresses`, `phoneNumbers`, `addresses`, and `biographies`, paging through `nextPageToken` until exhaustion or the hard cap. Do not expand to `otherContacts.list` in this pass because the scope and returned data shape are different. Official references: https://developers.google.com/people/api/rest/v1/people.connections/list and https://developers.google.com/people/contacts-api-migration
- Normalize Google people into the existing `ParsedClient`-compatible shape used by `CsvImport`, with at minimum: `full_name`, `email`, `phone`, primary `address`, `vibe_notes` from biographies/notes when present, `preferred_contact_method`, default `status='active'`, and empty arrays/nulls for unsupported fields. `lib/ai/parse-client.ts:16-70` `database/migrations/20260215000001_layer_1_foundation.sql:75-154`

Implementation requirements for `checkClientDuplicates()`:

- Normalize phone numbers into a digits-only comparison key before matching.
- Run phone matching in JS against the same tenant-scoped result set already used for name matching.
- Keep the action preview-only; no auto-merge and no silent skip logic.

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

There is no new route. The feature lives inside the existing CSV import mode on `/import?mode=csv`, which is already mounted through `SmartImportHub` and `CsvImport`. `app/(chef)/import/page.tsx:61-111` `components/import/smart-import-hub.tsx:66-77` `components/import/smart-import-hub.tsx:452`

The input phase in `CsvImport` should gain one additional primary action above the textarea:

- `Import from Google Contacts`
- Secondary explanation text: `One-time snapshot. Review before saving.`

The existing upload button, paste textarea, and `Detect Columns` flow stay intact. This is an added source path, not a replacement. `components/import/csv-import.tsx:149-194`

When the Google-source path is active, the preview phase should still use the existing client list, skip controls, confirmation checkbox, and import button. The difference is the explanatory card at the top:

- Replace CSV column-detection language with a compact source summary card: `Google Contacts import`, contact count, truncation warning if applicable, and a note that this is a one-time snapshot.
- Do not fake column chips or preview rows for API data. Those are CSV-specific affordances. `components/import/csv-import.tsx:200-283`

### States

- **Loading:** While fetching Google contacts, disable source buttons and show a spinner/inline loading message in the input phase instead of dropping straight to an empty preview.
- **Empty:** If Google returns zero importable contacts, show an info alert explaining that no contacts with usable names were found and keep a clear path back to upload/paste or retry the Google fetch.
- **Error:** Show an inline alert when the Google callback returns `error=...` to `/import`, when the fetch action returns `status: 'error'`, or when the People API call fails. Never show a fake successful preview with zero rows.
- **Populated:** Show the same duplicate badges, skip toggles, confirmation checkbox, and import CTA the CSV flow already uses, plus a source-summary banner that makes it clear the records came from Google Contacts.

### Interactions

- **First-time connect path:**
  - User clicks `Import from Google Contacts`.
  - `CsvImport` calls `fetchGoogleContactsImportPreview()`.
  - If the action returns `needs_connect` or `needs_scope`, the client redirects to the shared Google connect URL.
  - Google returns to `/import?mode=csv&source=google-contacts&connected=google` or the same route with `error=...`.
  - `CsvImport` reads the query string and auto-runs the fetch once when `source=google-contacts` is present and there is no local preview yet.
- **Connected path:**
  - User clicks `Import from Google Contacts`.
  - Preview loads directly from the People API and then runs duplicate detection.
  - User can skip rows, confirm, and import through the existing save path.
- **Reset path:**
  - `Start Over` clears both CSV and Google-source preview state and returns to the input phase.
- **CSV path remains unchanged:**
  - Upload and paste behaviors continue to run through `parseClientsCsv()` and the existing column-detection preview. `components/import/csv-import.tsx:51-80` `lib/ai/parse-csv-clients.ts:257-357`

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                                                    | Correct Behavior                                                                                                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef has no Google connection row                                           | Return `needs_connect` and redirect through the shared Google connect entry flow.                                                                           |
| Chef connected Gmail/Calendar earlier but never granted contacts scope      | Return `needs_scope` and send them through the same Google connect flow with `contacts.readonly`, preserving the return path.                               |
| Google OAuth returns an error to `/import`                                  | Surface the error inline in `CsvImport`; do not auto-fetch and do not silently clear the message.                                                           |
| Google contact has no usable name                                           | Skip it during normalization and include a warning count; never create a blank `clients.full_name`.                                                         |
| Google contact has no email                                                 | Allow preview/import; rely on the existing placeholder-email path in `importClient()`.                                                                      |
| Contact matches an existing client by email, full name, or normalized phone | Mark it as a possible duplicate and let the chef skip or continue; no auto-merge.                                                                           |
| People API returns more rows than the import cap                            | Stop at the cap, mark the result as truncated, and tell the chef the preview is partial.                                                                    |
| Access token is expired or revoked                                          | Reuse `getGoogleAccessToken()` first; if refresh fails or People API rejects the scope/token, return a reconnect-required error instead of a blank preview. |
| Google returns zero importable contacts                                     | Show an empty-state info alert, not a success state.                                                                                                        |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Sign in with the agent account and open `/import?mode=csv`.
2. Verify the existing upload/paste CSV UI still renders, and the new `Import from Google Contacts` action is visible in the input phase.
3. Start from a chef with no Google People scope. Click the new action and verify the browser redirects through `/api/auth/google/connect` and then back to `/import?mode=csv&source=google-contacts...`.
4. Complete the Google consent flow. Verify `CsvImport` auto-loads the Google-source preview without requiring a manual CSV upload.
5. Verify the preview shows duplicate badges for at least one existing client match by email, name, or normalized phone.
6. Skip one row, keep one row, confirm the checkbox, and import. Verify the selected record appears on `/clients` after refresh.
7. Verify a Google contact without email still imports successfully and lands in `clients` via the placeholder-email path.
8. Verify `Start Over` returns the UI to the input phase and the normal CSV upload path still works.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- No ongoing background sync between Google Contacts and ChefFlow.
- No write-back or edit sync from ChefFlow to Google Contacts.
- No new Google-specific settings page, contacts dashboard, or local contacts mirror table.
- No automatic lead, project, quote, event, or workflow creation from imported contacts.
- No Google "Other Contacts" import, inbox scraping, or Gmail-derived lead mining in v1.
- No structured extraction of allergies, dietary restrictions, or event requirements from Google contact notes in this pass. Preserve notes as notes only.
- No Google Drive, Docs, Calendar, Gmail, Meta, TikTok, YouTube, Yelp, Google Places, or marketplace-API implementation work.
- No changes to `google_mailboxes`, Gmail historical scan, or the broader social publishing engine.
- No automatic duplicate merge logic. This pass adds warnings, not merge automation.

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

- Reuse the shared Google connect entry/callback helpers. Do not add a second Google OAuth callback route for contacts. `app/api/auth/google/connect/route.ts:14-73` `app/api/auth/google/connect/callback/route.ts:22-255`
- Keep this feature local to the existing import flow. The repo already positions contact import under `/import`, and the onboarding audit points new chefs there directly. `docs/app-complete-audit.md:140` `docs/app-complete-audit.md:1539`
- Stay on `google_connections`, not `google_mailboxes`. This feature needs the existing merged Google scope row, not Gmail mailbox source-of-truth infrastructure. `database/migrations/20260331000045_google_mailboxes.sql:1-4`
- Use the existing import actions to preserve tenant-scoped writes and `/clients` cache invalidation. `lib/ai/import-actions.ts:72-175`
- After the UI lands, update `docs/app-complete-audit.md` because `/import` visibly changes. `CLAUDE.md:704-727`

---

## Spec Validation

### 1. What exists today that this touches?

- The existing `/import` page already mounts `SmartImportHub`, and `csv` is one of the built-in import modes. `app/(chef)/import/page.tsx:61-111` `components/import/smart-import-hub.tsx:35-49` `components/import/smart-import-hub.tsx:66-77`
- `SmartImportHub` already renders `CsvImport` when `mode === 'csv'`. `components/import/smart-import-hub.tsx:429-452`
- `CsvImport` already handles input, preview, duplicate checks, explicit confirmation, and save via `importClient()` / `importClients()`. `components/import/csv-import.tsx:38-121` `components/import/csv-import.tsx:197-415`
- The current CSV parser explicitly recognizes Google Contacts CSV headers and warns that only name, email, phone, and notes are imported from that format. `lib/ai/parse-csv-clients.ts:98-113` `lib/ai/parse-csv-clients.ts:294-356`
- The Google OAuth connect route already accepts arbitrary `scope` query params, and the shared callback merges newly granted scopes into `google_connections.scopes`. `app/api/auth/google/connect/route.ts:35-73` `app/api/auth/google/connect/callback/route.ts:188-225`
- `google_connections` already stores the shared token/scopes row this feature needs. `database/migrations/20260218000001_gmail_agent.sql:9-34`
- Client writes already have a canonical home in `clients`, with tenant-scoped RLS and a required email field. `database/migrations/20260215000001_layer_1_foundation.sql:75-154` `database/migrations/20260215000001_layer_1_foundation.sql:383-463`

### 2. What exactly changes?

- Add one new server-action file, `lib/google/contacts-actions.ts`, to fetch Google contacts server-side, detect connection/scope state, and normalize results into preview candidates.
- Modify `components/import/csv-import.tsx` so the input phase offers both manual CSV and direct Google Contacts import, and so the preview phase can represent API-sourced contacts without pretending they came from column detection.
- Modify `lib/ai/import-actions.ts` so preview duplicate warnings can match by normalized phone in addition to the existing email/name logic.
- Update `docs/app-complete-audit.md` after the UI ships so the audit reflects the new `/import` affordance.
- No database schema change, no route creation, no table migration, and no change to the existing Google callback contract.

### 3. What assumptions are you making?

- **Verified:** The shared Google connect path can request additional scopes through the existing entry URL and callback flow. `lib/google/connect-entry.ts:3-20` `app/api/auth/google/connect/route.ts:35-73`
- **Verified:** The callback persists merged scopes to `google_connections` instead of overwriting prior Google permissions. `app/api/auth/google/connect/callback/route.ts:196-223`
- **Verified:** Imported clients can safely reuse the existing `ParsedClient` shape and `importClient()` / `importClients()` write path. `lib/ai/parse-client.ts:16-70` `lib/ai/import-actions.ts:72-175`
- **Verified:** Contacts without email still need to pass through the placeholder-email path because `clients.email` is `NOT NULL`. `database/migrations/20260215000001_layer_1_foundation.sql:81-87` `database/migrations/20260215000001_layer_1_foundation.sql:136-154` `lib/ai/import-actions.ts:83-90`
- **Unverified:** I did not find a direct official pricing page that states Google People API itself is "no additional cost" in this session. That means the build plan is technically ready, but the strict product-policy question of whether People API satisfies the developer's "always free" standard still needs one direct official citation or explicit developer acceptance of the existing Google Workspace ambiguity. Official People API method docs verified: https://developers.google.com/people/api/rest/v1/people.connections/list
- **Unverified:** Real tenant contact volumes above the proposed `1000` preview cap were not verified from runtime data. The cap is a safety choice for v1, not a proven product maximum.

### 4. Where will this most likely break?

- **OAuth return/resume flow inside `CsvImport`:** today the component has no query-param handling, so if the builder adds a Google button but forgets the return-path logic, the chef will authorize Google and land back on the import page with no resumed action. `components/import/csv-import.tsx:38-121` `app/api/auth/google/connect/callback/route.ts:242-255`
- **Token-store confusion between `google_connections` and `google_mailboxes`:** Gmail mailbox sync now has a separate table, but the shared workspace connect flow and token refresh still use `google_connections`. A builder can easily wire contacts to the wrong table if they only skim the newer Gmail migration. `database/migrations/20260331000045_google_mailboxes.sql:1-4` `lib/google/auth.ts:93-157`
- **Client uniqueness/placeholder-email path:** if the builder bypasses `importClient()` or tries to insert raw People API rows directly, contacts without email will violate `clients.email NOT NULL`, and duplicate warnings will miss phone-only matches unless they explicitly widen the existing helper. `database/migrations/20260215000001_layer_1_foundation.sql:81-87` `lib/ai/import-actions.ts:26-66` `lib/ai/import-actions.ts:83-145`

### 5. What is underspecified?

- **How Google-source preview should render:** this spec resolves that by saying the Google path reuses the existing client list/confirmation UI but replaces CSV-specific column-detection language with a source-summary banner. `components/import/csv-import.tsx:200-283`
- **What happens when the People scope is missing:** this spec resolves that by requiring explicit `needs_scope` vs `needs_connect` statuses from the new server action, both returning a shared Google connect URL.
- **How many contacts to fetch in v1:** this spec resolves that by making the first pass a one-time preview capped at `1000` candidates, with a visible truncation warning if more exist.
- **Which fields matter from Google Contacts:** this spec resolves that by keeping v1 to fields that map cleanly into the existing `clients` / `ParsedClient` shape and explicitly fencing off live sync and richer contact mirrors.

### 6. What dependencies or prerequisites exist?

- Existing Google OAuth env vars must already be configured: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. `lib/google/auth.ts:25-49` `app/api/auth/google/connect/route.ts:18-33`
- The shared Google connect route and callback must remain intact because this feature depends on them for scope acquisition and token persistence. `app/api/auth/google/connect/route.ts:14-73` `app/api/auth/google/connect/callback/route.ts:22-255`
- No migration is required.
- After implementation, the builder must update `docs/app-complete-audit.md` because the `/import` UI changes. `CLAUDE.md:704-727`
- External prerequisite: the Google People API must be enabled in the same Google Cloud project that already backs the shared OAuth client. Official docs: https://developers.google.com/people/api/rest/v1/people.connections/list

### 7. What existing logic could this conflict with?

- The shared Google token row is already used for Gmail and Calendar connection state, so scope additions must not wipe those flags or tokens. `lib/google/auth.ts:161-245` `app/api/auth/google/connect/callback/route.ts:196-223`
- `google_mailboxes` is now Gmail's mailbox source of truth, so contacts import must not accidentally piggyback on mailbox-specific infrastructure. `database/migrations/20260331000045_google_mailboxes.sql:1-4`
- `checkClientDuplicates()` is shared import-preview logic. Extending it by phone affects CSV previews too, so the builder must keep the existing name/email behavior stable. `lib/ai/import-actions.ts:26-66`
- `clients` uniqueness and RLS rules are shared across the whole CRM, so the import path must continue to write through the tenant-scoped existing action. `database/migrations/20260215000001_layer_1_foundation.sql:136-154` `database/migrations/20260215000001_layer_1_foundation.sql:413-463`

### 8. What is the end-to-end data flow?

1. Chef opens `/import?mode=csv`, which mounts `CsvImport` inside `SmartImportHub`. `app/(chef)/import/page.tsx:61-111` `components/import/smart-import-hub.tsx:429-452`
2. Chef clicks `Import from Google Contacts` in `CsvImport`.
3. `CsvImport` calls `fetchGoogleContactsImportPreview()`.
4. If Google is disconnected or missing scope, the action returns a shared connect URL built from `buildGoogleConnectEntryUrl()` with `returnTo=/import?mode=csv&source=google-contacts`. `lib/google/connect-entry.ts:3-20`
5. Browser redirects through `/api/auth/google/connect`, which validates requested scopes, sets the CSRF cookie, and redirects to Google. `app/api/auth/google/connect/route.ts:14-73`
6. Google redirects back to `/api/auth/google/connect/callback`, which validates state, exchanges the auth code, merges granted scopes, and upserts the shared `google_connections` row. `app/api/auth/google/connect/callback/route.ts:66-255`
7. Browser returns to `/import?mode=csv&source=google-contacts&connected=google` (or `error=...` on failure).
8. `CsvImport` detects `source=google-contacts`, auto-calls `fetchGoogleContactsImportPreview()` once, and receives normalized `ParsedClient` candidates.
9. `CsvImport` runs duplicate detection, shows the existing review UI, and waits for explicit confirmation. `components/import/csv-import.tsx:68-121` `components/import/csv-import.tsx:296-387`
10. On save, the selected contacts flow through `importClient()` / `importClients()`, which write to `clients` and revalidate `/clients`. `lib/ai/import-actions.ts:72-175`

### 9. What is the correct implementation order?

1. Create `lib/google/contacts-actions.ts` first so the Google-source contract is fixed before touching the UI.
2. Extend `checkClientDuplicates()` with normalized phone matching, because the preview logic depends on that result shape.
3. Update `components/import/csv-import.tsx` to add the new button, loading/error states, Google-source preview, and query-param auto-resume flow.
4. Build and verify the manual CSV path still works unchanged.
5. Update `docs/app-complete-audit.md` after the UI behavior is confirmed.

### 10. What are the exact success criteria?

- `/import?mode=csv` shows a visible `Import from Google Contacts` action alongside the existing upload/paste CSV controls. Current import surface: `components/import/csv-import.tsx:149-194`
- A chef with no Google connection or missing contacts scope is redirected through the existing Google connect flow and returned to the import page, not to settings or a dead-end page. Google connect flow: `app/api/auth/google/connect/route.ts:14-73` `app/api/auth/google/connect/callback/route.ts:242-255`
- A chef with valid contacts scope can preview Google contacts without exporting/uploading CSV.
- Preview warnings flag existing clients by email, full name, or normalized phone.
- Save still requires explicit confirmation and writes through the existing `importClient()` / `importClients()` logic. `components/import/csv-import.tsx:99-121` `components/import/csv-import.tsx:362-381` `lib/ai/import-actions.ts:72-175`
- No database migration is introduced.
- Existing Gmail/Calendar Google connections still work because the shared token row and merged scopes behavior remain unchanged. `lib/google/auth.ts:161-245` `app/api/auth/google/connect/callback/route.ts:196-223`

### 11. What are the non-negotiable constraints?

- All new server actions must require chef auth through `requireChef()`. `lib/auth/get-user.ts:122-143`
- All reads and writes must stay tenant-scoped. `google_connections` is keyed by `chef_id`, and `clients` writes must continue to use `tenant_id = user.tenantId`. `database/migrations/20260218000001_gmail_agent.sql:9-34` `lib/ai/import-actions.ts:83-90`
- Google access/refresh tokens must never be sent to the browser. The browser only gets a preview payload or a redirect URL.
- The flow remains review-first. No background import or silent write is allowed.
- Gmail and Calendar scopes/tokens must be preserved when contacts scope is added. `app/api/auth/google/connect/callback/route.ts:196-223`

### 12. What should NOT be touched?

- Do not create a new Google OAuth callback route or a second Google token table.
- Do not modify `google_mailboxes`.
- Do not add a local `google_contacts` table in v1.
- Do not move this feature into `/settings/integrations`, `/settings/platform-connections`, `/social/connections`, or the reviews stack. Those are adjacent but unrelated surfaces. `app/(chef)/settings/integrations/page.tsx:25-99` `app/(chef)/settings/platform-connections/page.tsx:5-24` `app/(chef)/social/connections/page.tsx:9-35` `app/(chef)/reviews/page.tsx:15-43`
- Do not expand scope into Google Drive, Yelp, Places, Meta, TikTok, or YouTube work here.

### 13. Is this the simplest complete version?

Yes. It reuses the existing `/import` page, the existing shared Google OAuth stack, the existing duplicate/import review flow, and the existing `clients` table. That means the feature can ship with one new server-action file, one import-UI change, one duplicate-check enhancement, and no migration. `components/import/csv-import.tsx:38-121` `app/api/auth/google/connect/route.ts:14-73` `app/api/auth/google/connect/callback/route.ts:188-225` `lib/ai/import-actions.ts:72-175`

### 14. If implemented exactly as written, what would still be wrong?

- It is still a one-time import, not a live Google Contacts sync.
- Duplicate handling is still warning-only. A chef can still choose to import a likely duplicate, and the system will not auto-merge it.
- The strict product-policy question of whether Google People API satisfies the developer's "always free" standard still needs one direct official pricing citation if that is treated as a launch blocker. The technical integration path is ready; the remaining uncertainty is external-policy validation, not repo design.

### What would a builder get wrong building this as written?

- Building a new Google OAuth route instead of reusing the existing shared connect/callback flow.
- Attaching this feature to the integrations/settings/social surfaces instead of the existing import flow where contact import already lives.
- Writing directly to `clients` without reusing `importClient()`, which would break placeholder-email behavior and `/clients` revalidation.
- Trying to model Google contacts as a synced local mirror table in v1.
- Wiring the feature to `google_mailboxes` because it looks newer, even though the connect flow still uses `google_connections`.
- Auto-creating leads, quotes, projects, or events during import because external CRMs sometimes let imports feed pipeline objects. This spec does not.
- Pulling Google "Other Contacts" into the first pass and accidentally turning a simple contact import into inbox-lead ingestion.
- Treating freeform Google contact notes as fully structured dietary or allergy data instead of preserving them as notes for later human review.

### Is anything assumed but not verified?

- A direct official "no additional cost" statement for Google People API itself was not verified in this session.
- Real tenant distributions of contact counts above the proposed preview cap were not verified from runtime data.
- Real-world frequency of phone-only duplicate matches was not measured, even though the schema and contact model strongly suggest it is a real edge case worth covering.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the current repo state. The code paths, data model, reuse points, failure modes, and builder traps are all pinned to verified local sources.

**If uncertain: where specifically, and what would resolve it?**

The only remaining uncertainty is external policy, not implementation: I verified the Google People API method docs and the repo-side integration path, but I did not verify a direct official pricing statement for People API itself in this session. If the developer treats "always free" as a hard launch gate that requires explicit vendor proof, resolve that with one official pricing/cost citation before build or ship Google Drive ahead of this. Official People API method docs: https://developers.google.com/people/api/rest/v1/people.connections/list
