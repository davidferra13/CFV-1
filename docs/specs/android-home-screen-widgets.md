# Spec: Android Home Screen Widgets

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `cloud-mobile-unified-migration.md` (Phase 3 - Android APK, complete)
> **Estimated complexity:** medium (3-8 files, all in src-tauri/gen/android/)

## Timeline

| Event   | Date       | Agent/Session      | Commit |
| ------- | ---------- | ------------------ | ------ |
| Created | 2026-04-06 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

"Can I make widgets for ChefFlow for my Android now?"

### Developer Intent

- **Core goal:** Glanceable ChefFlow data on the Android home screen without opening the app
- **Key constraints:** Must use existing API infrastructure (v2 token-based auth already exists). No new backend work. Self-hosted, $0 cost
- **Motivation:** Chefs live on their phones. The most valuable data (next event, overdue items, revenue) should be visible at a glance
- **Success from the developer's perspective:** A chef adds a ChefFlow widget to their Android home screen and sees live data from their account

---

## What This Does (Plain English)

After this is built, a chef using the ChefFlow Android app can long-press their home screen, select "Widgets", find ChefFlow, and add widgets that show live data: today's events, tasks due, revenue, open inquiries, and the next thing that needs their attention. The widgets update automatically and tap through to the relevant screen in the app.

---

## Why It Matters

The whole point of a mobile app is reducing friction. Opening an app to check "do I have an event today?" is friction. A widget that shows it on the home screen is zero friction. This is the difference between a tool you check and a system that keeps you informed.

---

## Existing Infrastructure (No New Backend Needed)

### API v2 (Already Built)

ChefFlow already has token-based API routes at `/api/v2/` with Bearer auth (`cf_live_*` tokens), granular scopes, rate limiting (100 req/min), and pagination. These are the data source for widgets.

| Endpoint                                              | Scope          | Widget Data                                            |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------ |
| `GET /api/v2/events?date_from=today&date_to=today`    | `events:read`  | Today's events (occasion, time, guest count, location) |
| `GET /api/v2/events?status=confirmed&date_from=today` | `events:read`  | Upcoming confirmed events                              |
| `GET /api/v2/financials/summary`                      | `finance:read` | Revenue, outstanding balance                           |
| `GET /api/v2/goals/dashboard`                         | `goals:read`   | Revenue goal progress                                  |
| `GET /api/v2/calls?status=scheduled`                  | `calls:read`   | Upcoming calls                                         |
| `GET /api/feeds/calendar/[token]`                     | (token in URL) | iCal feed (already external-ready)                     |

### Widget Auth Strategy

Widgets can't use browser cookies. They use the existing v2 API key system:

1. Chef generates an API key in Settings > API (already built)
2. Key is stored in Android SharedPreferences (encrypted)
3. Widget sends `Authorization: Bearer cf_live_xxx` header with each request
4. Scoped to read-only: `events:read,finance:read,goals:read,calls:read,inquiries:read`

If no API key is configured, widget shows "Open ChefFlow to set up widgets" with a tap-through.

---

## Widget Designs

### Widget 1: "Today" (2x2)

The daily command card. What a chef checks first thing in the morning.

```
┌─────────────────────┐
│ ChefFlow        TODAY│
│                      │
│ 🗓 2 events          │
│ ✅ 5 tasks due       │
│ ⚠ 1 overdue inquiry  │
│                      │
│ Next: Smith Dinner 6p│
└─────────────────────┘
```

**Data source:** `/api/v2/events` (today) + dashboard task/inquiry counts
**Update frequency:** Every 30 minutes
**Tap action:** Opens app to dashboard
**Size:** 2x2 (default), resizable to 3x2

### Widget 2: "Revenue" (2x1)

Financial pulse. How's the month going?

```
┌─────────────────────┐
│ $4,250  ▲12%  78/mo │
└─────────────────────┘
```

- `$4,250` = revenue this month
- `▲12%` = vs last month
- `78/mo` = goal progress (78% of monthly target)

**Data source:** `/api/v2/financials/summary` + `/api/v2/goals/dashboard`
**Update frequency:** Every 60 minutes
**Tap action:** Opens app to financial reports
**Size:** 2x1 (compact strip)

### Widget 3: "Next Up" (2x1)

The single most important thing right now.

```
┌─────────────────────┐
│ ⏰ Reply to Johnson  │
│   Wedding · 3 days   │
└─────────────────────┘
```

Shows the #1 priority item from the priority queue: inquiry needing response, overdue task, upcoming event, or expiring quote.

**Data source:** Priority queue logic (needs a lightweight API endpoint, see below)
**Update frequency:** Every 15 minutes
**Tap action:** Opens app to the relevant item
**Size:** 2x1

### Widget 4: "Week Glance" (4x2)

The weekly runway. What's the shape of the week?

```
┌─────────────────────────────────────┐
│ ChefFlow                    This Week│
│                                      │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun   │
│  ·    2    ·    1    ·    3    1    │
│                                      │
│ 7 events · $8,200 booked            │
└─────────────────────────────────────┘
```

- Dots for zero-event days, numbers for event counts
- Today highlighted
- Bottom: total events + total booked revenue

**Data source:** `/api/v2/events?date_from=monday&date_to=sunday`
**Update frequency:** Every 60 minutes
**Tap action:** Opens app to calendar
**Size:** 4x2

---

## New API Endpoint Needed

One lightweight endpoint for the "Next Up" widget:

### `GET /api/v2/widgets/priority`

Returns the single highest-priority action item.

