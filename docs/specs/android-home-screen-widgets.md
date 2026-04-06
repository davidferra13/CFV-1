# Spec: Android Home Screen Widgets

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `cloud-mobile-unified-migration.md` (Phase 3 - Android APK, complete)
> **Estimated complexity:** large (9+ files, native Kotlin + 1 new backend feature)

## Timeline

| Event   | Date       | Agent/Session      | Commit                                 |
| ------- | ---------- | ------------------ | -------------------------------------- |
| Created | 2026-04-06 | Planner (Opus 4.6) |                                        |
| Revised | 2026-04-06 | Planner (Opus 4.6) | Developer input on real workflow needs |

---

## Developer Notes

### Raw Signal

"I need you to help me refine the top 10 things I would need right now."

"I need like almost like a raw dictation notepad that I can add to that just creates a bulleted list that gets carried over onto my dashboard. And the website can even probably help read that list and understand what needs to get done."

"I can never see the end goal. I have a hard time tracking progress. I don't know what my milestones are. It'd be cool if there was something that showed what needs to get done and had a visual representation of that."

"If I'm trying to finalize a dinner with somebody, it'll be like, oh, you're at 50% finished. This is where you're at. And then there could even be a quick button on the widget that brings me straight to that inquiry."

"I could literally have a widget that's called Dinner Circles that lets me handle all of my dinner circles. My prep list stuff would be in there, my grocery list would be in there, but obviously those would be different widgets that know how to parse and deliver me just the prep list."

"The Shazam widget is one of my favorites. It doesn't feel like a widget. It almost feels like an app altogether. It goes straight to the app and does macros as if you're using the app."

### Developer Intent

- **Core goal:** Widgets that solve real daily friction, not decorative dashboards. Each widget replaces a specific "open the app, navigate, find the thing" workflow with one glance or one tap
- **Key constraints:** Must feel like natural extensions of the phone (like Shazam, like a bank balance). Not gimmicky app-promotion surfaces. ADHD-friendly: visual progress, not walls of text
- **Motivation:** A chef's hands are dirty, their phone is on the counter, they have 10 people to get back to and 3 things on the stove. Every tap saved is real
- **Success from the developer's perspective:** "I didn't open ChefFlow once today but I stayed on top of everything"

---

## What This Does (Plain English)

10 Android home screen widgets that give a chef full situational awareness and quick capture without opening the app. They range from passive glanceable displays (what's happening) to active tools (capture a note, check off a prep item, see a dinner circle's progress). Every widget taps through to the exact right screen in ChefFlow.

---

## Why It Matters

ChefFlow has 265+ pages. A chef doesn't need 265 pages while they're cooking. They need 10 surfaces that show exactly the right thing at the right moment. Widgets are those surfaces.

---

## The 10 Widgets

### 1. Quick Notes (2x2) - NEW FEATURE REQUIRED

The raw dictation notepad. This is the #1 widget because it solves the #1 real problem: thoughts happen faster than you can organize them.

```
┌──────────────────────┐
│ + Quick note...      │
│                      │
│ - Email Johnson back │
│ - Pick basil 4pm     │
│ - Check lamb price   │
│ - Menu needs dessert │
│ - Reschedule Friday  │
└──────────────────────┘
```

**How it works:**

- Tap the `+` input field. Keyboard opens. Type or dictate. Hit enter. Note appears in the list
- Notes are raw, unstructured, timestamped bullets
- List syncs to a new "Quick Notes" section on the ChefFlow dashboard
- Remy can read the brain dump and suggest actions ("You mentioned 'email Johnson back' - want me to draft that?")
- Tap any note to open ChefFlow to the Quick Notes view (where notes can be triaged into tasks, calendar items, reminders)

**Backend needed:** New `chef_quick_notes` table (id, chef_id, text, created_at, status: raw|triaged|dismissed). New server action `addQuickNote()`. New API endpoint `POST /api/v2/quick-notes`. Dashboard section to display and triage notes.

**Why this is #1:** The developer said "I'm constantly taking notes down all day. Literally all day." This is the capture mechanism. Everything else in ChefFlow organizes and acts on information. This is how it gets in.

---

### 2. Inbox (4x2) - EXISTING INFRASTRUCTURE

Unified communications. Every inbound signal in one stream.

```
┌──────────────────────────────────────┐
│ ChefFlow Inbox                    12 │
│                                      │
│ 🔴 Johnson Wedding inquiry    2h ago │
│    "Hi, we'd love to book you fo..." │
│                                      │
│ 💬 Maria (client)             4h ago │
│    "Can we add a vegan option t..."  │
│                                      │
│ 📧 Whole Foods receipt        today  │
│    "Your order #4521 is ready f..."  │
└──────────────────────────────────────┘
```

