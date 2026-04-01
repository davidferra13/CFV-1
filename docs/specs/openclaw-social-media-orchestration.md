# Spec: OpenClaw-Assisted Social Orchestration

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                                          | Date                 | Agent/Session              | Commit |
| ---------------------------------------------- | -------------------- | -------------------------- | ------ |
| Created                                        | 2026-04-01 01:20 EDT | Codex research session     |        |
| Current-state audit completed                  | 2026-04-01 01:59 EDT | Planner + Research (Codex) |        |
| Developer-notes expansion and build-order pass | 2026-04-01 01:59 EDT | Planner + Research (Codex) |        |
| Status: ready                                  | 2026-04-01 01:59 EDT | Planner + Research (Codex) |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer wants to remove the daily burden of social media posting from a business owner. They do not want a system where someone has to open Instagram, TikTok, and Facebook every day and manually click through posting flows. They want to be able to sit down once, or in a few focused sessions, build a long horizon of posts from real food photos and videos, and have those posts scheduled and ready to go.

They are specifically worried about Instagram, Facebook, and TikTok. They are not worried about YouTube right now. The strongest constraint is platform safety. They do not want bans, shady automation, password sharing, browser bots, or anything that depends on brittle hacks.

The developer also kept asking a plain-language systems question: when the owner posts manually, the platform UI makes it look complicated, so how can software "just post"? The important intent behind that question is that the system needs to explain and embody the real boundary: software should publish through official APIs, not by pretending to click the same buttons a human sees.

They also wanted the OpenClaw role clarified. They do not want to build a giant media-editing suite inside ChefFlow unless it is truly necessary. Their current instinct is that ChefFlow should be the place where finished assets, post metadata, approvals, schedule, and official publishing live. OpenClaw should be the worker that prepares the assets, drafts the descriptions, chooses tags and labels, and helps fill the calendar. They are open to stock imagery only in limited support cases, such as seasonal atmosphere or decorative non-food visuals. They do not want stock food photography replacing their real work.

They explicitly asked for a full scan and a truthful hierarchy:

- what is already built
- what is actually verified
- what is missing
- what is drifting or misleading
- what should be built now
- what can wait until later

They also wanted all of this saved as permanent spec, research, and memory artifacts rather than left inside chat.

### Developer Intent

- **Core goal:** Build a set-it-and-forget-it social operations system where OpenClaw does the repetitive planning and content labor, and ChefFlow safely stores, schedules, approves, and publishes through official platform paths.
- **Key constraints:** No password sharing, no browser-bot posting, no fake "supports everything" marketing copy, no heavy in-app media editor unless clearly justified, and real chef-owned food media should be the default creative source.
- **Motivation:** Daily social posting is operational drag that should be systematized without increasing platform risk.
- **Success from the developer's perspective:** The owner can hand OpenClaw photos, videos, seasonal themes, holiday ideas, and campaign direction, then review or tweak a queue inside ChefFlow while the day-to-day posting burden mostly disappears.

---

## What This Does (Plain English)

This turns ChefFlow's existing `/social` system into the durable control tower for social operations. OpenClaw prepares the content package, meaning finished media, captions, hashtags, CTA, tags, and platform targets. ChefFlow stores that package, shows whether each platform can safely auto-publish or only draft/handoff, holds the schedule, and uses official OAuth-connected APIs to publish supported posts at the right time.

---

## Why It Matters

The repo already has real social scheduling and publishing infrastructure, but it still behaves like a partial internal tool in some places and over-promises full automation in others. This spec closes that gap by making the system truthful, safe, and delegable.

---

## Current Truth

### ChefFlow Can Already Do This

- Generate a year-scale slot calendar and reserve holdout slots for timely content.
- Store posts, captions, hashtags, CTA, location, alt text, and media references.
- Store uploaded photos and videos in a reusable social vault.
- Connect platform accounts through OAuth and store encrypted credentials.
- Run a scheduled publish engine against official platform adapters.

### ChefFlow Does Not Yet Prove This

- A real in-app social media editor with crop, trim, text overlay, or OpusClip-style transformations.
- A policy-aware preflight that understands platform-specific unsupported features.
- Truthful "automatic on every platform" behavior for every post type the UI implies.
- A verified OpenClaw-to-ChefFlow ingestion path for prepared social packages.

### OpenClaw's Correct Role