```json
{
  "type": "inquiry_response",
  "title": "Reply to Johnson",
  "subtitle": "Wedding - 3 days waiting",
  "urgency": "high",
  "deep_link": "/inquiries/abc123",
  "timestamp": "2026-04-06T14:00:00Z"
}
```

**Auth:** Bearer token, scope `events:read,inquiries:read`
**Logic:** Reuses `getPriorityQueue()` from the dashboard, returns only the top item.

---

## Files to Create

| File                                                                                         | Purpose                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/TodayWidget.kt`       | "Today" widget (2x2)                             |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/RevenueWidget.kt`     | "Revenue" widget (2x1)                           |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/NextUpWidget.kt`      | "Next Up" widget (2x1)                           |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/WeekGlanceWidget.kt`  | "Week Glance" widget (4x2)                       |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/WidgetDataFetcher.kt` | Shared HTTP client for API v2 calls              |
| `src-tauri/gen/android/app/src/main/java/com/cheflowhq/desktop/widgets/WidgetPreferences.kt` | Encrypted SharedPreferences for API key storage  |
| `src-tauri/gen/android/app/src/main/res/layout/widget_today.xml`                             | Layout for Today widget                          |
| `src-tauri/gen/android/app/src/main/res/layout/widget_revenue.xml`                           | Layout for Revenue widget                        |
| `src-tauri/gen/android/app/src/main/res/layout/widget_next_up.xml`                           | Layout for Next Up widget                        |
| `src-tauri/gen/android/app/src/main/res/layout/widget_week_glance.xml`                       | Layout for Week Glance widget                    |
| `src-tauri/gen/android/app/src/main/res/xml/widget_today_info.xml`                           | Widget metadata (size, update interval, preview) |
| `src-tauri/gen/android/app/src/main/res/xml/widget_revenue_info.xml`                         | Widget metadata                                  |
| `src-tauri/gen/android/app/src/main/res/xml/widget_next_up_info.xml`                         | Widget metadata                                  |
| `src-tauri/gen/android/app/src/main/res/xml/widget_week_glance_info.xml`                     | Widget metadata                                  |

## Files to Modify

| File                                                     | What Changes                           |
| -------------------------------------------------------- | -------------------------------------- |
| `src-tauri/gen/android/app/src/main/AndroidManifest.xml` | Register 4 widget receivers + metadata |
| `app/api/v2/widgets/priority/route.ts`                   | New API endpoint for priority item     |

---

## Database Changes

None.

---

## Implementation Pattern

Each widget follows the standard Android `AppWidgetProvider` pattern:

```kotlin
class TodayWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        // 1. Read API key from encrypted SharedPreferences
        // 2. Fetch data from app.cheflowhq.com/api/v2/...
        // 3. Build RemoteViews with the data
        // 4. Set click intents (open app to relevant screen)
        // 5. manager.updateAppWidget(ids, views)
    }
}
```

Widgets use `WorkManager` for periodic background updates (Android's recommended approach, battery-friendly).

---

## Edge Cases

| Scenario                    | Behavior                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| No API key configured       | Show "Open ChefFlow to set up" with tap-through to settings                                  |
| Server unreachable (PC off) | Show last cached data with "Last updated: X ago" timestamp. Never show stale data as current |
| API key revoked             | Show "Reconnect in ChefFlow" message                                                         |
| No events today             | Show "No events today" (not blank, not zero)                                                 |
| Rate limit hit              | Skip update, retry at next interval                                                          |
| Phone offline               | Show cached data with offline indicator                                                      |

---

## Verification Steps

1. Build updated APK with widget support
2. Install on Android device
3. Long-press home screen > Widgets > find "ChefFlow"
4. Add "Today" widget > verify it shows real data
5. Add "Revenue" widget > verify financial data matches app
6. Add "Next Up" widget > verify priority item matches dashboard
7. Add "Week Glance" widget > verify event counts match calendar
8. Turn off PC (kill tunnel) > verify widgets show cached data with timestamp
9. Turn PC back on > verify widgets refresh within their update interval
10. Tap each widget > verify it opens the correct screen in the app

---

## Out of Scope

- iOS widgets (blocked on macOS hardware)
- Interactive widgets (buttons that trigger actions directly from widget). Read-only for V1
- Widget configuration screen (choosing which data to show). All widgets show fixed data for V1
- Real-time push updates to widgets (polling is sufficient for V1)

---

## Notes for Builder Agent

1. **All widget code is native Kotlin in `src-tauri/gen/android/`.** This is Android-native development, not web/Tauri. The Tauri shell wraps the web app, but widgets are pure Android.

2. **The v2 API already exists.** Don't rebuild auth or endpoints. Use Bearer token auth with existing scopes. The only new endpoint is `/api/v2/widgets/priority` (one server action call, return top item).

3. **Widgets use RemoteViews, not Jetpack Compose.** Android widgets have strict layout constraints (no custom views, limited set of layout types). Use `RemoteViews` with XML layouts.

4. **Cache aggressively.** Widgets should store the last successful response in SharedPreferences. Never show blank/zero when the server is unreachable. Show stale data with a timestamp.

5. **Brand colors:** Background `#faf9f7`, accent `#e88f47`, text `#333333`. Match the app's visual identity.

6. **The `gen/android/` directory is regenerated by `tauri android init`.** Widget files in custom packages survive regeneration, but manifest changes may need re-application. Document which manifest entries are custom.

7. **Test with `adb install` on a physical device.** Emulator widgets work but touch targets and text rendering differ from real hardware.
