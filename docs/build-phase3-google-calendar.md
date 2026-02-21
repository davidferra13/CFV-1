# Build: Phase 3 — Google Calendar UI (Completing the Missing 5%)

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Status:** Complete — TypeScript clean, no migrations required

---

## Context

The Google Calendar integration was 95% complete before this build:

- OAuth callback handler: ✅ done
- Token refresh/management: ✅ done
- `syncEventToGoogleCalendar(eventId)`: ✅ done — creates/updates calendar events
- `deleteEventFromGoogleCalendar(eventId)`: ✅ done — removes cancelled events
- FSM hooks in `transitions.ts`: ✅ done — `confirmed → sync`, `cancelled → delete`
- DB columns (`google_calendar_event_id`, `google_calendar_synced_at`): ✅ done

**The only missing piece:** a UI card in Settings so chefs can actually connect/disconnect.

---

## What Shipped

### 1. `components/settings/google-calendar-connect.tsx` (new)

Client component following the same pattern as `ConnectedAccounts` (Gmail card):

- **Disconnected state:** Explains what calendar sync does (bullets: confirmed → add, cancelled → remove), then a "Connect Google Calendar" button
- **Connected state:** Shows badge + email + last sync time; a concise "how sync works" info box; Disconnect button with confirmation dialog
- Uses `initiateGoogleCalendarConnect()` and `disconnectGoogleCalendar()` server actions from `lib/scheduling/calendar-sync-actions.ts`
- All OAuth redirect/callback logic was already wired — the button just triggers `window.location.href = redirectUrl`

### 2. `app/(chef)/settings/page.tsx` (modified)

Three changes:

1. Import `getCalendarConnection` from `lib/scheduling/calendar-sync-actions`
2. Import `GoogleCalendarConnect` from the new component
3. Add `getCalendarConnection()` to the parallel `Promise.all` (14 → 15 fetches)
4. Add `<GoogleCalendarConnect connection={calendarConnection} />` in the "Connected Accounts" section, between Gmail and Wix

### 3. `app/(chef)/settings/health/page.tsx` (modified)

Google Calendar added as a fourth health check:

- **Not connected:** `warning` status — prompts chef to connect with a "Connect Calendar →" link to settings
- **Connected, no syncs yet:** `ok` status — "sync fires on event confirmation"
- **Connected with sync history:** `ok` status — shows email + last sync distance (e.g., "3 hours ago")

---

## End-to-End Flow (Now Complete)

```
Chef → Settings → "Connect Google Calendar"
  → initiateGoogleCalendarConnect() server action
  → OAuth redirect to accounts.google.com (calendar.events scope)
  → Chef grants permission
  → /api/auth/google/connect/callback receives code
  → Tokens stored in google_connections table (calendar_connected = true)
  → Chef redirected back to /settings?connected=calendar
  → GoogleCalendarConnect card now shows "Connected" badge

Next event confirmed via FSM:
  → transitions.ts fires syncEventToGoogleCalendar(eventId) [non-blocking]
  → Calendar event created with occasion, date, location, guest count
  → events.google_calendar_event_id saved to DB

Event cancelled:
  → transitions.ts fires deleteEventFromGoogleCalendar(eventId) [non-blocking]
  → Calendar event removed; google_calendar_event_id cleared from DB
```

---

## No Migrations Required

All DB columns already existed from migration `20260307000011_google_calendar_event_columns.sql`.

---

## Key Inventory Update (from deep scan)

**Currently LIVE:** Supabase, Gemini AI (AIzaSyCVtyMWWk3-1B96For0jlX*w-68g20qauE), Resend email (re_B7B4AHin*…), Spoonacular, Kroger, Cron jobs

**OAuth keys configured, now UI-complete:** Google Calendar + Gmail (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET present)

**Infrastructure ready, keys not yet set:**

- Twilio SMS — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- VAPID Web Push — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`
- Upstash Redis — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Sentry — `NEXT_PUBLIC_SENTRY_DSN` etc.
- Instacart — `INSTACART_API_KEY`
- MealMe — `MEALME_API_KEY`
- Stripe — keys not yet set
- Google Maps — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (OSM fallback active)

**NEXT_PUBLIC_APP_URL** — currently `http://localhost:3100`; update to production URL in Vercel before going live (affects QR codes, email links, etc.)
