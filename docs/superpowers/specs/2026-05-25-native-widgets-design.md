# ChefFlow Native Widgets

> Design spec for home screen widgets on iOS and Android, powered by Capacitor + a thin widget data API over existing server actions.

## Status

- **Decision**: Capacitor (already configured at `com.chefflow.app`)
- **Platforms**: iOS (WidgetKit) + Android (AppWidgetProvider) + PWA Widgets API (Android bonus)
- **Cost**: $0 (self-hosted, no cloud services)
- **Distribution**: TestFlight (iOS), direct APK (Android)

## Existing Infrastructure

| Asset                  | Path                                         | Notes                                         |
| ---------------------- | -------------------------------------------- | --------------------------------------------- |
| Capacitor config       | `capacitor.config.ts`                        | App ID, plugins, dynamic server URL           |
| PWA manifest           | `public/manifest.json`                       | Icons, shortcuts, standalone display          |
| Service worker         | `public/sw.js`                               | Push notifications, caching, version polling  |
| Calendar data          | `lib/scheduling/actions.ts`                  | `getWeekSchedule`, `getEnrichedTodaySchedule` |
| Daily plan             | `lib/daily-ops/actions.ts`                   | `getDailyPlan()` orchestrates all daily data  |
| Universal Rail         | `lib/discovery/universal-rail-actions.ts`    | Server-side rail assembly                     |
| Rail assembly          | `lib/discovery/universal-rail-assembly.ts`   | `UniversalRailItem`, scoring, ranking         |
| Quick Capture          | `lib/communication/quick-capture-actions.ts` | `logExternalCommunication(QuickCaptureInput)` |
| Feed                   | `lib/feed/source-registry.ts`                | `FeedSourceAdapter` pattern, 5 source types   |
| Dashboard widgets      | `lib/dashboard/widget-actions.ts`            | Payments, birthdays, upcoming events          |
| Capacitor mobile utils | `lib/mobile/capacitor-config.ts`             | Server URL resolution, navigation hosts       |

## Architecture

### Data Flow

```
Native Widget (Swift/Kotlin)
  -> GET /api/widgets/{type}?limit=N
    -> Auth: Bearer token from device keychain
      -> Calls existing server action logic
        -> Returns compact JSON
          -> Widget renders natively on home screen
```

Native widgets run outside the Capacitor WebView. They cannot call server actions directly. A thin REST API layer translates widget requests into existing server action calls.

### Widget Data API

New route group: `app/api/widgets/`

All endpoints:

- Accept `Authorization: Bearer <token>` header
- Resolve chef tenant from token
- Return minimal JSON (no HTML, no extra fields)
- Include `Cache-Control` headers for widget refresh cadence

#### `GET /api/widgets/calendar`

Source: `getWeekSchedule()` + `getDailyPlan()`

```json
{
  "events": [
    {
      "id": "evt_abc",
      "title": "Johnson Dinner",
      "date": "2026-05-26T18:00:00Z",
      "guestCount": 8,
      "status": "confirmed",
      "deepLink": "/events/evt_abc"
    }
  ],
  "updatedAt": "2026-05-25T12:00:00Z"
}
```

Refresh: every 30 minutes.

#### `GET /api/widgets/rail`

Source: `assembleUniversalRail()`

```json
{
  "items": [
    {
      "id": "rail_xyz",
      "label": "Confirm menu for Saturday",
      "priority": "high",
      "category": "event_prep",
      "deepLink": "/events/evt_abc/menu"
    }
  ],
  "updatedAt": "2026-05-25T12:00:00Z"
}
```

Refresh: every 15 minutes (operational data needs freshness).

#### `GET /api/widgets/feed`

Source: `FeedSourceAdapter` registry

```json
{
  "entries": [
    {
      "id": "feed_001",
      "source": "inquiry",
      "summary": "New inquiry from Sarah M. for June 14",
      "timestamp": "2026-05-25T11:30:00Z",
      "deepLink": "/inquiries/inq_456"
    }
  ],
  "updatedAt": "2026-05-25T12:00:00Z"
}
```

Refresh: every 15 minutes.

#### `POST /api/widgets/capture`

Source: `logExternalCommunication()`

```json
{
  "type": "text | photo | voice",
  "content": "Truffle risotto idea for Johnson dinner",
  "eventId": null,
  "attachmentUrl": null
}
```

Response: `{ "success": true, "id": "cap_789" }`

## Widgets

### 1. Calendar Widget

**Sizes**: Small (2x2), Medium (4x2)

