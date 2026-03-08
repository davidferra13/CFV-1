# Client Quick Requests

## What It Is

A fast path for recurring clients to request a meal or event without going through the full inquiry form. Clients pick a date, set guest count, and optionally repeat their last menu. Three taps, done.

## Why It Exists

Existing clients already have a relationship with their chef. The full inquiry pipeline (name, email, phone, occasion, budget, dietary needs, etc.) is redundant for them since the chef already has all that context. Quick requests remove that friction.

## Database

**Table:** `client_quick_requests`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| tenant_id | uuid FK -> chefs(id) | Scoping |
| client_id | uuid FK -> clients(id) | Who is requesting |
| requested_date | date | When they want the event |
| requested_time | text | morning, lunch, afternoon, evening, or HH:MM |
| guest_count | int | Default 2 |
| notes | text | Free-text notes |
| preferred_menu_id | uuid FK -> menus(id) | Optional repeat menu |
| status | text | pending, confirmed, declined, converted |
| decline_reason | text | Chef's reason for declining |
| converted_event_id | uuid FK -> events(id) | Links to the created event |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto (trigger) |

**Migration:** `supabase/migrations/20260308000001_client_quick_requests.sql`

**RLS:** Tenant-scoped. Chefs see/update their tenant's requests. Clients see/create their own.

## Server Actions

**File:** `lib/client-requests/actions.ts`

### Client actions (require client role)
- `createQuickRequest(input)` - Submit a new request
- `getClientRequestHistory()` - View past requests
- `getClientLastMenu()` - Get most recent menu for "repeat" feature

### Chef actions (require chef role)
- `getQuickRequests(filters?)` - List requests (optionally filtered by status)
- `getPendingQuickRequestCount()` - Count pending (for badges)
- `convertRequestToEvent(requestId)` - Create draft event pre-filled from request
- `declineRequest(requestId, reason?)` - Decline with optional reason
- `confirmRequest(requestId)` - Confirm without creating a full event

## Routes

| Route | Who | What |
|---|---|---|
| `/my-events/request` | Client | Quick request form + request history |
| `/client-requests` | Chef | Full request management queue |
| `/dashboard` | Chef | Quick requests widget (shows pending) |

## Components

| Component | File | Used By |
|---|---|---|
| QuickRequestForm | `components/client-requests/quick-request-form.tsx` | Client request page |
| RequestQueue | `components/client-requests/request-queue.tsx` | Chef request management page |
| QuickRequestsWidget | `components/client-requests/quick-requests-widget.tsx` | Chef dashboard |

## Flow

1. Client visits `/my-events/request`
2. Fills in date, guest count, optional notes/menu selection
3. Submits (creates `pending` record)
4. Chef sees it on dashboard widget and/or `/client-requests` page
5. Chef can:
   - **Convert to Event** - creates a draft event pre-filled with client info, date, guest count, menu. Redirects to the event page for final details.
   - **Confirm** - marks as confirmed without creating a full event (for simple/recurring meals)
   - **Decline** - marks as declined with an optional reason (visible to client)
