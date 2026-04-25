# Dinner Circles Elevation Spec

> **Status:** SPEC - Ready for review
> **Created:** 2026-04-24
> **Scope:** 67 improvements across 8 categories. Every item traced to a real codebase gap.
> **Principle:** Fix what's broken, connect what's siloed, then expand what works.

---

## How to Read This

Each item has:

- **What:** the improvement
- **Why:** the gap it closes (with file path citations)
- **Size:** S (hours), M (half-day), L (day+), XL (multi-day)

Items are ordered by impact within each category. Build top-down.

---

## Category 1: Critical Fixes (Broken in Production)

These are bugs. Not enhancements. Things that silently fail or produce wrong behavior.

### 1.1 Fix in-memory notification grouping (non-functional in serverless)

**What:** The `pendingNotifications` Map in `circle-notification-actions.ts:25` uses `setTimeout` for 2-minute batching. In serverless (Vercel), the process terminates after each request. The timer never fires. Smart grouping is completely dead.

**Why:** Every circle message triggers an individual notification email. No batching ever happens.

**Fix:** Replace in-memory Map with a database-backed queue. Insert pending notifications into a `hub_notification_queue` table with a `batch_key` (author + circle + 2-min window). A lightweight cron (or the digest cron) flushes the queue.

**Size:** M

---

### 1.2 Fix `email_normalized` not set during RSVP profile creation

**What:** `integration-actions.ts:67-78` creates hub_guest_profiles with `email` but not `email_normalized`. Later lookups use `email_normalized` (e.g., `email-to-circle.ts:42`). Profiles created via RSVP may be unfindable, causing duplicates.

**Fix:** Set `email_normalized: email.trim().toLowerCase()` on all profile creation paths.

**Size:** S

---

### 1.3 Fix `db.raw('message_count + 1')` in meal board bulk upsert

**What:** `meal-board-actions.ts:339` calls `db.raw()` which is not a valid postgres.js / Drizzle method. The message_count increment silently fails on every bulk meal board operation.

**Fix:** Use a separate `UPDATE hub_groups SET message_count = message_count + 1 WHERE id = $1` raw SQL query.

**Size:** S

---

### 1.4 Fix `searchPeople` friend discovery stub

**What:** `friend-actions.ts:303-309` accepts a query, ignores it (`void query`), returns empty arrays. Friend discovery is non-functional.

**Fix:** Implement actual search against `hub_guest_profiles` by display_name and email, scoped to profiles that share at least one circle with the searcher.

**Size:** M

---

### 1.5 Fix dead notification types

**What:** `contract_ready`, `invoice_sent`, and `repeat_booking_request` are defined in the `HubNotificationType` enum but never fired from any call site. Features implied by types but never implemented.

**Fix:** Wire `contract_ready` to contract generation, `invoice_sent` to invoice creation, `repeat_booking_request` to the rebook flow. Or remove the dead types.

**Size:** M

---

### 1.6 Fix typing indicator dropping `displayName`

**What:** `realtime.ts:78-83` accepts `displayName` in `sendTyping` but only sends `userId` and `isTyping` in the POST body. The display name is lost. UI shows "Someone is typing" instead of "Sarah is typing."

**Fix:** Include `displayName` in the POST body. Update the typing indicator UI to display it.

**Size:** S

---

### 1.7 Fix push subscription `failed_count` never incrementing

**What:** `hub-push-subscriptions.ts` filters on `failed_count < 5` but no code ever increments `failed_count`. The graceful degradation path is dead. Failed subscriptions remain active forever.

**Fix:** In the push send function (`lib/push/send.ts`), catch `410 Gone` and `404` responses and call a new `incrementPushFailedCount(subscriptionId)` function. After 5 failures, auto-deactivate.

**Size:** S

---

### 1.8 Fix SeenByIndicator positioning bug

**What:** `hub-message.tsx` SeenByIndicator uses `position: absolute` with `right-0 top-full` but the parent container lacks `position: relative`. The reader list dropdown renders in unexpected positions.

**Fix:** Add `position: relative` to the parent wrapper.

**Size:** S

---

### 1.9 Fix member list "Leave" redirect

**What:** `hub-member-list.tsx` Leave button always redirects to `/my-hub` (client route). Chef users who leave a circle should redirect to `/circles`.

**Fix:** Accept a `userRole` prop or detect from session. Redirect to `/circles` for chefs, `/my-hub` for clients.

**Size:** S

---

### 1.10 Fix photo gallery and availability poll permission scoping

**What:** Photo delete in lightbox and close-poll in availability grid are available to any authenticated user, not scoped to uploader/creator or admin roles.