| Size   | Content                                                                 |
| ------ | ----------------------------------------------------------------------- |
| Small  | Next event: title, countdown ("Tomorrow 6pm"), guest count              |
| Medium | Next 3 events in a list, each with date, title, guest count, status dot |

- Tap any event deep-links to `/events/{id}`
- Empty state: "No upcoming events" with tap to create
- WidgetKit timeline: 30-minute refresh via `TimelineProvider`
- Android: `AppWidgetProvider` with `AlarmManager` refresh

### 2. Quick Capture Widget

**Size**: Small (2x2)

Three buttons in a compact grid:

- **Text** (notepad icon): Opens `/capture?mode=text`
- **Photo** (camera icon): Opens `/capture?mode=photo`
- **Voice** (mic icon): Opens `/capture?mode=voice`

No data fetching needed (static layout). Each button deep-links into the capture page. This is the only widget that creates data rather than displaying it.

### 3. Universal Rail Widget

**Sizes**: Medium (4x2), Large (4x4)

| Size   | Content                                                  |
| ------ | -------------------------------------------------------- |
| Medium | Top 3 action items with priority color indicators        |
| Large  | Top 5 items with category badges and priority indicators |

- Priority colors: red (urgent), amber (high), green (normal)
- Category shown as small badge (event_prep, follow_up, inquiry, etc.)
- Tap item deep-links to relevant page
- 15-minute refresh cycle

### 4. Live Feed Widget

**Size**: Medium (4x2)

- Last 3-5 activity entries
- Each entry: source icon (inquiry, message, status change, circle activity) + one-line summary + relative timestamp ("2h ago")
- Tap entry deep-links to source item
- 15-minute refresh cycle

## Auth for Widgets

Native widgets cannot share the Capacitor WebView session. Token-based auth flow:

1. **Login**: When user signs into ChefFlow via Capacitor app, generate a long-lived widget API token (separate from session)
2. **Store**: Capacitor plugin stores token in iOS Keychain (via App Group for widget access) / Android EncryptedSharedPreferences
3. **Widget reads**: Native widget code reads token from shared storage, includes as `Authorization: Bearer` header
4. **Validate**: Widget API endpoints validate token, resolve chef/tenant
5. **Refresh**: Main app refreshes widget token on each foreground (silent rotation)
6. **Logout**: Token cleared from keychain on sign-out, widgets show "Sign in to ChefFlow"

### Token Generation

New server action in `lib/auth/`:

- `generateWidgetToken(chefId)`: Creates a scoped token (read-only for calendar/rail/feed, write for capture)
- Token stored in `widget_tokens` table: `id`, `chef_id`, `token_hash`, `scopes`, `created_at`, `last_used_at`
- Tokens expire after 90 days of inactivity, refreshed on app foreground

## Quick Capture Page

New route: `app/(chef)/capture/page.tsx`

Lightweight, speed-optimized page with no sidebar, no nav, just the capture form.

### Mode: Text

- Single text input (auto-focused)
- Optional event selector (recent events dropdown)
- Optional tags (dietary_change, guest_count, date_change, etc.)
- Submit button
- Calls `logExternalCommunication` with `method: 'in_person'` and `direction: 'internal'`

### Mode: Photo

- Camera capture via `@capacitor/camera` plugin
- Photo preview after capture
- Optional text note field
- Submit uploads photo + calls `logExternalCommunication`
- Photo stored in local filesystem (existing pattern)

### Mode: Voice

- Record button via `@capacitor-community/media-capture` or Web Audio API
- Visual waveform during recording
- After recording: audio uploaded to server, transcribed via Gemma 4 on Ollama (local, $0)
- Transcribed text shown for review/edit
- Submit calls `logExternalCommunication`

### Post-Capture

- Success confirmation with haptic feedback (`@capacitor/haptics`, already configured)
- "Capture another" button or auto-close after 2 seconds
- All captures appear in communication timeline and are linkable to events

## Capacitor Plugin Structure

