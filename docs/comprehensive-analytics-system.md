# Comprehensive Analytics System

## Overview

ChefFlow now tracks every meaningful business and private-chef statistic in a unified Analytics Hub at `/analytics`. This document describes the complete system — what's tracked, where the data comes from, and how to extend it.

---

## Database: New Tables (Migrations 20260306000004–20260306000009)

| Migration      | Table / Column                             | Purpose                                                                      |
| -------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| 20260306000004 | `social_stats_snapshots`                   | Daily/weekly Instagram (and future platform) metric snapshots pulled via API |
| 20260306000005 | `marketing_spend_log`                      | Ad spend by channel/date for CAC and CPL calculations                        |
| 20260306000005 | `competitor_benchmarks`                    | Manual local market rate entries                                             |
| 20260306000005 | `website_stats_snapshots`                  | Monthly website traffic (manual or from analytics provider)                  |
| 20260306000006 | `client_satisfaction_surveys`              | Post-event NPS + multi-dimension ratings, token-authenticated for clients    |
| 20260306000007 | `inquiries.decline_reason`                 | Why an inquiry didn't convert (enables decline reason analytics)             |
| 20260306000007 | `inquiries.ghost_at`                       | When an inquiry went cold (for ghost rate calculation)                       |
| 20260306000007 | `quotes.negotiation_occurred`              | Was the price adjusted on client request?                                    |
| 20260306000007 | `quotes.original_quoted_cents`             | Pre-negotiation price for discount % calculation                             |
| 20260306000008 | `events.actual_menu_deviations`            | What changed from proposed menu to served menu                               |
| 20260306000008 | `events.parking_tolls_cents`               | Per-event parking/toll costs                                                 |
| 20260306000008 | `events.inquiry_received_at`               | Booking lead time anchor point                                               |
| 20260306000008 | `campaign_recipients.bounced_at`           | Bounce tracking via Resend webhook                                           |
| 20260306000008 | `campaign_recipients.spam_at`              | Spam complaint tracking via Resend webhook                                   |
| 20260306000009 | `chef_preferences.max_events_per_month`    | Capacity ceiling for utilization %                                           |
| 20260306000009 | `chef_preferences.owner_hourly_rate_cents` | Imputed hourly rate for true labor cost                                      |

---

## Server Actions: `lib/analytics/`

Seven new action files, each covering a domain:

### `client-analytics.ts`

| Function                                | What it computes                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `getClientRetentionStats()`             | Active clients, repeat clients, 6-month retention rate                         |
| `getClientChurnStats()`                 | At-risk count, dormant count, churn rate, avg days since last event            |
| `getRevenueConcentration()`             | Top 5 clients by revenue, their % share, HHI concentration index               |
| `getClientAcquisitionStats(start, end)` | New clients, marketing spend, CAC, CAC ratio                                   |
| `getReferralConversionStats()`          | Referred inquiries → events conversion rate + revenue                          |
| `getNpsStats()`                         | Full NPS breakdown (promoters/passives/detractors), avg ratings, response rate |

### `pipeline-analytics.ts`

| Function                      | What it computes                                                             |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `getInquiryFunnelStats()`     | Full funnel: inquiries → quoted → confirmed → completed with % at each stage |
| `getQuoteAcceptanceStats()`   | Acceptance, rejection, expiry rates + avg accepted value                     |
| `getGhostRateStats()`         | % of inquiries that expire without response                                  |
| `getLeadTimeStats()`          | Avg days from inquiry to event, avg sales cycle, lead time distribution      |
| `getDeclineReasonStats()`     | Ranked breakdown of why inquiries declined                                   |
| `getNegotiationStats()`       | % of quotes negotiated, avg discount %, avg discount amount                  |
| `getAvgInquiryResponseTime()` | Avg hours to first reply, % responded < 1h / < 4h                            |

### `revenue-analytics.ts`

| Function                             | What it computes                                                  |
| ------------------------------------ | ----------------------------------------------------------------- |
| `getRevenuePerUnitStats(start, end)` | Revenue per guest, per hour, per mile                             |
| `getRevenueByDayOfWeek(start, end)`  | Event count + revenue by weekday                                  |
| `getRevenueByEventType(start, end)`  | Revenue/events/avg guest count by occasion                        |
| `getRevenueBySeason()`               | Q1–Q4 revenue distribution                                        |
| `getTrueLaborCostStats(start, end)`  | Owner hours cost + staff pay = true labor, net margin after labor |
| `getCapacityStats(month)`            | Booked/max events this month, utilization %, demand overflow      |
| `getCarryForwardStats(start, end)`   | Leftover ingredient savings, % of food spend                      |
| `getBreakEvenStats()`                | Fixed monthly costs, break-even event count per month             |

