# System Integrity Question Set: Network & Collaboration

> 40 questions across 10 domains. Covers all 8 network pages: social feed, channels, discover, connections, collaboration inbox, collab spaces, introduction bridges, chef profiles.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                          | Answer                                                                                                                                                                                                                                                  | Status |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Do all 8 network pages gate with `requireChef()`?                 | Yes. All 8 pages call `requireChef()` directly. Layout also gates.                                                                                                                                                                                      | BUILT  |
| 2   | Do `[id]` pages check resource existence and return `notFound()`? | Yes. `[chefId]/page.tsx` uses try/catch with `notFound()`. `bridges/[bridgeId]/page.tsx` checks `if (!detail) notFound()`. `collabs/[spaceId]/page.tsx` checks `if (!detail) notFound()`. `channels/[slug]/page.tsx` checks `if (!channel) notFound()`. | BUILT  |
| 3   | Is there no error.tsx in the network directory?                   | Correct. No `error.tsx` found. Errors bubble to the parent `(chef)/error.tsx` which was sanitized in the systemic sweep (shows "Something went wrong." with opaque digest).                                                                             | BUILT  |
| 4   | Does the `[chefId]` page prevent viewing own profile?             | Yes. Detects `chefId === user.entityId` and shows "This is your own profile" with link to settings/profile instead.                                                                                                                                     | BUILT  |

## Domain 2: Chef Identity Scoping

| #   | Question                                                        | Answer                                                                                                                                                                                      | Status |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Do all network actions use `user.entityId` for chef identity?   | Yes. All functions in `lib/network/actions.ts`, `collab-actions.ts`, and `collab-space-actions.ts` call `requireChef()` and use `user.entityId` to scope queries to the authenticated chef. | BUILT  |
| 6   | Are connections scoped to the authenticated chef's perspective? | Yes. `getMyConnections` filters by `requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`. All connection queries filter by the authenticated chef.                            | BUILT  |
| 7   | Is the collab inbox filtered to the recipient chef?             | Yes. `getCollabInbox` filters `.eq('recipient_chef_id', user.entityId)`. Sent items filter `.eq('from_chef_id', user.entityId)`. Both expire overdue handoffs for the chef first.           | BUILT  |
| 8   | Do collab spaces verify membership?                             | Yes. `getCollabSpaceDetail` uses `requireChef()` and `user.entityId` to verify the chef is a member of the space before returning data.                                                     | BUILT  |

## Domain 3: Social Feed & Posts

| #   | Question                                                          | Answer                                                                                                                                                                                   | Status |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 9   | Does the social feed show posts from connections only?            | Yes. `getSocialFeed` in `actions.ts` first loads connected chef IDs, then filters posts to those from connections + own posts. Non-connected chef posts not visible.                     | BUILT  |
| 10  | Does the feed mark own posts correctly?                           | Yes. Each post has `is_mine: post.author_chef_id === user.entityId`. UI uses this for edit/delete controls.                                                                              | BUILT  |
| 11  | Do post visibility controls respect feature preferences?          | Yes. `getFeaturePreferenceMapForChef` loads per-chef visibility preferences and filters accordingly.                                                                                     | BUILT  |
| 12  | Does the trending/discover panel show community-wide data safely? | Yes. `getDiscoverChefs`, `getTrendingHashtags`, `getTrendingPosts` are intentionally cross-chef (community features). No private data exposed; only public profile info and post counts. | BUILT  |

## Domain 4: Channels

| #   | Question                                                     | Answer                                                                                                                                                                                         | Status |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 13  | Are channels shared across all chefs by design?              | Yes. `channels/[slug]/page.tsx` uses `createServerClient({ admin: true })` to read channels. Channels are community-wide, not tenant-scoped. This is intentional for the social network model. | ACCEPT |
| 14  | Does the channel feed show posts from the channel only?      | Yes. `getChannelFeed` filters by channel slug. Posts are scoped to channel membership.                                                                                                         | BUILT  |
| 15  | Can a chef join/leave channels?                              | Yes. `getMyChannels` returns the authenticated chef's channel memberships. `ChannelJoinButton` client component handles join/leave via server actions.                                         | BUILT  |
| 16  | Does the channel page return `notFound()` for invalid slugs? | Yes. `if (!channel) notFound()` after slug lookup.                                                                                                                                             | BUILT  |

## Domain 5: Connections & Requests

| #   | Question                                                    | Answer                                                                                                                                         | Status |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17  | Does `sendConnectionRequest` validate the target chef?      | Yes. Uses `requireChef()` and validates the target chef exists before creating the connection request.                                         | BUILT  |
| 18  | Does the pending requests view show both sent and received? | Yes. `getPendingRequests` in `actions.ts` filters by both `requester_id` and `addressee_id`, returning direction (`sent`/`received`) for each. | BUILT  |
| 19  | Can a chef connect with themselves?                         | No. `[chefId]/page.tsx` detects self-view and redirects. Underlying actions also guard against self-connections.                               | BUILT  |
| 20  | Does the discover panel filter out already-connected chefs? | Yes. `getNetworkDiscoverable` uses `.neq('id', user.entityId)` and filters out existing connections.                                           | BUILT  |

## Domain 6: Collaboration Handoffs