```
capacitor-chefflow-widgets/
  ios/
    Plugin/
      ChefFlowWidgetsPlugin.swift       # Capacitor plugin bridge
      WidgetTokenManager.swift           # Keychain read/write via App Group
    ChefFlowWidgetExtension/
      CalendarWidget.swift               # WidgetKit TimelineProvider
      QuickCaptureWidget.swift           # Static IntentConfiguration
      RailWidget.swift                   # WidgetKit TimelineProvider
      FeedWidget.swift                   # WidgetKit TimelineProvider
      WidgetDataFetcher.swift            # Shared HTTP client for widget API
      ChefFlowWidgetBundle.swift         # Widget bundle registration
  android/
    src/main/java/com/chefflow/widgets/
      CalendarWidgetProvider.kt          # AppWidgetProvider
      QuickCaptureWidgetProvider.kt      # AppWidgetProvider (static)
      RailWidgetProvider.kt              # AppWidgetProvider
      FeedWidgetProvider.kt              # AppWidgetProvider
      WidgetDataFetcher.kt              # Shared HTTP client
      WidgetTokenManager.kt             # EncryptedSharedPreferences
    src/main/res/layout/
      widget_calendar_small.xml
      widget_calendar_medium.xml
      widget_capture.xml
      widget_rail_medium.xml
      widget_rail_large.xml
      widget_feed.xml
  src/
    index.ts                             # TS plugin definitions
    definitions.ts                       # TypeScript interfaces
```

## PWA Widgets (Android Bonus, Phase 2)

For Android users who install via PWA (not the native app):

1. Add `widgets` array to `public/manifest.json`:

```json
{
  "widgets": [
    {
      "name": "Upcoming Events",
      "tag": "calendar",
      "url": "/widgets/calendar",
      "type": "text/html",
      "short_name": "Events",
      "description": "Your next events at a glance",
      "icons": [{ "src": "/icon-widget-calendar.png", "sizes": "48x48" }],
      "backgrounds": [{ "src": "/widget-bg.png", "sizes": "1024x1024" }],
      "ms_ac_template": "widgets/calendar-template.json"
    }
  ]
}
```

2. Add widget event handlers to `public/sw.js`:

```js
self.addEventListener('widgetinstall', (event) => {
  /* ... */
})
self.addEventListener('widgetresume', (event) => {
  /* ... */
})
self.addEventListener('widgetclick', (event) => {
  /* ... */
})
```

3. Same `/api/widgets/` endpoints, different rendering (Adaptive Cards template).

Not a blocker for Phase 1. Ship after native widgets are working.

## Database Changes

One new table:

```sql
CREATE TABLE widget_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:calendar','read:rail','read:feed','write:capture'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '90 days'
);

CREATE INDEX idx_widget_tokens_chef ON widget_tokens(chef_id);
CREATE INDEX idx_widget_tokens_hash ON widget_tokens(token_hash);
```

## Deep Linking

Capacitor App plugin (`@capacitor/app`) handles deep links. URL scheme: `chefflow://`

| Widget Action       | Deep Link                       | Target                  |
| ------------------- | ------------------------------- | ----------------------- |
| Tap calendar event  | `chefflow://events/{id}`        | Event detail page       |
| Tap rail item       | `chefflow://rail/{deepLink}`    | Relevant page per item  |
| Tap feed entry      | `chefflow://feed/{deepLink}`    | Source item page        |
| Quick capture text  | `chefflow://capture?mode=text`  | Capture page, text mode |
| Quick capture photo | `chefflow://capture?mode=photo` | Capture page, camera    |
| Quick capture voice | `chefflow://capture?mode=voice` | Capture page, mic       |

Register in `capacitor.config.ts`:

```ts
App: {
  url: 'chefflow://',
  androidScheme: 'chefflow',
}
```

## Build & Distribution

| Platform | Method                                           | Cost                                                                  |
| -------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| iOS      | TestFlight (up to 10K testers)                   | $0 (requires Apple Developer account, $99/yr if not already enrolled) |
| Android  | Direct APK sideload or Firebase App Distribution | $0                                                                    |
| PWA      | Already deployed                                 | $0                                                                    |

Note: Apple Developer Program enrollment ($99/yr) is required for TestFlight and WidgetKit. If not already enrolled, this is the only cost.

## Phase Plan

| Phase       | Scope                                             | Dependencies                         |
| ----------- | ------------------------------------------------- | ------------------------------------ |
| **Phase 1** | Widget Data API (4 endpoints) + auth token system | Migration, API routes                |
| **Phase 2** | Quick Capture page (`/capture`)                   | Phase 1 API                          |
| **Phase 3** | Capacitor plugin (iOS widgets)                    | Phase 1 + 2, Apple Developer account |
| **Phase 4** | Capacitor plugin (Android widgets)                | Phase 1 + 2                          |
| **Phase 5** | PWA Widgets (Android bonus)                       | Phase 1 API                          |

## Not Included (Future)

- Apple Watch complications
- Lock screen widgets (iOS 16+, same WidgetKit, easy add-on)
- Interactive widget editing (keep read-only + deep-link for now)
- Siri shortcuts
- Android Glance (Jetpack Glance for Compose-based widgets, future upgrade)
- Widget configuration (user picks which events/feeds to show)
