# Spec: Platform Intelligence Hub

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (60+ files across 14 phases)
> **Created:** 2026-03-29
> **Built by:** not started

---

## What This Does (Plain English)

ChefFlow becomes the single command center for every third-party platform a chef uses. Today, chefs juggle TakeAChef, Private Chef Manager, Thumbtack, Bark, Cozymeal, TheKnot, GigSalad, and others. They log into each platform separately, miss response deadlines, quote without knowing their take-home after commission, and can't tell which platforms actually make them money. This spec eliminates all of that.

After this is built: a chef connects Gmail, selects which platforms they're active on, and ChefFlow automatically captures every inquiry from every platform. Each inquiry shows a response deadline countdown. The quote builder shows net take-home after commission. A dashboard shows which platforms are worth the chef's time. When the same person inquires through two different platforms, ChefFlow detects it and suggests a merge. When a chef wants to respond, ChefFlow drafts the message and deep-links them straight to the right conversation on the platform.

This works for every chef who creates a ChefFlow account. Not a personal tool. A product feature.

---

## Why It Matters

Chefs lose leads because they're spread across 5-10 platforms with no unified view. They lose money because they quote without factoring commission. They waste hours logging into platforms that don't convert. This is the #1 operational pain point across the entire private chef industry, and no competitor solves it.

---

## Architecture: 12 Phases

Each phase is independently buildable and shippable. Phases are ordered by dependency, not priority. A builder agent should build them in order but can mark each phase as a standalone deliverable.

---

## Phase 1: Platform Settings Generalization

**Goal:** Replace TakeAChef-specific settings with a generic "My Platforms" configuration that works for every platform.

### Files to Modify

| File                                             | What to Change                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/marketplace/platforms.ts`                   | Add 5 missing platforms: privatechefmanager (2.9% commission), hireachef (0%, directory), cuisineistchef (15% est.), google_business (0%), wix (0%). Add `slaHours` field to MarketplacePlatform type. Add `deepLinkTemplate` field (nullable string).                                                            |
| `lib/integrations/take-a-chef-settings.ts`       | Rename to `platform-settings.ts`. Generalize to read/write per-platform config from `integration_connection_settings` JSONB. Keep backward compat: existing `take_a_chef` key still works. New structure: `{ platforms: { [channel]: { active: boolean, commissionPercent: number, customSlaHours?: number } } }` |
| `lib/integrations/take-a-chef-defaults.ts`       | Rename to `platform-defaults.ts`. Replace hardcoded TAC dates with generic `getDefaultCommissionPercent(channel, referenceDate?)` that reads from MARKETPLACE_PLATFORMS registry. Keep `getDefaultTakeAChefCommissionPercent()` as a thin wrapper for backward compat.                                            |
| `components/integrations/take-a-chef-setup.tsx`  | Rename to `platform-setup.tsx`. Replace single-platform card with multi-platform setup. Show all platforms from MARKETPLACE_PLATFORMS. Each has: toggle (active/inactive), commission % input, platform icon/label. Keep the 3-state Gmail connection flow (not connected / scanning / connected).                |
| `app/(chef)/settings/integrations/page.tsx`      | Wire new `PlatformSetup` component instead of `TakeAChefSetup`. Pass full platform list + per-chef settings.                                                                                                                                                                                                      |
| `components/inquiries/inquiries-filter-tabs.tsx` | Replace hardcoded TAC + Yhangry buttons (lines 70-87) with dynamic platform filter. Read active platforms from chef's settings. Use a dropdown/select when >4 platforms active (avoids crowded button row).                                                                                                       |

### Files to Create

| File                                         | Purpose                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `lib/integrations/platform-settings.ts`      | Generic get/update platform settings server actions (replaces take-a-chef-settings.ts) |
| `lib/integrations/platform-defaults.ts`      | Default commission/SLA per platform (replaces take-a-chef-defaults.ts)                 |
| `components/integrations/platform-setup.tsx` | Multi-platform configuration card (replaces take-a-chef-setup.tsx)                     |

### Database Changes

```sql
-- Add active_platforms convenience column (denormalized from JSONB for query speed)
-- The JSONB integration_connection_settings remains the source of truth
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS active_platforms text[] DEFAULT '{}';
```

### Server Actions

| Action                              | Auth            | Input                                                                                        | Output                                                                          | Side Effects                                                           |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `getChefPlatformSettings()`         | `requireChef()` | none                                                                                         | `{ platforms: Record<channel, { active, commissionPercent, customSlaHours }> }` | none                                                                   |
| `updateChefPlatformSettings(input)` | `requireChef()` | `{ channel: string, active?: boolean, commissionPercent?: number, customSlaHours?: number }` | `{ success: boolean, error?: string }`                                          | Revalidates `/settings/integrations`, updates `active_platforms` array |
| `getActivePlatforms()`              | `requireChef()` | none                                                                                         | `string[]`                                                                      | none (cached)                                                          |

### UI Spec

**Settings > Integrations page:**

- **Gmail Connection** section (existing, unchanged)
- **My Platforms** section (new):
  - Grid of platform cards, one per MARKETPLACE_PLATFORMS entry
  - Each card shows: platform icon, name, tier badge (major/lead_gen/niche)
  - Toggle switch: active/inactive
  - When active: commission % input (pre-filled from MARKETPLACE_PLATFORMS default), optional SLA override
  - When inactive: grayed out, no inputs
  - "Active platforms appear in your inquiry filters and analytics"
- **States:**
  - Loading: skeleton cards
  - Empty: all platforms inactive, guidance text "Select the platforms where you accept inquiries"
  - Error: DataError component (never fake zeros)

### Backward Compatibility

The existing `getTakeAChefIntegrationSettings()` and `updateTakeAChefIntegrationSettings()` must continue to work during migration. The new `platform-settings.ts` reads from the same JSONB column. Old `take_a_chef` nested key is read as a fallback. New writes use the `platforms.take_a_chef` structure.

---

## Phase 2: Parser Hardening + Historical Backfill

**Goal:** Get all 12 parsers to production quality. Auto-trigger historical backfill on first Gmail connect.

### Files to Modify

| File                                     | What to Change                                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gmail/privatechefmanager-parser.ts` | Tune regex patterns with real email samples. Remove "Parser needs real email samples" warnings once verified. Target: extract clientName, eventDate, guestCount, location, occasion, budget, dietary from new lead emails. |
| `lib/gmail/hireachef-parser.ts`          | Same as above. Note: HireAChef is a directory (USPCA), emails may be direct contact rather than platform-mediated. Parser should handle both notification-style and direct-contact-style emails.                           |
| `lib/gmail/cuisineistchef-parser.ts`     | Same as above. Extra: conciergeNote field (line 33) is unique to this parser. Luxury platform may use more verbose email templates.                                                                                        |
| `lib/gmail/historical-scan.ts`           | Add auto-trigger logic: when `google_connections.historical_scan_status` is null AND `gmail_connected` just became true, start first batch automatically. Add progress tracking fields for UI display.                     |
| `lib/gmail/sync.ts`                      | After successful Gmail OAuth connect callback, call `triggerInitialHistoricalScan(chefId)`.                                                                                                                                |

### Files to Create

| File                                                   | Purpose                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/gmail/parser-feedback.ts`                         | When a parser fails to extract expected fields, log to `parser_feedback_log` table. Surface in admin dashboard for parser improvement. Also powers "help us improve" prompt to chef. |
| `components/integrations/historical-scan-progress.tsx` | Progress bar + stats during initial backfill: "Scanning your inbox... found 47 platform emails. Processing..."                                                                       |

### Database Changes

```sql
-- Parser feedback log for continuous improvement
CREATE TABLE IF NOT EXISTS parser_feedback_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  gmail_message_id text NOT NULL,
  email_subject text,
  email_from text,
  fields_extracted jsonb DEFAULT '{}',
  fields_missing text[] DEFAULT '{}',
  chef_correction jsonb, -- chef can manually correct parsed fields
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, gmail_message_id, platform)
);

CREATE INDEX idx_parser_feedback_platform ON parser_feedback_log(platform, created_at DESC);
```

### Sample Collection Mechanism

The settings UI should include, for each active platform: "Forward a recent email from [Platform] to parserfeedback@cheflowhq.com to help us improve detection." This is optional, non-blocking, and helps tune parsers across all chef accounts.

Alternatively (and preferably), when a parser partially fails (extracts <50% of expected fields), the inquiry detail page shows: "We couldn't read all details from this [Platform] email. [View raw email] [Report issue]". The "Report issue" button logs to `parser_feedback_log` with the extracted fields and what's missing.

---

## Phase 3: Response SLA Tracking

**Goal:** Each inquiry shows a platform-specific response deadline. Stale lead alerts respect per-platform SLA.

### Files to Modify

| File                                     | What to Change                                                                                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/scheduled/stale-leads/route.ts` | Replace flat `STALE_THRESHOLD_HOURS = 24` (line 18) with per-platform lookup from MARKETPLACE_PLATFORMS.slaHours. Fall back to 24h if not configured.                                    |
| `lib/gmail/sync.ts`                      | When creating an inquiry from a platform email, set `first_response_at` to null. When a chef sends the first outbound message on a platform inquiry, record `first_response_at = now()`. |
| `lib/messages/actions.ts`                | In `createMessage()`, when message is outbound and inquiry.first_response_at is null, set it.                                                                                            |
| `app/(chef)/inquiries/[id]/page.tsx`     | Show SLA badge next to platform source badge.                                                                                                                                            |