**Data:** Inquiries, client messages (conversations), Gmail threads, Remy conversations. Merged and sorted by recency.
**Tap:** Opens specific conversation/inquiry in ChefFlow.
**Badge:** Unread count in top right.
**API:** `/api/v2/events` + conversations query + Gmail sync status. May need a new unified inbox endpoint.

---

### 3. Dinner Circles (4x2) - EXISTING INFRASTRUCTURE

The active event command center. Each circle is an event with everything attached.

```
┌──────────────────────────────────────┐
│ Dinner Circles                       │
│                                      │
│ Johnson Wedding  Sat Apr 12  ███░ 72%│
│  25 guests · menu set · deposit paid │
│                                      │
│ Chen Birthday    Thu Apr 10  ██░░ 45%│
│  8 guests · menu draft · no deposit  │
│                                      │
│ Garcia Weekly    Every Tue   ████ 90%│
│  4 guests · recurring · all set      │
└──────────────────────────────────────┘
```

**The progress bar is the key feature.** Each event has a completeness score based on: client confirmed, menu assigned, deposit paid, guest count set, dietary info collected, prep timeline created, grocery list generated. The bar shows how "done" this dinner is.

**Tap:** Opens that event's dinner circle in ChefFlow (unified view with everything attached).
**API:** `/api/v2/events` with a new `completeness_score` computed field.

---

### 4. Prep List (2x2) - EXISTING INFRASTRUCTURE

The kitchen counter widget. What to do right now, checkable without opening the app.

```
┌──────────────────────┐
│ Prep - Johnson Wed   │
│                      │
│ ☑ Brine chicken      │
│ ☑ Make vinaigrette   │
│ ☐ Prep mise en place │
│ ☐ Plate garnishes    │
│ ☐ Final tasting      │
│              3/5 done│
└──────────────────────┘
```

**Checkboxes work directly from the widget.** Tap a checkbox, it checks off, syncs to ChefFlow. No app opening required.
**Shows:** The next upcoming event's prep list (or the currently active one if an event is in_progress).
**API:** Prep timeline actions already exist. Need a lightweight endpoint to list + toggle items.

---

### 5. Today (2x2) - DESIGNED IN V1 OF THIS SPEC

The daily command card.

```
┌──────────────────────┐
│ TODAY          Apr 6  │
│                      │
│ 2 events             │
│ 5 tasks due          │
│ 1 overdue response   │
│                      │
│ Next: Smith 6pm      │
│       12 guests      │
└──────────────────────┘
```

**API:** `/api/v2/events` (today) + task counts + inquiry response times.
**Tap:** Opens dashboard.

---

### 6. Quick Actions (2x1) - SHAZAM-STYLE

Not a display widget. A row of buttons that launch straight into specific app functions.

```
┌──────────────────────────────┐
│  📝 Note  📅 Event  📸 Snap │
└──────────────────────────────┘
```

- **Note:** Opens Quick Notes capture (keyboard ready, type and save)
- **Event:** Opens new event form
- **Snap:** Opens camera, photo saves to ChefFlow storage (receipt, plating, ingredient)

These are the Shazam-style widgets. They don't display data. They're single-tap launchers into the most common actions. Each one deep-links to the exact screen with the exact state (keyboard open, camera ready, form loaded).

---

### 7. Grocery Run (2x2) - EXISTING INFRASTRUCTURE

The parking lot widget. What do I need to buy?

```
┌──────────────────────┐
│ Grocery - 3 events   │
│                      │
│ Whole Foods:         │
│ ☐ Salmon 4lb        │
│ ☐ Heavy cream 2qt   │
│ ☐ Microgreens       │
│                      │
│ 12 items · ~$186     │
└──────────────────────┘
```

**Checkboxes work from widget.** Check items off as you shop.
**Grouped by store** (from vendor/price data).
**Consolidated** across upcoming events.
**API:** Grocery list generation already exists. Need lightweight endpoint for list + toggle.

---

### 8. Live Feed (4x1) - EXISTING INFRASTRUCTURE

The status bar. A scrolling ticker of what's happening right now.

```
┌──────────────────────────────────────┐
│ 🟢 Johnson deposit received · Chen inquiry 2h waiting · Lamb price ↓12% · Menu approved by Garcia │
└──────────────────────────────────────┘
```

A single-line horizontal scroll of recent activity. Newest events, payments, inquiries, price alerts, client actions. The passive surveillance feed.

**API:** Activity log / event stream. Already tracked internally. Need a lightweight recent-activity endpoint.
**Tap:** Opens activity feed / dashboard.
**Update:** Every 15 minutes.

---

### 9. Revenue (2x1) - DESIGNED IN V1 OF THIS SPEC

