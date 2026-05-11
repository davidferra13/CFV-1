# Circle Remy: Per-Circle AI Concierge

## Summary

Circle Remy is a shared virtual assistant that lives inside every dinner circle. It is the 5th Remy surface (alongside chef, client, public, landing). One instance per circle. Dual-tier knowledge: circle data for everyone, business data visible only to the chef. Per-member toggle so anyone can opt out without affecting others.

## Core Principle

From a guest's perspective, Remy is their personal concierge for this dinner. From the chef's perspective, Remy is their business-aware assistant scoped to this circle. Neither knows the other tier exists.

---

## Identity and Authorship

Remy needs a `hub_guest_profiles` record to author messages (`author_profile_id` FK is NOT NULL).

One Remy profile per tenant, created lazily via `ensureRemyProfile(tenantId)`:

- `display_name`: "Remy"
- `email`: `remy+{tenantId}@system.chefflow.internal` (synthetic, non-deliverable)
- `avatar_url`: `/images/remy-avatar.webp` (static asset)
- `auth_user_id`: null (not a real user)
- `client_id`: null

This profile is NOT added as a circle member. Used only as FK for authoring messages. The existing message query pattern (`select('*, hub_guest_profiles!author_profile_id(*)')`) joins to this profile automatically.

---

## Message Model

All Remy feed messages use the existing `hub_messages` table. No new tables for feed messages.

### Insert Pattern

```
source: 'remy'               // already in CHECK constraint, never used until now
message_type: 'text'          // conversational responses
message_type: 'notification'  // proactive nudges
author_profile_id: remyProfileId
system_metadata: {
  remy_visible: 'circle' | 'chef_only',
  remy_intent: 'question' | 'nudge' | 'welcome' | 'dietary_alert' | 'timeline',
  triggered_by_message_id?: string
}
```

### Visibility Enforcement

- `remy_visible: 'circle'` - everyone with `show_remy = true` sees it
- `remy_visible: 'chef_only'` - only the chef sees it, rendered with whisper treatment
- Server-side enforcement: `getHubMessages` filters `chef_only` messages unless requester is chef

### Private Drawer Messages

NOT stored in `hub_messages`. Stored client-side in IndexedDB (same privacy-first pattern as current Remy). Separate from the feed.

---

## Per-Member Toggle

New column on `hub_group_members`:

```sql
ALTER TABLE hub_group_members ADD COLUMN show_remy BOOLEAN NOT NULL DEFAULT true;
```

Default: ON. Toggle prominent in circle settings.

When OFF: Remy messages filtered from feed, @Remy mentions treated as plain text, drawer icon hidden. When toggled back ON, full Remy history reappears.

---

## Interaction Model

### Feed (@mention)

1. User types "@Remy ..." in circle chat input
2. Client posts user message as normal `hub_message` AND sends question to `/api/remy/circle`
3. Server authenticates, verifies circle membership, loads context
4. Server determines visibility (`remy_visible`) based on who asked + content
5. Server streams response via SSE
6. Server posts completed response as `hub_message` with `source: 'remy'`
7. Other members pick up via existing real-time subscription

### Private Drawer

1. User taps Remy icon in circle header
2. Question sent to `/api/remy/circle` with `mode: 'private'`
3. Server streams response (business-tier context if chef)
4. Stored in IndexedDB only

### Proactive Nudges (V1: Cron)

New cron route: `/api/cron/circle-remy-nudges`. Runs every 4 hours.

| Nudge Type          | Trigger                                        | Cooldown        |
| ------------------- | ---------------------------------------------- | --------------- |
| Dietary conflict    | Menu item matches member allergy               | Once per event  |
| Timeline reminder   | 3 days, 1 day, 4 hours before event            | Once per tier   |
| Menu finalization   | Menu not locked, event < 3 days                | Once            |
| Guest count check   | Event < 5 days, no RSVP from members           | Once            |
| Post-event feedback | Event completed, no feedback yet               | Once, 24h after |
| Rebook prompt       | Event completed > 7 days, no rebook discussion | Once            |

---

## Context Loader

`loadRemyCircleContext(groupId, memberProfileId, memberRole)`

### Base Tier (everyone)

- Circle identity: name, emoji, type, visibility, member count
- Members: display names, roles, RSVP status, dietary restrictions, allergies (profiles + household)
- Linked events: date, occasion, status, guest count, location, arrival/serve time
- Menu: courses, dishes per course
- Menu polls: active polls with vote tallies, locked selections
- Sourcing board: ingredient availability, substitution proposals
- Timeline: from DinnerCircleConfig.layout.timeline
- Recent messages: last 15 for conversational context
- DinnerCircleConfig: publicPage, layout, farm (if enabled)

### Business Tier (chef only)

- Financial overlay: quoted price, total paid, profit, margins
- Pipeline state: stage, urgency score, attention flags
- Client history: loyalty tier, past events, booking frequency
- Sourcing costs: actual costs, price deltas
- Engagement metrics: response gaps, activity rates
- Quote details: full breakdown, validity, approval status
- Chef's service config: equipment, prep timeline

### Context Scope Tiers

- `minimal`: greetings, simple logistics
- `focused`: menu, dietary, timeline (default)
- `full`: strategic questions (chef only, triggers business tier)