### Files to Create

| File                                          | Purpose                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/integrations/platform-sla.ts`            | `getSlaConfig(channel)` returns `{ slaHours, urgency }`. `computeSlaStatus(inquiry)` returns `{ hoursRemaining, status: 'ok' \| 'warning' \| 'overdue' }`. |
| `components/inquiries/platform-sla-badge.tsx` | Countdown badge: green (>50% time left), yellow (<50%), red (overdue). Shows "Respond within 6h" or "2h overdue".                                          |

### Database Changes

```sql
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;
```

### Default SLA Values

| Platform           | SLA Hours | Source                                              |
| ------------------ | --------- | --------------------------------------------------- |
| take_a_chef        | 24        | Platform penalizes slow responders                  |
| thumbtack          | 4         | Lead credits expire, fast response = higher ranking |
| bark               | 24        | Credits model, but less time-sensitive              |
| cozymeal           | 24        | Standard marketplace                                |
| yhangry            | 24        | Standard marketplace                                |
| theknot            | 48        | Wedding inquiries are less urgent                   |
| gigsalad           | 24        | Standard marketplace                                |
| privatechefmanager | 24        | Default (needs verification)                        |
| hireachef          | 48        | Directory model, less urgent                        |
| cuisineistchef     | 24        | Concierge-mediated                                  |
| google_business    | 24        | Google penalizes slow GBP responses                 |
| wix                | 48        | Self-hosted, no platform penalty                    |

All values are chef-overridable via Phase 1 settings (`customSlaHours`).

---

## Phase 4: Cross-Platform Client Merge Suggestions

**Goal:** When a new inquiry arrives and matches an existing client from a different platform, auto-suggest a merge.

### Files to Modify

| File                                     | What to Change                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gmail/sync.ts`                      | After creating a new inquiry + client, call `checkCrossPlatformMatch()`. If match found, create an in-app notification with merge suggestion.                                                             |
| `lib/clients/cross-platform-matching.ts` | Add `checkCrossPlatformMatch(newClientId, tenantId)` that runs `findPotentialClientMatches()` filtered to different channels only. Returns top match if confidence is high enough (email or phone match). |

### Files to Create

| File                                                       | Purpose                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `components/inquiries/cross-platform-merge-suggestion.tsx` | Banner on inquiry detail page: "This looks like [Client Name] who inquired through [Other Platform] on [Date]. [Merge clients] [Dismiss]" |

### No Database Changes

Uses existing `client_merge_log` table and `mergeClients()` function from `cross-platform-matching.ts:109-191`.

### Merge Logic

Only suggest merges when confidence is high:

- **Email match** (case-insensitive exact): always suggest
- **Phone match** (normalized): always suggest
- **Name-only match**: do NOT auto-suggest (too many false positives). Log for admin review.

Suggestion is a non-blocking notification + banner. Chef decides. Never auto-merge.

---

## Phase 5: Commission-Adjusted Quote Preview

**Goal:** When a chef builds a quote for a platform inquiry, show net take-home after commission.

### Files to Modify

| File                                                                                  | What to Change                                                                                                                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote builder component (find via `docs/app-complete-audit.md` - quote creation form) | Add commission preview section when inquiry.channel is a marketplace platform. Show: gross quote, platform fee (%), platform fee ($), net take-home. |

### Files to Create

| File                                       | Purpose                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/quotes/commission-preview.tsx` | Standalone component. Inputs: `quoteTotalCents`, `channel`, `commissionPercent`. Outputs: formatted breakdown.                                                                                                                       |
| `lib/quotes/commission-calculator.ts`      | `calculateCommissionBreakdown(totalCents, channel, chefOverridePercent?)` returns `{ gross, commissionPercent, commissionCents, netCents }`. Reads from chef's platform settings first, falls back to MARKETPLACE_PLATFORMS default. |

### No Database Changes

Commission data already exists in `platform_payouts` and chef's `integration_connection_settings`.

### UI Spec

When the inquiry's channel is a marketplace platform, show below the quote total:

```
Platform: Take a Chef (25%)
Your quote:     $2,000.00
Platform fee:   -  $500.00
Your take-home: $1,500.00
```

- Commission % is editable inline (overrides default for this quote only)
- Updates in real-time as the chef adjusts the quote amount
- Only shows for marketplace channels (not for direct website/email/phone inquiries)

---

## Phase 6: Platform ROI Dashboard

**Goal:** Answer "which platforms are worth my money?" with hard numbers.

### Files to Create

| File                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `app/(chef)/analytics/platforms/page.tsx`         | Platform performance dashboard page          |
| `lib/analytics/platform-roi.ts`                   | Server actions to aggregate platform metrics |
| `components/analytics/platform-roi-dashboard.tsx` | Client component: table + charts             |
| `components/analytics/platform-roi-card.tsx`      | Per-platform summary card                    |

### Server Actions

| Action                       | Auth            | Input                            | Output              |
| ---------------------------- | --------------- | -------------------------------- | ------------------- |
| `getPlatformROI(dateRange?)` | `requireChef()` | `{ from?: string, to?: string }` | `PlatformROIData[]` |

**PlatformROIData per platform:**

```typescript
{
  channel: string
  label: string
  tier: string
  // Volume
  totalInquiries: number
  inquiriesThisPeriod: number
  // Conversion
  respondedCount: number
  responseRate: number // %
  confirmedCount: number
  conversionRate: number // %
  avgResponseTimeHours: number
  // Revenue
  totalBookingCents: number
  totalCommissionCents: number
  netRevenueCents: number
  avgBookingValueCents: number
  // Cost
  totalSpendCents: number // from marketing_spend_log
  costPerLead: number
  costPerConfirmed: number
  // ROI
  roiPercent: number // (netRevenue - spend) / spend * 100
}
```

**Data sources:**

- `inquiries` table: counts, channels, statuses, first_response_at (from Phase 3)
- `platform_payouts` table: booking amounts, commissions, net payouts
- `marketing_spend_log` table: platform spend (from existing `platform-cpl.ts`)
- `events` table: confirmed bookings linked to platform inquiries

### UI Spec

**Page layout:**

- Date range selector (last 30d, 90d, 1y, all time)
- Summary row: total leads across all platforms, total revenue, best-performing platform
- Per-platform cards in a grid, sorted by net revenue descending
- Each card: platform name, tier badge, key metrics (leads, conversion %, net revenue, ROI %)
- Expandable detail: response time trend, monthly lead volume chart
- Bottom section: "Platforms with no activity" (platforms the chef is on but got zero leads)

**States:**

- Loading: skeleton cards
- Empty: "Connect Gmail and select your platforms in Settings to start tracking"
- Error: DataError component
- Populated: cards + summary

### Navigation

Add to nav config under Analytics section. Not admin-only (every chef sees their own data).

---

## Phase 7: Chrome Extension (SEPARATE SPEC RECOMMENDED)

**This phase is large enough to warrant its own spec.** It involves a separate codebase, separate build system, Chrome Web Store review, and a different development/deployment cycle. This section defines the API contract and architectural boundaries so Phases 1-6 and 8 can be built without waiting for the extension.

### API Endpoint (build this in the main codebase)

| File                                           | Purpose                                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/integrations/extension/sync/route.ts` | POST endpoint that receives structured data from the Chrome extension                                                                                                  |
| `lib/integrations/extension-sync.ts`           | Server actions: validate payload, match to existing inquiry, upsert platform_record with richer data                                                                   |
| `lib/integrations/extension-dom-selectors.ts`  | Server-managed registry of DOM selectors per platform. Extension fetches latest selectors on startup. Allows updating selectors without Chrome Web Store update cycle. |

### API Contract

```typescript
// POST /api/integrations/extension/sync
// Auth: Bearer token (chef's session token or API key)

interface ExtensionSyncPayload {
  platform: string // 'take_a_chef' | 'privatechefmanager' | etc.
  pageUrl: string // current page URL
  pageType: 'inquiry' | 'conversation' | 'booking' | 'profile' | 'payout'
  capturedAt: string // ISO timestamp
  selectorVersion: string // which selector set was used
  data: {
    // Inquiry/conversation data
    clientName?: string
    clientEmail?: string
    clientPhone?: string
    eventDate?: string
    guestCount?: number
    location?: string
    occasion?: string
    dietaryRestrictions?: string[]
    conversationMessages?: Array<{
      sender: 'client' | 'chef' | 'platform'
      text: string
      timestamp?: string
    }>
    menuProposal?: string
    // Financial data
    bookingAmountCents?: number
    commissionPercent?: number
    payoutAmountCents?: number
    payoutStatus?: string
    // Platform-specific
    platformInquiryId?: string
    platformBookingId?: string
    clientProfileUrl?: string
    reviewRating?: number
    reviewText?: string
  }
  // Health check
  selectorsFound: string[] // which selectors matched
  selectorsMissing: string[] // which selectors were expected but missing
}
```

### DOM Selector Registry

```typescript
// lib/integrations/extension-dom-selectors.ts

interface PlatformSelectorSet {
  platform: string
  version: string
  updatedAt: string
  selectors: {
    inquiryPage: {
      clientName: string // CSS selector
      eventDate: string
      guestCount: string
      // ...
    }
    conversationPage: {
      messageList: string
      messageItem: string
      messageSender: string
      messageText: string
      messageTime: string
    }
    payoutPage: {
      amount: string
      status: string
      reference: string
    }
  }
}
```

