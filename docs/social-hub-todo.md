# Social Event Hub — Full Build & Improvement List

> Generated 2026-02-28. Tracks everything needed to make the hub client-ready.
> Context: Single-chef app (the developer). No marketplace, no "Find a Chef" flow.

---

## TIER 0: DEPLOYMENT BLOCKERS (must do before anything works)

- [ ] **0.1** Apply all 8 hub migrations to Supabase (`supabase db push` — requires backup first)
- [ ] **0.2** Regenerate TypeScript types (`supabase gen types typescript --linked > types/database.ts`)
- [ ] **0.3** Run `npx tsc --noEmit --skipLibCheck` — verify zero new type errors
- [ ] **0.4** Run `npx next build --no-lint` — verify build passes

---

## TIER 1: CRITICAL BUGS (broken right now)

- [ ] **1.1** Fix photo gallery thumbnail bug — `hub-photo-gallery.tsx` line 197 uses `useState()` initializer instead of `useEffect()` to load signed URLs. Thumbnails never load on mount.

---

## TIER 2: CHEF-FACING SIDE (you need this to manage hubs)

- [ ] **2.1** Add `/social/hub-overview` to nav sidebar (`nav-config.tsx`) — adminOnly, under Social group. Without this, the page is invisible.
- [ ] **2.2** Chef hub management page (`/social/hub-groups`) — list all hub groups tied to your events, member counts, message counts, last activity. Link to each group.
- [ ] **2.3** Chef can create a hub group proactively from event detail — "Create Hub Group" button on events that don't have one yet (not just auto-created on RSVP).
- [ ] **2.4** Chef moderation tools — delete messages, remove members, mute users from the group view (role-gated to `chef`/`owner`/`admin`).
- [ ] **2.5** Chef can post in hub groups with a "Chef" role badge — visible distinction from guest messages.
- [ ] **2.6** Aggregated dietary view — from hub group members, show a combined allergy/dietary summary (useful for menu planning). Could be a panel on event detail or a tab in the hub.
- [ ] **2.7** Hub activity in chef inbox/notifications — when guests post, chef gets a notification (or at minimum, unread badges in the sidebar nav).

---

## TIER 3: CLIENT-FACING SIDE (your clients need this)