- OpenClaw should be the operator and content-prep layer.
- ChefFlow should be the system of record, approval layer, queue, and official publisher.
- External media tools can still exist. ChefFlow does not need to become a full creative studio in this phase.

---

## Files to Create

| File                                               | Purpose                                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/social/platform-policy.ts`                    | Central capability matrix for each supported social platform, including delivery mode, supported media types, hard blockers, and warning rules. |
| `lib/social/publishability.ts`                     | Pure logic that combines post data, asset facts, connection state, and policy rules into a per-platform delivery assessment.                    |
| `lib/social/openclaw-ingest.ts`                    | Normalized ingestion boundary for OpenClaw-prepared social packages so ChefFlow can create or update posts without custom one-off glue.         |
| `components/social/social-delivery-mode-panel.tsx` | Shared UI panel that shows per-platform delivery mode, blockers, warnings, and what the user or OpenClaw must fix before queueing.              |

---

## Files to Modify

| File                                               | What to Change                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/social/layout.tsx`                     | Replace blanket "posts automatically on every platform" language with accurate system-of-record wording.                                     |
| `app/(chef)/social/connections/page.tsx`           | Replace blanket automatic-posting copy with truthful connection and delivery-mode messaging.                                                 |
| `app/(chef)/social/calendar/page.tsx`              | Fix redirect shape so calendar month routing matches the actual planner route contract.                                                      |
| `app/(chef)/social/templates/page.tsx`             | Point at the correct templates table or explicitly park this page until the data source is aligned.                                          |
| `app/(chef)/social/compose/[eventId]/page.tsx`     | Either align event-compose with the current planner model or clearly fence it as a separate draft-only flow.                                 |
| `components/social/social-connections-manager.tsx` | Show platform requirements, draft-only states, and explicit "connected but not fully auto-publishable" messaging.                            |
| `components/social/social-post-editor.tsx`         | Add delivery-mode assessment to the editor, block queueing on platform-specific blockers, and expose OpenClaw-ingested package data cleanly. |
| `components/social/social-post-preflight.tsx`      | Expand from generic missing-item pills to platform-specific blockers, warnings, and next actions.                                            |
| `components/social/social-platform-preview.tsx`    | Add capability and unsupported-feature hints instead of only caption-length preview.                                                         |
| `components/social/social-queue-settings-form.tsx` | Align `posts_per_week` controls with server validation and clarify queue behavior vs actual platform publishability.                         |
| `lib/social/types.ts`                              | Add delivery-mode, platform-policy, and OpenClaw-package types.                                                                              |
| `lib/social/actions.ts`                            | Integrate platform-aware preflight, align validation limits, and wire OpenClaw ingestion into existing post/asset workflows.                 |
| `lib/social/preflight-check.ts`                    | Fold privacy/disclosure warnings into the actual queue and publish decision path.                                                            |
| `lib/social/event-social-actions.ts`               | Resolve or fence schema drift around `event_id` and `slot_number`, and stop treating this flow as a silently safe path until verified.       |
| `lib/social/oauth-actions.ts`                      | Expose enough connection metadata for the editor and connections screen to compute truthful readiness.                                       |
| `lib/social/publishing/engine.ts`                  | Respect delivery mode and skip platforms that are manual, blocked, or draft-only rather than trying to publish them.                         |
| `lib/social/publishing/adapters/meta.ts`           | Make supported media-type behavior explicit and fail clearly on unsupported combinations.                                                    |
| `lib/social/publishing/adapters/tiktok.ts`         | Reflect current product policy for TikTok, including draft-only or blocked modes when direct posting is not approved.                        |

---

## Database Changes

None in phase 1.

### New Tables

None.

### New Columns on Existing Tables

None required for the first pass. Reuse existing `status`, `platforms`, `additional_data`, `preflight_ready`, and `preflight_missing_items` unless a later implementation proves they are insufficient.

### Migration Notes

- Phase 1 should stay additive and avoid schema churn.
- Do not introduce new persistence until the policy layer and route/schema drift are resolved.
- If later work truly needs persistence, prefer explicit additive columns over generic JSON overload.

---

## Data Model

The existing persistent model is mostly strong enough for phase 1:

- **`social_queue_settings`** remains the yearly cadence record.
- **`social_posts`** remains the source of truth for scheduled posts.
- **`social_media_assets`** and **`social_post_assets`** remain the asset vault and attachment model.
- **`social_platform_credentials`** remains the encrypted OAuth credential store.

