# Social Event Hub — Architecture & Implementation

## What It Is

A persistent social space for event guests — like a group chat meets Instagram meets event planner. Guests can create groups, plan events, chat, share photos, vote on themes, pin notes, and browse their full dining history. Either a client or chef can start it. The whole thing drives repeat bookings by making the social experience around dinners fun and interactive.

## Core Concepts

### 1. Guest Profiles (`hub_guest_profiles`)

- Persistent identity across all events and all chefs
- Deduplicates by email (case-insensitive)
- Stores known allergies, dietary restrictions, display name, avatar, bio
- Link-based access via `profile_token` UUID — no login required
- Optional link to `auth.users` and `clients` for authenticated users
- Editable via profile page (name, bio, dietary info)

### 2. Hub Groups (`hub_groups`)

- Social container for a group of people
- Can be tied to a single event, an event stub, or standalone
- Has a shareable `group_token` — texted to friends to invite them
- Supports visual themes from the curated theme library
- Groups can link to multiple events via `hub_group_events`
- Visibility: `public` (default), `private` (invite-only), `secret` (hidden)
- Optional anonymous posting mode (`allow_anonymous_posts`)

### 3. Hub Thread (`hub_messages`)

- Group chat within a hub group
- Supports: text, images, system messages, polls, RSVP updates, menu updates, photo shares
- Message pinning (with permission checks)
- Reply threading (inline replies)
- Emoji reactions (denormalized counts for fast display)
- Real-time via Supabase postgres_changes + broadcast channels
- Anonymous posting flag per message (`is_anonymous`)

### 4. Event Stubs (`event_stubs`)

- Client-initiated events that exist before a chef is involved
- Lightweight: title, occasion, date, guest count, location, notes
- Status lifecycle: planning → seeking_chef → adopted → cancelled
- When adopted by a chef, creates a real `events` row
- Stubs seeking a chef appear in the admin hub overview (lead pipeline)

### 5. Event Themes (`event_themes`)

- 18 curated visual themes (bachelorette, birthday, corporate, holiday, etc.)
- CSS custom properties injected via `ThemedWrapper` component
- Themes apply to both hub group pages and event share pages

### 6. Availability Scheduling (`hub_availability`)

- Date-range scheduling polls within groups
- Members mark dates as available / maybe / unavailable
- Visual overlap finder to identify best dates for everyone
- Created by any member with can_post permission

## Database Schema

### New Tables (8 migrations)

| Migration        | Tables                                                          |
| ---------------- | --------------------------------------------------------------- |
| `20260330000001` | `event_themes` + seed data, `event_shares.theme_id`             |
| `20260330000002` | `hub_guest_profiles`, `hub_guest_event_history`                 |
| `20260330000003` | `event_stubs`                                                   |
| `20260330000004` | `hub_groups`, `hub_group_members`, `hub_group_events`           |
| `20260330000005` | `hub_messages`, `hub_message_reactions`                         |
| `20260330000006` | `hub_media`, `hub_pinned_notes`, `hub-media` storage bucket     |
| `20260330000007` | `hub_polls`, `hub_poll_options`, `hub_poll_votes`               |
| `20260330000008` | `hub_groups.visibility/anonymous`, `hub_availability/responses` |

### Key Relationships

```
hub_guest_profiles (cross-event identity)
  ├── hub_guest_event_history → events (dining history)
  ├── hub_group_members → hub_groups (membership)
  ├── hub_messages (authored messages)
  └── hub_pinned_notes (authored notes)

hub_groups (social container)
  ├── hub_group_members → hub_guest_profiles (who's in)
  ├── hub_group_events → events (linked events)
  ├── hub_messages (group chat)
  ├── hub_media (shared photos)
  ├── hub_pinned_notes (sticky notes)
  ├── hub_polls (polls)
  ├── hub_availability (scheduling)
  └── event_themes (visual theme)

event_stubs (pre-chef events)
  └── hub_groups (planning group)
```

## File Structure

### Server Actions

- `lib/hub/types.ts` — All TypeScript types
- `lib/hub/profile-actions.ts` — Guest profile CRUD
- `lib/hub/group-actions.ts` — Group CRUD, joining, members
- `lib/hub/message-actions.ts` — Messages, pins, reactions, notes
- `lib/hub/poll-actions.ts` — Polls, voting, closing
- `lib/hub/media-actions.ts` — Photo uploads, gallery, deletion
- `lib/hub/availability-actions.ts` — Date scheduling polls, responses
- `lib/hub/notification-actions.ts` — Unread counts, email notifications
- `lib/hub/integration-actions.ts` — RSVP→profile sync, event→history snapshot, hub stats
- `lib/hub/realtime.ts` — Supabase realtime subscriptions (client-side)
- `lib/themes/actions.ts` — Theme CRUD
- `lib/themes/theme-registry.ts` — Theme CSS variable mapping
- `lib/event-stubs/actions.ts` — Event stub CRUD, adoption

