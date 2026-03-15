# Client Preference History

Tracks liked/disliked dishes, ingredients, cuisines, and techniques per client. Builds a cumulative taste profile over time (SevenRooms pattern).

## What Changed

### Database

- New table `client_preferences` with RLS (migration `20260401000007`)
- Columns: item_type (dish/ingredient/cuisine/technique), item_name, rating (loved/liked/neutral/disliked), notes, event_id link, observed_at timestamp
- Enums: `client_preference_rating`, `client_preference_item_type`
- Indexes on tenant_id, client_id, item_type, rating, and composite client+type

### Server Actions (`lib/clients/preference-actions.ts`)

- `addPreference(clientId, data)` - single preference entry
- `getClientPreferences(clientId, itemType?)` - list with optional type filter
- `getClientTasteProfile(clientId)` - aggregated profile grouped by rating and type, plus top/avoid items
- `recordPostEventFeedback(eventId, clientId, feedback[])` - bulk dish ratings after an event
- `suggestAvoidItems(clientId)` - disliked items for menu planning
- `deletePreference(preferenceId)` - remove a preference

### UI Components

- `components/clients/preference-panel.tsx` - tabbed panel (Loved/Liked/Disliked/All) with add form and delete. Use on client detail pages
- `components/events/post-event-feedback.tsx` - post-event dish rating widget. Shows after event completion with quick rating buttons per dish

## How It Connects

- Complements `preference-learning-actions.ts` (auto-learned patterns from event history) with explicit chef observations
- Uses same auth pattern: `requireChef()` + tenant scoping
- Separate table from `client_preference_patterns` (that table is for auto-derived patterns; this one is for explicit chef input)
- Event link via `event_id` FK allows tracing preferences back to specific events

## Integration Points

To add the preference panel to the client detail page:

```tsx
import { PreferencePanel } from '@/components/clients/preference-panel'
// In client detail:
;<PreferencePanel clientId={client.id} clientName={client.full_name} />
```

To add post-event feedback on event detail (when status is 'completed'):

```tsx
import { PostEventFeedback } from '@/components/events/post-event-feedback'
// Pass dish names from the event's menu:
;<PostEventFeedback eventId={event.id} clientId={event.client_id} dishes={dishNames} />
```

## Tier Assignment

This is a **Pro** feature (client intelligence). Should be gated behind the CRM/client management module when tier enforcement is integrated.