Phase 1 adds two important application-level concepts without a required schema migration:

1. **`PlatformDeliveryAssessment`**  
   Computed, not stored. Fields should include:
   - `platform`
   - `isConnected`
   - `deliveryMode` = `auto_publish | upload_as_draft | partner_handoff | manual_handoff | blocked`
   - `blockers: string[]`
   - `warnings: string[]`
   - `supportedMediaTypes`
   - `canQueue`

2. **`OpenClawSocialPackage`**  
   Normalized handoff object from OpenClaw into ChefFlow. Fields should include:
   - target post or slot identifier
   - asset references or upload payloads
   - title
   - master caption and per-platform caption overrides
   - hashtags
   - CTA
   - mentions
   - location
   - notes
   - intended platforms
   - provenance metadata such as `source = tenant_media | approved_support_stock`

Important phase-1 policy decision:

- ChefFlow is the system of record and publisher.
- OpenClaw is an upstream operator that prepares content and feeds ChefFlow.
- ChefFlow is not a full creative studio in this phase.

---

## Server Actions

| Action                                 | Auth                                                | Input                                  | Output                                                       | Side Effects                                              |
| -------------------------------------- | --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| `getSocialPlannerData(targetYear?)`    | `requireChef()`                                     | `{ targetYear?: number }`              | existing planner payload plus per-platform readiness context | None                                                      |
| `updateSocialPost(postId, input)`      | `requireChef()`                                     | existing post-edit payload             | updated post plus refreshed preflight state                  | Revalidates `/social`                                     |
| `uploadSocialAsset(formData)`          | `requireChef()`                                     | uploaded file + optional tags/metadata | stored `SocialMediaAsset`                                    | Uploads asset, revalidates `/social`                      |
| `attachSocialAssetToPost(input)`       | `requireChef()`                                     | `{ post_id, asset_id, is_primary }`    | `SocialPostAssetLink`                                        | Updates primary media, revalidates `/social`              |
| `exportSocialPlatformWindowCsv(input)` | `requireChef()`                                     | `{ platform }`                         | `{ csv, filename, count, windowDays }`                       | None                                                      |
| `getSocialConnections()`               | `requireChef()`                                     | none                                   | connection status for all supported platforms                | None                                                      |
| `ingestOpenClawPackage(input)`         | internal trusted caller or `requireChef()` fallback | normalized OpenClaw package payload    | `{ success, postId, createdAssetIds, blockers }`             | Creates or updates posts/assets, revalidates `/social`    |
| `runPublishingEngine()`                | cron only                                           | none                                   | `{ processed, succeeded, failed, skipped, errors }`          | Publishes supported queued posts, records success/failure |

Phase-1 approval decision:

- Use the existing `approved` status as the owner-approval checkpoint.
- `queued` means "approved and publishable through this platform's current delivery mode," not just "user clicked queue."

---

## UI / Component Spec

### Page Layout

Keep the existing `/social` layout and do not build a separate scheduler product. The main surfaces remain:

- Planner
- Settings
- Connections
- Vault
- Post editor

Add a single shared readiness panel pattern so every post shows:

- target platforms
- current delivery mode per platform
- blockers
- warnings
- whether the post can truly move from `approved` to `queued`

### States

- **Loading:** use the current page-level loading and existing editor shell.
- **Empty:** if there are no posts, point the user to generate a yearly plan and upload source assets.
- **Error:** show exact platform or connection blockers; never collapse everything into a generic "publish failed" message.
- **Populated:** every post shows both content completeness and platform readiness.

### Interactions

- Uploading assets stays in the vault and remains simple. No new in-app media editor in phase 1.
- Editing a post updates captions, tags, location, alt text, platforms, and notes as today, but now also shows delivery mode per platform.
- Moving a post to `approved` is the owner's "yes, this package is ready" checkpoint.
- Moving a post to `queued` runs policy-aware preflight:
  - generic completeness
  - connection state
  - supported media type
  - privacy/disclosure warnings
  - platform-specific delivery mode
- If one platform is blocked but others are safe, the UI must say exactly which platform is blocked and why. Do not silently pretend the entire post is queueable everywhere.
- OpenClaw-ingested packages should land as editable ChefFlow posts, not hidden system records. The owner must always be able to review and adjust them.

---

## Edge Cases and Error Handling

