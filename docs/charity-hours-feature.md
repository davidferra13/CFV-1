# Charity Hours Logging Feature

**Added:** 2026-02-27
**Route:** `/charity/hours`
**Tier:** Free (core chef identity)
**Accessible from:** Charity Hub page (`/charity`) via "Log Charity Hours" button

## Overview

Allows chefs to log volunteer/charity hours at specific organizations, discover nonprofits to volunteer at (not limited to food-related), and stay informed about World Food Programme activities.

## Capabilities

### 1. Log Volunteer Hours

- Search for any organization via Google Places autocomplete (food banks, shelters, churches, Habitat for Humanity, etc.)
- Auto-verify 501(c)(3) status via ProPublica IRS database — non-blocking, form works without it
- Quick-select from recently-used organizations (clickable chips)
- Manual entry fallback if org isn't on Google Maps
- Fields: Organization (search), Date (default today), Hours (0.25–24, quarter-hour steps), Notes (optional)
- Edit and delete existing entries

### 2. Find Charities (Nonprofit Discovery)

- Browse 1.8M IRS-registered 501(c) nonprofits via ProPublica Nonprofit Explorer
- Filter by US state (50 states + DC)
- Filter by NTEE category (10 categories covering all nonprofit types)
- Optional keyword search (debounced 500ms)
- Click any result to auto-fill the log form
- Paginated results with "Load more"

### 3. World Food Programme Feed

- Live news from WFP RSS feed (`wfp.org/rss.xml`)
- Shows latest 6 stories with title, description, and date
- Links to full articles on wfp.org
- Graceful degradation if feed is unavailable

## External APIs

All three are free and require no API keys (Google Places already configured):

- **Google Places** — organization search (client-side, reuses `StoreAutocomplete`)
- **ProPublica Nonprofit Explorer** — 501(c) verification + discovery (server-side, 1-hour cache)
- **WFP RSS** — news feed (server-side, 1-hour cache)

## Database

Single table `charity_hours` — see migration `20260328000008_charity_hours.sql`.

Key design decisions:

- No separate organizations table — recent orgs aggregated from hours entries
- `NUMERIC(5,2)` for decimal hours (e.g., 2.5 for two and a half hours)
- `ein` column stores IRS EIN from ProPublica (nullable)
- `is_verified_501c` flag set when ProPublica match found
- `google_place_id` for linking back to Google Places
- RLS policies enforce chef-only access via `get_current_tenant_id()`

## Architecture

```
Page (server component)
├── CharityHoursSummaryCards (server) — 4 stat cards
├── CharityHoursClient (client wrapper — manages edit state)
│   ├── CharityHourForm (client) — log/edit form
│   │   ├── StoreAutocomplete (client) — Google Places search
│   │   └── NonprofitBadge (client) — 501(c) badge
│   ├── NonprofitSearch (client) — Find Charities browser
│   └── CharityHoursList (client) — logged hours table
└── WfpFeed (server) — WFP news feed
```

## Files

| File                                                   | Purpose                                    |
| ------------------------------------------------------ | ------------------------------------------ |
| `supabase/migrations/20260328000008_charity_hours.sql` | Table + RLS + indexes + trigger            |
| `lib/charity/hours-types.ts`                           | Types, NTEE categories, US states          |
| `lib/charity/propublica-actions.ts`                    | `searchNonprofits()`, `browseNonprofits()` |
| `lib/charity/hours-actions.ts`                         | CRUD: log, update, delete, get, summary    |
| `lib/charity/wfp-actions.ts`                           | `getWfpNews()` RSS fetcher                 |
| `components/charity/charity-hour-form.tsx`             | Log form with autocomplete                 |
| `components/charity/charity-hours-list.tsx`            | Hours table with edit/delete               |
| `components/charity/charity-hours-summary.tsx`         | Summary stat cards                         |
| `components/charity/charity-hours-client.tsx`          | Client wrapper for state                   |
| `components/charity/nonprofit-search.tsx`              | Nonprofit discovery browser                |
| `components/charity/nonprofit-badge.tsx`               | 501(c) verified badge                      |
| `components/charity/wfp-feed.tsx`                      | WFP news feed display                      |
| `app/(chef)/charity/hours/page.tsx`                    | Server page component                      |
| `app/(chef)/charity/hours/loading.tsx`                 | Skeleton loader                            |
