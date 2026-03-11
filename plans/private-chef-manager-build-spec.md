# Private Chef Manager / Marketplace Hub Build Spec

Created: 2026-03-11
Owner: ChefFlow
Status: Proposed build spec

## Purpose

Define the exact build for turning ChefFlow into the operating surface for Private Chef Manager (PCM) and other marketplace-fed inquiries, while leaving the gated marketplace actions inside the marketplace itself.

This is the implementation follow-up to [private-chef-manager-expansion-roadmap.md](./private-chef-manager-expansion-roadmap.md).

## Product Rule

ChefFlow is the control tower.
PCM is still the execution surface for gated marketplace actions.

ChefFlow should:

- open the right marketplace page every time
- remember the latest known marketplace state even if PCM asks for login
- let the chef log and reconcile work without losing context
- convert marketplace clients into chef-owned repeat business after the first booking

ChefFlow should not:

- bypass PCM authentication
- auto-click or auto-submit actions inside PCM
- pretend PCM is fully replaceable where the marketplace still controls the interaction

## Current Baseline In Repo

These are the current surfaces the build must extend, not replace blindly:

- Inquiry page with latest capture card and platform link banner:
  - `app/(chef)/inquiries/[id]/page.tsx`
  - `components/inquiries/platform-link-banner.tsx`
- Marketplace command center:
  - `app/(chef)/marketplace/page.tsx`
  - `lib/marketplace/command-center-actions.ts`
  - `lib/marketplace/scorecard-actions.ts`
  - `lib/marketplace/roi-actions.ts`
- Manual / bookmarklet capture flow:
  - `app/(chef)/marketplace/capture/page.tsx`
  - `components/marketplace/take-a-chef-capture-tool.tsx`
  - `lib/integrations/take-a-chef-page-capture.ts`
  - `lib/integrations/take-a-chef-page-capture-actions.ts`
- Gmail ingestion already populating legacy marketplace fields:
  - `lib/gmail/sync.ts`
  - `lib/gmail/take-a-chef-parser.ts`
  - `lib/gmail/platform-dedup.ts`
- Existing legacy inquiry fields:
  - `inquiries.external_platform`
  - `inquiries.external_inquiry_id`
  - `inquiries.external_link`

## Definition Of Done

- Every PCM-backed inquiry in ChefFlow has one canonical marketplace record.
- The inquiry page shows latest marketplace state, last capture, next action, and all relevant deep links.
- The chef can capture a PCM page in one click from a browser extension without manually saving a bookmarklet.
- Proposal, booking, guest contact, and payout captures update ChefFlow records deterministically.
- Marketplace Command Center becomes a real PCM Hub with actionable queues.
- ChefFlow still writes legacy inquiry fields during rollout so current flows do not break.

## Build Overview

The build is four phases:

1. Data foundation
2. Inquiry operating surface
3. PCM Hub / command center
4. Conversion and post-booking follow-through

Each phase is independently shippable.

## Phase 1: Data Foundation

### Migration 1

Add `supabase/migrations/20260312000001_marketplace_platform_records.sql`

Create `platform_records`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id UUID NOT NULL`
- `platform TEXT NOT NULL`
- `channel TEXT NOT NULL`
- `inquiry_id UUID NULL`
- `event_id UUID NULL`
- `client_id UUID NULL`
- `external_request_id TEXT NULL`
- `external_order_id TEXT NULL`
- `external_inquiry_id TEXT NULL`
- `external_url TEXT NULL`
- `partner_name TEXT NULL`
- `status TEXT NOT NULL DEFAULT 'new'`
- `link_health TEXT NOT NULL DEFAULT 'unknown'`
- `last_capture_type TEXT NULL`
- `last_captured_at TIMESTAMPTZ NULL`
- `first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `latest_next_action_required TEXT NULL`
- `latest_next_action_by TEXT NULL`
- `last_action_type TEXT NULL`
- `last_action_at TIMESTAMPTZ NULL`
- `meta JSONB NOT NULL DEFAULT '{}'::jsonb`

Constraints and indexes:

- check `platform` against current marketplace channels
- check `link_health IN ('unknown', 'working', 'login_required', 'expired', 'missing')`
- unique index on `(tenant_id, platform, external_request_id)` where `external_request_id IS NOT NULL`
- unique index on `(tenant_id, platform, external_order_id)` where `external_order_id IS NOT NULL`
- index on `(tenant_id, inquiry_id)`
- index on `(tenant_id, event_id)`
- index on `(tenant_id, status, last_captured_at DESC)`

### Migration 2

Add `supabase/migrations/20260312000002_marketplace_snapshots_and_actions.sql`