### Components

- `components/hub/themed-wrapper.tsx` — CSS variable injection
- `components/hub/hub-feed.tsx` — Main chat feed with realtime
- `components/hub/hub-message.tsx` — Message bubble (reactions, reply, pin)
- `components/hub/hub-input.tsx` — Text input with emoji picker
- `components/hub/hub-poll-card.tsx` — Poll display and voting
- `components/hub/hub-notes-board.tsx` — Sticky notes board
- `components/hub/hub-member-list.tsx` — Member list with roles
- `components/hub/theme-picker.tsx` — Visual theme selector
- `components/hub/hub-photo-gallery.tsx` — Photo grid with lightbox, upload, delete
- `components/hub/hub-availability-grid.tsx` — Date scheduling grid
- `components/hub/hub-profile-editor.tsx` — Profile edit form (name, bio, dietary)
- `components/hub/join-hub-cta.tsx` — "Join the Hub" CTA for share page
- `components/hub/event-hub-link-panel.tsx` — Hub link panel for chef event detail

### Pages

- `app/(public)/hub/g/[groupToken]/page.tsx` — Group view (main surface)
- `app/(public)/hub/join/[groupToken]/page.tsx` — Join page (first-time visitors)
- `app/(public)/hub/me/[profileToken]/page.tsx` — Guest profile page (with edit)
- `app/(chef)/social/hub-overview/page.tsx` — Admin hub overview dashboard

## Integrations (wired into existing app)

### RSVP → Hub Profile Sync

- When a guest submits an RSVP via `submitRSVP()`, a hub profile is auto-created/matched
- Guest is auto-joined to the event's hub group (if one exists)
- A system message ("Sarah RSVPed — attending!") is posted to the thread
- Non-blocking — RSVP never fails because of hub sync

### Event Completion → History Snapshot

- When `completeEvent()` runs, menu items are snapshotted into `hub_guest_event_history.courses_served`
- A system message ("Dinner complete!") is posted to the hub group
- Non-blocking side effect in the `finally` block

### Share Page → "Join the Hub" CTA

- After RSVPing on `/share/[token]`, guests see a "Join the Group Chat" CTA
- Clicking creates/finds the hub group for that event and redirects to the join page
- `getOrCreateEventHubGroup()` handles auto-creation with the chef as the group creator

### Event Detail → Hub Link

- Chef event detail page shows an `EventHubLinkPanel` near the Guests section
- Links to the hub group so chefs can see what guests are discussing
- Shows "No hub group exists yet" if no guests have joined

### Admin Hub Overview

- Admin-only page at `/social/hub-overview`
- Stats: total profiles, groups, messages, photos, stubs seeking chef
- Event stubs seeking a chef surface as a lead pipeline
- Recent hub activity feed (last 20 non-system messages)

## Guest Access Model

**Link-based, zero friction.** No login, no email, no account creation.

1. Host texts group link to friends: `cheflowhq.com/hub/join/abc123`
2. Friend opens link, enters their name → they're in
3. Browser gets persistent cookie (`hub_profile_token`)
4. Returning visitors auto-recognized by cookie
5. Profile page at `/hub/me/[profileToken]` for cross-group history
6. Profile is editable (name, bio, allergies, dietary restrictions)

## Security Model

- Profile tokens are UUIDs — not guessable, but link-shareable (like Google Docs)
- Group tokens can be revoked by the host
- Hosts can remove members
- Server actions validate membership before allowing posts
- Admin client (`createServerClient({ admin: true })`) with app-layer token validation
- RLS allows anon SELECT + INSERT, with app-layer permission checks
- Private groups require invitation (no join page access)
- Secret groups are hidden from all listings

## Billing Tier

**Pro feature** — `social-hub` module in `lib/billing/modules.ts` and `lib/billing/pro-features.ts`.

Free users keep the existing RSVP share page. Pro unlocks the full Social Event Hub.

## Group View Tabs

The main group page (`/hub/g/[groupToken]`) has 6 tabs:

1. **Chat** — Real-time group thread with messages, reactions, replies, pins
2. **Events** — Events linked to this group
3. **Photos** — Shared photo gallery with upload capability
4. **Schedule** — Availability scheduling polls for planning dinners
5. **Notes** — Sticky notes board for pinning suggestions and ideas
6. **Members** — Member list with role badges, dietary info, "(you)" indicator