Financial pulse at a glance.

```
┌──────────────────────┐
│ $4,250 ▲12%  78% 🎯 │
└──────────────────────┘
```

Revenue this month, vs last month, goal progress.
**API:** `/api/v2/financials/summary` + `/api/v2/goals/dashboard`.
**Tap:** Opens financial reports.

---

### 10. Week Glance (4x2) - DESIGNED IN V1 OF THIS SPEC

The weekly runway.

```
┌──────────────────────────────────────┐
│ This Week                            │
│                                      │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun    │
│  ·    2    ·    1    ·    3    1     │
│                                      │
│ 7 events · $8,200 booked            │
└──────────────────────────────────────┘
```

**API:** `/api/v2/events` with date range.
**Tap:** Opens calendar.

---

## New Backend Features Required

### 1. Quick Notes (new feature)

This is the only widget that requires a genuinely new feature in ChefFlow.

**Database:**

```sql
CREATE TABLE chef_quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raw'
    CHECK (status IN ('raw', 'triaged', 'dismissed')),
  triaged_to TEXT,         -- 'task', 'event', 'calendar', 'inquiry', etc.
  triaged_ref_id UUID,     -- FK to the created task/event/etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quick_notes_chef ON chef_quick_notes(chef_id, status, created_at DESC);
```

**Server actions:**

| Action                        | Auth            | Input                                          | Output            |
| ----------------------------- | --------------- | ---------------------------------------------- | ----------------- |
| `addQuickNote(text)`          | `requireChef()` | `{ text: string }`                             | `{ success, id }` |
| `getQuickNotes()`             | `requireChef()` | `{ status?: string, limit?: number }`          | `QuickNote[]`     |
| `triageQuickNote(id, action)` | `requireChef()` | `{ id, status, triaged_to?, triaged_ref_id? }` | `{ success }`     |

**API endpoint:** `POST /api/v2/quick-notes` (for widget), `GET /api/v2/quick-notes` (list).

**Dashboard section (FIRST-CLASS FEATURE, not just a card):**

Quick Notes lives on the chef portal dashboard as a prominent, always-visible section. Not a collapsible card buried at the bottom. This is where the chef's raw stream of consciousness lands, and where they triage it into real actions.

Layout on dashboard:

```
┌─────────────────────────────────────────────┐
│ Quick Notes                          12 notes│
│                                             │
│ + Type a quick note...              [voice] │
│                                             │
│ ● Email Johnson back          3h  [triage ▾]│
│ ● Pick basil from garden 4pm  1h  [triage ▾]│
│ ● Check lamb price at WF      45m [triage ▾]│
│ ● Menu needs a dessert option 30m [triage ▾]│
│ ● Reschedule Friday dinner    20m [triage ▾]│
│                                             │
│ Show all 12 notes...                        │
└─────────────────────────────────────────────┘
```

- Text input at the top (always visible, keyboard-ready). Type or use system dictation
- Each note shows text, time since capture, and a triage dropdown
- Triage actions: Convert to Task, Add to Calendar, Link to Event, Link to Inquiry, Dismiss
- Triaging a note creates the real object (task, calendar entry, etc.) and links back to the original note
- Dismissed notes move to a collapsed "dismissed" section (recoverable, not deleted)
- Notes sort by newest first
- The same data powers both the dashboard section AND the Android widget. One table, two surfaces

**Remy integration:** Remy can read raw brain dump notes and suggest triage actions. "You wrote 'email Johnson back' 3 hours ago. Want me to draft a reply?" This uses existing Remy action patterns, not new AI features.

### 2. Event Completeness Score (computed field)

Add a `completeness_score` to event queries. Computed from:

- Client confirmed (10%)
- Guest count set (10%)
- Menu assigned (15%)
- Dietary info collected (10%)
- Deposit/payment received (15%)
- Prep timeline created (15%)
- Grocery list generated (10%)
- Pre-service checklist done (15%)

This is a pure formula (not AI). Each field is a boolean check against existing data. Returns 0-100.

### 3. Lightweight Widget Endpoints

| Endpoint                                 | Purpose                        | Scope                        |
| ---------------------------------------- | ------------------------------ | ---------------------------- |
| `GET /api/v2/quick-notes`                | Recent notes                   | `quick-notes:read`           |
| `POST /api/v2/quick-notes`               | Add note                       | `quick-notes:write`          |
| `GET /api/v2/widgets/inbox`              | Unified inbox (top N)          | `inquiries:read,events:read` |
| `GET /api/v2/widgets/priority`           | Top priority action            | `events:read,inquiries:read` |
| `GET /api/v2/widgets/prep`               | Active prep list               | `events:read`                |
| `PATCH /api/v2/widgets/prep/[id]`        | Toggle prep item               | `events:read`                |
| `GET /api/v2/widgets/grocery`            | Consolidated grocery list      | `events:read`                |
| `PATCH /api/v2/widgets/grocery/[id]`     | Toggle grocery item            | `events:read`                |
| `GET /api/v2/widgets/activity`           | Recent activity feed           | `events:read`                |
| `GET /api/v2/events?fields=completeness` | Events with completeness score | `events:read`                |