**Fix:** Add role/ownership checks. Only uploaders, owners, and admins can delete photos. Only poll creators and admins can close polls.

**Size:** S

---

## Category 2: Missing Connections (Systems That Should Talk)

These are the seams between systems. Each one is a data bridge that doesn't exist yet.

### 2.1 Auto-create circle when ticketing is enabled

**What:** When `toggleEventTicketing(enabled: true)` fires in `lib/tickets/actions.ts`, auto-create a `hub_groups` row for the event if one doesn't exist. Currently, ticket buyers only auto-join a circle if the circle already exists (`webhook-handler.ts:159`). Ticketed events that skip the inquiry flow may never have a circle.

**Why:** This is the single biggest break in the consumer-to-circle pipeline. A buyer pays money, gets a confirmation email, but has no circle to join because nobody created one.

**Size:** M

---

### 2.2 Circle join for comp tickets and walk-ins

**What:** `createCompTicket` and `createWalkInTicket` in `lib/tickets/actions.ts` create ticket records but never create hub profiles or circle memberships. Extract the circle-join logic from `webhook-handler.ts` into a shared `joinTicketBuyerToCircle(ticketId, eventId)` function. Call it from all three ticket creation paths.

**Why:** Comp guests (VIPs, friends, partners) and walk-ins (day-of attendees) are invisible to the Dinner Circle. They miss chat, dietary aggregation, menu updates, and event notifications.

**Size:** M

---

### 2.3 Plus-one hub profiles and circle membership

