# Dinner Circle as Event Hub

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: if everything lives in the dinner circle, every edge case is solved (2026-05-16)
> **Depends On:** QR Circle Join, Menu Variant Accommodations

---

## Problem Statement

The dinner circle exists. Guests can join. Dietary collection works. But right now it's a flat container: a guest list with dietary info. It's not the LIVING DOCUMENT of the event.

If the dinner circle became the single hub where everything about the event lives, updating in real time, visible to everyone who should see it, then every edge case from the entire "Picky Client" exercise is solved in one place:

- The client knows the status (it's in the circle)
- The guests know the menu (it's in the circle)
- The dietary info is collected (it's in the circle)
- The photos are shared (it's in the circle)
- The theme is communicated (it's in the circle)
- The real-time day-of updates flow (it's in the circle)

The circle IS the event. Not a sidebar. The main stage.

---

## Solution

### 1. Circle Rail (Navigation Within the Circle)

Every dinner circle gets a navigation rail with sections:

| Section      | What's Here                                                                                         | Who Sees It                                               |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Overview** | Event name, date, occasion, chef name, theme, what we're celebrating. The "poster" for this event.  | Everyone                                                  |
| **Menu**     | Full menu with courses. Dietary variants shown per guest. "Your menu" personalized view.            | Everyone (their variant)                                  |
| **Guests**   | Who's coming, dietary summary, RSVP status. Guest count.                                            | Host + chef (full). Guests see names only (configurable). |
| **Updates**  | Real-time feed from chef and host. "Menu finalized!" "Shopping complete." "Chef arriving at 3pm."   | Everyone                                                  |
| **Dietary**  | "Submit your dietary needs" form (for guests who haven't). Summary for host/chef.                   | Guests (their own). Host/chef (all).                      |
| **Photos**   | Event photos shared by chef (curated tier). Post-event gallery. Guests can upload too (if enabled). | Everyone (post-event). Chef previews before sharing.      |
| **Details**  | Location, time, parking, dress code, what to bring, special instructions.                           | Everyone                                                  |
| **Chat**     | Group chat for the circle. Host can disable if preferred.                                           | Everyone (if enabled)                                     |

The rail is responsive: sidebar on desktop, bottom tabs on mobile.

### 2. Real-Time Updates Feed

The Updates section is the heartbeat of the circle:

**Pre-event updates (from chef and host):**

- "Menu has been finalized! Take a look." (links to Menu section)
- "Please submit your dietary needs by [date]." (links to Dietary section)
- "We're celebrating [Father]'s birthday! Theme: Lord of the Rings." (if host shares)
- "Chef is sourcing ingredients this week."
- "7 days to go! Here's what to expect."

**Day-of updates (from chef):**

- "On my way! ETA 3:00pm."
- "Set up complete. Prep starting."
- "First course going out in 20 minutes."
- "Dinner is served!"
- "Thank you for a wonderful evening."

**Post-event updates:**

- "Photos from tonight are now in the gallery."
- "Thank you all for coming! It was a pleasure."
- Chef can share a highlight or personal note.

Updates are push notifications (if guest opted in) or visible on next circle visit.

### 3. Personalized Guest Experience

Each guest sees the circle through their own lens:

- **Their menu:** If they're vegan, they see the vegan variant for each course. Not the standard menu with a footnote. THEIR menu.
- **Their dietary status:** "Your dietary info: Vegan. Update?" Or "You haven't submitted dietary info yet."
- **Their RSVP:** "You're confirmed for Saturday." Or "RSVP: Are you coming?"
- **Their role:** Host sees management tools. Guest sees consumption view. Chef sees operational view.

### 4. Theme and Celebration Context

The host can set the event theme and what's being celebrated:

- "Celebrating: Dad's 62nd Birthday"
- "Theme: Lord of the Rings"
- "Dress code: Casual elegant"
- "Vibe: Beachside sunset dinner"

This context appears on the Overview section and in the QR join page when new guests scan.

Why this matters: guests who join the circle BEFORE the event get excited. They know what to expect. They feel included before they arrive. The circle builds anticipation.

### 5. Host Controls

The host (client) has management powers in the circle:

- **Invite guests:** Share the circle link or QR code
- **Set theme/occasion:** What we're celebrating, dress code, vibe
- **Enable/disable sections:** Don't want group chat? Turn it off. Don't want guest-uploaded photos? Turn it off.
- **Privacy settings:** Can guests see each other's names? Can guests see the full guest list or just count?
- **Pin updates:** Important updates stay at top of the feed
- **Add co-hosts:** Give another person management access (the co-hosting spec)

### 6. Chef Controls

The chef has operational powers:

- **Post updates:** Menu changes, timeline updates, day-of status
- **Share photos:** Select which curated photos appear in the circle gallery
- **View dietary summary:** Aggregate view of all guest dietary needs
- **Guest notes:** Private notes per guest (never visible to guests)
- **Menu display:** Control which menu version guests see (draft vs final vs per-variant)

### 7. Circle Persistence (Post-Event)

The circle doesn't die after the event:

- Photos shared post-event remain accessible
- Guest can rebook from the circle: "Book [Chef] for your own event" link
- Circle becomes part of the chef's relationship memory
- Past circles are archived, searchable, and linked to the event archive
- If the same group books again: "Reactivate this circle?" Pre-populated with the same guest list

### 8. Circle as Client Portal Replacement (For This Event)

For guests (not the host), the dinner circle IS their portal:

- They don't need a separate client portal account
- They don't need to log in
- Everything about this event is in the circle they already joined via QR
- The circle link is their bookmark. One link, everything they need.

For the HOST, the circle supplements the full client portal. The host has deeper management access via the portal, but can also participate in the circle as a member.

---

## Edge Cases

### A. Guest Joins Late (Day Of)

Someone shows up who wasn't on the guest list. Scans the QR.

- They join the circle instantly. See the menu, the theme, the updates.
- Chef gets a notification: "New guest joined: [Name]"
- If they have dietary needs: they can still submit (chef sees immediately, adjusts if possible)

### B. Circle for a Recurring Event

Monthly dinner club. Same group, same chef, different menu each month.

- Same circle, new "event" within it. Like channels in a workspace.
- Past menus archived within the circle
- Guest dietary data persists across events (only enter once, update when needed)
- Chef sees: "This circle has had 8 dinners over 14 months"

### C. Surprise Event

The host doesn't want guests to see certain details before they arrive.

- Host can mark sections as "reveal on event day" or "reveal at [time]"
- Menu hidden until host reveals it. "The menu is a surprise! You'll see it when you sit down."
- Theme/celebration context can be hidden too (surprise party: don't tell them who it's for)

### D. Multiple Circles, Same Guest

A guest is in 3 different dinner circles across 3 different chefs.

- Each circle is independent. No cross-circle data leakage.
- Guest's ChefFlow presence (if they create an account) shows all their circles
- But anonymous/token guests just have separate bookmarks for each circle

### E. Large Event (50+ Guests)

QR scanning works at scale, but the circle needs to handle large groups:

- Guest list paginated
- Dietary summary aggregated (not 50 individual entries on one screen)
- Updates feed still works (but chat might need to be disabled for very large events)
- Chef sees: summary stats, not individual noise

### F. Private Information in the Circle

The host shares "Dad is turning 62" in the theme. But maybe Dad doesn't want his age broadcast.

- Host controls what's visible. "Celebrating: Dad's Birthday" (no age) vs "Celebrating: Dad's 62nd!" (with age)
- Chef's private notes about guests never appear in the circle
- Guest dietary info visible to host/chef only (not other guests)
- Guest names visible to other guests only if host enables "show guest list"

---

## Files Likely Touched

- `app/(public)/circle/[token]/page.tsx` (new or major redesign, circle hub with rail)
- `components/circles/circle-rail.tsx` (new, navigation rail with sections)
- `components/circles/circle-overview.tsx` (new, event poster: occasion, theme, chef, date)
- `components/circles/circle-menu-view.tsx` (new, personalized menu per guest with variants)
- `components/circles/circle-updates-feed.tsx` (new, real-time update stream)
- `components/circles/circle-guest-list.tsx` (new, RSVP status, dietary summary)
- `components/circles/circle-dietary-form.tsx` (new or extend existing dietary collection)
- `components/circles/circle-photo-gallery.tsx` (new, post-event shared photos)
- `components/circles/circle-details-card.tsx` (new, location, time, dress code, parking)
- `components/circles/circle-chat.tsx` (new, optional group chat)
- `components/circles/circle-host-controls.tsx` (new, section toggles, privacy, theme editor)
- `components/circles/circle-chef-controls.tsx` (new, update posting, photo sharing, dietary view)
- `lib/dinner-circles/circle-hub-actions.ts` (new, section data fetching, real-time updates)
- `lib/dinner-circles/circle-updates.ts` (new, update feed CRUD, push notifications)
- `lib/dinner-circles/circle-personalization.ts` (new, per-guest menu variant, dietary status)
- `lib/dinner-circles/circle-persistence.ts` (new, post-event archive, reactivation)
- SSE integration for real-time update push (reuse existing SSE infrastructure)
- Database: `circle_updates` table (circle_id, author_type, content, pinned, reveal_at, created_at), `circle_settings` table (circle_id, chat_enabled, guest_photos_enabled, guest_list_visible, theme, occasion, dress_code, vibe)

---

## Verification

### Rail Navigation

- [ ] Circle displays with rail/tabs: Overview, Menu, Guests, Updates, Dietary, Photos, Details, Chat
- [ ] Mobile renders as bottom tabs
- [ ] Desktop renders as sidebar

### Real-Time Updates

- [ ] Chef can post updates visible to all circle members
- [ ] Host can post updates
- [ ] Day-of updates flow in real time (SSE)
- [ ] Updates show timestamp and author
- [ ] Host can pin important updates

### Personalized Experience

- [ ] Vegan guest sees vegan variant menu, not standard menu
- [ ] Guest with submitted dietary sees "Your info: [details]. Update?"
- [ ] Guest without dietary sees "Submit your dietary needs" prompt
- [ ] RSVP status shown per guest

### Theme and Context

- [ ] Host can set occasion, theme, dress code, vibe
- [ ] Theme appears on Overview and QR join page
- [ ] Surprise events: sections hideable until reveal time

### Host Controls

- [ ] Host can enable/disable chat, guest photos, guest list visibility
- [ ] Host can invite via QR or link
- [ ] Host can add co-hosts

### Chef Controls

- [ ] Chef can post updates, share curated photos, view dietary summary
- [ ] Chef's private notes per guest never visible in circle
- [ ] Chef controls which menu version guests see

### Persistence

- [ ] Circle persists post-event with photos and archive
- [ ] "Book [Chef]" link available to all circle guests post-event
- [ ] Past circles archived and searchable
- [ ] Recurring event circle reactivation works

### Privacy

- [ ] Guest dietary info visible only to host and chef
- [ ] Guest list visibility controlled by host
- [ ] No cross-circle data leakage
- [ ] Confidential chef notes never appear in circle