---

## Widget Auth Strategy (Unchanged)

All widgets use existing v2 API Bearer token auth (`cf_live_*`). Chef generates key in Settings > API. Key stored in Android encrypted SharedPreferences.

---

## Widget Sizing Summary

| #   | Widget         | Size | Type             | Interaction               |
| --- | -------------- | ---- | ---------------- | ------------------------- |
| 1   | Quick Notes    | 2x2  | Input + list     | Type notes, tap to triage |
| 2   | Inbox          | 4x2  | Display + tap    | Tap message to open       |
| 3   | Dinner Circles | 4x2  | Display + tap    | Tap event to open circle  |
| 4   | Prep List      | 2x2  | Checkable list   | Check items off           |
| 5   | Today          | 2x2  | Display          | Tap to open dashboard     |
| 6   | Quick Actions  | 2x1  | Buttons          | Tap to launch function    |
| 7   | Grocery Run    | 2x2  | Checkable list   | Check items off           |
| 8   | Live Feed      | 4x1  | Scrolling ticker | Tap to open activity      |
| 9   | Revenue        | 2x1  | Display          | Tap to open financials    |
| 10  | Week Glance    | 4x2  | Display          | Tap to open calendar      |

---

## Implementation Order

**Phase A (backend, 1 session):**

1. Quick Notes table + server actions + dashboard section
2. Event completeness score formula
3. Widget API endpoints (lightweight wrappers around existing functions)

**Phase B (Android native, 1-2 sessions):**

1. WidgetDataFetcher (shared HTTP client) + WidgetPreferences (encrypted key storage)
2. Display-only widgets first: Today, Revenue, Week Glance, Live Feed
3. Interactive widgets: Prep List, Grocery Run (checkbox toggle)
4. Tap-through widgets: Inbox, Dinner Circles (progress bars)
5. Input widgets: Quick Notes (text input from widget), Quick Actions (deep-link launchers)

Phase A can be built by any builder agent (it's Next.js/TypeScript). Phase B requires Kotlin in `src-tauri/gen/android/`.

---

## Edge Cases

| Scenario                   | Behavior                                                     |
| -------------------------- | ------------------------------------------------------------ |
| No API key configured      | All widgets show "Tap to set up" with link to Settings > API |
| Server unreachable         | Show cached data + "Last updated X ago". Never blank         |
| No events this week        | Week Glance shows empty dots, "No events this week"          |
| Empty brain dump           | Show just the input field, no list                           |
| Prep list: no active event | Show "No active prep" with next upcoming event date          |
| Grocery: nothing to buy    | Show "All stocked"                                           |
| Checkbox sync fails        | Show retry indicator on the item, don't uncheck              |

---

## Out of Scope

- iOS widgets (blocked on macOS hardware)
- Widget configuration/customization (fixed layouts for V1)
- Real-time push updates to widgets (polling on intervals is sufficient)
- Voice input on Quick Notes widget (uses keyboard/system dictation, not custom voice)
- AI auto-triage of brain dump notes (Remy suggests, chef decides)

---

## Notes for Builder Agent

1. **Quick Notes is the only new feature.** Everything else wraps existing data. Build Quick Notes first (Phase A) since multiple widgets benefit from it.

2. **Completeness score is a formula, not AI.** 8 boolean checks, weighted sum. Put it in `lib/events/completeness.ts`. Expose via the events API.

3. **Checkable widgets (Prep, Grocery) need optimistic updates.** Check the box immediately in the widget UI, fire the PATCH request in the background. If it fails, uncheck with a retry indicator.

4. **The Live Feed widget uses Android's `RemoteViews` with `ViewFlipper`** for horizontal scrolling text. This is a standard Android pattern for ticker-style widgets.

5. **Quick Actions widget uses `PendingIntent` with deep-link URIs.** Each button launches `chefflow://events/new`, `chefflow://quick-notes`, etc. The Tauri app needs to register these URI schemes.

6. **Brand colors:** Background `#faf9f7`, accent `#e88f47`, text `#333333`. Progress bars use `#e88f47` fill on `#e5e5e5` track.

7. **The `gen/android/` directory is regenerated by `tauri android init`.** Custom widget files in the `widgets/` package survive, but `AndroidManifest.xml` changes need re-application after regeneration. Document all manifest additions in a comment block at the top of each widget class.