| #   | Question                                               | Answer                                                                                                                                                              | Status |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 21  | Does the collab inbox expire overdue handoffs?         | Yes. `expireOverdueHandoffsForChef` is called before every inbox read (both received and sent). Expired handoffs automatically cleaned up.                          | BUILT  |
| 22  | Does handoff viewing verify participant authorization? | Yes. `getCollabHandoffDetail` checks `handoff.from_chef_id === user.entityId` or `handoff.recipient_chef_id === user.entityId`. Non-participants get access denied. | BUILT  |
| 23  | Do collab metrics scope to the authenticated chef?     | Yes. `getCollabMetrics` filters all queries by `user.entityId` for completed handoffs, active partnerships, and response times.                                     | BUILT  |
| 24  | Does the unread count scope correctly?                 | Yes. `getCollabUnreadCount` filters `.eq('recipient_chef_id', user.entityId)` and counts unread items for the authenticated chef only.                              | BUILT  |

## Domain 7: Trusted Circle & Availability

| #   | Question                                                    | Answer                                                                                                                                                                                 | Status |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 25  | Does the trusted circle validate connected chefs only?      | Yes. `addToTrustedCircle` checks `validated.trustedChefId === user.entityId` (self-guard) and verifies the target chef is in the connected set via `getConnectedChefIds`.              | BUILT  |
| 26  | Does availability signal sharing scope to trusted circle?   | Yes. `getCollabAvailabilitySignals` reads signals only from chefs in the authenticated chef's trusted circle. Non-circle chefs' availability not visible.                              | BUILT  |
| 27  | Does the trusted circle enforce max size?                   | Yes. Checks current circle size before adding. Prevents unbounded growth.                                                                                                              | BUILT  |
| 28  | Can chefs see each other's client data through the network? | No. Network shows only public profile info (name, bio, city, specialties, post count, follower count). No client PII, no financial data, no event details visible through the network. | BUILT  |

## Domain 8: Collab Spaces (Private Messaging)

| #   | Question                                                      | Answer                                                                                                                                            | Status |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 29  | Does space creation require both parties to be connected?     | Yes. `createCollabSpace` verifies connection status between the two chefs before creating the space.                                              | BUILT  |
| 30  | Does the space detail verify membership?                      | Yes. `getCollabSpaceDetail` checks the authenticated chef is a member of the space. Returns null for non-members (triggers `notFound()` in page). | BUILT  |
| 31  | Does the spaces unread count scope to the authenticated chef? | Yes. `getCollabSpacesUnreadCount` filters by the authenticated chef's membership and counts only their unread messages.                           | BUILT  |
| 32  | Do space summaries show only spaces the chef belongs to?      | Yes. `getCollabSpaceSummaries` filters by `user.entityId` membership. No cross-chef space visibility.                                             | BUILT  |

## Domain 9: Introduction Bridges

| #   | Question                                                      | Answer                                                                                                                                                           | Status |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 33  | Does bridge viewing verify the chef is a participant?         | Yes. `getIntroductionBridgeForChef` verifies the authenticated chef is either `source_chef_id` or `target_chef_id`. Non-participants cannot view bridge details. | BUILT  |
| 34  | Does the bridge page identify source vs target chef roles?    | Yes. `isSourceChef` and `isTargetChef` computed from `detail.bridge.source_chef_id === currentChefId`. Passed to `HubBridgeView` for role-appropriate UI.        | BUILT  |
| 35  | Does the bridge list scope to the authenticated chef?         | Yes. `getChefIntroBridges` filters by the authenticated chef's ID. Only bridges where the chef is a participant are returned.                                    | BUILT  |
| 36  | Does the bridge page return `notFound()` for invalid bridges? | Yes. Checks both `if (!detail) notFound()` and `if (!group) notFound()`.                                                                                         | BUILT  |

## Domain 10: Cross-System & Intelligence

| #   | Question                                                     | Answer                                                                                                                                                                                | Status |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 37  | Do contact shares scope to connected chefs only?             | Yes. `getNetworkContactShares` returns shares only between the authenticated chef and their connections.                                                                              | BUILT  |
| 38  | Does the network hub use widget error boundaries?            | Yes. `page.tsx` wraps `NetworkReferralBar` intelligence overlay in `<WidgetErrorBoundary>` + `<Suspense>`. Non-blocking, isolated from main content.                                  | BUILT  |
| 39  | Does the saved posts page scope to the authenticated chef?   | Yes. `saved/page.tsx` calls `requireChef()` and reads bookmarks for the authenticated chef only.                                                                                      | BUILT  |
| 40  | Does the notifications page scope to the authenticated chef? | Yes. `notifications/page.tsx` calls `requireChef()` and reads social notifications for the authenticated chef. `markSocialNotificationsRead` only marks the chef's own notifications. | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

| #   | Item                                          | Rationale                                                                                                                                                    |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13  | Channels use admin client (not tenant-scoped) | By design. Channels are community-wide social features shared across all chefs. Not a multi-tenant data isolation concern; channels contain no private data. |

**Sweep score: 39/40 BUILT, 1 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 8 pages auth-gated, all actions use `user.entityId` for chef identity scoping, connections enforce bidirectional queries, collab handoffs verify participant authorization with auto-expiry, trusted circle validates connected status, collab spaces verify membership, introduction bridges verify participant role, no client PII visible through the network, intelligence overlays isolated with error boundaries.

**No fixes needed this session.** This surface was clean on arrival.