| Scenario                                                               | Correct Behavior                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Instagram or Facebook connection is missing                            | Show explicit connection blocker and prevent queueing for that platform.                                              |
| TikTok post is not safe for current direct-publish mode                | Downgrade to `upload_as_draft`, `manual_handoff`, or `blocked`; do not claim full autopublish.                        |
| Post is generically complete but violates privacy/disclosure rules     | Keep it out of `queued` and show specific disclosure blockers.                                                        |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` is missing in deployment                 | Treat OAuth as a hard environment blocker; do not treat connect failures as user mistakes.                            |
| User wants 14 posts per week                                           | Validation and UI must agree on whether that is supported.                                                            |
| Event-compose flow depends on fields not proven by current schema      | Fence it as unverified or repair it before builders rely on it.                                                       |
| OpenClaw proposes stock food photography                               | Reject by default; allow only tenant-owned food media unless the developer later defines an explicit override policy. |
| OpenClaw proposes support imagery such as leaves, decor, or atmosphere | Allow if provenance is explicit and it is clearly not representing the chef's food output.                            |

---

## Execution Order

### Must Build Now

1. **Truth and drift repairs**
   - Fix copy that over-promises universal autopublishing.
   - Fix route and table drift that will mislead builders and users.
   - Align `posts_per_week` validation across UI and server.

2. **Policy layer**
   - Add central platform capability and delivery-mode logic.
   - Wire policy-aware preflight into queueing.
   - Make the editor and connections UI display that truth.

3. **System boundary**
   - Define the OpenClaw-to-ChefFlow package boundary.
   - Keep ChefFlow as vault, queue, approval, and publish layer.
   - Keep OpenClaw as content-prep operator.

### Should Build Next

1. **Publishing hardening**
   - Normalize Meta adapter behavior.
   - Add explicit TikTok direct-vs-draft gating.
   - Make the engine skip blocked/manual platforms cleanly.

2. **OpenClaw handoff**
   - Let OpenClaw create or update posts and attach prepared assets through a single normalized ingestion path.

### Can Wait

1. **Heavy in-app creative tooling**
   - Crop, trim, overlay, captions-on-video, or an OpusClip-style editor.

2. **Advanced trend-reactive automation**
   - Trend discovery, dynamic slot refill, seasonal image generation, or automatic creative transformations.

3. **Stock-asset policy engine**
   - Formal provenance and approval rules for non-food support imagery beyond the initial builder guidance.

---

## Verification Steps

1. Connect Instagram and Facebook through `/social/connections`. Verify the connection flow completes and the UI shows connected status.
2. Generate a yearly plan in `/social/settings`. Verify the resulting planner populates with scheduled posts and holdout slots.
3. Open a post editor, attach media, add captions, hashtags, CTA, mentions, location, and alt text. Verify the readiness panel updates.
4. Try queueing a post with one safe platform and one blocked platform. Verify the UI explains the split instead of pretending both will publish.
5. Try queueing a TikTok non-video post under the current policy. Verify the system blocks or downgrades the platform instead of silently accepting it.
6. Run the scheduled publish route in a non-production environment. Verify only truly queueable platforms are attempted and failures are recorded per platform.
7. Ingest one OpenClaw-prepared package. Verify it lands as a normal editable ChefFlow post with attached assets and readable provenance notes.

---

## Out of Scope

- A full creative studio inside ChefFlow
- Browser automation against consumer social-media UIs
- Password-based posting workflows
- Stock food-photo generation as a normal default
- Claiming full TikTok autopublishing before live compliance and deployment verification
- Building a separate scheduler product outside the existing `/social` system

---

## Notes for Builder Agent

- Do not rebuild the scheduler. Extend the existing planner, vault, editor, OAuth, and publishing engine.
- Make the system boundary explicit: OpenClaw prepares content; ChefFlow stores and publishes it.
- Treat "approved" as the human sign-off checkpoint and "queued" as "safe for this platform's current delivery mode."
- Keep the first pass additive and conservative. Repair truthfulness and policy before adding more feature surface.
- Verify deployment env before touching OAuth flows. `SOCIAL_TOKEN_ENCRYPTION_KEY` is a hard dependency.
- Prefer real chef-owned food media. Support imagery is acceptable only for non-food atmosphere or seasonal context and should remain explicit.

---

## Spec Validation

### 1. Does a real social planner already exist, or is this greenfield?

It already exists. The planner page, planner data action, queue settings table, and yearly post table are all present in `app/(chef)/social/planner/page.tsx:8-44`, `lib/social/actions.ts:895-921`, `database/migrations/20260224000014_social_content_queue.sql:44-64`, and `database/migrations/20260224000014_social_content_queue.sql:69-114`.

### 2. Can ChefFlow already store assets, edit posts, connect accounts, and auto-publish?

Yes, in a partial but real form. Vault upload and asset tagging are in `components/social/social-vault-browser.tsx:58-72` and `components/social/social-vault-browser.tsx:214-312`. Post editing exists in `components/social/social-post-editor.tsx:336-398`, `components/social/social-post-editor.tsx:403-499`, and `components/social/social-post-editor.tsx:503-735`. OAuth connection flow exists in `app/api/integrations/social/connect/[platform]/route.ts:17-105`, `app/api/integrations/social/callback/[platform]/route.ts:142-358`, and `lib/social/oauth/token-store.ts:154-179`. Scheduled publishing exists in `app/api/scheduled/social-publish/route.ts:10-37` and `lib/social/publishing/engine.ts:219-260`.

### 3. What is already wrong or drifting today?

Several things:

- Marketing copy overstates universal autopublishing in `app/(chef)/social/layout.tsx:15-18`, `app/(chef)/social/connections/page.tsx:17-20`, and `components/social/social-connections-manager.tsx:131-137`.
- Calendar routing is mismatched between `app/(chef)/social/calendar/page.tsx:18-22` and `app/(chef)/social/planner/[month]/page.tsx:24-29`.
- Templates page points at the wrong table in `app/(chef)/social/templates/page.tsx:17-21`, while the migration creates `social_templates` in `database/migrations/20260401000040_social_templates.sql:2-18`.
- `posts_per_week` validation disagrees across layers in `lib/social/actions.ts:38-58`, `components/social/social-queue-settings-form.tsx:141-177`, and `database/migrations/20260224000014_social_content_queue.sql:55-60`.
- Event-social flow assumes schema that is not proven by the inspected `social_posts` type and base migration in `lib/social/event-social-actions.ts:94-110`, `lib/social/event-social-actions.ts:288-294`, `database/migrations/20260224000014_social_content_queue.sql:69-114`, and `types/database.generated.d.ts:27335-27437`.

### 4. Is OpenClaw social generation already built in this repo?

Not verified. The verified OpenClaw system is a multi-agent platform documented in `docs/research/raspberry-pi-full-audit.md:239-257`, and the repo-local OpenClaw modules I verified are non-social examples such as `lib/openclaw/trend-forecaster.ts:1-9`. This spec therefore treats OpenClaw social orchestration as a new integration boundary, not an already-finished repo feature.

### 5. Is ChefFlow already a media editor?

Not verified. What is verified is vault upload, basic metadata editing, and post-asset attachment in `components/social/social-vault-browser.tsx:58-72`, `components/social/social-vault-browser.tsx:214-312`, and `components/social/social-post-editor.tsx:503-601`. I did not verify crop, trim, overlay, or timeline-style editing in the social UI scan, so this spec intentionally keeps heavy creative editing out of scope for phase 1.

### 6. What would a builder get wrong building this as written?

- They might rebuild a scheduler from scratch instead of extending the existing `/social` stack.
- They might treat ChefFlow as the creative studio instead of the system of record and publisher.
- They might keep or add blanket "auto-publishes everywhere" copy even though the current adapters and policies do not justify it.
- They might try to "fix" TikTok by brute-forcing unsupported direct-post behavior instead of formalizing draft/manual/blocked modes.
- They might trust the event-social compose flow or templates page as stable references even though both have verified drift.

### 7. Is anything assumed but not verified?

Yes.

- Live deployment env for social OAuth is not verified here. `SOCIAL_TOKEN_ENCRYPTION_KEY` is a hard runtime dependency in `lib/social/oauth/crypto.ts:9-23`.
- Live tenant data compatibility for the event-social flow is not verified. The code references `event_id`, but the inspected `social_posts` type block does not show it in `types/database.generated.d.ts:27335-27437`.
- Full TikTok direct-post compliance for this product is not verified here. Current repo code is still explicitly video-only in `lib/social/publishing/adapters/tiktok.ts:1-4` and `lib/social/publishing/adapters/tiktok.ts:23-29`.
- In-app creative tooling beyond upload/tag/link is not verified and is intentionally not assumed.