### `operations-analytics.ts`

| Function                           | What it computes                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `getComplianceStats(start?, end?)` | 6 compliance rates: on-time start, receipt, kitchen, menu deviation, temp log, dietary |
| `getTimePhaseStats(start?, end?)`  | Avg/min/max minutes per phase (shopping/prep/travel/service/reset)                     |
| `getWasteStats(start, end)`        | Food spend, leftovers, net food cost, waste %                                          |
| `getCulinaryOperationsStats()`     | Avg courses, avg guests, top occasion, dietary restriction frequency                   |
| `getEffectiveHourlyRateByMonth()`  | Monthly trend of effective hourly rate                                                 |

### `marketing-analytics.ts`

| Function                                 | What it computes                                              |
| ---------------------------------------- | ------------------------------------------------------------- |
| `getCampaignEmailStats()`                | Open/click/bounce/spam/unsub rates across all sent campaigns  |
| `getMarketingSpendByChannel(start, end)` | Spend distribution by ad channel                              |
| `getCostPerLeadByChannel(start, end)`    | CPL and CPA by channel using spend + inquiry data             |
| `getReviewStats()`                       | Total reviews, avg rating, review rate %, rating distribution |
| `getWebsiteStats()`                      | Latest + previous month website traffic snapshot              |

### `social-analytics.ts`

| Function                                 | What it computes                                                      |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `getSocialConnectionStatuses()`          | Connected/disconnected status per platform                            |
| `getLatestSocialSnapshot(platform)`      | Most recent follower/engagement snapshot                              |
| `getSocialGrowthTrend(platform, months)` | Historical follower + engagement trend                                |
| `getFollowerGrowthRate(platform, days)`  | % growth over period                                                  |
| `getGoogleReviewStats()`                 | Total reviews, avg rating, rating distribution, new reviews this week |
| `getExternalReviewSummary()`             | Summary across all connected external review sources                  |

### `culinary-analytics.ts`

| Function                             | What it computes                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `getRecipeUsageStats()`              | Total recipes, reuse rate, top recipes by times cooked                  |
| `getDishPerformanceStats()`          | New dishes this month/year, menu modification rate, avg dishes per menu |
| `getIngredientCostStats()`           | % with pricing data, most expensive, recently updated                   |
| `getMenuApprovalStats()`             | Approval/revision rates, avg response time                              |
| `getMostCommonDietaryRestrictions()` | Ranked frequency of dietary restrictions across events                  |

---

## Analytics Hub UI: `/analytics`

Nine tabs, each surfacing data from the server actions above:

| Tab                     | Key Stats                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Overview**            | Revenue MoM, events this month, NPS, avg rating, capacity, conversion rate, repeat booking rate                 |
| **Revenue & Financial** | Revenue/guest/hour/mile, by day/season/type, true labor cost, carry-forward savings, break-even                 |
| **Operations**          | 6 compliance rates, time per phase (table), waste stats                                                         |
| **Pipeline**            | Funnel chart, lead time distribution, ghost rate, decline reasons, negotiation rate, response time              |
| **Clients**             | Retention, churn, at-risk count, revenue concentration bar chart, referral conversion, NPS stats                |
| **Marketing**           | Email open/click/bounce rates, best campaign, spend by channel (pie), review rating distribution, website stats |
| **Social**              | Instagram follower trend chart (LineChart), Google review stats, connection status for all platforms            |
| **Culinary**            | Recipe reuse, top recipes, dietary frequency, menu modification rate, approval stats                            |
| **Benchmarks**          | Links to competitor benchmark entry and website stats entry pages                                               |

---

## External Integrations

### Instagram Graph API

