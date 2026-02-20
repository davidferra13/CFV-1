# Recurring Services & Weekly Meal Prep

## What Changed
Added structured support for ongoing client relationships — weekly meal prep, regular dinners, and other standing arrangements. Also added a dish history log that tracks what was served to each client with client reactions, enabling AI-free menu variety suggestions.

## Why
Weekly meal prep is one of the most common and financially stable arrangements in private chef work. Before this change, ChefFlow had no way to model these ongoing relationships. Each week's session was either a manual event creation or not tracked at all. Dish history was a mental map — chefs remembered "I make salmon for the Hendersons every other week" in their head. This formalizes both the arrangement and the history.

## What Was Built

### Database
**Migration:** `supabase/migrations/20260303000017_recurring_services.sql`

**`recurring_services`**
- `client_id FK`, `service_type` enum (weekly_meal_prep, weekly_dinners, daily_meals, biweekly_prep, other)
- `frequency` enum: weekly, biweekly, monthly
- `day_of_week JSONB` — array of day numbers (0=Sun…6=Sat)
- `rate_cents`, `start_date`, `end_date nullable`
- `status` enum: active, paused, ended

**`served_dish_history`**
- `client_id FK`, `recipe_id FK nullable`, `dish_name TEXT` (always stored)
- `served_date DATE`, `event_id FK nullable`
- `client_reaction` enum: loved, liked, neutral, disliked
- `notes`

### Server Actions
**File:** `lib/recurring/actions.ts`

**Recurring Services:**
| Action | What |
|--------|------|
| `createRecurringService(input)` | Set up a standing arrangement |
| `updateRecurringService(id, input)` | Edit details |
| `pauseRecurringService(id)` | Set status=paused |
| `endRecurringService(id)` | Set status=ended, stamps today as end_date |
| `listRecurringServices(clientId?)` | All services, optionally filtered to one client |

**Dish History:**
| Action | What |
|--------|------|
| `logServedDish(input)` | Record a dish served to a client on a date |
| `deleteServedDishEntry(id)` | Remove an entry |
| `getServedHistoryForClient(clientId, weeks?)` | Rolling history (default: 12 weeks) |
| `getSuggestedMenuItems(clientId)` | Returns `{ loved: [], disliked: [], recentlyServed: [] }` — loved dishes not served in recent 20 records, disliked dish names to avoid |

Exports `SERVICE_TYPE_LABELS`, `REACTION_LABELS`.

### UI
- **`app/(chef)/clients/[id]/recurring/page.tsx`** — Full page: active service cards, menu suggestion panel (loved/avoid), rolling 12-week dish history
- **`app/(chef)/clients/[id]/recurring/recurring-service-form.tsx`** — Client component: two inline forms — "Set Up Service" and "Log Dish Served" with reaction select

## Menu Suggestion Logic
`getSuggestedMenuItems()` is a simple, AI-free algorithm:
1. Fetch all dish history for the client
2. Build sets: `disliked` dishes (never suggest), `loved` dishes (prioritize), `recentlyServed` (last 20 records)
3. Return loved dishes that are not in the recent 20 as top suggestions
4. Return disliked dish names as an avoid list

No ML, no API calls — just data the chef already recorded.

## Future Considerations
- Bulk create upcoming draft events from a recurring service (e.g. "Generate next 8 Mondays")
- Recurring service rate change tracking (when rate updates from $X to $Y)
- Rotation planner — "Suggest a 4-week menu rotation avoiding repeats and dislikes"
- Client portal view of what's being prepared