**What:** Tickets capture `plus_one_name`, `plus_one_dietary`, `plus_one_allergies` but the webhook handler only creates a profile for the primary buyer. Create a hub_guest_profile for each plus-one (using the buyer's email with a "+1" suffix or a generated profile) and add them to the circle.

**Why:** Plus-one dietary data is collected but never reaches the circle's dietary dashboard. Chef can't see "buyer's plus-one has shellfish allergy" in the aggregated view.

**Size:** M

---

### 2.4 Refund removes from circle

**What:** `refundTicket` in `lib/tickets/actions.ts` marks the ticket as refunded and decrements capacity, but leaves the buyer as an active circle member with "attending" RSVP status.

**Fix:** On refund, update `hub_group_members` role to `viewer` (can see history but not post), update `event_guests.rsvp_status` to `cancelled`, and post a system message noting the change.

**Size:** S

---

### 2.5 Connect CIL to circle engagement

**What:** The Continuous Intelligence Layer (`lib/cil/`) has zero awareness of circles. Circle activity (message frequency, poll participation, meal feedback, photo sharing) is a rich signal for client intelligence scoring.

**Fix:** Add a new CIL signal source: `circle_engagement`. Scan `hub_messages`, `hub_message_reactions`, and `hub_meal_feedback` per tenant's circles. Feed engagement scores into the CIL per-client profile.

**Why:** A guest who actively messages in circles looks identical to an inactive guest in CIL. This is a major intelligence blind spot.

**Size:** L

---

### 2.6 Connect campaigns to circle audiences

**What:** `lib/campaigns/` has zero awareness of hub data. Circle members can't be targeted as a campaign audience segment.

**Fix:** Add a `circle_members` audience source to `targeting-actions.ts`. Allow campaigns to target "all guests from circles in the last N days" or "guests who attended 3+ events." Use `hub_guest_profiles` + `hub_guest_event_history` for targeting.

**Why:** The chef's most engaged audience (circle members) is unreachable by the campaigns system.

**Size:** M

---

### 2.7 Connect push dinner campaigns to circles

**What:** Push dinner campaigns (`lib/campaigns/push-dinner-actions.ts`) are conceptually the closest thing to a "dinner circle invitation" but the two systems are completely siloed.

**Fix:** When a push dinner campaign is created, auto-create a `hub_groups` row with `group_type: 'dinner_club'` or `'circle'`. When a recipient books (converted_to_inquiry_id), auto-join them to the circle. The campaign email should mention "Join the Dinner Circle" as a CTA alongside the booking CTA.

**Size:** L

---

### 2.8 Connect settlement to ticket revenue

**What:** `getEventSettlement` in `lib/collaboration/settlement-actions.ts` reads `amount_paid_cents` from the events table, not from actual ticket sales. For ticketed events, the total revenue should be `SUM(total_cents) FROM event_tickets WHERE payment_status = 'paid'`.

**Fix:** Add a ticket revenue query path. If `event_ticket_types` exist for the event, use ticket revenue. Otherwise, fall back to `amount_paid_cents`.

**Size:** M

---

### 2.9 Connect collaborating chefs to the event's circle

**What:** When a collaborator is added to a multi-chef event (`lib/collaboration/actions.ts`), they are never added to the event's Dinner Circle. They can't see guest conversations, dietary data, or menu poll results.

**Fix:** In `inviteChefToEvent`, after creating the `event_collaborators` row, add the collaborating chef's hub profile to the event's circle with `role: 'chef'`. Post a system message: "{Chef B} has joined as {role}."

**Size:** M

---

### 2.10 Connect planning groups to the booking flow

**What:** Planning groups (`lib/hub/planning-candidate-actions.ts`) let users shortlist chefs but have no "book this chef" action. Users must manually navigate to the chef's profile.

**Fix:** Add a `bookFromPlanning(groupId, candidateId)` action that pre-fills the inquiry form from the planning brief (occasion, date, party size, budget, dietary). After the inquiry is created, link the planning circle to the resulting event circle.

**Size:** M

---

### 2.11 Feed meal feedback into CIL preferences

**What:** `hub_meal_feedback` stores reactions (loved/liked/neutral/disliked) and notes per meal, but this data never flows to client preferences or menu intelligence.

**Fix:** When meal feedback is submitted, write a CIL signal: `meal_preference`. Aggregate across events: "Client X has loved risotto 3 times, disliked fish 2 times." Surface in the chef's client profile.

**Size:** M

---

### 2.12 Surface household dislikes and favorites in dietary summary

**What:** `getCircleHouseholdSummary` in `household-actions.ts` only aggregates `allergies` and `dietary_restrictions`. The `dislikes` and `favorites` arrays exist on household members but are never surfaced.

**Fix:** Add `dislikes` and `favorites` aggregation to the summary. Show them in the member list dietary section: "Loves: risotto, dark chocolate. Avoids: cilantro, blue cheese."

**Size:** S

---

### 2.13 Sync RSVP status changes back to hub

**What:** `syncRSVPToHubProfile` is called only on initial RSVP. If a guest changes from "attending" to "declined," the hub profile's event history record is never updated.

**Fix:** Call `syncRSVPToHubProfile` on RSVP update as well (in `lib/sharing/actions.ts`). Post a system message when a guest's RSVP changes.

**Size:** S

---

### 2.14 Embed widget post-inquiry circle link

**What:** The embed widget (`app/embed/inquiry/[chefId]`) submits an inquiry but the confirmation screen never mentions the auto-created circle.

**Fix:** After inquiry submission, return the circle `group_token`. Show "You've been added to a Dinner Circle" with a link in the embed confirmation.

**Size:** S

---

## Category 3: Missing Lifecycle Notifications

The circle should narrate the entire event journey. These transitions are silent.

### 3.1 Event cancellation notification

**What:** When an event transitions to `cancelled`, no circle notification fires. Guests discover it by visiting the circle or never.

**Fix:** Add `event_cancelled` to `circleFirstNotify` call sites in `lib/events/transitions.ts`. Post a notification card with cancellation reason (if provided) and refund status.

**Size:** S

---

### 3.2 Event rescheduled notification

**What:** If the event date/time changes, no circle post fires. Guests may show up on the old date.

**Fix:** In the event update action, detect date/time changes and call `circleFirstNotify` with a new `event_rescheduled` type. Include old and new dates.

**Size:** S

---

### 3.3 New member joined notification

**What:** When a guest joins a circle, no notification is sent to existing members. The chef doesn't know someone new arrived unless they check the member list.

**Fix:** Post a system message and fire `notifyCircleMembers` with `notification_type: 'member_joined'`. Include the new member's name and dietary info.

**Size:** S

---

### 3.4 Dietary change alert to chef

**What:** When a guest adds or updates allergy/dietary info in their hub profile, the chef gets no notification. Critical for food safety.

**Fix:** In `household-actions.ts` update paths, fire a notification to circle members with `role: 'chef'`. Include what changed: "Sarah added tree nut allergy."

**Size:** S

---

### 3.5 Contract signed notification

**What:** `contract_ready` exists as a notification type but `contract_signed` does not. When a client signs a contract, the circle is silent.

**Fix:** Add `contract_signed` to the notification type enum. Fire from the contract signing action.

**Size:** S

---

### 3.6 Tip received / review posted notifications

**What:** Post-event, when a guest tips the chef or posts a review, the circle doesn't celebrate it. These are positive moments that should be shared.

**Fix:** Post system messages for tips ("A guest left a tip!") and reviews ("A guest left a 5-star review!"). No amount or content disclosed for privacy.

**Size:** S

---

### 3.7 Lifecycle notifications respect quiet hours

**What:** `circleFirstNotify` checks throttle and email prefs but bypasses quiet hours and digest mode. A "payment received" notification at 2am pierces quiet hours.

**Fix:** Route lifecycle notifications through the same quiet hours and digest mode checks that `notifyCircleMembers` uses. Critical/time-sensitive types (event_cancelled, running_late) can bypass.

**Size:** S

---

## Category 4: UX Improvements (Bare-Bones to Polished)

### 4.1 Rich events tab in circle view

**What:** The Events tab in `hub-group-view.tsx` shows "Event linked on {date}" with no details. Replace with event cards showing: name, date/time, location, status badge, guest count, financial summary (for chef/admin), menu status, and RSVP button.

**Why:** Guests must navigate away from the circle to see event details. The circle should be the single pane of glass.

**Size:** M

---

### 4.2 Message threading

**What:** Replies are flat with a quoted preview. No expandable thread view. Busy circles lose conversations in the main feed.

**Fix:** Add a "View thread" button on messages with replies. Render a side panel or inline expanded thread. Keep the main feed clean by collapsing threads to "N replies" after 2.

**Size:** L

---

### 4.3 @mentions in messages

**What:** No way to ping a specific member. In a circle with 15 guests, the chef can't direct a question to one person.

**Fix:** Add `@name` autocomplete in `hub-input.tsx`. Store mentioned profile IDs in a `mentions` array on the message. Mentioned users get a notification regardless of their digest/mute settings (except quiet hours).

**Size:** L

---

### 4.4 Message formatting and link previews

**What:** Messages are plain text. No markdown, no bold/italic, no clickable links, no URL previews.

**Fix:** Parse message body through a lightweight markdown renderer (bold, italic, links, lists). For URLs, fetch OG metadata server-side and render inline previews (title, description, image).

**Size:** M

---

### 4.5 Multi-photo upload with albums

**What:** Photo gallery supports single-file upload only. No drag-and-drop. No albums. No lightbox navigation.

**Fix:** Multi-file upload with drag-and-drop. Auto-create albums by date or event. Add prev/next navigation in lightbox. Add download button. Scope delete to uploader + admin.

**Size:** M

---

### 4.6 Social sharing on public event pages

**What:** `/e/[shareToken]` has no share buttons. For ticketed dinner events, attendee social sharing is the primary organic growth channel.

**Fix:** Add share buttons (copy link, X/Twitter, Facebook, WhatsApp, iMessage). Use Web Share API on mobile. Pre-compose share text: "{Event name} on {date} - I'm going! {url}".

**Size:** S

---

### 4.7 Social proof on public event pages

**What:** The page shows remaining capacity but never shows "23 people going" or attendee avatars. Social proof drives conversion.

**Fix:** Add an attendee count with optional avatar strip (for guests who opted in to `show_guest_list`). Show "Sarah and 14 others are going."

**Size:** S

---

### 4.8 Event hero image on public event pages

**What:** `/e/[shareToken]` is text-only. No hero image, no food photos, no venue photos. Compare to any Eventbrite page.

**Fix:** Add `cover_image_url` to `event_share_settings`. Chef uploads a cover image from the tickets tab. Render as hero banner on the public page. Fall back to chef's portfolio photo or a themed gradient.

**Size:** M

---

### 4.9 Calendar add buttons on public event pages

**What:** After ticket purchase, the confirmation screen says "Check your email" with no calendar integration. Guests forget the date.

**Fix:** Add "Add to Google Calendar" and "Add to Apple Calendar" (.ics download) buttons on the confirmation screen. Include event name, date, time, location, and circle link in the calendar event.

**Size:** S

---

### 4.10 Waitlist for sold-out events

**What:** When all ticket types are sold out, the page says "Tickets are not available." Dead end. Lost demand.

**Fix:** Show a "Notify me if tickets become available" email capture. On refund (capacity freed), auto-email the waitlist. Use `open_table_requests` or a new lightweight `ticket_waitlist` table.

**Size:** M

---

### 4.11 Promo codes for ticketed events

**What:** No discount/promo code field. Standard for any ticketing system.

**Fix:** Add `event_promo_codes` table (code, discount_type, discount_amount, max_uses, used_count, expires_at). Add promo code input to the purchase form. Apply discount at checkout. Show "Promo applied: -$15" in order summary.

**Size:** L

---

### 4.12 Free ticket bypass (skip Stripe for $0)

**What:** Tickets with `price_cents: 0` still create a full Stripe Checkout session. Unnecessary friction for free events.

**Fix:** When `total_cents === 0`, skip Stripe entirely. Mark ticket as `paid` immediately. Run the same post-purchase flow (profile creation, circle join, email, notification). Redirect to confirmation.

**Size:** M

---

### 4.13 Chef circles dashboard improvements

**What:** Chef circles page (`app/(chef)/circles/page.tsx`) has no search, no bulk actions, no health metrics, no sorting.

**Fix:** Add:

- Search across all circles (by name, member name, message content)
- Sort by: most recent activity, unread count, member count, event date
- Circle health badges: "3 unanswered messages," "dietary incomplete," "menu poll closing tomorrow"
- Bulk mark-as-read
- Manual circle creation (not just dinner clubs)

**Size:** L

---

### 4.14 Check-in / door management for ticketed events

**What:** No way to mark ticket holders as "checked in" at the event. Basic operational need for ticketed events.

**Fix:** Add `checked_in_at` to `event_tickets`. Add a check-in UI to the tickets tab (list view with checkboxes or QR scan). Show checked-in count vs total in the summary card.

**Size:** M

---

### 4.15 Ticket type editing

**What:** The tickets tab UI can create, pause, and delete ticket types but cannot edit name, price, description, or capacity. `updateTicketType` server action exists but isn't wired.

**Fix:** Add an edit mode to each ticket type card. Capacity cannot go below `sold_count`. Price changes only apply to future purchases.

**Size:** S

---

### 4.16 Ticket CSV export

**What:** No export for the guest list. For events with 50+ tickets, the chef has no way to get data out.

**Fix:** Add "Export CSV" button to tickets tab. Include: buyer name, email, phone, ticket type, quantity, amount, payment status, dietary, allergies, plus-one info, checked-in status.

**Size:** S

---

### 4.17 Dietary allergen cross-check on menu poll votes

**What:** When guests vote for a dish, there is no check against their known allergies. A guest with a nut allergy can vote for a dish flagged with tree nuts.

**Fix:** Show a warning badge on dish options that conflict with the voter's known allergies: "This dish contains tree nuts (you have a tree nut allergy)." Allow the vote but surface the conflict.

**Size:** M

---

### 4.18 Poll auto-close cron

**What:** Polls have `closes_at` but it's only checked at vote time. No cron auto-closes expired polls.

**Fix:** Add a `close-expired-polls` task to the digest cron. Close expired availability polls and menu polls. Post a system message with results.

**Size:** S

---

### 4.19 Community circles: sorting, geo-filtering, recommendations

**What:** `/hub/circles` discovery has no sorting (popular, trending, newest), no geographic filtering, hardcoded topic filters.

**Fix:**

- Sort by: most active (message_count/7d), trending (new members/7d), newest, largest
- Location filter: use browser geolocation or city input to filter circles with `display_area` matching
- Dynamic topic filters from actual circle `display_vibe` values (replace hardcoded 10)
- "Recommended for you" section based on past circle membership and dietary profile

**Size:** L

---

### 4.20 Circle-level RSVP from within the circle

**What:** Guests cannot RSVP from within the circle. They must navigate to a separate page.

**Fix:** Add an RSVP widget to the circle view (above the chat, below the event card). "Are you coming?" with Yes/Maybe/No buttons. Sync to `event_guests.rsvp_status`. Show RSVP counts to the chef.

**Size:** M

---

## Category 5: New Features (Don't Exist Yet)

### 5.1 Circle-level timeline / calendar view

**What:** No unified view of event dates, meal board dates, poll deadlines, and scheduled events across a circle's lifecycle.

**Build:** A timeline component that aggregates: event dates, menu poll close dates, availability poll dates, meal board entries, and lifecycle milestones (paid, confirmed, completed). Render as a vertical timeline or horizontal calendar strip.

**Size:** L

---

### 5.2 Ticketed events in the discovery feed

**What:** `/eat` discovery feed never surfaces upcoming ticketed events. `getUpcomingPublicEvents` exists but isn't called from the discovery feed.

**Build:** Add `'ticketed_event'` to `ConsumerResultType`. In `getConsumerDiscoveryFeed`, query `event_share_settings` joined to events for active, upcoming, ticketed events. Render as event cards with date, price range, and "Get Tickets" CTA.

**Size:** M

---

### 5.3 Circles in the discovery feed

**What:** `/eat` discovery feed never surfaces community circles. A consumer searching "Italian dinner party" should see relevant circles.

**Build:** Add `'circle'` to `ConsumerResultType`. In `getConsumerDiscoveryFeed`, query `hub_groups` with `visibility: 'public'` and `group_type: 'community'`. Match against dietary_theme, display_vibe, and name. Render as circle cards with member count and recent activity.

**Size:** M

---

### 5.4 "Create a circle for this restaurant" from /nearby

**What:** `/nearby` listing pages link to circle discovery but can't create or bind circles to a listing.

**Build:** Add a "Plan a dinner here" button on listing detail pages. Creates a `planning` circle with the listing pre-added as a candidate. Add `directory_listing_id` FK to `hub_groups` for binding. Pre-fill the planning brief with the listing's cuisine, location, and price range.

**Size:** M

---

### 5.5 Circle presence (who's online)

**What:** No way to see who is currently viewing the circle. The presence API endpoint exists (`app/api/realtime/presence/route.ts`) but no client subscription exists.

**Build:** Add `subscribeToPresence` in `realtime.ts`. Show green dots on online member avatars. Show "3 members online" in the header. Track last-seen timestamps.

**Size:** M

---

### 5.6 Direct messages between circle members

**What:** No private messaging within the circle context. All messages are visible to all members.

**Build:** Add a "Message privately" action on member cards. Create a `hub_direct_messages` table (or reuse `hub_messages` with a `direct_to_profile_id` column filtered from the main feed). Render DMs in a separate tab or slide-out panel.

**Size:** L

---

### 5.7 Circle analytics dashboard for chefs

**What:** Chefs have no visibility into circle health: engagement rate, response times, dietary completion, guest satisfaction.

**Build:** A chef-facing analytics panel showing:

- Active circles: count, avg members, avg message frequency
- Response metrics: avg time to first guest message, avg time to dietary completion
- Engagement: messages/week trend, poll participation rate, photo sharing rate
- Dietary completion: % of guests with allergies/dietary filled out
- Guest satisfaction: aggregated meal feedback scores across circles

**Size:** L

---

### 5.8 Invite tracking and analytics

**What:** HMAC-signed invite links identify the inviter but no table records sends, clicks, or conversions.

**Build:** Add `hub_invite_events` table (invite_token_hash, inviter_profile_id, group_id, event_type: sent/clicked/joined, created_at). Track invite link generation, page views of the join page, and actual joins. Surface in chef analytics: "Your guests invited 23 friends. 14 clicked. 8 joined."

**Size:** M

---

### 5.9 Invite expiry

**What:** Invite tokens are HMAC-signed with no expiration claim. Links are valid forever.

**Build:** Add an `exp` claim to the HMAC payload (default: 30 days). Validate expiry on join. Show "This invite has expired. Ask {inviter} for a new link" on expired join pages. Allow chefs to set custom expiry per circle.

**Size:** S

---

### 5.10 Guest upgrade prompt wiring

**What:** `GuestUpgradePrompt` component exists but is never rendered in `hub-group-view.tsx`. Unauthenticated guests who access circles via profile tokens are never prompted to create an account.

**Build:** Render `GuestUpgradePrompt` in the circle view for guests with a `profile_token` cookie but no `auth_user_id`. Show after 3rd visit or 1st message sent. "Create an account to keep your dietary info, friend connections, and event history across all circles."

**Size:** S

---

### 5.11 Recurring meal auto-apply cron

**What:** `applyRecurringMeals` exists but must be manually called. No cron auto-fills next week's meals.

**Build:** Add a `recurring-meals-apply` task to the weekly cron. Run Sunday evening. Auto-fill the coming week's meal board from saved recurring patterns. Post a system message: "Next week's meals are ready for review."

**Size:** S

---

### 5.12 Snack support in meal board

**What:** `snack` is defined as a meal type but `MEAL_TYPES` hardcodes `['breakfast', 'lunch', 'dinner']`. Snacks are invisible.

**Fix:** Add `'snack'` to `MEAL_TYPES`. Render as a fourth row in the weekly grid.

**Size:** S

---

## Category 6: Growth & Network Effects

Features that accelerate the flywheel.

### 6.1 Post-event circle-to-rebook pipeline

**What:** After an event completes, the circle goes to archive. The rebook CTA exists but it's a dead-end link. The circle should become the rebook vehicle.

**Build:** On event completion, post a "Rebook?" card to the circle with: one-click rebook (pre-fills from this event), date poll (for the group to pick the next date), and "Invite more friends" CTA. The circle stays warm instead of dying.

**Size:** M

---

### 6.2 Guest-to-guest circle creation

**What:** Guests can only join circles created by chefs. There's no "I want to plan a dinner with my friends and then find a chef" flow that starts from the consumer side.

**Build:** Consumer creates a planning circle from `/my-hub/create` or `/hub/circles`. Adds friends. Fills in the planning brief (occasion, budget, date, dietary). Browses chefs from the directory within the circle. Sends a group inquiry pre-filled from the brief. Chef sees "Group of 6 is looking for an Italian dinner, $100/head, 2 vegetarians" instead of a bare inquiry.

**Why:** This inverts the funnel. Instead of chef-push (campaigns, push dinners), this is consumer-pull (groups self-organize and pull chefs in). Higher intent, higher conversion, higher satisfaction.

**Size:** L

---

### 6.3 Circle referral program

**What:** Invite attribution exists (HMAC-signed tokens) but creates no value for the inviter.

**Build:** When an invited guest books a chef (directly or via a circle), the inviter earns loyalty points. Show a referral leaderboard in the client portal: "You've introduced 8 friends to great food." Award milestone badges (First Invite, Circle Builder, Tastemaker). Optionally: referral credits toward future bookings.

**Size:** M

---

### 6.4 Chef showcase in community circles

**What:** Community circles are social spaces but have no commercial bridge. A chef can't surface their services to a community circle they belong to.

**Build:** Allow chefs to "pin a tasting" or "offer an experience" to community circles they're members of. Renders as a special card: chef photo, experience name, price, date, "Book" CTA. Community circle becomes a discovery channel. Rate-limited to prevent spam (1 offer per chef per circle per week).

**Size:** M

---

### 6.5 Open Table discovery page

**What:** The `is_open_table`, `open_seats`, `max_group_size`, `closes_at` fields exist on `hub_groups` but there's no dedicated discovery page for Open Tables.

**Build:** `/open-tables` page showing upcoming Open Table circles: chef name, cuisine, date, price, open seats, dietary theme, "Request a Seat" CTA. Feeds from `hub_groups WHERE is_open_table = true AND is_active = true AND closes_at > now()`. Uses `open_table_requests` for the join flow with chef approval.

**Why:** Open Tables are the highest-leverage growth feature. A chef fills empty seats. A consumer discovers a unique experience. No booking overhead. The circle handles coordination.

**Size:** L

---

### 6.6 Cross-circle guest recommendations

**What:** A guest who loved a dinner with Chef A might love Chef B's upcoming event. No recommendation engine connects these.

**Build:** When a guest completes an event (positive feedback or rebook), surface "You might also enjoy" cards from other chefs' upcoming ticketed events or open tables. Match on: cuisine overlap, dietary compatibility, location proximity, price range similarity. Render in the client portal dashboard and in post-event circle notifications.

**Size:** L

---

### 6.7 Multi-chef dinner series (season pass)

**What:** Dinner clubs support multi-event persistence but there's no "subscribe to a series" model.

**Build:** Chef creates a dinner series (e.g., "4-Course Italy: 4 monthly dinners"). Adds a `series` ticket type that covers all events. Series subscribers auto-join all circles. Each event in the series links to the dinner club circle. Early-bird pricing for the full series.

**Why:** Subscription model = predictable revenue for chefs + committed attendance. The circle is the connective tissue across all events in the series.

**Size:** XL

---

### 6.8 Corporate circle program

**What:** No corporate-specific features. Corporate lunch coordination is a huge market with no tooling.

**Build:** Corporate circles with department-level dietary aggregation, per-employee meal preferences, budget tracking, and compliance reporting. A company admin creates a circle, invites employees, and books chefs for recurring team lunches. The circle aggregates dietary data across the team. The chef sees "Marketing team: 12 people, 3 vegetarian, 1 celiac, $18/head budget."

**Size:** XL

---

## Category 7: Data Quality & Intelligence

### 7.1 Candidate snapshot refresh

**What:** Planning group candidate snapshots are point-in-time and never refresh. Chef pricing or availability changes make snapshots stale.

**Fix:** Add a `refreshCandidateSnapshots(groupId)` action that re-queries live data for each candidate. Run on planning group load (if snapshot is >24h old). Show "Last updated: 3 days ago" badge.

**Size:** M

---

### 7.2 Dietary data back-sync

**What:** When a guest updates dietary info in the hub, it doesn't flow back to `event_guests` or the RSVP record. Two sources of truth.

**Fix:** On hub profile dietary update, propagate changes to all active `event_guests` records for that profile. Fire the dietary-change notification (3.4).

**Size:** M

---

### 7.3 Guest profile merge on signup

**What:** When a hub guest creates a client account, historical circle activity may remain orphaned on an unlinked profile.

**Fix:** On client account creation, search `hub_guest_profiles` by `email_normalized`. If found, link the profile (`auth_user_id`, `client_id`). Merge duplicate profiles if multiple exist for the same email.

**Size:** M

---

### 7.4 SSE reconnection logic

**What:** `realtime.ts` creates EventSource with no error handling. If the connection drops, no reconnection attempt and no UI feedback.

**Fix:** Add `onerror` handler with exponential backoff reconnection. Show a "Reconnecting..." banner in the chat UI. Fetch missed messages on reconnection.

**Size:** M

---

### 7.5 Real-time subscriptions for polls and meal board

**What:** Only messages and members have real-time SSE subscriptions. Poll votes, availability responses, and meal board changes require manual refresh.

**Fix:** Add SSE channels for `hub_polls`, `hub_availability_responses`, and `hub_meal_entries`. Subscribe in the respective UI components. Eliminate the 15-second polling interval in the menu polling board.

**Size:** L

---

## Category 8: Distribution & Partnerships

### 8.1 Event syndication engine (Phase 2 of ticketed events spec)

**What:** The `event_distribution` table and types exist but no application code syncs events to external platforms.

**Build:** Start with the simplest channel: Google Events structured data (already partially done via JSON-LD). Then add:

- **Google Calendar publish:** Create a public Google Calendar event with ticket link
- **Facebook Events API:** Create a Facebook event with ticket link
- **Eventbrite API:** Create an Eventbrite listing that redirects to ChefFlow for purchase
- Each channel: draft -> publish -> sync status tracking -> error handling

**Size:** XL (per platform, phased)

---

### 8.2 Embed widget with circle preview

**What:** The embed widget is a pure inquiry form with no circle awareness.

**Build:** After inquiry submission via embed, show a mini-circle preview: "You've been added to a Dinner Circle. See your event updates, share dietary info, and chat with your chef." With a "Open Dinner Circle" button linking to `/hub/g/{token}`.

**Size:** S

---

### 8.3 Partner venue circle integration

**What:** Partner venues (`lib/partners/`) have no circle integration. A venue hosting a dinner can't see the circle.

**Build:** Add venue partners as circle members with a `venue` role. They see event logistics (date, guest count, setup needs) but not pricing or private chef-client conversations. Post venue-specific updates: "Venue confirmed setup at 4pm."

**Size:** M

---

### 8.4 QR code generation for event pages

**What:** No QR code for the public event page. For physical promotion (posters, table cards, menus), a QR code is essential.

**Build:** Generate a QR code for `/e/[shareToken]`. Downloadable as PNG/SVG from the chef's tickets tab. Include in the public event page for sharing.

**Size:** S

---

### 8.5 Email digest with circle activity summary for chefs

**What:** Chefs get individual circle notifications but no daily summary of activity across all their circles.

**Build:** Daily chef digest email: "Yesterday across your circles: 12 new messages, 3 new members, 2 dietary updates, 1 menu poll closing tomorrow." Link to each active circle. Run on the existing digest cron.

**Size:** M

---

---

## Implementation Priority Matrix

### Phase 1: Fix What's Broken (Week 1)

Items: 1.1-1.10 (10 critical fixes)
Impact: Stop silent failures. Build trust in the system.

### Phase 2: Connect What's Siloed (Week 2-3)

Items: 2.1-2.4 (ticketing-circle bridge), 3.1-3.7 (lifecycle notifications), 2.14 (embed)
Impact: The consumer-to-circle pipeline becomes seamless. Every ticket buyer lands in a circle. Every lifecycle event narrates itself.

### Phase 3: Polish the UX (Week 3-4)

Items: 4.1-4.9, 4.14-4.18 (event page, chef dashboard, menu safety)
Impact: Circles feel polished. Public event pages convert. Chefs manage efficiently.

### Phase 4: Grow the Network (Week 5-6)

Items: 6.1-6.5 (rebook pipeline, consumer-pull, referrals, Open Tables, chef showcase)
Impact: Flywheels spin. Guests become hosts. Circles multiply organically.

### Phase 5: Intelligence & Distribution (Week 7-8)

Items: 2.5-2.6 (CIL + campaigns), 5.7-5.8 (analytics, invite tracking), 8.1-8.5 (syndication)
Impact: Data moat deepens. Chef decisions improve. External channels drive traffic.

### Phase 6: New Markets (Week 9+)

Items: 6.6-6.8 (recommendations, dinner series, corporate), 5.1-5.6 (timeline, DMs, presence)
Impact: New revenue streams. New user segments. Platform lock-in.

---

## Success Metrics

| Metric                                       | Current                        | Target (90 days)        |
| -------------------------------------------- | ------------------------------ | ----------------------- |
| Circle auto-creation rate on ticketed events | 0% (manual only)               | 100%                    |
| Ticket buyer -> circle join rate             | ~60% (only when circle exists) | 95%+                    |
| Lifecycle events narrated in circle          | 9 of 15                        | 15 of 15                |
| Average messages per circle                  | unknown                        | 20+ per event lifecycle |
| Guest dietary completion rate                | unknown                        | 80%+                    |
| Post-event rebook rate via circle            | 0% (no pipeline)               | 15%+                    |
| Consumer-initiated planning circles          | 0 (no flow)                    | 50/month                |
| Open Table fill rate                         | 0% (no discovery page)         | 40%+                    |
| Circle-attributed bookings                   | 0 (no tracking)                | 20% of all bookings     |