- **Connect:** `GET /api/social/instagram/connect` → OAuth redirect
- **Callback:** `GET /api/social/instagram/callback` → token exchange + initial sync
- **Sync:** `GET /api/social/instagram/sync` (manual) or `POST` (internal/cron)
- **Required env vars:** `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `NEXT_PUBLIC_APP_URL`
- **Required scopes:** `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`
- **Stores to:** `social_connected_accounts`, `social_stats_snapshots`

### Google My Business API

- **Connect:** `GET /api/social/google/connect` → OAuth redirect
- **Callback:** `GET /api/social/google/callback` → token exchange + initial sync
- **Sync:** `GET /api/social/google/sync` (manual) or `POST` (internal/cron)
- **Required env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `INTERNAL_API_KEY`
- **Scopes:** `https://www.googleapis.com/auth/business.manage`
- **Stores to:** `social_platform_credentials`, `external_reviews`

### Resend Webhook (Extended)

- **Route:** `POST /api/webhooks/resend`
- **Now handles:** `email.opened`, `email.clicked`, `email.bounced`, `email.spam_complaint`
- **Stores bounce to:** `campaign_recipients.bounced_at`
- **Stores spam to:** `campaign_recipients.spam_at`
- **Required env vars:** `RESEND_WEBHOOK_SECRET`

---

## Client Satisfaction Survey System

### Flow

1. Chef clicks "Send Survey" on a completed event detail page
2. `sendClientSurvey(eventId)` creates/updates a row in `client_satisfaction_surveys` with a unique token
3. Chef sends the survey URL (`/survey/{token}`) to the client via email or text
4. Client visits URL — no login required, authenticated by token
5. Client submits ratings + NPS + feedback via `submitSurveyResponse()`
6. Chef views aggregate NPS and ratings in Analytics Hub → Clients tab

### Key files

- `lib/surveys/actions.ts` — send and submit server actions
- `app/(client)/survey/[token]/page.tsx` — public survey page
- `app/(client)/survey/[token]/survey-form.tsx` — interactive survey form

---

## Stats Intentionally Not Tracked

| Stat                                       | Reason                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Market share %                             | No industry data source; use competitor_benchmarks for positioning |
| TAM penetration                            | Unknowable without market research                                 |
| Share of voice                             | Requires dedicated social listening tool                           |
| Virality coefficient (K-factor)            | Not applicable to service businesses                               |
| Brand awareness score                      | Requires survey of non-clients                                     |
| Goodwill impairment                        | Not a GAAP-reporting entity                                        |
| Debt/equity, interest coverage             | Personal finance scope                                             |
| Employee HR metrics (turnover, engagement) | Solo operator; staff tracked via event_staff_assignments           |

---

## Setting Up (Required Environment Variables)

Add to `.env.local` for external integrations:

```
# Instagram
INSTAGRAM_APP_ID=your_meta_app_id
INSTAGRAM_APP_SECRET=your_meta_app_secret

# Google Business
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Internal cron/sync
INTERNAL_API_KEY=generate_a_secure_random_string

# Already required
RESEND_WEBHOOK_SECRET=from_resend_dashboard
NEXT_PUBLIC_APP_URL=https://yourchefflowdomain.com
```

---

## Migration Status (as of 2026-02-20)

All analytics migrations have been applied to the remote Supabase project. Types regenerated at 454 KB.

| Migration                                             | Status  | Notes                                                                                                |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `20260306000004_analytics_social_stats_snapshots.sql` | Applied | `social_stats_snapshots` table live                                                                  |
| `20260306000005_analytics_marketing_spend.sql`        | Applied | `marketing_spend_log`, `competitor_benchmarks`, `website_stats_snapshots` live                       |
| `20260306000006_analytics_client_surveys.sql`         | Applied | `client_satisfaction_surveys` live; token column uses `gen_random_uuid()::text`                      |
| `20260306000007_analytics_inquiry_quote_columns.sql`  | Applied | `decline_reason`, `ghost_at`, `negotiation_occurred`, `original_quoted_cents` live                   |
| `20260306000008_analytics_event_campaign_columns.sql` | Applied | `actual_menu_deviations`, `parking_tolls_cents`, `inquiry_received_at`, `bounced_at`, `spam_at` live |
| `20260306000009_analytics_chef_prefs_capacity.sql`    | Applied | `max_events_per_month`, `owner_hourly_rate_cents` live                                               |
| `20260307000002_catchup_missing_schema.sql`           | Applied | Catch-up: `event_surveys`, `onboarding_completed_at`, `stripe_account_id`, `logo_url`, `photo_url`   |

`types/database.ts` regenerated after all migrations — all new tables and columns are fully typed.

## Applying Migrations (future changes)

```bash
# Always back up first
supabase db push --linked
supabase gen types typescript --linked > types/database.ts
```