Selectors are stored as a JSON config file, fetched by the extension via `GET /api/integrations/extension/selectors?platform=take_a_chef`. When a platform redesigns, update the selectors server-side. Extension picks up the new selectors on next fetch (every 24h or on-demand).

### Health Monitoring

When the extension reports `selectorsMissing`, the API:

1. Logs to `extension_health_log` table
2. If >50% of selectors are missing for a platform across multiple chefs, flag as "platform redesign detected"
3. Surface to admin: "TakeAChef selectors are stale. X chefs affected."
4. Surface to chef: "TakeAChef page capture may be incomplete. We're working on an update."

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS extension_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  selector_version text NOT NULL,
  selectors_found text[] DEFAULT '{}',
  selectors_missing text[] DEFAULT '{}',
  page_url text,
  page_type text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_extension_health_platform ON extension_health_log(platform, created_at DESC);
```

### Extension Codebase (separate repo/directory)

The Chrome extension itself should be spec'd separately. Key decisions for that spec:

- **Manifest V3** (required by Chrome Web Store as of 2024)
- **Content scripts** per platform domain (detects page type, reads DOM with selectors)
- **Popup** shows: connection status, last sync, active platforms
- **Background service worker** handles auth token refresh, selector updates, sync queue
- **No data stored in extension** beyond auth token and cached selectors. All data goes to ChefFlow API immediately.
- **Permissions:** `activeTab`, host permissions for platform domains only
- **Privacy:** Extension reads DOM of pages the chef visits. No automation, no navigation, no background requests to platforms.

---

## Phase 8: Compose + Deep Link Send Flow

**Goal:** Chef drafts response in ChefFlow, clicks one button, lands on the right conversation on the platform ready to paste.

### Files to Create

| File                                              | Purpose                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/inquiries/platform-compose-panel.tsx` | Draft response panel on inquiry detail page. Shows when inquiry.channel is a platform. Remy integration for draft assistance. "Send on [Platform]" button.                                 |
| `lib/integrations/deep-links.ts`                  | `buildPlatformDeepLink(channel, externalInquiryId, externalLink)` returns the best URL to the conversation on the platform. Falls back to platform homepage if no specific link available. |

### Files to Modify