---

## Personality

New file: `lib/ai/remy-circle-personality.ts`

Core voice: Warm hospitality concierge. Maitre d', not CFO. Uses chef's name naturally. Conversational but professional.

Inherits chef's chosen archetype as a tone modifier:

- veteran: seasoned, confident
- hype: enthusiastic, energetic
- zen: calm, elegant
- numbers: precise, factual
- mentor: nurturing, teaching
- hustler: energetic, forward
- classic: warm, traditional

### Guardrails

- Never reveal chef financials, margins, other clients, pipeline data
- Never reveal other members' private drawer conversations
- Never generate full recipes
- Never auto-send emails or modify event data
- Never take sides in guest disagreements
- Decline politics, religion, medical advice

---

## API Endpoint

New file: `app/api/remy/circle/route.ts`

| Aspect        | Design                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Auth          | `requireCircleMember(groupId)` - accepts chef and client/guest auth. Returns `{ user, profileId, role, tenantId }` |
| Rate limit    | `remy-circle:{groupId}`, 20/min                                                                                    |
| Validation    | Reuse `validateRemyRequestBody`, `validateHistory` (cap 12), `validateRemyInput`, `checkRecipeGenerationBlock`     |
| History       | Role labels: member display_name / `Remy`. Slice last 12                                                           |
| Model         | `getOllamaModel('standard')`                                                                                       |
| Token budget  | 600 (minimal) / 1000 (focused) / 1500 (full, chef only)                                                            |
| SSE events    | `token`, `done`, `error`, `visibility`                                                                             |
| Post-response | Post to `hub_messages` if `mode: 'feed'`. Latency tracking.                                                        |

### Request Body

```typescript
{
  groupId: string
  message: string
  mode: 'feed' | 'private'
  history: Array<{ role: string; content: string }>
  currentPage?: string
}
```

---

## Spawning Lifecycle

When any circle is created, a welcome message is posted:

- Event circle: "I'm Remy, your concierge for this dinner. Ask me about the menu, dietary accommodations, timing, or logistics. You can turn me off anytime in your circle settings."
- Planning circle: "I'm Remy, here to help plan your event. I can help with dietary needs, menu ideas, and coordination."
- Community circle: "I'm Remy. I'm here if you need help with food questions or keeping things organized."
- Dinner club: "I'm Remy, your concierge for this dinner club. I'll keep track of menus, preferences, and upcoming events."

Post-event: stays alive for feedback/rebook, goes quiet after 14 days. Still responds to @mentions indefinitely.

---

## UI Components

| Component                                     | Purpose                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `components/hub/remy-circle-feed-message.tsx` | NEW: Renders Remy messages with avatar, badge, whisper treatment |
| `components/hub/remy-circle-drawer.tsx`       | NEW: Private 1:1 drawer in circle view                           |
| `components/hub/remy-circle-toggle.tsx`       | NEW: Per-member toggle in circle settings                        |
| `components/hub/hub-message.tsx`              | MODIFY: Add `source === 'remy'` rendering branch                 |
| `components/hub/circle-detail-client.tsx`     | MODIFY: Add Remy drawer icon, @Remy detection                    |

### Rendering Rules

- Remy messages: distinct avatar (rat icon), subtle "AI" badge
- `chef_only` messages: dimmed background, lock icon, "(only you can see this)"
- Feed messages hidden when `show_remy = false`

---

## Schema Changes

One migration (`20260510000009`):

1. `show_remy` column on `hub_group_members` (BOOLEAN DEFAULT true)

No new tables. Everything fits existing structures:

- Feed messages: `hub_messages` (existing, `source: 'remy'` already in CHECK)
- Drawer messages: IndexedDB client-side (existing pattern)
- Visibility: `hub_messages.system_metadata` (JSONB, no schema change)
- Remy identity: `hub_guest_profiles` (existing table)

---

## Security Boundaries

| Risk                              | Mitigation                                                                  |
| --------------------------------- | --------------------------------------------------------------------------- |
| Chef data leaking to guests       | Business tier only when `role === 'chef'`. Visibility enforced server-side. |
| Guest data leaking across circles | Context loader scoped to single `groupId`.                                  |
| Prompt injection                  | Same anti-injection rules as other surfaces.                                |
| Rate abuse                        | Per-circle rate limit (20/min).                                             |
| Remy impersonation                | `source: 'remy'` only writable by server.                                   |
| Drawer privacy                    | Client-side IndexedDB only. Never in hub_messages.                          |

---

## God-Mode Capabilities

### Pre-event

- Welcome new members on join
- Dietary conflict detection (menu vs member allergies)
- Timeline nudges (72h, 24h, 4h before)
- Logistics answers (parking, dress code, arrival, address)
- Sourcing updates from board
- Dish explanations and wine pairing suggestions
- Weather alerts for outdoor events

### Post-event

- Feedback collection
- Thank-you message drafting (chef approval required)
- Event recap/highlights
- Rebook prompting

### Read-heavy, Write-light

- Can read: event, menu, guests, dietary, timeline, sourcing, polls, messages
- Can surface: reminders, warnings, nudges, explanations
- Can draft: messages for chef approval, poll questions
- Cannot act without chef: change menu, modify guests, send emails, update pricing
