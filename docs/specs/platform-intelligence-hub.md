# Spec: Platform Intelligence Hub

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (30+ files across 8 phases)
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

## Architecture: 8 Phases

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