| File                                 | What to Change                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `app/(chef)/inquiries/[id]/page.tsx` | Add `PlatformComposePanel` below existing inquiry detail when channel is a marketplace platform |
| `lib/marketplace/platforms.ts`       | Add `deepLinkTemplate` to each platform (nullable, some platforms don't have predictable URLs)  |

### Deep Link Templates

| Platform           | Template                                                                    | Notes                  |
| ------------------ | --------------------------------------------------------------------------- | ---------------------- |
| take_a_chef        | `https://www.takeachef.com/en/chef/requests/{externalInquiryId}`            | Needs verification     |
| privatechefmanager | `https://www.privatechefmanager.com/dashboard/bookings/{externalInquiryId}` | Needs verification     |
| thumbtack          | `https://www.thumbtack.com/pro/messages/{externalInquiryId}`                | Needs verification     |
| bark               | `https://www.bark.com/en/pro/leads/{externalInquiryId}`                     | Needs verification     |
| cozymeal           | `https://www.cozymeal.com/chef/bookings/{externalInquiryId}`                | Needs verification     |
| theknot            | Stored in `external_link` from email parser                                 | No predictable pattern |
| gigsalad           | `https://www.gigsalad.com/dashboard/leads/{externalInquiryId}`              | Needs verification     |

All templates are stored in `MARKETPLACE_PLATFORMS` config and are overridable. If `external_link` exists on the inquiry (parsed from email), use that first. Template is fallback.

### UI Spec

**Platform Compose Panel (on inquiry detail page):**

```
[ Draft your response ]
[                                                          ]
[                                                          ]
[                                                          ]

[Ask Remy to draft]  [Send on Take a Chef ->]
```

- **Text area:** Chef types or Remy drafts the response
- **"Ask Remy to draft"** button: Remy generates a response using full inquiry context (client name, event details, dietary needs, conversation history). Remy follows the chef's communication style (from `memory/chef-communication-rules.md`).
- **"Send on [Platform]"** button:
  1. Copies text area content to clipboard (via `navigator.clipboard.writeText()`)
  2. Shows toast: "Response copied. Opening [Platform]..."
  3. Opens deep link in new tab (`window.open(deepLink, '_blank')`)
  4. Chef pastes and sends on the platform
- **If no deep link available:** Button says "Copy response" only (no redirect). Chef navigates to platform manually.
- **Not shown** for non-platform inquiries (website, email, phone, etc. have their own communication flows).

---

## Edge Cases and Error Handling

| Scenario                               | Correct Behavior                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef has no Gmail connected            | Phase 1 settings still work. Platform selection is saved. Email parsing just doesn't run. Show "Connect Gmail to start capturing leads."                                              |
| Parser fails to extract fields         | Inquiry still created with partial data. Log to `parser_feedback_log`. Show "Some details couldn't be read" on inquiry.                                                               |
| Historical backfill finds 500+ emails  | Process in batches (existing 100/batch). Show progress bar. Don't create inquiries directly; use `gmail_historical_findings` for chef review.                                         |
| Same client inquires on 2 platforms    | Auto-suggest merge (Phase 4). Never auto-merge. Chef decides.                                                                                                                         |
| Platform changes email format          | Parser extracts fewer fields than before. `parser_feedback_log` captures the degradation. Admin dashboard surfaces it.                                                                |
| Platform changes DOM structure         | Extension reports `selectorsMissing`. `extension_health_log` captures it. Chef sees "capture may be incomplete" warning. Server-side selector update fixes without extension rebuild. |
| Chef sets 0% commission                | Valid (lead gen platforms like Thumbtack charge per-lead, not commission). Commission preview shows $0 fee, full take-home.                                                           |
| Deep link URL is wrong/expired         | Platform link banner already handles this with `link_health` check (existing). Show "Link may be expired. Open [Platform] homepage instead."                                          |
| SLA countdown hits zero                | Badge turns red "Overdue by Xh". Stale lead notification fires (existing cron). No auto-action.                                                                                       |
| Quote is $0                            | Commission preview doesn't show (no value in showing 25% of $0).                                                                                                                      |
| Extension not installed                | Everything else still works. Email parsing is the primary data source. Extension is additive.                                                                                         |
| Chef on a platform not in our registry | "Other" channel. No parser, no SLA, no commission preview. Basic email classification still works via GOLDMINE Layer 4.5+ heuristics.                                                 |

---

## Verification Steps

### Phase 1

1. Sign in with agent account
2. Navigate to Settings > Integrations
3. Verify: "My Platforms" section shows all 12 platforms
4. Toggle 3 platforms active, set custom commission %
5. Navigate to Inquiries page, verify filter tabs show active platforms
6. Refresh, verify settings persisted

### Phase 2

1. Verify historical scan auto-triggers after Gmail connect (mock or use agent Gmail)
2. Verify parser feedback log captures partial extractions
3. Verify progress indicator shows during backfill

### Phase 3

1. Create a test inquiry with channel = 'take_a_chef'
2. Verify SLA badge shows "Respond within 24h"
3. Wait or mock time passage, verify badge turns yellow then red
4. Send a message on the inquiry, verify `first_response_at` is set
5. Verify stale lead cron respects per-platform SLA

### Phase 4

1. Create two test clients with same email, different channels
2. Create inquiry for second client
3. Verify merge suggestion banner appears
4. Click merge, verify clients are combined
5. Verify client_merge_log has audit entry

### Phase 5

1. Create inquiry with channel = 'take_a_chef'
2. Navigate to quote builder for that inquiry
3. Verify commission preview shows (25% default for TAC)
4. Change quote amount, verify preview updates in real-time
5. Override commission %, verify calculation updates
6. Create inquiry with channel = 'email', verify no commission preview

### Phase 6

1. Navigate to Analytics > Platforms
2. Verify dashboard loads with platform cards
3. Verify metrics match known data (cross-check with inquiries count)
4. Change date range, verify numbers update
5. Verify empty state for platforms with no data

### Phase 7

1. POST test payload to `/api/integrations/extension/sync`
2. Verify platform_record is updated with richer data
3. POST payload with missing selectors, verify extension_health_log entry
4. GET `/api/integrations/extension/selectors?platform=take_a_chef`, verify selector set returned

### Phase 8

1. Open a platform inquiry detail page
2. Verify compose panel appears
3. Type a response, click "Send on [Platform]"
4. Verify clipboard contains the response text
5. Verify new tab opens to platform deep link (or toast if no link)

### Phase 9

1. Navigate to Analytics > Platforms
2. Verify reputation column shows star ratings per platform
3. Verify dashboard widget shows compact reputation row

### Phase 10

1. Navigate to Analytics > Platforms
2. Click "Log Platform Spend"
3. Enter: Thumbtack, $47, today
4. Verify spend appears in history table
5. Verify ROI metrics update to include the spend

### Phase 11

1. Create a confirmed event for June 15
2. Create a new inquiry with confirmed_date = June 15, channel = 'take_a_chef'
3. Verify date conflict warning appears on inquiry detail page
4. Verify warning names the conflicting event

### Phase 12

1. Open a TakeAChef inquiry, click "Ask Remy to draft"
2. Verify draft tone matches TakeAChef context (professional, warm)
3. Open a Thumbtack inquiry, click "Ask Remy to draft"
4. Verify draft tone matches Thumbtack context (direct, casual)
5. Verify morning briefing notification appears on dashboard (after cron runs)

---

## Phase 9: Review Aggregation

**Goal:** Show a chef's reputation across all platforms in one view. Ratings, review counts, trends.

### Files to Create

| File                                                  | Purpose                                                                                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/analytics/platform-reviews.ts`                   | Server actions: `getPlatformReviewSummary()` aggregates ratings/counts from `platform_snapshots` (review-type captures) and `platform_records` (review fields from extension sync). |
| `components/analytics/platform-reputation-card.tsx`   | Card showing per-platform: star rating, review count, trend arrow (up/down/flat vs last month).                                                                                     |
| `components/dashboard/platform-reputation-widget.tsx` | Dashboard widget: compact row of platform badges with ratings. "TAC 4.8 (23) / Cozymeal 4.5 (8) / GigSalad 5.0 (3)"                                                                 |

### Data Sources

- **Email parsers** already detect review notification emails for most platforms. These contain the star rating and review text. Captured in `platform_snapshots` with `capture_type = 'review'`.
- **Extension sync** (Phase 7) can capture review data from platform profile pages.
- **No new tables needed.** Review data is stored in `platform_snapshots.extracted_data` JSONB (already exists).

### UI Spec

**On the Platform ROI Dashboard (Phase 6), add a "Reputation" column:**

- Star rating (1 decimal)
- Review count
- Trend: compare current month's average to previous month
- Click to expand: see recent reviews with text

**On the Dashboard, add a compact reputation widget:**

- One-line summary of all platforms with ratings
- Highlight any platform where rating dropped

---

## Phase 10: Platform Spend Entry

**Goal:** Give chefs an easy way to log platform costs so the ROI dashboard has complete data.

### Files to Create

| File                                              | Purpose                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `components/analytics/platform-spend-form.tsx`    | Quick entry form: platform (dropdown), amount, date, optional note. Accessible from ROI dashboard and platform settings. |
| `components/analytics/platform-spend-history.tsx` | Table of logged spend entries with edit/delete.                                                                          |

### Files to Modify

| File                                      | What to Change                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/(chef)/analytics/platforms/page.tsx` | Add spend entry form + history below ROI cards.                                                             |
| `lib/inquiries/platform-cpl.ts`           | `recordPlatformSpend()` already exists (lines 40-75). Wire it to the new form. No new server action needed. |

### No Database Changes

`marketing_spend_log` table already exists with: `chef_id`, `spend_date`, `channel`, `amount_cents`, `campaign_name`, `notes`.

### UI Spec

**Spend entry (on ROI dashboard page):**

- "Log Platform Spend" button at top of page
- Modal or inline form: platform dropdown (pre-filtered to active platforms), amount ($), date (defaults to today), optional note
- After save: ROI metrics recalculate immediately (revalidatePath)
- Spend history table below: date, platform, amount, note, edit/delete actions

**Also accessible from Settings > Integrations:** each platform card shows "Total spent: $X" with a "Log spend" shortcut link.

---

## Phase 11: Calendar Conflict Detection

**Goal:** When a new platform inquiry has a date that conflicts with an existing booking, warn the chef immediately.

### Files to Create

| File                                             | Purpose                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/inquiries/conflict-detection.ts`            | `checkDateConflicts(tenantId, date)` queries `events` table for confirmed/in_progress events on same date. Returns conflicting events if found.      |
| `components/inquiries/date-conflict-warning.tsx` | Banner on inquiry detail: "Heads up: you have a confirmed event on June 15 (via Thumbtack, 12 guests in Portland). Consider this before responding." |

### Files to Modify

| File                                 | What to Change                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/gmail/sync.ts`                  | After creating inquiry with a `confirmed_date`, call `checkDateConflicts()`. If conflict found, add to inquiry's notification. |
| `app/(chef)/inquiries/[id]/page.tsx` | Show `DateConflictWarning` when inquiry has a date that conflicts.                                                             |

### No Database Changes

Uses existing `events` table. Query: `SELECT * FROM events WHERE tenant_id = $1 AND confirmed_date = $2 AND status IN ('confirmed', 'in_progress', 'paid', 'accepted')`.

### Why This Matters

Double-booking across platforms is a real risk. A chef confirms on TakeAChef for Saturday, then gets a Thumbtack lead for the same Saturday. Without a warning, they might quote both and have to cancel one, which tanks their platform rating. This is a 5-line query that prevents a reputation-destroying mistake.

---

## Phase 12: Platform-Aware Response Tone + Morning Briefing

### Part A: Platform-Aware Remy Drafts

**Goal:** When Remy drafts a response (Phase 8), adjust tone based on which platform the inquiry came from.

### Files to Modify

| File                                              | What to Change                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/marketplace/platforms.ts`                    | Add `responseContext` field to `MarketplacePlatform`: a 1-2 sentence description of the platform's audience and expected tone. |
| `components/inquiries/platform-compose-panel.tsx` | Pass `responseContext` to Remy's draft prompt.                                                                                 |

### Response Context Per Platform

| Platform           | Context for Remy                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| take_a_chef        | "International marketplace. Clients are often affluent travelers booking luxury dining experiences. Professional, warm, detail-oriented tone. Mention menu customization and dietary accommodation proactively." |
| thumbtack          | "Local services marketplace. Clients are comparing 3-5 pros side by side. Be direct, competitive, and responsive. Lead with availability and pricing. Keep it casual."                                           |
| bark               | "Lead generation platform. Client submitted a brief request. Be concise, answer their specific ask, and suggest a call to discuss details."                                                                      |
| cozymeal           | "Experience marketplace. Clients expect a curated dining experience. Emphasize the experience, ambiance, and menu storytelling."                                                                                 |
| theknot            | "Wedding platform. Clients are planning their wedding and comparing vendors. Be warm, enthusiastic about their special day, and detail-oriented about logistics."                                                |
| gigsalad           | "Event services marketplace. Clients are booking for parties, corporate events, or special occasions. Professional but approachable. Emphasize flexibility and experience."                                      |
| yhangry            | "UK-originated marketplace expanding to US. Mix of casual dinners and events. Friendly, professional tone. Similar to TakeAChef but slightly less formal."                                                       |
| privatechefmanager | "Professional chef services platform. Direct booking model. Clients expect a polished, experienced professional. Formal but personable."                                                                         |

### Part B: Morning Platform Briefing

**Goal:** Push a daily summary so the chef sees everything at a glance without opening each section.

### Files to Create

| File                                               | Purpose                                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/notifications/morning-briefing.ts`            | `generateMorningBriefing(tenantId)` aggregates: new leads since last briefing, bookings confirmed, reviews posted, overdue SLAs, revenue summary. Returns structured briefing data. |
| `app/api/scheduled/morning-briefing/route.ts`      | Cron job: runs at 7am local time (or chef-configured time). Generates briefing, creates notification.                                                                               |
| `components/dashboard/morning-briefing-widget.tsx` | Dashboard widget showing today's briefing in a compact card.                                                                                                                        |

### Server Action

| Action                              | Auth         | Trigger      | Output                               |
| ----------------------------------- | ------------ | ------------ | ------------------------------------ |
| `generateMorningBriefing(tenantId)` | Admin (cron) | Daily at 7am | Notification with structured summary |

### Briefing Content

```
Good morning, Chef.

Overnight: 2 new leads (1 TakeAChef, 1 Bark)
Confirmed: 1 booking (Cozymeal, $1,200 gross, $960 net)
Reviews: 1 new (TakeAChef, 5 stars)
Action needed: 3 leads awaiting your response
  - Thumbtack lead: 2h until SLA (respond first)
  - TakeAChef lead: 18h until SLA
  - Bark lead: 20h until SLA
This week: 4 events scheduled, $6,800 gross revenue
```

### No Database Changes

Uses existing `notifications` table for delivery. Briefing data is computed on-the-fly from `inquiries`, `events`, `platform_records`, `platform_payouts`, `platform_snapshots`.

---

## Phase 13: Trust & Transparency Layer (CRITICAL - This Makes or Breaks Adoption)

**Goal:** Make the chef trust ChefFlow enough to stop logging into third-party platforms. Without this phase, every other phase is wasted. A feature that's 95% reliable is 0% trusted, because the chef doesn't know which 5% it missed. So they check the platform anyway, and ChefFlow has zero value.

This phase provides PROOF, not claims. The chef can verify at any time that ChefFlow has captured everything.

### Files to Create

| File                                                      | Purpose                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/integrations/email-accountability.ts`                | Server actions: `getPlatformEmailAccountability(channel, dateRange)` counts ALL emails from a platform domain, categorized by what ChefFlow did with each one. `getPlatformSyncHealth()` returns per-platform health status. |
| `lib/integrations/capture-confidence.ts`                  | `computeCaptureConfidence(inquiryId)` returns confidence level (full/partial/minimal) based on which fields were extracted vs expected for that platform's email type.                                                       |
| `lib/integrations/platform-reconciliation.ts`             | `generateReconciliationPrompt(tenantId)` creates weekly check-in: "We captured X inquiries from Y platform. Does that match?" Handles chef feedback (yes/no/missing).                                                        |
| `components/integrations/email-accountability-ledger.tsx` | Per-platform breakdown: emails received, how each was categorized, parse success rate, unprocessable count with "view raw" links.                                                                                            |
| `components/integrations/platform-sync-status.tsx`        | Per-platform indicator: green "All caught up" or orange "X actions needed." The single most important component in the entire spec.                                                                                          |
| `components/integrations/raw-email-feed.tsx`              | Unfiltered view of every email from platform domains. Each shows subject, date, what ChefFlow did with it. One-click reclassify for misclassified emails.                                                                    |
| `components/integrations/quarantine-view.tsx`             | Emails from platform domains that were classified as spam/marketing. Recovery button to reclassify as inquiry.                                                                                                               |
| `components/inquiries/capture-confidence-badge.tsx`       | Per-inquiry badge: green (full capture), yellow (partial), orange (minimal + link to platform). Shows exactly which fields were/weren't extracted.                                                                           |
| `app/api/scheduled/platform-health-check/route.ts`        | Cron: if no emails received from an active platform in 7+ days, alert the chef. Catches Gmail filter issues, platform account problems, or broken sync.                                                                      |
| `components/integrations/reconciliation-prompt.tsx`       | Weekly check-in widget: "This week we captured X inquiries from TakeAChef. Does that match? [Yes] [No, something's missing]"                                                                                                 |

### Files to Modify

| File                                        | What to Change                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/inquiries/[id]/page.tsx`        | Add `CaptureConfidenceBadge` to every platform inquiry. Shows what was captured and what wasn't.                                                                    |
| `app/(chef)/settings/integrations/page.tsx` | Add `PlatformSyncStatus` per platform in the "My Platforms" grid. Green/orange indicator replaces guessing.                                                         |
| `app/(chef)/dashboard/page.tsx`             | Add platform sync status summary widget + reconciliation prompt.                                                                                                    |
| `lib/gmail/sync.ts`                         | After processing each email, record what was captured vs what was expected in a sync audit trail.                                                                   |
| `lib/gmail/classify.ts`                     | When a platform-domain email is classified as non-inquiry (spam, marketing, admin), log it to the quarantine/accountability system so it's visible in the raw feed. |

### Database Changes

```sql
-- Email accountability: tracks every email from platform domains
-- Not just parsed ones - ALL of them, including spam/admin classifications
CREATE TABLE IF NOT EXISTS platform_email_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  gmail_message_id text NOT NULL,
  email_subject text,
  email_from text,
  email_date timestamptz,
  classification text NOT NULL, -- 'inquiry', 'status_update', 'payment', 'message', 'review', 'administrative', 'spam', 'unprocessable'
  action_taken text NOT NULL, -- 'created_inquiry', 'updated_status', 'captured_payment', 'logged_message', 'classified_admin', 'classified_spam', 'parse_failed'
  inquiry_id uuid, -- links to inquiry if one was created/updated
  confidence text DEFAULT 'high', -- 'full', 'partial', 'minimal'
  fields_extracted text[] DEFAULT '{}', -- which fields were successfully extracted
  fields_missing text[] DEFAULT '{}', -- which fields could not be extracted
  raw_email_snippet text, -- first 500 chars of email body for quick review
  reclassified_at timestamptz, -- set if chef manually reclassifies
  reclassified_to text, -- what the chef reclassified it as
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, gmail_message_id)
);

CREATE INDEX idx_platform_email_audit_tenant_platform ON platform_email_audit(tenant_id, platform, created_at DESC);
CREATE INDEX idx_platform_email_audit_classification ON platform_email_audit(tenant_id, classification);

-- Reconciliation responses: tracks chef's weekly yes/no on accuracy
CREATE TABLE IF NOT EXISTS platform_reconciliation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  week_start date NOT NULL,
  emails_reported integer NOT NULL,
  inquiries_reported integer NOT NULL,
  chef_response text, -- 'accurate', 'missing_items', 'too_many'
  chef_notes text, -- free text if they say something's missing
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, platform, week_start)
);
```

### The Six Trust Mechanisms

**Mechanism 1: Email Accountability Ledger**

For each platform, a complete accounting of every email received this period:

```
TakeAChef - This Month
Emails received:     23
  New inquiries:      8  (all parsed)
  Status updates:     5  (all parsed)
  Payment confirms:   4  (all parsed)
  Messages:           4  (all parsed)
  Administrative:     2  (classified, not actionable)
  Unprocessable:      0
Parse success rate: 100%
Last email: 2 hours ago
```

Every email from `@takeachef.com` is accounted for. 23 in, 23 handled. Zero fell through the cracks. If one couldn't be parsed, it shows under "Unprocessable" with a "view raw" link.

**Mechanism 2: The "Nothing to Do" / "Action Needed" Indicator**

For each platform, exactly one of two states:

- **Green: "All caught up on TakeAChef"** - All emails parsed, all inquiries responded to or within SLA, no pending actions. "You don't need to visit TakeAChef right now."
- **Orange: "1 action needed on TakeAChef"** - Specific named action: "Respond to Sarah Miller's inquiry (16h until SLA)." Direct link to that exact conversation. After the chef completes it, TakeAChef sends a confirmation email, ChefFlow parses it, status flips back to green.

This is THE trust builder. The chef never wonders "should I check TakeAChef?" ChefFlow says yes or no. And when yes, exactly what to do and a link straight there.

**Mechanism 3: Raw Email Feed (the escape hatch)**

"View All Platform Emails" tab showing every email from every platform domain. Unfiltered. Each email shows: subject, from, date, and what ChefFlow did with it ("Created inquiry #47" / "Updated booking" / "Classified as admin" / "Could not parse - view raw").

This is the chef's proof. They eyeball it, see every email was processed. If something looks wrong, one click to see the raw email. One click to reclassify.

The fact that this exists builds trust even if the chef never uses it. Knowing you CAN verify is what lets you stop verifying.

**Mechanism 4: Capture Confidence Per Inquiry**

Every platform inquiry shows how complete the capture was:

- **Full capture (green):** "All fields extracted. Name, date, guests, location, dietary, budget."
- **Partial capture (yellow):** "Name and date extracted. Guest count and dietary could not be read. [View raw email]"
- **Minimal capture (orange):** "Only name extracted. Visit platform for full details. [Go to inquiry on TakeAChef]"

No silent gaps. The chef knows exactly what ChefFlow has and what it doesn't.

**Mechanism 5: Weekly Reconciliation**

Simple weekly prompt: "This week, we received 15 emails from TakeAChef and captured 4 new inquiries. Does that match? [Yes, looks right] [No, something's missing]"

If "no": ChefFlow asks what's missing, logs it, feeds it back into parser improvement. If "yes": confidence score for that platform increases. After 4 weeks of "yes," the chef stops checking.

**Mechanism 6: Platform Health Monitoring**

Alerts when something looks wrong:

- "No emails from TakeAChef in 8 days. You said you're active there. Gmail might be filtering them. [Check Gmail filters]"
- "Parse success rate for Private Chef Manager dropped from 95% to 60% this week. The platform may have changed their email format. [View failed parses]"
- "3 TakeAChef emails couldn't be parsed today. [View quarantine]"

Proactive, not reactive. The chef finds out about problems before they notice them.

### Quarantine & Recovery Flow

When a platform-domain email gets classified as spam/marketing (should be rare since Layer 1 in classify.ts catches platform emails first, but edge cases exist):

1. Email appears in quarantine view
2. Chef sees: "This email from notifications@takeachef.com was classified as marketing. [This is actually an inquiry] [Correct, it's marketing]"
3. If chef clicks "This is actually an inquiry": email is reclassified, parser re-runs, inquiry created, classification feedback logged for model improvement
4. Platform email audit updated with `reclassified_at` and `reclassified_to`

### The Adoption Flywheel

Week 1: Chef checks TakeAChef daily. Also checks ChefFlow. Sees that ChefFlow matches.
Week 2: Chef checks TakeAChef every other day. ChefFlow accountability ledger shows 100% match.
Week 3: Chef checks TakeAChef once. Reconciliation prompt: "Yes, looks right."
Week 4: Chef stops checking TakeAChef. ChefFlow says "All caught up." Chef trusts it.
Week 5+: Chef only visits TakeAChef when ChefFlow says "Action needed: respond to [inquiry]." 10 seconds, in and out.

This flywheel only works if the system is honest about its limitations. Showing "partial capture" on one inquiry builds MORE trust than pretending everything is perfect. Transparency is what converts skeptics into believers.

### Edge Cases

| Scenario                                               | Correct Behavior                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Gmail filters archive platform emails                  | Platform health check detects 0 emails in 7+ days, alerts chef to check Gmail filters                              |
| Parser extracts 0 fields from a new email format       | Email shows in accountability ledger as "unprocessable." Raw email viewable. Alert generated.                      |
| Chef says "no, something's missing" on reconciliation  | Log what's missing. Flag for parser review. Create manual inquiry entry path.                                      |
| Platform sends email from a new/unknown sender address | Layer 1 in classify.ts may miss it. Quarantine/raw feed catches it. Chef reclassifies. Sender added to known list. |
| Chef never responds to reconciliation prompts          | Stop showing after 3 ignored prompts. Don't nag. Resume if chef opts back in.                                      |
| Sync is 6+ hours behind (Gmail API rate limits)        | Show "Last sync: 6 hours ago" prominently. Don't show "All caught up" if sync is stale.                            |

### Verification Steps (Phase 13)

1. Create a test inquiry via email parser
2. Navigate to Settings > Integrations, verify green "All caught up" status
3. Navigate to raw email feed, verify all test emails appear with correct classifications
4. Verify capture confidence badge on inquiry detail page shows correct field coverage
5. Manually send an email from a platform domain, verify it appears in accountability ledger
6. Trigger reconciliation prompt, click "Yes," verify response logged
7. Click "No, something's missing," verify feedback form appears
8. Verify quarantine view shows any misclassified platform emails
9. Reclassify a quarantine email as inquiry, verify inquiry is created
10. Verify platform health check cron alerts when no emails received in 7+ days

---

## Phase 14: Unified Email Feed, Smart Spam, Scam Detection & Opportunities Bucket

**Goal:** Give the chef a single place to see EVERYTHING ChefFlow captured from their inbox, categorized with surgical precision. The raw feed is the ultimate proof: "We see every email. Here's what we did with each one." Spam isn't hidden; it's showcased (tucked away) as evidence of thoroughness. Scam booking attempts are flagged before the chef wastes time. And a whole new class of email (sponsorship, partnerships, collaborations) gets its own home instead of being lost or misclassified.

### Why This Phase Exists

The chef's #1 adoption barrier is: "Did ChefFlow actually catch everything?" Phase 13 provides metrics and reconciliation prompts. Phase 14 provides the RAW PROOF. The chef can open the unified feed, scroll through, and see every single food-related email from the past week with ChefFlow's classification stamp on each one. If something was miscategorized, they fix it in one click. If a scam slipped through as a real inquiry, the scam detection flags would have caught it. If a sponsorship email got buried in marketing, the opportunities bucket recovers it.

This is the "I never need to check my Gmail again" phase.

### 14a: Enhanced Classification Categories

The current classifier (`lib/gmail/classify.ts`) uses 5 categories: `inquiry`, `existing_thread`, `personal`, `spam`, `marketing`. This phase adds granular sub-classification for non-inquiry emails, stored as a new `sub_category` field.

**New sub-categories (stored alongside the primary category):**

| Primary Category | Sub-Category          | What It Catches                                                                                                                  |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `spam`           | `scam_booking`        | Fake dinner requests, phishing disguised as inquiries, too-good-to-be-true events                                                |
| `spam`           | `vendor_solicitation` | "We'd love to supply your kitchen," wholesale cold outreach, equipment sales pitches                                             |
| `spam`           | `aggregator_spam`     | Catering aggregator sites scraping chef profiles and sending fake leads                                                          |
| `marketing`      | `platform_admin`      | Platform receipts, profile updates, "your listing was viewed X times," account alerts                                            |
| `marketing`      | `platform_marketing`  | Platform newsletters, "boost your profile," seasonal promotions from platforms                                                   |
| `marketing`      | `industry_newsletter` | Food industry newsletters, culinary publications, trade org updates                                                              |
| `personal`       | `opportunity`         | Sponsorship offers, brand partnerships, collaboration requests, media/press, event invites to participate (not to cook for hire) |
| `personal`       | `vendor_relationship` | Existing supplier communications, wholesale account updates, delivery notifications from regular vendors                         |

**Why sub-categories instead of new primary categories:** Backward compatibility. Every piece of code that reads `classification` from `gmail_sync_log` continues working. The `sub_category` is additive. The unified feed uses it for smart grouping; everything else ignores it.

### 14b: Scam Booking Detection (Formula-First)

Fake booking inquiries waste the chef's most valuable resource: time. A chef who spends 20 minutes crafting a custom menu proposal for a scam loses trust in the whole pipeline. Scam detection must be deterministic (Formula > AI), running as a new sub-layer within Layer 4.5 of the classifier.

**Scam Red Flags (each adds to a scam_score):**

| Red Flag                                                                                         | Score | Why                                             |
| ------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------- |
| Generic event description + no specific date                                                     | +1    | Real clients mention dates; scammers stay vague |
| Unrealistic guest count for the inquiry type (200 guests for "intimate dinner")                  | +1    | Mismatch between occasion language and scale    |
| Email address is less than 30 days old (heuristic: free email + no prior history)                | +1    | New throwaway accounts                          |
| Mentions payment method upfront before any discussion ("I'll pay by check/wire")                 | +2    | Classic advance-fee scam pattern                |
| Asks chef to procure unusually expensive ingredients or equipment                                | +1    | Overpayment scam setup                          |
| Budget is dramatically above market rate with no negotiation                                     | +1    | Too good to be true                             |
| Sender location has no relation to service area and email doesn't explain travel                 | +1    | Random geography with no context                |
| Email body is copy-paste generic (no personalization, no chef name, no mention of cuisine style) | +1    | Mass blast to multiple chefs                    |
| Reply-to address differs from sender address                                                     | +1    | Impersonation attempt                           |
| Contains suspicious links or requests to "click here to confirm"                                 | +2    | Phishing                                        |

**Scoring threshold:**

- scam_score >= 4: Auto-classify as `spam` / `scam_booking`, do NOT create inquiry. Show in quarantine with "Suspected scam" badge.
- scam_score 2-3: Create inquiry but add `scam_warning` flag. Show yellow warning badge on inquiry detail: "This inquiry has some characteristics of a scam. Review before investing time."
- scam_score 0-1: Normal processing, no flag.

**Critical rule:** Scam detection NEVER blocks a real inquiry silently. If scam_score >= 4, the email still appears in the unified feed and quarantine. The chef can always reclassify it as a real inquiry with one click. False positives are recoverable; false negatives waste hours.

### 14c: Opportunities Bucket

Sponsorship offers, brand partnership pitches, collaboration requests, media inquiries, and event invitations (to participate, not to be hired) currently get lost. They're not inquiries (no booking), not personal (they're business), and lumping them into marketing loses them forever.