Create `platform_snapshots`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `platform_record_id UUID NOT NULL`
- `tenant_id UUID NOT NULL`
- `capture_source TEXT NOT NULL`
- `snapshot_type TEXT NOT NULL`
- `page_url TEXT NULL`
- `page_title TEXT NULL`
- `raw_text TEXT NOT NULL DEFAULT ''`
- `raw_html TEXT NULL`
- `raw_links JSONB NOT NULL DEFAULT '[]'::jsonb`
- `parsed_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- `notes TEXT NULL`
- `captured_by UUID NULL`
- `captured_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Create `platform_action_log`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `platform_record_id UUID NOT NULL`
- `tenant_id UUID NOT NULL`
- `action_type TEXT NOT NULL`
- `action_source TEXT NOT NULL`
- `notes TEXT NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_by UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Constraints and indexes:

- check `capture_source IN ('gmail', 'bookmarklet', 'extension', 'manual', 'system')`
- check `snapshot_type IN ('request', 'proposal', 'booking', 'message', 'guest_contact', 'menu', 'other', 'email')`
- index on `(tenant_id, platform_record_id, captured_at DESC)`
- index on `(tenant_id, platform_record_id, created_at DESC)`

### Migration 3

Add `supabase/migrations/20260312000003_marketplace_proposals_and_payouts.sql`

Create `platform_proposals`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `platform_record_id UUID NOT NULL`
- `tenant_id UUID NOT NULL`
- `captured_snapshot_id UUID NULL`
- `version_number INTEGER NOT NULL`
- `sent_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL DEFAULT 'draft'`
- `menu_summary TEXT NULL`
- `price_cents INTEGER NULL`
- `grocery_policy TEXT NULL`
- `currency TEXT NOT NULL DEFAULT 'USD'`
- `external_url TEXT NULL`
- `meta JSONB NOT NULL DEFAULT '{}'::jsonb`

Create `platform_payouts`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `platform_record_id UUID NOT NULL`
- `tenant_id UUID NOT NULL`
- `source_snapshot_id UUID NULL`
- `external_payout_id TEXT NULL`
- `external_order_id TEXT NULL`
- `gross_cents INTEGER NULL`
- `commission_cents INTEGER NULL`
- `net_cents INTEGER NULL`
- `commission_percent NUMERIC(5,2) NULL`
- `currency TEXT NOT NULL DEFAULT 'USD'`
- `payout_date DATE NULL`
- `payout_status TEXT NOT NULL DEFAULT 'unknown'`
- `source TEXT NOT NULL DEFAULT 'gmail'`
- `notes TEXT NULL`
- `meta JSONB NOT NULL DEFAULT '{}'::jsonb`

Constraints and indexes:

- unique index on `(platform_record_id, version_number)`
- index on `(tenant_id, payout_date DESC)`
- index on `(tenant_id, external_order_id)`

### Backfill

Add `scripts/backfill-marketplace-platform-records.ts`

Responsibilities:

- backfill `platform_records` from `inquiries.external_platform`, `external_inquiry_id`, and `external_link`
- hydrate last known capture metadata from `unknown_fields.take_a_chef_page_capture`
- create initial `platform_snapshots` rows for existing captured pages where enough metadata exists
- preserve current inquiry fields as rollout compatibility data

## Phase 2: Inquiry Operating Surface

### Refactor Capture Abstractions

Generalize the current "take-a-chef" naming that already handles multiple marketplaces.

Add:

- `lib/marketplace/page-capture.ts`
- `lib/marketplace/page-capture-actions.ts`
- `lib/marketplace/platform-record-actions.ts`
- `lib/marketplace/platform-record-readers.ts`

Move or wrap current logic from:

- `lib/integrations/take-a-chef-page-capture.ts`
- `lib/integrations/take-a-chef-page-capture-actions.ts`

Rollout rule:

- first ship new marketplace-named modules
- keep old file names as wrappers for one release
- then migrate imports and delete the wrappers later

### New Inquiry UI

Add `components/inquiries/marketplace-action-panel.tsx`

This replaces the generic link banner and becomes the top marketplace work panel on inquiry pages.

Panel sections:

- platform badge and link health
- latest known marketplace status
- latest snapshot summary
- exact actions
- last capture timestamp
- fallback actions if link is stale or login is required

Primary actions:

- `Open request`
- `Open proposal`
- `Open guest contact`
- `Open booking`
- `Capture current page`
- `Mark responded`
- `Mark declined`
- `Mark waiting on client`
- `Mark booked`

Add `components/inquiries/marketplace-snapshot-card.tsx`

This replaces the current ad-hoc "Latest Marketplace Capture" rendering in the inquiry page and reads from `platform_snapshots`.

Add `components/inquiries/marketplace-link-health-badge.tsx`

States:

- `Working`
- `Login required`
- `Expired`
- `Missing`
- `Unknown`

### Inquiry Page Changes

Update `app/(chef)/inquiries/[id]/page.tsx`

Exact changes:

- replace `PlatformLinkBanner` block with `MarketplaceActionPanel`
- replace the current `tacPageCapture` card with `MarketplaceSnapshotCard`
- keep `TacWorkflowGuide`, `TacAddressLead`, `TacStatusPrompt`, and `TacMenuNudge` during phase 2
- render TAC-specific prompts below the new panel until behavior is stable

Read strategy:

- prefer `platform_records` and `platform_snapshots`
- fall back to current inquiry legacy fields and `unknown_fields` when no platform record exists yet

### Server Actions For Panel Buttons

Add `lib/marketplace/platform-ui-actions.ts`

Actions:

- `openMarketplaceLink(recordId, linkType)`
- `markMarketplaceResponded(recordId, notes?)`
- `markMarketplaceDeclined(recordId, notes?)`
- `markMarketplaceWaitingOnClient(recordId, notes?)`
- `markMarketplaceBooked(recordId, notes?)`
- `markMarketplaceLinkHealth(recordId, health)`

These actions must:

- append to `platform_action_log`
- update `platform_records.last_action_type`
- update `platform_records.last_action_at`
- keep inquiry `next_action_required` aligned where appropriate

## Phase 3: Extension And Capture Flow

### Extension MVP

Add:

- `extensions/marketplace-capture-extension/manifest.json`
- `extensions/marketplace-capture-extension/background.js`
- `extensions/marketplace-capture-extension/content.js`
- `extensions/marketplace-capture-extension/options.html`
- `extensions/marketplace-capture-extension/options.js`
- `extensions/marketplace-capture-extension/README.md`

Supported domains in MVP:

- `privatechefmanager.com`
- `takeachef.com`

MVP flow:

1. Chef clicks the extension while on a PCM page.
2. The extension duplicates the active tab.
3. The duplicate tab stores the captured payload in `window.name`.
4. The duplicate tab navigates to `/marketplace/capture?source=extension`.
5. Chef Flow ingests the payload using the same handoff model as the bookmarklet, but without requiring the chef to maintain a saved bookmark.

Reason for this approach:

- preserves the original PCM tab
- avoids fragile cross-site auth assumptions
- reuses the existing capture route shape
- is implementable without pretending the extension can bypass ChefFlow or PCM session boundaries

### Capture API

Add `app/api/integrations/marketplace/capture/route.ts`

Purpose:

- authenticated route for future direct extension submissions
- shared normalized entry point for bookmarklet, manual capture, and extension

POST request shape:

```json
{
  "source": "extension",
  "platform": "take_a_chef",
  "captureType": "proposal",
  "pageUrl": "https://www.privatechefmanager.com/...",
  "pageTitle": "Proposal sent to Jane Doe",
  "pageText": "Proposal ...",
  "pageLinks": ["https://www.privatechefmanager.com/..."],
  "notes": "",
  "context": {
    "inquiryId": null,
    "eventId": null
  }
}
```

POST response shape:

```json
{
  "success": true,
  "platformRecordId": "uuid",
  "inquiryId": "uuid",
  "eventId": "uuid",
  "captureType": "proposal",
  "matchType": "existing_inquiry",
  "redirectTo": "/inquiries/uuid"
}
```

### Capture Page Changes

Update:

- `app/(chef)/marketplace/capture/page.tsx`
- `components/marketplace/take-a-chef-capture-tool.tsx`

Rename:

- `components/marketplace/take-a-chef-capture-tool.tsx`
to
- `components/marketplace/marketplace-capture-tool.tsx`

UI changes:

- show match confidence and exact match reason
- show whether this capture created or updated a `platform_record`
- show redirect CTA to the matched inquiry
- show post-capture next action

## Phase 4: PCM Hub / Marketplace Command Center

### New Queue Model

Extend `lib/marketplace/command-center-actions.ts`

New top-level queues:

- `needsResponse`
- `waitingOnClient`
- `bookingNeedsEvent`
- `guestContactReady`
- `staleSnapshot`

Queue rules:

- `needsResponse`: platform record status in `new` or `awaiting_chef`
- `waitingOnClient`: latest action is `proposal_sent` or inquiry status is `quoted`
- `bookingNeedsEvent`: booking snapshot exists and no linked event exists
- `guestContactReady`: guest contact snapshot exists and client contact sync or follow-up is incomplete
- `staleSnapshot`: `last_captured_at` older than 72 hours, or `link_health` is `login_required`, `expired`, or `missing`

### Marketplace Command Center UI

Update `app/(chef)/marketplace/page.tsx`

Add components:

- `components/marketplace/marketplace-queue-section.tsx`
- `components/marketplace/marketplace-record-row.tsx`
- `components/marketplace/marketplace-next-action-pill.tsx`

Required surface changes:

- keep existing scorecard and ROI cards
- add queue-first operating area above scorecards
- each row must link to the inquiry page, not just the marketplace capture page
- each row must expose the best external action link if available

## Phase 5: Proposal, Booking, Contact, And Payout Sync

### Proposal Versioning

When capture type is `proposal`:

- create a `platform_snapshot`
- create or update a `platform_proposals` row
- auto-increment `version_number`
- update `platform_records.status` to `quoted` where valid
- keep inquiry status transitions deterministic and explicit

### Booking Sync

When capture type is `booking`:

- create a `platform_snapshot`
- update `platform_records.external_order_id`
- link or create the ChefFlow event
- update `platform_records.event_id`
- update inquiry `converted_to_event_id` for compatibility

### Guest Contact Sync

When capture type is `guest_contact`:

- create a `platform_snapshot`
- merge real email and phone into the client record
- append a `platform_action_log` entry
- mark queue state as completed once contact details are fully synced

### Payout Sync

Continue parsing payout emails in `lib/gmail/sync.ts`, but stop treating them as inquiry-only metadata.

New behavior:

- create or update `platform_payouts`
- link payout rows to the canonical `platform_record`
- preserve current finance compatibility behavior
- surface payout reconciliation on both inquiry and event pages

## Post-Booking Conversion Layer

After the first completed marketplace booking, ChefFlow should immediately start the "convert to direct" sequence.

Add:

- `lib/marketplace/direct-conversion-actions.ts`
- updates to `components/events/marketplace-convert-banner.tsx`

Sequence:

- generate direct booking link
- generate worksheet or portal invite if needed
- schedule rebook reminder
- schedule review request workflow

This phase builds on existing marketplace ROI and conversion surfaces rather than replacing them.

## Testing

Add or update:

- `tests/unit/marketplace-page-capture.test.ts`
- `tests/unit/platform-record-actions.test.ts`
- `tests/unit/platform-command-center-queues.test.ts`
- `tests/unit/gmail-marketplace-backfill.test.ts`

Key cases:

- PCM request link becomes one canonical platform record
- booking capture updates the same record instead of creating duplicates
- proposal version numbers increment correctly
- guest contact capture fills placeholder clients safely
- stale snapshot queue flags records with missing or login-gated links

## Rollout Strategy

### Release 1

- ship schema
- ship write-through helpers
- keep reading legacy inquiry fields by default

### Release 2

- ship inquiry action panel and new snapshot card
- write to both legacy inquiry fields and `platform_records`
- start reading `platform_records` first when present

### Release 3

- ship extension MVP
- ship queue-first command center
- start treating `platform_records` as the main marketplace source of truth

### Release 4

- ship proposal history, payouts, and direct-conversion workflow
- remove UI dependence on `unknown_fields.take_a_chef_page_capture`

## Tracked Tasks

- [ ] Create `platform_records`
- [ ] Create `platform_snapshots`
- [ ] Create `platform_action_log`
- [ ] Create `platform_proposals`
- [ ] Create `platform_payouts`
- [ ] Add marketplace backfill script
- [ ] Add generic marketplace capture library
- [ ] Add generic marketplace capture actions
- [ ] Add inquiry `MarketplaceActionPanel`
- [ ] Add inquiry `MarketplaceSnapshotCard`
- [ ] Replace `PlatformLinkBanner` usage on inquiry page
- [ ] Rename TAC capture UI to marketplace naming
- [ ] Add extension MVP
- [ ] Add authenticated marketplace capture API route
- [ ] Add queue-first Marketplace Command Center
- [ ] Add payout reconciliation on canonical marketplace records
- [ ] Add direct-conversion automation follow-through

## Immediate Build Order

Sprint 1:

- migrations
- backfill
- marketplace capture refactor

Sprint 2:

- inquiry action panel
- snapshot card
- queue data model in command center

Sprint 3:

- extension MVP
- proposal history
- payout reconciliation

Sprint 4:

- guest-contact completion flow
- direct-conversion workflow
- cleanup of legacy TAC-only naming

## Explicit Non-Goals

- no headless PCM automation
- no attempt to bypass PCM login
- no generic CRM abstraction that hides marketplace-specific states
- no broad multi-platform parity work before PCM / TAC is solid
