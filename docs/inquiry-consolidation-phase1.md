# Inquiry Consolidation - Phase 1 Implementation

**Date:** 2026-03-15
**Branch:** `feature/openclaw-adoption`
**Status:** Complete

## What Changed

### 7 Commits (all on feature/openclaw-adoption)

#### 1. Channel Badge Expansion

- Added 15 missing entries to `CHANNEL_CONFIG` in `inquiry-status-badge.tsx`
- All marketplace channels now display proper colored badges instead of "Other"
- Includes: Thumbtack, The Knot, Bark, Cozymeal, GigSalad, Google, Wix, Referral, Walk-In, Outbound, Kiosk, Campaign, PCM, HireAChef, Cuisineist

#### 2. Platform Link Banner Expansion

- Added 10 entries to `PLATFORM_DISPLAY` in `platform-link-banner.tsx`
- "Open in {Platform}" button now works for all marketplace platforms with external_link
- Includes: Thumbtack, The Knot, Bark, Cozymeal, GigSalad, Google Business, Wix, PCM, HireAChef, CuisineistChef

#### 3. Lead Score Factors Display

- New component: `components/inquiries/lead-score-factors.tsx`
- Shows GOLDMINE score factors as visible pill badges on inquiry detail page
- Previously only available via hover tooltip (unusable on mobile)

#### 4. follow_up_due_at Reset on Chef Action

- `lib/messages/actions.ts`: Outbound messages now reset follow_up_due_at to now+48h
- `lib/inquiries/actions.ts`: Status transitions recalculate follow_up_due_at per status
  - awaiting_client: 48h, awaiting_chef: 24h, quoted: 72h, terminal: null
- Both changes are non-blocking side effects (try/catch)

#### 5. New Platform Parser Skeletons

- `lib/gmail/privatechefmanager-parser.ts` (domain: privatechefmanager.com)
- `lib/gmail/hireachef-parser.ts` (domain: hireachef.com)
- `lib/gmail/cuisineistchef-parser.ts` (domain: cuisineistchef.com, cuisineist.com)
- Each follows the thumbtack-parser.ts pattern exactly
- Basic regex extraction with warnings that real email samples are needed for tuning

#### 6. Sync Routing + Migration

- `lib/gmail/sync.ts`: 3 new platform checks wired after existing Wix Forms check
- PlatformChannel type, PLATFORM_TO_INQUIRY_CHANNEL, and PLATFORM_DISPLAY_NAMES all extended
- Migration `20260401000057`: Adds privatechefmanager, hireachef, cuisineistchef to inquiry_channel enum

#### 7. Platform Analytics Card

- `lib/inquiries/platform-analytics.ts`: Server function aggregating inquiries by channel
- `components/inquiries/platform-analytics-card.tsx`: Compact bar chart showing volume + conversion per source
- Wired into inquiry pipeline page (Suspense-wrapped, only shows with 2+ channels)
- Highlights best-performing platform (min 3 inquiries for qualification)

## How It Connects

```
Gmail Sync receives email
  -> Platform detection (sender domain match)
  -> NEW: PrivateChefManager/HireAChef/CuisineistChef parsers
  -> Generic platform handler (dedup, client creation, lead scoring, inquiry creation)
  -> Inquiry list shows proper channel badge (not "Other")
  -> Inquiry detail shows "Open in {Platform}" banner with deep link
  -> Lead score factors visible as pills (not just hover)
  -> follow_up_due_at resets when chef responds
  -> Platform analytics card shows cross-platform comparison
```

## What Still Needs Tuning

1. **Parser regex**: The 3 new parsers have generic regex. Need real email samples from PrivateChefManager, HireAChef, and CuisineistChef to tune extraction patterns. Forward a few sample notification emails and we can calibrate.

2. **Identity keys**: Without real emails, CTA link extraction and identity key collection may miss platform-specific patterns.

3. **Sender domains**: The known sender addresses are guesses. Real emails will reveal actual sender addresses (could be noreply@, notifications@, etc.).

## Phase 2 (Not Started)

- Raw feed tab for platform emails
- Cross-platform client matching (same person on multiple platforms)
- Cost-per-lead tracking for paid platforms (Thumbtack)
- Platform response time SLA indicators
- API integrations where available (Thumbtack Pro, Google Business Profile)