**Detection (Layer 4.6, after inquiry heuristic, before sender reputation):**

Deterministic signals for `opportunity` sub-category:

| Signal                                                     | Score | Pattern                                                                           |
| ---------------------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| Sponsorship language                                       | +2    | "sponsor," "partnership," "collaborate," "brand ambassador," "represent"          |
| Media/press language                                       | +2    | "feature," "interview," "article," "podcast," "publication," "press," "editorial" |
| Event participation                                        | +1    | "food festival," "culinary event," "guest chef," "pop-up," "demo," "competition"  |
| Influencer outreach                                        | +1    | "content creator," "social media," "Instagram," "TikTok," "followers"             |
| Revenue share language                                     | +1    | "revenue share," "affiliate," "commission for referrals," "earn per"              |
| From a recognizable brand domain (not free email)          | +1    | Company domain, not @gmail/@yahoo/@hotmail                                        |
| Mentions chef by name + references their cuisine/specialty | +1    | Personalized, not mass blast                                                      |

Threshold: score >= 3 AND `is_food_related: true` -> classify as `personal` / `opportunity`.

**Where opportunities appear:**

- NOT in the inquiry pipeline (they're not bookings)
- In the unified feed, highlighted with a distinct "Opportunity" badge
- In a dedicated "Opportunities" tab on the unified feed page
- Optional: weekly digest "You received 2 opportunity emails this week" in the dashboard

**What the chef can do:**

- View the full email
- "Convert to Inquiry" if it's actually a booking request in disguise
- "Archive" to dismiss
- "Star" to mark for follow-up (simple boolean flag, no complex workflow)

### 14d: Unified Email Feed (The Proof Layer)

Expands the existing `lib/inquiries/platform-raw-feed.ts` into a full unified email feed. This is NOT just platform emails. This is EVERY food-related email ChefFlow processed, from all sources.

**Architecture:**

The feed reads from `gmail_sync_log` (already stores every processed email) and enriches each entry with:

- Primary classification + sub-category
- What ChefFlow did with it (created inquiry, added to thread, quarantined, ignored)
- Platform badge (if from a known platform domain)
- Scam warning badge (if applicable)
- Opportunity badge (if applicable)
- One-click actions (reclassify, view raw, convert to inquiry)

**Feed Views (tabs within the unified feed page):**

| Tab                | What It Shows                                | Purpose                                     |
| ------------------ | -------------------------------------------- | ------------------------------------------- |
| **All**            | Every email, most recent first               | The "I can see everything" view             |
| **Inquiries**      | Emails that became inquiries                 | Quick access to what matters most           |
| **Opportunities**  | Sponsorship, partnerships, collaborations    | Business opportunities that aren't bookings |
| **Platform Admin** | Receipts, profile updates, listing stats     | Platform housekeeping (usually ignorable)   |
| **Spam & Scams**   | Food-related spam + flagged scam attempts    | The "proof we catch everything" view        |
| **Unclassified**   | Emails the classifier wasn't confident about | Chef can manually categorize                |

**Key UX decisions:**

- Default view is "All" with most recent first
- Each row: sender, subject (truncated), platform badge, classification badge, timestamp, action taken
- Expandable row shows full email preview + available actions
- Search/filter by platform, date range, classification
- Spam & Scams tab is NOT in the primary nav. It's accessible from the feed page as a tab. Tucked away but one click from the main feed.
- The feed shows a running count: "247 emails processed this month. 31 inquiries, 4 opportunities, 189 marketing, 23 spam/scams."

### Files to Create

| File                                              | Purpose                                                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gmail/scam-detection.ts`                     | Deterministic scam scoring function. Takes email fields, returns `{ scamScore: number, flags: string[] }`. Pure function, no DB calls, no AI.                                          |
| `lib/gmail/opportunity-detection.ts`              | Deterministic opportunity scoring. Takes email fields, returns `{ opportunityScore: number, signals: string[] }`. Pure function, no DB calls, no AI.                                   |
| `lib/gmail/sub-classifier.ts`                     | Post-classification enrichment. Takes the primary classification + email data, returns sub-category. Called after `classifyEmail()` in the sync pipeline.                              |
| `lib/integrations/unified-feed.ts`                | Server actions: `getUnifiedFeed(filters)`, `reclassifyEmail(id, newCategory, newSubCategory)`, `starOpportunity(id)`, `convertToInquiry(id)`. Replaces/extends `platform-raw-feed.ts`. |
| `components/integrations/unified-email-feed.tsx`  | Main feed page component. Tabs, search, filters, expandable rows, action buttons.                                                                                                      |
| `components/integrations/feed-row.tsx`            | Single email row in the feed. Shows sender, subject, badges, timestamp, expand/collapse.                                                                                               |
| `components/integrations/scam-warning-badge.tsx`  | Yellow/red badge for scam-flagged emails/inquiries. Shows which red flags triggered. Tooltip with details.                                                                             |
| `components/integrations/opportunity-badge.tsx`   | Distinct badge for opportunity emails. Differentiates from inquiry/marketing visually.                                                                                                 |
| `components/integrations/email-detail-drawer.tsx` | Slide-out drawer showing full email content when a feed row is expanded. Includes reclassify dropdown, convert-to-inquiry button, star toggle.                                         |
| `app/(chef)/email-feed/page.tsx`                  | Route for the unified feed. Accessible from integrations settings and from a dashboard link.                                                                                           |

### Files to Modify

| File                                                       | What to Change                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/gmail/classify.ts`                                    | Add Layer 4.6 (opportunity detection) between Layer 4.5 and Layer 5. Scam detection integrates into Layer 4.5 as a parallel check. Export `sub_category` field alongside primary classification. |
| `lib/gmail/sync.ts`                                        | After classification, call `sub-classifier.ts` to enrich with sub-category. Write `sub_category` to `gmail_sync_log`.                                                                            |
| `lib/inquiries/platform-raw-feed.ts`                       | Deprecate or redirect to `unified-feed.ts`. Keep the export for backward compat but internally delegate.                                                                                         |
| `app/(chef)/inquiries/[id]/page.tsx`                       | Show `ScamWarningBadge` on inquiries with `scam_warning` flag.                                                                                                                                   |
| `app/(chef)/settings/integrations/page.tsx`                | Add link to unified email feed.                                                                                                                                                                  |
| `app/(chef)/dashboard/page.tsx`                            | Add small feed summary widget: "X emails processed today, Y inquiries, Z flagged." Link to full feed.                                                                                            |
| `components/inquiries/inquiry-list-item.tsx` or equivalent | Show scam warning icon on inquiry list for flagged items.                                                                                                                                        |

### Database Changes

```sql
-- Add sub_category to gmail_sync_log
ALTER TABLE gmail_sync_log
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS scam_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scam_flags TEXT[],
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reclassified_by TEXT,
  ADD COLUMN IF NOT EXISTS reclassified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_classification TEXT,
  ADD COLUMN IF NOT EXISTS original_sub_category TEXT;

-- Index for unified feed queries
CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_feed
  ON gmail_sync_log(tenant_id, synced_at DESC, classification, sub_category);

-- Index for starred opportunities
CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_starred
  ON gmail_sync_log(tenant_id, is_starred)
  WHERE is_starred = true;

-- Add scam_warning flag to inquiries
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS scam_warning BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scam_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scam_flags TEXT[];
```

### Critical Implementation Clarifications

**Scam detection on platform emails:** Platform emails bypass `classifyEmail()` entirely (fast-path in `sync.ts:248`). Scam scoring MUST run as a post-parse step inside `processMessage()`, after the dedicated parser returns but before `handleInquiry()`/`handleGenericNewLead()` is called. This is the only way to catch scams arriving via platform sender domains.

**Opportunity detection and food-relatedness:** The `is_food_related` flag from Ollama is NOT available at Layer 4.6. The opportunity detector must include its own food-related keyword check (chef, cooking, food, culinary, dining, catering, kitchen, menu, restaurant, recipe) as part of its scoring signals. Do not depend on the classification output's `is_food_related` field.

**Reclassification creates minimal inquiries:** When `convertToInquiry(id)` is called from the unified feed, create a minimal inquiry record using only the stored `gmail_sync_log` metadata (from_address as client email, subject, synced_at as first_contact_at). The chef fills in the rest. Do NOT attempt to re-fetch or re-parse the email from Gmail API.

**Backfill strategy for existing data:** Existing `gmail_sync_log` rows with NULL `sub_category` appear in the "All" tab only. Category-specific tabs (Opportunities, Spam & Scams, etc.) only show rows WITH a sub_category. This is correct behavior (old emails were processed before sub-classification existed). No backfill migration required.

**Nav placement:** The `/email-feed` route gets a nav item under the "Inquiries" nav group in `nav-config.tsx`, labeled "Email Feed" with an Inbox icon. Not a standalone top-level item.

### How Scam Detection Integrates with the Existing Pipeline

```
Email arrives
  -> Layer 1: Platform detection (existing)
  -> Layer 1.5: Partner detection (existing)
  -> Layer 2: Gmail labels (existing)
  -> Layer 3: RFC headers (existing)
  -> Layer 4: Marketing heuristic (existing)
  -> Layer 4.5: Inquiry heuristic (existing) + Scam scoring (NEW, parallel)
       If inquiry detected AND scam_score >= 4:
         Override to spam/scam_booking, skip inquiry creation
       If inquiry detected AND scam_score 2-3:
         Create inquiry WITH scam_warning flag
  -> Layer 4.6: Opportunity detection (NEW)
       If not already classified AND opportunity_score >= 3:
         Classify as personal/opportunity
  -> Layer 5: Sender reputation (existing)
  -> Layer 6: Ollama fallback (existing)
  -> Post-classification: Sub-classifier enrichment (NEW)
       Adds sub_category to whatever the primary classification was
```

### How the Unified Feed Differs from Phase 13's Raw Email Feed

Phase 13's `raw-email-feed.tsx` is a trust verification tool: "Here are all emails from platform domains, showing what we did with each." It's platform-focused and audit-oriented.

Phase 14's unified feed is the chef's EMAIL COMMAND CENTER: every food-related email from every source, with smart categorization, one-click actions, and the ability to discover business opportunities that would otherwise be invisible. It subsumes Phase 13's raw feed (which becomes the "All" tab filtered to platform domains).

### What the Spam & Scams Tab Actually Shows

This is the "tucked away but powerful proof" the developer described. The tab shows:

**Scam Bookings:**

- "Fake inquiry: 'I need a chef for 500 guests, will pay $50,000 by wire transfer' - flagged: unrealistic budget, payment method upfront, generic description, no specific date" (red badge)
- Chef sees: "Yep, that's the one I almost responded to last month. ChefFlow caught it."

**Vendor Solicitations:**

- "Hi Chef, we'd love to supply your kitchen with premium olive oil..." (gray badge)
- Chef sees: "I get 10 of these a week. Glad they're here, not in my inquiries."

**Aggregator Spam:**

- "New lead from CateringRequest.com: Someone in your area needs catering!" (orange badge)
- Chef sees: "These are always fake. Good, they're quarantined."

**Platform Marketing:**

- "Your TakeAChef profile was viewed 47 times this week!" (blue badge)
- Chef sees: "Nice to know, but not an inquiry. Correctly sorted."

Each item has a "This is actually a real inquiry" recovery button. One click reclassifies and creates the inquiry. False positives are never permanent.

### The Running Count (Always Visible)

At the top of the unified feed page, a persistent summary bar:

```
This month: 247 emails processed
  31 inquiries created | 4 opportunities | 189 marketing | 23 spam/scams
  Capture rate: 100% of platform emails | Last sync: 2 minutes ago
```

This single line answers: "Is ChefFlow catching everything?" The chef sees it every time they visit the feed. 100% capture rate + recent sync + correct categorization = trust.

### Edge Cases

| Scenario                                                        | Correct Behavior                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scam email uses a real platform's sender domain (spoofing)      | Platform detection (Layer 1) triggers first, creates inquiry. Scam scoring runs post-classification and adds warning flag. Chef sees inquiry with yellow "Possible scam" badge. |
| Legitimate high-budget inquiry triggers scam detection          | scam_score 2-3 range: inquiry created with warning badge. Chef reviews and dismisses the warning. System learns (future: reduce scam weight for this sender domain).            |
| Sponsorship email mentions cooking/booking language             | Opportunity detector checks BEFORE creating inquiry. If opportunity signals dominate, classifies as opportunity. Chef can convert to inquiry if it's actually a booking.        |
| Chef reclassifies an email; sync processes the same email again | `gmail_sync_log` has UNIQUE constraint on `(tenant_id, gmail_message_id)`. Re-sync hits the constraint and skips. Reclassification is preserved.                                |
| Chef stars 50 opportunities and never follows up                | Stars persist. No nagging. Optional: monthly digest "You have 50 starred opportunities." No forced workflow.                                                                    |
| Email is in a language the classifier doesn't handle well       | Ollama fallback (Layer 6) handles non-English. Sub-classifier still runs. If classification is low-confidence, email shows in "Unclassified" tab for manual triage.             |
| A new scam pattern emerges that scam detection doesn't catch    | Chef reclassifies from inquiry to spam/scam_booking. System logs the reclassification. Future: pattern analysis on reclassified emails to improve detection.                    |

### Verification Steps (Phase 14)

1. Send a test email with scam signals (vague event + high budget + wire transfer mention). Verify it's classified as spam/scam_booking and appears in quarantine, NOT in inquiry list
2. Send a test email with scam_score 2-3. Verify inquiry is created WITH scam_warning badge visible on inquiry detail page
3. Send a sponsorship/partnership email. Verify it's classified as personal/opportunity and appears in Opportunities tab
4. Navigate to unified feed (/email-feed). Verify all tabs render with correct counts
5. Expand a feed row. Verify email detail drawer shows full content + action buttons
6. Reclassify a spam email as inquiry. Verify inquiry is created and email's original_classification is preserved
7. Star an opportunity. Refresh page. Verify star persists
8. Verify running count at top of feed page matches actual data
9. Verify scam warning badge on inquiry list for flagged inquiries
10. Verify "Convert to Inquiry" on an opportunity email creates a real inquiry
11. Check that existing platform-raw-feed.ts callers still work (backward compat)
12. Verify the Spam & Scams tab shows food-related spam with correct sub-category badges

---

## Out of Scope

- **Chrome extension codebase itself** (Phase 7 defines the API contract only; extension build is a separate spec)
- **Mobile app / mobile browser extension** (Layer 1 email parsing covers mobile users; extension is desktop-only)
- **Two-way messaging through platforms** (we compose in ChefFlow, send on platform manually; no API integration)
- **Platform API integrations** (no public APIs exist for most platforms; email + extension is the strategy)
- **Automated responses** (chef always sends manually; Remy drafts but chef approves and sends)
- **Platform profile optimization** (future feature; not in this spec)
- **Removing existing TakeAChef-specific components** (payout panel, command center, capture tool stay as-is; they work and are more detailed than the generic versions would be)

---

## Notes for Builder Agent

### Critical Patterns

- **Formula > AI** everywhere. Commission calculations, SLA countdowns, ROI metrics are all deterministic. No Ollama/Gemini calls in any phase except Remy draft assistance in Phase 8.
- **Non-blocking side effects.** Parser feedback logging, merge suggestions, extension health logging are all wrapped in try/catch. Main flow never fails because a side effect fails.
- **Tenant scoping** on every query. Every new server action must start with `requireChef()` and scope by `user.tenantId!`.
- **Backward compatibility.** Existing TakeAChef-specific code (payout panel, command center, finance tracking) must continue to work. The generalization adds a layer on top; it doesn't replace platform-specific deep features.

### Files to Reference

- Existing TakeAChef parser for the "gold standard" of a fully built parser: `lib/gmail/take-a-chef-parser.ts`
- Platform records write-through pattern: `lib/gmail/platform-records-writer.ts`
- How dedup works: `lib/gmail/platform-dedup.ts`
- How classification works: `lib/gmail/classify.ts`
- How the sync pipeline works: `lib/gmail/sync.ts`
- Existing CPL metrics: `lib/inquiries/platform-cpl.ts`
- Existing cross-platform matching: `lib/clients/cross-platform-matching.ts`

### What a Builder Will Get Wrong

1. **Breaking TakeAChef-specific code.** There are 100+ references to `take_a_chef` and `tac_` across the codebase. The generalization must not break the payout panel, command center, finance tracking, capture tool, or dashboard widget. These are NOT being replaced; they're being supplemented by generic versions. Search for all imports of `take-a-chef-settings.ts` and `take-a-chef-defaults.ts` before renaming.

2. **Crowding the filter tabs.** Going from 2 hardcoded platform buttons to 12 dynamic ones will break the UI. Must use a dropdown/select pattern when >4 platforms are active, not a button row.

3. **Auto-merging clients.** Phase 4 is suggestion-only. A builder might implement auto-merge thinking it's "smarter." Never auto-merge. The chef decides. Name-only matches (no email/phone) should NOT trigger suggestions (too many false positives like "John Smith").

4. **Forgetting backward compat for JSONB settings.** The `integration_connection_settings` JSONB already has `{ take_a_chef: { default_commission_percent: N } }` for existing chefs. The new structure (`{ platforms: { take_a_chef: { active: true, commissionPercent: N } } }`) must read both formats. Migration path: read old format, write new format. Never drop old keys until all chefs have been migrated.

5. **Making the extension a hard dependency.** Phases 1-6 and 8 must work perfectly without the extension installed. The extension is additive. If a builder writes code that breaks when extension data is missing, that's a bug.

6. **SLA badge on non-platform inquiries.** The SLA badge must only show for marketplace platform channels. A direct email inquiry or walk-in has no platform SLA. Check `isMarketplaceSource(inquiry.channel)` before rendering.

7. **Commission preview on non-marketplace channels.** Same as above. Only show for channels where a platform takes a cut. Thumbtack/Bark are pay-per-lead (0% commission), so preview should show $0 platform fee, or just not show at all for 0% platforms.

8. **Historical backfill creating inquiries directly.** The existing system creates `gmail_historical_findings` for chef review (not auto-imported). A builder might shortcut this and create inquiries directly from historical emails. Don't. A 3-year backfill would flood the inquiry list with hundreds of old, resolved inquiries.

9. **Deep link templates as guaranteed URLs.** Every deep link template in Phase 8 is a best guess. They WILL break. The system must gracefully handle broken links: try the stored `external_link` first (from email parser), fall back to template, fall back to platform homepage. Never show a dead link with no fallback.

10. **Putting commission calculation in a server action.** The commission preview (Phase 5) should be client-side only. It's a simple multiplication. No server round-trip needed. Read commission % from the inquiry data (already loaded) and calculate in the component.

11. **Scam detection never runs on platform emails.** Platform emails skip the classifier entirely via the fast-path in `sync.ts:248` (`processMessage()` routes directly to dedicated parsers). A builder who puts scam detection at Layer 4.5 of `classify.ts` will never score platform emails for scams. Scam scoring must run as a POST-PARSE step inside `processMessage()` for platform-routed emails, not just as a classification layer. This is the only way to catch spoofed platform sender domains.

12. **`convertToInquiry()` from unified feed has no full email body.** `gmail_sync_log` stores `body_preview` (truncated). When a chef reclassifies a spam/opportunity email as an inquiry, there's no full body to parse fields from. Two options: (a) store the full body in a new `raw_body` column on `gmail_sync_log` during sync (storage cost, but enables re-parsing), or (b) accept that reclassified inquiries are created as minimal records (from_address, subject, date) requiring the chef to fill in details manually. Option (b) is simpler and acceptable. Never try to re-fetch from Gmail API for old emails (may be deleted or archived).

13. **Opportunity detection assumes `is_food_related` is available, but it's not.** The `is_food_related` flag is only reliably set by Ollama (Layer 6), which runs AFTER opportunity detection (Layer 4.6). The opportunity detector must include its OWN food-relatedness signals (mentions chef, cooking, food, culinary, dining, catering, kitchen, menu, etc.) as part of its scoring. Do not depend on a flag from a later pipeline stage.

14. **Dynamic filter tabs need a "chef's active platforms" data source.** There is no single query that returns which platforms a chef has received inquiries from. The builder must add a `getChefActivePlatforms(tenantId)` server action that returns `SELECT DISTINCT channel FROM inquiries WHERE tenant_id = $1 AND channel IN (marketplace channels)`. Cache this with a short TTL or revalidate on new inquiry creation. Do not GROUP BY the full inquiries table on every page load.

15. **`sub_category` column has no backfill for existing data.** Existing `gmail_sync_log` rows will have `sub_category = NULL`. The unified feed tab counts will be wrong (everything shows in "Unclassified"). Either: (a) write a one-time backfill script that runs the sub-classifier on existing rows, or (b) treat NULL sub_category as "legacy" in the feed UI and show these rows in the "All" tab only, not in category-specific tabs. Option (b) is simpler and avoids reprocessing thousands of emails.

16. **`inquiry_channel` enum may need new values.** The enum at `lib/db/schema/schema.ts:66` has 23 values. If the spec adds platforms not in the enum (e.g., a new niche platform), a migration to ALTER TYPE is required. Enum migrations in PostgreSQL are tricky (no IF NOT EXISTS for enum values before PG 14). Use `ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'new_channel'` if on PG 14+, or check with a DO block.

17. **Stale leads cron has its own hardcoded channel list.** `app/api/scheduled/stale-leads/route.ts:19-30` has a separate `MARKETPLACE_CHANNELS` array (10 channels). Phase 6 per-platform SLA thresholds must update this file's channel list AND import SLA config from the new shared source. Do not leave two independent channel lists that drift apart. Extract to a shared constant.