- [ ] **3.1** Client hub dashboard — when a client logs in, they should see their hub groups somewhere (e.g., on `/my-events` or a new `/my-hub` page). Shows groups they're in, unread counts, quick links.
- [ ] **3.2** Client can create an event stub from their portal — simplified form: title, occasion, date, guest count, notes. Creates stub + hub group. NO "Find a Chef" button — stub goes directly to you.
- [ ] **3.3** Client can invite friends to a hub group — share link UI (copy link, text it). The `can_invite` permission and `allow_member_invites` group setting already exist in the schema.
- [ ] **3.4** Client event planning view — after creating a stub, client lands in the hub group where they can chat, add notes, run polls, set availability with their friends.
- [ ] **3.5** Stub → Real Event adoption (chef-side) — when a client creates a stub, it appears in your hub overview. You click "Take This Event" → creates a real event linked to the group. System message: "Chef [you] is on it!"
- [ ] **3.6** Remove "seeking_chef" status and "Find a Chef" UI — stubs go from `planning` → `adopted` directly (you're the only chef). Hide the `seeking_chef` status from all UI. Keep it in the schema for future marketplace expansion but don't expose it.

---

## TIER 4: NOTIFICATIONS & ENGAGEMENT (makes it feel alive)

- [ ] **4.1** Wire up real email notifications — `notification-actions.ts` currently logs to console. Integrate with `lib/email/send.ts` to actually send "New message in your group" emails.
- [ ] **4.2** Notification preferences per group — `notifications_muted` field exists on `hub_group_members`. Add UI toggle in member settings or group header.
- [ ] **4.3** Typing indicators — `createHubTypingIndicator()` is built in `realtime.ts` but never wired to `hub-input.tsx` or displayed in `hub-feed.tsx`. Show "Sarah is typing..." in the chat.
- [ ] **4.4** Member join real-time updates — `subscribeToGroupMembers()` exists but isn't used. When someone joins, show it live in the feed without refresh.
- [ ] **4.5** Push notifications (PWA) — leverage existing PWA notification infrastructure. Alert guests when there's new activity in their groups.
- [ ] **4.6** Unread badge in chef sidebar nav — show total unread count from hub groups on the nav item (the `getHubTotalUnreadCount()` action already exists).

---

## TIER 5: UX POLISH (makes it feel good)

- [ ] **5.1** Message editing — guests should be able to edit their own messages (within a time window, e.g., 15 minutes). `edited_at` column already exists.
- [ ] **5.2** Group privacy settings UI — `visibility` column exists (public/private/secret) but no UI to change it. Add to group settings.
- [ ] **5.3** Anonymous posting toggle — `allow_anonymous_posts` and `is_anonymous` exist in schema but no UI toggle for group owners.
- [ ] **5.4** Member invite UI — dedicated invite flow beyond just sharing the link. Enter email/name → sends invite text/email with the group link.
- [ ] **5.5** Reply threading — `reply_to_message_id` exists and replies show inline, but consider a collapsible thread view for long conversations.
- [ ] **5.6** Message search — search past messages within a group. Useful for finding pinned notes, past decisions, etc.
- [ ] **5.7** Emoji picker for reactions — currently uses the text emoji list from `hub-message.tsx`. Replace with a proper emoji picker component.
- [ ] **5.8** Image preview in chat — when a photo is shared via the chat input, show an inline preview in the message, not just a link.
- [ ] **5.9** Mobile-optimized layout — ensure all hub pages look good on phone screens (guests will open links on their phones). Test at 375px viewport.
- [ ] **5.10** Loading skeletons — add skeleton UI for hub pages while data loads (group view, profile page, feed).
- [ ] **5.11** Empty states — improve empty state messaging for new groups (no messages yet, no photos yet, no events yet). Make them encouraging, not just "nothing here."

---

## TIER 6: THEME SYSTEM EXPANSION

- [ ] **6.1** Theme preview on share page — the `themed-wrapper.tsx` wraps the hub group view, but should also style the share page (`/share/[token]`). The `theme_id` column on `event_shares` is ready.
- [ ] **6.2** Theme management (admin) — page to view/edit/add themes beyond the 18 seeded ones. Low priority since 18 is probably enough.
- [ ] **6.3** Theme voting in groups — let guests vote on which theme to use for their event via a poll.

---

## TIER 7: ANALYTICS & OBSERVABILITY

- [ ] **7.1** Hub engagement stats on chef dashboard — "X guests active in hub groups this week", "Y messages posted", etc. Widget on the main dashboard.
- [ ] **7.2** Per-group analytics — message frequency, most active members, photo count, poll participation rates. Helps chef understand guest engagement.
- [ ] **7.3** Hub activity in the existing activity feed — when guests post, RSVP, or share photos, it should show up in the chef's activity timeline.

---

## TIER 8: DATA & EXPORT

- [ ] **8.1** Export group chat history — download as PDF or text file. Useful for record-keeping or sharing with someone not in the group.
- [ ] **8.2** Photo album download — bulk download all photos from a group/event as a zip.
- [ ] **8.3** Guest dietary aggregate export — export all dietary restrictions and allergies from a group's members as a list (useful for grocery shopping / menu planning).

---

## TIER 9: FUTURE / MARKETPLACE (NOT NOW)

> These are for when the app expands beyond a single chef. Keep in schema, hide from UI.

- [ ] **9.1** "Find a Chef" marketplace — stubs with `seeking_chef` surface to multiple chefs. Chef profiles, ratings, availability matching.
- [ ] **9.2** Multi-chef hub groups — groups that span multiple chefs (e.g., a catering collab).
- [ ] **9.3** Public chef profiles — guests can browse chefs, see past event photos, read reviews.
- [ ] **9.4** Referral system — guests invite friends to the platform, earn loyalty points.

---

## BILLING ENFORCEMENT (decide before launch)

- [ ] **B.1** Decide: Is the hub gated behind Pro, or free for all chefs? Currently registered as Pro (`social-hub` module) but NO enforcement anywhere — no `requirePro()` calls in server actions, no `<UpgradeGate>` on pages.
- [ ] **B.2** If Pro: add `requirePro('social-hub')` to all hub server actions + `<UpgradeGate>` on hub pages.
- [ ] **B.3** If Free: remove from `pro-features.ts` and `modules.ts` to avoid confusion.

---

## TESTING

- [ ] **T.1** End-to-end test: Create hub group → invite guest → guest joins → post message → see realtime update → react → create poll → vote → share photo → pin note
- [ ] **T.2** RSVP → hub sync test: Submit RSVP on share page → verify profile created → verify event history saved → verify auto-join to group
- [ ] **T.3** Event completion test: Complete an event → verify menu snapshot in guest history
- [ ] **T.4** Mobile viewport screenshots: All hub pages at 375px width
- [ ] **T.5** Soak test: Repeated navigation across hub pages to check for memory leaks (realtime subscriptions, event listeners)

---

## SUMMARY

| Tier                | Items  | Priority                     |
| ------------------- | ------ | ---------------------------- |
| 0 — Deploy blockers | 4      | Must do first                |
| 1 — Critical bugs   | 1      | Fix immediately              |
| 2 — Chef side       | 7      | High — you need this         |
| 3 — Client side     | 6      | High — clients need this     |
| 4 — Notifications   | 6      | Medium — makes it feel alive |
| 5 — UX polish       | 11     | Medium — makes it feel good  |
| 6 — Themes          | 3      | Low                          |
| 7 — Analytics       | 3      | Low                          |
| 8 — Export          | 3      | Low                          |
| 9 — Future          | 4      | Not now                      |
| B — Billing         | 3      | Decide before launch         |
| T — Testing         | 5      | Before showing clients       |
| **Total**           | **56** |                              |
